import { db, packagesTable, postsTable, seoPagesTable, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type SeoEntityKind = "service" | "container" | "post" | "page";

export type SeoSource = {
  id?: number;
  kind: SeoEntityKind;
  title?: unknown;
  name?: unknown;
  description?: unknown;
  excerpt?: unknown;
  content?: unknown;
  targetKeyword?: unknown;
  category?: unknown;
  size?: unknown;
  capacity?: unknown;
  slug?: unknown;
  seoSlug?: unknown;
  seoTitle?: unknown;
  seoDescription?: unknown;
  seoKeywords?: unknown;
  ogImage?: unknown;
  coverImage?: unknown;
  imageUrl?: unknown;
};

export type SeoMetadata = {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoSlug: string;
  ogImage: string;
  canonicalUrl: string;
};

const GOLDEN_KEYWORDS = [
  "تأجير الحاويات بالرياض",
  "نقل مخلفات البناء بالرياض",
  "حاويات أنقاض بالرياض",
  "نقل المخلفات بالرياض",
];

const FALLBACK_IMAGES: Record<SeoEntityKind, string> = {
  service: "/images/seo/taqi-services.jpg",
  container: "/images/seo/taqi-containers.jpg",
  post: "/images/seo/taqi-blog.jpg",
  page: "/images/seo/taqi-services.jpg",
};

const ROUTE_PREFIXES: Record<SeoEntityKind, string> = {
  service: "/services",
  container: "/containers",
  post: "/blog",
  page: "/page",
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function plainText(value: unknown): string {
  return text(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function cap(value: string, max: number): string {
  if (value.length <= max) return value;
  const clipped = value.slice(0, max - 1).replace(/\s+\S*$/, "").trim();
  return `${clipped || value.slice(0, max - 1).trim()}…`;
}

function fitDescription(seed: string, suffix: string): string {
  let value = plainText(seed);
  if (!value) value = suffix;
  if (value.length < 120) value = `${value} ${suffix}`.replace(/\s+/g, " ").trim();
  if (value.length < 120) value = `${value} خدمة موثوقة وسريعة داخل جميع أحياء الرياض.`.trim();
  return cap(value, 160);
}

function normalizeSlug(value: unknown, fallback: string): string {
  const normalized = plainText(value)
    .normalize("NFKC")
    .replace(/[\s_]+/g, "-")
    .replace(/[^\u0600-\u06FF\u0750-\u077Fa-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}

function generatedTitle(source: SeoSource, displayName: string, keyword: string): string {
  switch (source.kind) {
    case "service":
      return `${displayName} بالرياض | تأجير حاويات ونقل مخلفات`;
    case "container":
      return `تأجير ${displayName}${text(source.size) ? ` ${text(source.size)}` : ""} بالرياض | تقي جروب`;
    case "post":
      return `${displayName} | دليل تأجير الحاويات بالرياض`;
    case "page":
      return `${displayName} | خدمات الحاويات بالرياض`;
  }
}

function generatedDescription(source: SeoSource, displayName: string, keyword: string): string {
  const sourceText = plainText(source.description) || plainText(source.excerpt) || plainText(source.content);
  const details = [
    text(source.size) ? `المقاس ${text(source.size)}` : "",
    text(source.capacity) ? `بسعة ${text(source.capacity)}` : "",
    text(source.category) ? `ضمن خدمات ${text(source.category)}` : "",
  ].filter(Boolean).join("، ");

  switch (source.kind) {
    case "service":
      return fitDescription(
        `خدمة ${displayName} في الرياض من تقي جروب. ${sourceText}${details ? ` ${details}.` : ""}`,
        "تواصل معنا لتحديد الموعد وطلب الخدمة ونقل المخلفات بطريقة منظمة.",
      );
    case "container":
      return fitDescription(
        `استأجر ${displayName} في الرياض من تقي جروب. ${sourceText}${details ? ` ${details}.` : ""}`,
        "نوفر التوصيل والسحب ونقل الأنقاض والمخلفات من موقعك في الموعد المتفق عليه.",
      );
    case "post":
      return fitDescription(
        `اقرأ ${displayName} من مدونة تقي جروب لمعرفة ${keyword || "أفضل حلول تأجير الحاويات ونقل المخلفات"} في الرياض. ${sourceText}`,
        "دليل عملي محدث يساعدك على اختيار الحل المناسب وطلب الخدمة بثقة.",
      );
    case "page":
      return fitDescription(
        `${displayName} في الرياض من تقي جروب. ${sourceText}`,
        "معلومات عملية وخطوات واضحة لاختيار الحاوية أو خدمة نقل المخلفات المناسبة.",
      );
  }
}

function generatedKeywords(source: SeoSource, displayName: string, keyword: string): string {
  const supplied = text(source.seoKeywords)
    .split(/[,،|]/g)
    .map((item) => item.trim())
    .filter(Boolean);
  const kindKeywords = source.kind === "post"
    ? ["مدونة تقي جروب", "دليل الحاويات", "أسعار الحاويات بالرياض"]
    : source.kind === "page"
      ? ["خدمات الحاويات", "طلب حاوية بالرياض", "حلول المخلفات بالرياض"]
      : source.kind === "container"
        ? ["حاويات للإيجار بالرياض", "حاويات مخلفات البناء", "أسعار تأجير الحاويات"]
        : ["خدمات تقي جروب", "تأجير حاويات", "خدمة نقل المخلفات"];
  return [...new Set([keyword, displayName, ...supplied, ...kindKeywords, ...GOLDEN_KEYWORDS]
    .map((item) => item.trim())
    .filter(Boolean))].slice(0, 12).join(", ");
}

export function generateSeoMetadata(source: SeoSource): SeoMetadata {
  const displayName = plainText(source.title) || plainText(source.name) || "خدمات الحاويات";
  const keyword = plainText(source.targetKeyword) || displayName;
  const slug = normalizeSlug(
    source.seoSlug || source.slug || displayName,
    `${source.kind}-${source.id ?? "new"}`,
  );
  const title = cap(plainText(source.seoTitle) || generatedTitle(source, displayName, keyword), 60);
  const description = fitDescription(
    plainText(source.seoDescription),
    generatedDescription(source, displayName, keyword),
  );
  const image = text(source.ogImage) || text(source.coverImage) || text(source.imageUrl) || FALLBACK_IMAGES[source.kind];
  const canonicalUrl = `${ROUTE_PREFIXES[source.kind]}/${slug}`;

  return {
    seoTitle: title,
    seoDescription: description,
    seoKeywords: generatedKeywords(source, displayName, keyword),
    seoSlug: slug,
    ogImage: image,
    canonicalUrl,
  };
}

export function uniqueSlug(base: string, existing: Iterable<string>, current?: string): string {
  const used = new Set([...existing].map((value) => value.trim().toLowerCase()).filter(Boolean));
  if (current) used.delete(current.trim().toLowerCase());
  if (!used.has(base.toLowerCase())) return base;
  let counter = 2;
  while (used.has(`${base}-${counter}`.toLowerCase())) counter += 1;
  return `${base}-${counter}`;
}

export async function backfillSeoMetadata(): Promise<{ updated: number }> {
  let updated = 0;
  const updateIfNeeded = async (
    table: typeof servicesTable | typeof packagesTable | typeof postsTable | typeof seoPagesTable,
    kind: SeoEntityKind,
  ) => {
    const rows = await db.select().from(table as never) as Array<Record<string, unknown>>;
    for (const row of rows) {
      const source: SeoSource = {
        kind,
        id: Number(row.id),
        title: row.title,
        name: row.name,
        description: row.description,
        excerpt: row.excerpt,
        content: row.content,
        targetKeyword: row.targetKeyword ?? row.target_keyword,
        category: row.category,
        size: row.size,
        capacity: row.capacity,
        slug: row.slug,
        seoSlug: row.seoSlug ?? row.seo_slug,
        seoTitle: row.seoTitle ?? row.seo_title,
        seoDescription: row.seoDescription ?? row.seo_description,
        seoKeywords: row.seoKeywords ?? row.seo_keywords,
        ogImage: row.ogImage ?? row.og_image,
        coverImage: row.coverImage ?? row.cover_image,
        imageUrl: row.imageUrl ?? row.image_url,
      };
      const metadata = generateSeoMetadata(source);
      const needsUpdate = !text(source.seoTitle)
        || !text(source.seoDescription)
        || !text(source.seoKeywords)
        || !text(source.seoSlug)
        || ((kind === "post" || kind === "page") && !text(row.canonicalUrl ?? row.canonical_url))
        || ((kind === "post" || kind === "page") && !text(source.ogImage));
      if (!needsUpdate) continue;

      const patch: Record<string, unknown> = {
        seoTitle: metadata.seoTitle,
        seoDescription: metadata.seoDescription,
        seoKeywords: metadata.seoKeywords,
        seoSlug: metadata.seoSlug,
      };
      if (kind === "service" || kind === "container") patch.seoEnabled = true;
      if (kind === "post" || kind === "page") {
        patch.ogImage = metadata.ogImage;
        patch.canonicalUrl = metadata.canonicalUrl;
      }
      await db.update(table as never).set(patch as never).where(eq((table as typeof servicesTable).id, Number(row.id)));
      updated += 1;
    }
  };

  await updateIfNeeded(servicesTable, "service");
  await updateIfNeeded(packagesTable, "container");
  await updateIfNeeded(postsTable, "post");
  await updateIfNeeded(seoPagesTable, "page");
  return { updated };
}