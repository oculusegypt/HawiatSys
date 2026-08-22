import { Router } from "express";
import { db } from "@workspace/db";
import { containersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";

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
    seoEnabled: seoEnabled ?? false,
    seoTitle: seoTitle ?? "",
    seoDescription: seoDescription ?? "",
    seoKeywords: seoKeywords ?? "",
     seoSlug: normalizeArabicSlug(seoSlug),
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
  const updateData: Record<string, unknown> = {
    name, category, size, capacity, description, features,
    suitableFor, priceText, priceNote, rentalPeriod,
    contactPhone1, contactPhone2, imageUrl, images,
     order, isActive, seoEnabled, seoTitle, seoDescription, seoKeywords,
  };
  if (pricePerDay !== undefined) updateData.pricePerDay = Number(pricePerDay);
  // Strip undefined keys so partial patches work correctly
  for (const k of Object.keys(updateData)) {
    if (updateData[k] === undefined) delete updateData[k];
  }
   if (seoSlug !== undefined) updateData.seoSlug = normalizeArabicSlug(seoSlug);
  const [container] = await db.update(containersTable)
    .set(updateData)
    .where(eq(containersTable.id, id))
    .returning();
  if (!container) return res.status(404).json({ error: "Not found" });
  return res.json(container);
});

router.delete("/containers/:id", requireAdmin, requireSectionPermission("packages"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(containersTable).where(eq(containersTable.id, id));
  return res.status(204).send();
});

export default router;
