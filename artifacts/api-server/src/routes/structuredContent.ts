import { Router } from "express";
import { db, structuredContentTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";
import {
  buildStructuredContentGraph,
  normalizeScopePath,
  validateStructuredContentPayload,
} from "../lib/structuredData";

const router = Router();
const publicOrigin = () => String(process.env.PUBLIC_ORIGIN || "").replace(/\/+$/, "");

function serialize(row: any) {
  let payload: unknown = {};
  try { payload = JSON.parse(row.payload || "{}"); } catch {}
  return {
    id: row.id,
    scopePath: row.scopePath,
    schemaType: row.schemaType,
    title: row.title,
    description: row.description,
    payload,
    isActive: Boolean(row.isActive),
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Public consumers receive only the validated graph; admin debugging receives
// the source and validation reasons separately.
router.get("/structured-data", async (req, res) => {
  const scopePath = normalizeScopePath(req.query.path || "/");
  const rows = await db.select().from(structuredContentTable);
  const result = buildStructuredContentGraph(rows, scopePath, publicOrigin());
  return res.json({ "@context": "https://schema.org", "@graph": result.graph });
});

router.get("/structured-content", async (req, res) => {
  const scopePath = normalizeScopePath(req.query.path || "/");
  const rows = await db.select().from(structuredContentTable);
  return res.json(rows
    .filter((row) => row.isActive && (normalizeScopePath(row.scopePath) === scopePath || normalizeScopePath(row.scopePath) === "*"))
    .filter((row) => row.schemaType === "FAQPage")
    .map(serialize));
});

router.get("/admin/structured-content", requireAdmin, requireSectionPermission("structured_content"), async (_req, res) => {
  const rows = await db.select().from(structuredContentTable).orderBy(desc(structuredContentTable.sortOrder), desc(structuredContentTable.updatedAt));
  return res.json(rows.map(serialize));
});

router.get("/admin/structured-content/debug", requireAdmin, requireSectionPermission("structured_content"), async (req, res) => {
  const scopePath = normalizeScopePath(req.query.path || "/");
  const rows = await db.select().from(structuredContentTable);
  const result = buildStructuredContentGraph(rows, scopePath, publicOrigin());
  return res.json({
    scopePath,
    graph: { "@context": "https://schema.org", "@graph": result.graph },
    debug: result.debug,
    totals: {
      configured: rows.filter((row) => row.isActive && (normalizeScopePath(row.scopePath) === scopePath || normalizeScopePath(row.scopePath) === "*")).length,
      included: result.graph.length,
      issues: result.debug.reduce((count, item) => count + item.issues.length, 0),
    },
  });
});

router.post("/admin/structured-content", requireAdmin, requireSectionPermission("structured_content"), async (req, res) => {
  const parsed = validateStructuredContentPayload(req.body);
  if (parsed.errors.length || !parsed.value) return res.status(400).json({ error: parsed.errors.join("، ") });
  const now = new Date().toISOString();
  try {
    const [row] = await db.insert(structuredContentTable).values({
      scopePath: parsed.value.scopePath,
      schemaType: parsed.value.schemaType,
      title: parsed.value.title,
      description: parsed.value.description,
      payload: JSON.stringify(parsed.value.payload),
      isActive: parsed.value.isActive,
      sortOrder: parsed.value.sortOrder,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return res.status(201).json(serialize(row));
  } catch (error) {
    return res.status(409).json({ error: "يوجد عنصر من نفس النوع والمسار بالفعل", details: String(error) });
  }
});

router.patch("/admin/structured-content/:id", requireAdmin, requireSectionPermission("structured_content"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "معرّف غير صالح" });
  const existing = await db.select().from(structuredContentTable).where(eq(structuredContentTable.id, id));
  if (!existing[0]) return res.status(404).json({ error: "العنصر غير موجود" });
  const current = serialize(existing[0]);
  const parsed = validateStructuredContentPayload({ ...current, ...req.body, payload: req.body.payload ?? current.payload });
  if (parsed.errors.length || !parsed.value) return res.status(400).json({ error: parsed.errors.join("، ") });
  try {
    const [row] = await db.update(structuredContentTable).set({
      scopePath: parsed.value.scopePath,
      schemaType: parsed.value.schemaType,
      title: parsed.value.title,
      description: parsed.value.description,
      payload: JSON.stringify(parsed.value.payload),
      isActive: parsed.value.isActive,
      sortOrder: parsed.value.sortOrder,
      updatedAt: new Date().toISOString(),
    }).where(eq(structuredContentTable.id, id)).returning();
    return res.json(serialize(row));
  } catch (error) {
    return res.status(409).json({ error: "يوجد عنصر من نفس النوع والمسار بالفعل", details: String(error) });
  }
});

router.delete("/admin/structured-content/:id", requireAdmin, requireSectionPermission("structured_content"), async (req, res) => {
  const id = Number.parseInt(String(req.params.id), 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "معرّف غير صالح" });
  await db.delete(structuredContentTable).where(eq(structuredContentTable.id, id));
  return res.status(204).send();
});

export default router;