import { Router } from "express";
import { db } from "@workspace/db";
import { containersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";
import { getSetting } from "./settings";
import { replaceLegacyCompanyName } from "../lib/companyName";
import { generateSeoMetadata, uniqueSlug } from "../lib/seoMetadata";
import { entitySlug } from "../lib/friendlySlug";

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

function castContainer(row: any, companyName: string) {
  const text = (value: unknown) => replaceLegacyCompanyName(typeof value === "string" ? value : "", companyName) || "";
  return {
    ...row,
    name: text(row.name),
    size: text(row.size),
    capacity: text(row.capacity),
    description: text(row.description),
    suitableFor: text(row.suitableFor ?? row.suitable_for),
    priceText: text(row.priceText ?? row.price_text),
    priceNote: text(row.priceNote ?? row.price_note),
    rentalPeriod: text(row.rentalPeriod ?? row.rental_period),
    seoTitle: text(row.seoTitle ?? row.seo_title),
    seoDescription: text(row.seoDescription ?? row.seo_description),
    seoKeywords: text(row.seoKeywords ?? row.seo_keywords),
  };
}

router.get(["/containers", "/packages", "/cleaning-packages"], async (_req, res) => {
  const containers = await db.select().from(containersTable).orderBy(asc(containersTable.order));
  const companyName = await getSetting("company_name");
  return res.json(containers.map(container => castContainer(container, companyName)));
});

router.get(["/containers/:slug", "/packages/:slug", "/cleaning-packages/:slug"], async (req, res) => {
  const rawParam = req.params.slug;
  const requested = decodeURIComponent(Array.isArray(rawParam) ? rawParam[0] : rawParam).trim().toLowerCase();
  const rows = await db.select().from(containersTable)
    .where(eq(containersTable.isActive, true))
    .orderBy(asc(containersTable.id));
  const container = rows.find(row => {
    const stored = String(row.seoSlug ?? "").trim().toLowerCase();
    const publicSlug = entitySlug({ slug: row.seoSlug, title: row.name, id: row.id, fallback: "container" }).toLowerCase();
    return requested === stored || requested === publicSlug || requested === String(row.id);
  });
  if (!container) return res.status(404).json({ error: "Not found" });
  return res.json(castContainer(container, await getSetting("company_name")));
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
  const existingSlugs = (await db.select({ seoSlug: containersTable.seoSlug }).from(containersTable))
    .map((row) => row.seoSlug ?? "");
  seo.seoSlug = uniqueSlug(seo.seoSlug, existingSlugs);
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
    seoEnabled: seoEnabled ?? (isActive ?? true),
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
  const slugWasRequested = seoSlug !== undefined || !existing.seoSlug;
  const finalSlug = slugWasRequested
    ? uniqueSlug(
        seo.seoSlug,
        (await db.select({ seoSlug: containersTable.seoSlug }).from(containersTable)).map((row) => row.seoSlug ?? ""),
        existing.seoSlug ?? "",
      )
    : (existing.seoSlug || seo.seoSlug);
  const updateData: Record<string, unknown> = {
    name, category, size, capacity, description, features,
    suitableFor, priceText, priceNote, rentalPeriod,
    contactPhone1, contactPhone2, imageUrl, images,
     order, isActive,
     seoEnabled: seoEnabled !== undefined
       ? seoEnabled
       : (existing.seoEnabled ?? (isActive ?? true)),
     seoTitle: seo.seoTitle,
     seoDescription: seo.seoDescription,
     seoKeywords: seo.seoKeywords,
     seoSlug: finalSlug,
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
