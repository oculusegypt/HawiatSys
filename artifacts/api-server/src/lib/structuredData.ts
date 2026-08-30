import type { StructuredContent } from "@workspace/db";

export const SUPPORTED_SCHEMA_TYPES = [
  "FAQPage",
  "Article",
  "LocalBusiness",
  "Service",
  "BreadcrumbList",
  "WebPage",
  "Organization",
  "ImageObject",
  "JobPosting",
  "Product",
  "Review",
  "AggregateRating",
] as const;

export type SupportedSchemaType = typeof SUPPORTED_SCHEMA_TYPES[number];

const schemaTypeSet = new Set<string>(SUPPORTED_SCHEMA_TYPES);

export type StructuredContentInput = {
  scopePath: string
  schemaType: SupportedSchemaType
  title: string
  description: string
  payload: unknown
  isActive: boolean
  sortOrder: number
}

export type SchemaDebug = {
  source: string;
  schemaType: string;
  id: string;
  included: boolean;
  issues: string[];
};

export function normalizeScopePath(value: unknown): string {
  const raw = String(value ?? "/").trim();
  if (raw === "*") return "*";
  const withoutQuery = raw.split(/[?#]/, 1)[0] || "/";
  const withSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  const normalized = withSlash.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  return normalized || "/";
}

function plainText(value: unknown): string {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeUrl(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  if (text.startsWith("/") || /^https?:\/\//i.test(text)) return text;
  return undefined;
}

function parsePayload(row: Pick<StructuredContent, "payload">): Record<string, unknown> {
  try {
    const value = JSON.parse(row.payload || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function faqNode(payload: Record<string, unknown>, row: StructuredContent, id: string, debug: SchemaDebug): Record<string, unknown> | null {
  const rawItems = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.mainEntity) ? payload.mainEntity : [];
  const mainEntity = rawItems
    .filter((item) => item && typeof item === "object" && (item as Record<string, unknown>).enabled !== false)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Record<string, unknown>;
      const question = plainText(candidate.question ?? candidate.q ?? candidate.name);
      const answer = plainText(candidate.answer ?? candidate.a ?? candidate.text);
      if (!question || !answer || answer.length < 2) return null;
      return {
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      };
    })
    .filter(Boolean);
  if (!mainEntity.length) {
    debug.issues.push("FAQPage يحتاج إلى عنصر FAQ واحد صالح على الأقل");
    debug.included = false;
    return null;
  }
  return {
    "@type": "FAQPage",
    "@id": id,
    ...(row.title ? { name: plainText(row.title) } : {}),
    ...(row.description ? { description: plainText(row.description) } : {}),
    mainEntity,
  };
}

function genericNode(payload: Record<string, unknown>, row: StructuredContent, id: string, debug: SchemaDebug): Record<string, unknown> | null {
  const node: Record<string, unknown> = { "@type": row.schemaType, "@id": id };
  for (const [key, value] of Object.entries(payload)) {
    // Admin payloads cannot replace graph identity or inject a second context.
    if (key === "@context" || key === "@type" || key === "@id") continue;
    if (key === "url" || key === "image") {
      const url = safeUrl(value);
      if (url) node[key] = url;
    } else {
      node[key] = value;
    }
  }
  if (row.title && node.name === undefined) node.name = plainText(row.title);
  if (row.description && node.description === undefined) node.description = plainText(row.description);

  if (row.schemaType === "AggregateRating") {
    const ratingValue = Number(node.ratingValue);
    const reviewCount = Number(node.reviewCount);
    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5 || !Number.isInteger(reviewCount) || reviewCount < 1) {
      debug.issues.push("AggregateRating محجوب حتى تتوفر مراجعات حقيقية وتقييم صالح");
      debug.included = false;
      return null;
    }
    node.ratingValue = Number(ratingValue.toFixed(1));
    node.reviewCount = reviewCount;
  }
  if (row.schemaType === "Review" && (!node.reviewBody || !node.author || !node.reviewRating)) {
    debug.issues.push("Review يحتاج reviewBody وauthor وreviewRating");
    debug.included = false;
    return null;
  }
  if (row.schemaType === "ImageObject" && !node.contentUrl && !node.url) {
    debug.issues.push("ImageObject يحتاج contentUrl أو url");
    debug.included = false;
    return null;
  }
  return node;
}

export function buildStructuredContentNode(
  row: StructuredContent,
  origin = "",
): { node: Record<string, unknown> | null; debug: SchemaDebug } {
  const path = normalizeScopePath(row.scopePath);
  const base = origin.replace(/\/+$/, "");
  const id = `${base}${path === "*" ? "/" : path}#${row.schemaType}`;
  const debug: SchemaDebug = {
    source: `structured_content:${row.id}`,
    schemaType: row.schemaType,
    id,
    included: Boolean(row.isActive),
    issues: [],
  };
  if (!row.isActive) {
    debug.issues.push("العنصر معطّل");
    return { node: null, debug };
  }
  if (!schemaTypeSet.has(row.schemaType)) {
    debug.issues.push("نوع Schema غير مدعوم");
    debug.included = false;
    return { node: null, debug };
  }
  const payload = parsePayload(row);
  const node = row.schemaType === "FAQPage"
    ? faqNode(payload, row, id, debug)
    : genericNode(payload, row, id, debug);
  return { node, debug };
}

export function buildStructuredContentGraph(
  rows: StructuredContent[],
  scopePath: string,
  origin = "",
): { graph: Record<string, unknown>[]; debug: SchemaDebug[] } {
  const normalizedPath = normalizeScopePath(scopePath);
  const candidates = rows
    .filter((row) => row.isActive && (normalizeScopePath(row.scopePath) === normalizedPath || normalizeScopePath(row.scopePath) === "*"))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const debug: SchemaDebug[] = [];
  const graph: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const row of candidates) {
    const result = buildStructuredContentNode(row, origin);
    debug.push(result.debug);
    if (!result.node) continue;
    const key = String(result.node["@id"] || `${result.node["@type"]}:${JSON.stringify(result.node)}`);
    if (seen.has(key)) {
      debug[debug.length - 1].issues.push("مكرر وتم دمجه");
      debug[debug.length - 1].included = false;
      continue;
    }
    seen.add(key);
    graph.push(result.node);
  }
  return { graph, debug };
}

export function validateStructuredContentPayload(input: unknown): {
  value?: StructuredContentInput;
  errors: string[];
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { errors: ["بيانات Structured Content يجب أن تكون كائن JSON"] };
  }
  const source = input as Record<string, unknown>;
  const scopePath = String(source.scopePath ?? "/").trim();
  const schemaType = String(source.schemaType ?? "");
  const title = String(source.title ?? "").trim();
  const description = String(source.description ?? "").trim();
  const errors: string[] = [];
  if (!scopePath || scopePath.length > 500) errors.push("scopePath: مسار الصفحة غير صالح");
  if (!schemaTypeSet.has(schemaType)) errors.push("schemaType: نوع Schema غير مدعوم");
  if (title.length > 300) errors.push("title: العنوان طويل جدًا");
  if (description.length > 2000) errors.push("description: الوصف طويل جدًا");
  const sortOrder = source.sortOrder === undefined ? 0 : Number(source.sortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < -100000 || sortOrder > 100000) {
    errors.push("sortOrder: ترتيب غير صالح");
  }
  if (source.isActive !== undefined && typeof source.isActive !== "boolean") {
    errors.push("isActive: قيمة التفعيل غير صالحة");
  }
  if (errors.length) return { errors };
  const value: StructuredContentInput = {
    scopePath: normalizeScopePath(scopePath),
    schemaType: schemaType as SupportedSchemaType,
    title,
    description,
    payload: source.payload ?? {},
    isActive: source.isActive !== false,
    sortOrder,
  };
  if (value.schemaType !== "FAQPage" && (!value.payload || typeof value.payload !== "object" || Array.isArray(value.payload))) {
    return { errors: ["حمولة Schema يجب أن تكون كائن JSON"] };
  }
  return { value, errors: [] };
}