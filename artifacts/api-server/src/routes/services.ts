import { Router } from "express";
import { db } from "@workspace/db";
import { servicesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";

// ── DB migration: add new columns to existing DB ───────────────────────────────
try {
  const client = (db as any).$client;
  const migrations = [
    "ALTER TABLE services ADD COLUMN images TEXT DEFAULT '[]'",
    "ALTER TABLE services ADD COLUMN seo_enabled INTEGER DEFAULT 0",
    "ALTER TABLE services ADD COLUMN seo_title TEXT DEFAULT ''",
    "ALTER TABLE services ADD COLUMN seo_description TEXT DEFAULT ''",
    "ALTER TABLE services ADD COLUMN seo_keywords TEXT DEFAULT ''",
    "ALTER TABLE services ADD COLUMN seo_slug TEXT DEFAULT ''",
  ];
  for (const sql of migrations) {
    try { client.exec(sql); } catch {}
  }
} catch {}

const router = Router();

function normalizeArabicSlug(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\u0600-\u06FF0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function castRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    imageUrl: row.imageUrl ?? row.image_url ?? null,
    images: row.images ?? "[]",
    order: row.order ?? 0,
    isActive: Boolean(row.isActive ?? row.is_active ?? true),
    seoEnabled: Boolean(row.seoEnabled ?? row.seo_enabled ?? false),
    seoTitle: row.seoTitle ?? row.seo_title ?? "",
    seoDescription: row.seoDescription ?? row.seo_description ?? "",
    seoKeywords: row.seoKeywords ?? row.seo_keywords ?? "",
    seoSlug: row.seoSlug ?? row.seo_slug ?? "",
  };
}

router.get("/services", async (_req, res) => {
  const rows = await db.select().from(servicesTable).orderBy(asc(servicesTable.order));
  return res.json(rows.map(castRow));
});

router.post("/services", requireAdmin, requireSectionPermission("services"), async (req, res) => {
  const { title, description, icon, imageUrl, images, order, isActive,
          seoEnabled, seoTitle, seoDescription, seoKeywords, seoSlug } = req.body;
  const [service] = await db.insert(servicesTable).values({
    title, description, icon,
    imageUrl: imageUrl || undefined,
    images: images ?? "[]",
    order: order ?? 0,
    isActive: isActive ?? true,
    seoEnabled: seoEnabled ?? false,
    seoTitle: seoTitle ?? "",
    seoDescription: seoDescription ?? "",
    seoKeywords: seoKeywords ?? "",
     seoSlug: normalizeArabicSlug(seoSlug),
  }).returning();
  return res.status(201).json(castRow(service));
});

router.patch("/services/:id", requireAdmin, requireSectionPermission("services"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { title, description, icon, imageUrl, images, order, isActive,
          seoEnabled, seoTitle, seoDescription, seoKeywords, seoSlug } = req.body;
  const updateData: Record<string, any> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (icon !== undefined) updateData.icon = icon;
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
  if (images !== undefined) updateData.images = images;
  if (order !== undefined) updateData.order = order;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (seoEnabled !== undefined) updateData.seoEnabled = seoEnabled;
  if (seoTitle !== undefined) updateData.seoTitle = seoTitle;
  if (seoDescription !== undefined) updateData.seoDescription = seoDescription;
  if (seoKeywords !== undefined) updateData.seoKeywords = seoKeywords;
   if (seoSlug !== undefined) updateData.seoSlug = normalizeArabicSlug(seoSlug);

  const [service] = await db.update(servicesTable)
    .set(updateData)
    .where(eq(servicesTable.id, id))
    .returning();
  if (!service) return res.status(404).json({ error: "Not found" });
  return res.json(castRow(service));
});

router.delete("/services/:id", requireAdmin, requireSectionPermission("services"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(servicesTable).where(eq(servicesTable.id, id));
  return res.status(204).send();
});

export default router;
