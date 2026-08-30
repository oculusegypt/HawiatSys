import { Router } from "express";
import { db } from "@workspace/db";
import { servicesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";
import { getSetting } from "./settings";
import { replaceLegacyCompanyName } from "../lib/companyName";
import { generateSeoMetadata, uniqueSlug } from "../lib/seoMetadata";
import { entitySlug, legacyEntitySlug } from "../lib/friendlySlug";

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

function castRow(row: any, companyName: string) {
  const text = (value: unknown) => replaceLegacyCompanyName(typeof value === "string" ? value : "", companyName) || "";
  return {
    id: row.id,
    title: text(row.title),
    description: text(row.description),
    icon: row.icon,
    imageUrl: row.imageUrl ?? row.image_url ?? null,
    images: row.images ?? "[]",
    order: row.order ?? 0,
    isActive: Boolean(row.isActive ?? row.is_active ?? true),
    seoEnabled: Boolean(row.seoEnabled ?? row.seo_enabled ?? false),
    seoTitle: text(row.seoTitle ?? row.seo_title ?? ""),
    seoDescription: text(row.seoDescription ?? row.seo_description ?? ""),
    seoKeywords: text(row.seoKeywords ?? row.seo_keywords ?? ""),
    seoSlug: row.seoSlug ?? row.seo_slug ?? "",
  };
}

router.get("/services", async (_req, res) => {
  const rows = await db.select().from(servicesTable).orderBy(asc(servicesTable.order));
  const companyName = await getSetting("company_name");
  return res.json(rows.map(row => castRow(row, companyName)));
});

router.get("/services/:slug", async (req, res) => {
  const rawParam = req.params.slug;
  let requested = String(Array.isArray(rawParam) ? rawParam[0] : rawParam);
  for (let pass = 0; pass < 2 && /%[0-9a-f]{2}/i.test(requested); pass += 1) {
    try {
      requested = decodeURIComponent(requested);
    } catch {
      break;
    }
  }
  requested = requested.trim().toLowerCase();
  const rows = await db.select().from(servicesTable)
    .where(eq(servicesTable.isActive, true))
    .orderBy(asc(servicesTable.id));
  const service = rows.find(row => {
    const stored = String(row.seoSlug ?? "").trim().toLowerCase();
    const storedWithId = row.id == null ? "" : `${stored}-${row.id}`;
    const publicSlug = entitySlug({ slug: row.seoSlug, title: row.title, id: row.id, fallback: "service" }).toLowerCase();
    const legacySlug = legacyEntitySlug({ slug: row.seoSlug, title: row.title, id: row.id, fallback: "service" }).toLowerCase();
    return requested === stored
      || requested === storedWithId
      || requested === publicSlug
      || requested === legacySlug
      || requested === String(row.id);
  });
  if (!service) return res.status(404).json({ error: "Not found" });
  return res.json(castRow(service, await getSetting("company_name")));
});

router.post("/services", requireAdmin, requireSectionPermission("services"), async (req, res) => {
  const { title, description, icon, imageUrl, images, order, isActive,
          seoEnabled, seoTitle, seoDescription, seoKeywords, seoSlug } = req.body;
  const seo = generateSeoMetadata({
    kind: "service",
    title,
    description,
    imageUrl,
    seoTitle,
    seoDescription,
    seoKeywords,
    seoSlug,
  });
  const existingSlugs = (await db.select({ seoSlug: servicesTable.seoSlug }).from(servicesTable))
    .map((row) => row.seoSlug ?? "");
  seo.seoSlug = uniqueSlug(seo.seoSlug, existingSlugs);
  const [service] = await db.insert(servicesTable).values({
    title, description, icon,
    imageUrl: imageUrl || undefined,
    images: images ?? "[]",
    order: order ?? 0,
    isActive: isActive ?? true,
    // Public active services are always SEO-managed. The metadata is generated
    // server-side so a form or API client cannot accidentally create a blank
    // indexable route.
    seoEnabled: seoEnabled ?? (isActive ?? true),
    seoTitle: seo.seoTitle,
    seoDescription: seo.seoDescription,
    seoKeywords: seo.seoKeywords,
    seoSlug: seo.seoSlug,
  }).returning();
  return res.status(201).json(castRow(service, await getSetting("company_name")));
});

router.patch("/services/:id", requireAdmin, requireSectionPermission("services"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { title, description, icon, imageUrl, images, order, isActive,
          seoEnabled, seoTitle, seoDescription, seoKeywords, seoSlug } = req.body;
  const [existing] = await db.select().from(servicesTable).where(eq(servicesTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });

  const seo = generateSeoMetadata({
    kind: "service",
    id,
    title: title ?? existing.title,
    description: description ?? existing.description,
    imageUrl: imageUrl ?? existing.imageUrl,
    seoTitle: seoTitle !== undefined ? seoTitle : (title !== undefined ? "" : existing.seoTitle),
    seoDescription: seoDescription !== undefined ? seoDescription : (description !== undefined ? "" : existing.seoDescription),
    seoKeywords: seoKeywords !== undefined ? seoKeywords : existing.seoKeywords,
    seoSlug: seoSlug !== undefined ? seoSlug : existing.seoSlug,
  });
  const slugWasRequested = seoSlug !== undefined || !existing.seoSlug;
  const finalSlug = slugWasRequested
    ? uniqueSlug(
        seo.seoSlug,
        (await db.select({ seoSlug: servicesTable.seoSlug }).from(servicesTable)).map((row) => row.seoSlug ?? ""),
        existing.seoSlug ?? "",
      )
    : (existing.seoSlug || seo.seoSlug);
  const updateData: Record<string, any> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (icon !== undefined) updateData.icon = icon;
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
  if (images !== undefined) updateData.images = images;
  if (order !== undefined) updateData.order = order;
  if (isActive !== undefined) updateData.isActive = isActive;
  updateData.seoEnabled = seoEnabled !== undefined
    ? seoEnabled
    : (existing.seoEnabled ?? (isActive ?? true));
  updateData.seoTitle = seo.seoTitle;
  updateData.seoDescription = seo.seoDescription;
  updateData.seoKeywords = seo.seoKeywords;
  updateData.seoSlug = finalSlug;

  const [service] = await db.update(servicesTable)
    .set(updateData)
    .where(eq(servicesTable.id, id))
    .returning();
  return res.json(castRow(service, await getSetting("company_name")));
});

router.delete("/services/:id", requireAdmin, requireSectionPermission("services"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(servicesTable).where(eq(servicesTable.id, id));
  return res.status(204).send();
});

export default router;
