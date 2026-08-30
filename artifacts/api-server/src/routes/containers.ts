import { Router } from "express";
import { db } from "@workspace/db";
import { containersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";
import { generateSeoMetadata } from "../lib/seoMetadata";

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

router.get(["/containers", "/packages", "/cleaning-packages"], async (_req, res) => {
  const containers = await db.select().from(containersTable).orderBy(asc(containersTable.order));
  return res.json(containers);
});

router.post("/containers", requireAdmin, requireSectionPermission("packages"), async (req, res) => {
  const {
    name, category, size, capacity, description, features,
    suitableFor, priceText, priceNote, rentalPeriod,
    contactPhone1, contactPhone2, pricePerDay, imageUrl, images,
    order, isActive, seoEnabled, seoTitle, seoDescription, seoKeywords, seoSlug,
  } = req.body;
  const seo = generateSeoMetadata({
    kind: "container",
    name,
    title: name,
    description,
    size,
    capacity,
    imageUrl,
    seoTitle,
    seoDescription,
    seoKeywords,
    seoSlug,
  });
  const [container] = await db.insert(containersTable).values({
    name,
    category: category ?? "debris",
    size: size ?? "",
    capacity: capacity ?? "",
    description,
    features: features ?? [],
    suitableFor: suitableFor ?? "",
    priceText: priceText ?? "",
    priceNote: priceNote ?? "",
    rentalPeriod: rentalPeriod ?? "",
    contactPhone1: contactPhone1 ?? "",
    contactPhone2: contactPhone2 ?? "",
    pricePerDay: Number(pricePerDay ?? 0),
    imageUrl: imageUrl ?? "",
    images: images ?? "[]",
    order: order ?? 0,
    isActive: isActive ?? true,
    // Every active container is a public SEO landing route. Keep this
    // invariant on the server instead of relying on an editor toggle.
    seoEnabled: true,
    seoTitle: seo.seoTitle,
    seoDescription: seo.seoDescription,
    seoKeywords: seo.seoKeywords,
    seoSlug: seo.seoSlug,
  }).returning();
  return res.status(201).json(container);
});

router.patch("/containers/:id", requireAdmin, requireSectionPermission("packages"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const {
    name, category, size, capacity, description, features,
    suitableFor, priceText, priceNote, rentalPeriod,
    contactPhone1, contactPhone2, pricePerDay, imageUrl, images,
     order, isActive, seoEnabled, seoTitle, seoDescription, seoKeywords, seoSlug,
  } = req.body;
  const [existing] = await db.select().from(containersTable).where(eq(containersTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });

  const seo = generateSeoMetadata({
    kind: "container",
    id,
    name: name ?? existing.name,
    title: name ?? existing.name,
    description: description ?? existing.description,
    size: size ?? existing.size,
    capacity: capacity ?? existing.capacity,
    imageUrl: imageUrl ?? existing.imageUrl,
    seoTitle: seoTitle !== undefined ? seoTitle : (name !== undefined ? "" : existing.seoTitle),
    seoDescription: seoDescription !== undefined ? seoDescription : (description !== undefined ? "" : existing.seoDescription),
    seoKeywords: seoKeywords !== undefined ? seoKeywords : existing.seoKeywords,
    seoSlug: seoSlug !== undefined ? seoSlug : existing.seoSlug,
  });
  const updateData: Record<string, unknown> = {
    name, category, size, capacity, description, features,
    suitableFor, priceText, priceNote, rentalPeriod,
    contactPhone1, contactPhone2, imageUrl, images,
     order, isActive, seoEnabled: true,
     seoTitle: seo.seoTitle,
     seoDescription: seo.seoDescription,
     seoKeywords: seo.seoKeywords,
     seoSlug: seo.seoSlug,
  };
  if (pricePerDay !== undefined) updateData.pricePerDay = Number(pricePerDay);
  // Strip undefined keys so partial patches work correctly
  for (const k of Object.keys(updateData)) {
    if (updateData[k] === undefined) delete updateData[k];
  }
  const [container] = await db.update(containersTable)
    .set(updateData)
    .where(eq(containersTable.id, id))
    .returning();
  return res.json(container);
});

router.delete("/containers/:id", requireAdmin, requireSectionPermission("packages"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(containersTable).where(eq(containersTable.id, id));
  return res.status(204).send();
});

export default router;
