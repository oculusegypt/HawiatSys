import { Router } from "express";
import { db, seoPagesTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { getSetting } from "./settings";
import { replaceLegacyCompanyName } from "../lib/companyName";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";
import { entitySlug, legacyEntitySlug } from "../lib/friendlySlug";
import { generateSeoMetadata, uniqueSlug } from "../lib/seoMetadata";

const router = Router();

function normalizeSlug(value: unknown, fallback = "صفحة-seo"): string {
  const source = typeof value === "string" ? value : "";
  const slug = source
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
  return slug || `${fallback}-${Date.now()}`;
}

function castRow(row: any, companyName: string) {
  const text = (value: unknown) => replaceLegacyCompanyName(value, companyName);

  return {
    id: row.id,
    title: text(row.title ?? ""),
    slug: row.slug ?? row.seoSlug ?? row.seo_slug ?? "",
    targetKeyword: text(row.targetKeyword ?? row.target_keyword ?? ""),
    content: text(row.content ?? ""),
    excerpt: text(row.excerpt ?? ""),
    coverImage: text(row.coverImage ?? row.cover_image ?? ""),
    category: text(row.category ?? "خدمات التنظيف"),
    tags: text(row.tags ?? "[]"),
    status: row.status ?? "draft",
    publishedAt: row.publishedAt ?? row.published_at ?? null,
    viewCount: row.viewCount ?? row.view_count ?? 0,
    isActive: Boolean(row.isActive ?? row.is_active ?? true),
    order: row.order ?? 0,
    seoTitle: text(row.seoTitle ?? row.seo_title ?? ""),
    seoDescription: text(row.seoDescription ?? row.seo_description ?? ""),
    seoKeywords: text(row.seoKeywords ?? row.seo_keywords ?? ""),
    seoSlug: row.seoSlug ?? row.seo_slug ?? row.slug ?? "",
    ogImage: text(row.ogImage ?? row.og_image ?? ""),
    canonicalUrl: text(row.canonicalUrl ?? row.canonical_url ?? ""),
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
  };
}

const publicFilter = and(eq(seoPagesTable.status, "published"), eq(seoPagesTable.isActive, true));

// Public page index is useful for internal linking and for future page hubs.
router.get("/pages", async (_req, res) => {
  try {
    const rows = await db.select().from(seoPagesTable).where(publicFilter).orderBy(desc(seoPagesTable.publishedAt), desc(seoPagesTable.id));
    const companyName = await getSetting("company_name");
    return res.json(rows.map(row => castRow(row, companyName)));
  } catch {
    return res.json([]);
  }
});

// GET /pages/:slug — published SEO landing page
router.get("/pages/:slug", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(seoPagesTable)
      .where(publicFilter);
    const requestedSlug = decodeURIComponent(req.params.slug).trim().toLowerCase();
    const row = rows.find(candidate =>
      candidate.slug.toLowerCase() === requestedSlug
      || candidate.seoSlug?.toLowerCase() === requestedSlug
      || entitySlug({ slug: candidate.slug, title: candidate.title, id: candidate.id, fallback: "page" }) === requestedSlug
      || legacyEntitySlug({ slug: candidate.slug, title: candidate.title, id: candidate.id, fallback: "page" }) === requestedSlug
      || legacyEntitySlug({ slug: candidate.seoSlug, title: candidate.title, id: candidate.id, fallback: "page" }) === requestedSlug
    );
    if (!row) return res.status(404).json({ error: "Not found" });

    try {
      const client = (db as any).$client;
      client.prepare("UPDATE seo_pages SET view_count = view_count + 1 WHERE id = ?").run(row.id);
    } catch {}

    return res.json(castRow(row, await getSetting("company_name")));
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

// Admin list includes drafts and unpublished keyword pages.
router.get("/admin/seo-pages", requireAdmin, requireSectionPermission("seo_pages"), async (_req, res) => {
  try {
    const rows = await db.select().from(seoPagesTable).orderBy(desc(seoPagesTable.createdAt));
    const companyName = await getSetting("company_name");
    return res.json(rows.map(row => castRow(row, companyName)));
  } catch {
    return res.json([]);
  }
});

router.post("/admin/seo-pages", requireAdmin, requireSectionPermission("seo_pages"), async (req, res) => {
  try {
    const body = req.body as Record<string, any>;
    const now = new Date().toISOString();
    const metadata = generateSeoMetadata({
      kind: "page",
      title: body.title,
      targetKeyword: body.targetKeyword,
      content: body.content,
      excerpt: body.excerpt,
      category: body.category,
      slug: body.slug,
      seoSlug: body.seoSlug || body.slug,
      seoTitle: body.seoTitle,
      seoDescription: body.seoDescription,
      seoKeywords: body.seoKeywords,
      ogImage: body.ogImage,
      coverImage: body.coverImage,
    });
    const existingSlugs = (await db.select({ slug: seoPagesTable.slug }).from(seoPagesTable)).map((row) => row.slug);
    const slug = uniqueSlug(metadata.seoSlug, existingSlugs);
    metadata.seoSlug = slug;
    metadata.canonicalUrl = `/page/${slug}`;
    const companyName = await getSetting("company_name");
    const [row] = await db.insert(seoPagesTable).values({
      title: replaceLegacyCompanyName(body.title || "صفحة SEO جديدة", companyName),
      slug,
      targetKeyword: replaceLegacyCompanyName(body.targetKeyword ?? "", companyName),
      content: replaceLegacyCompanyName(body.content ?? "", companyName),
      excerpt: replaceLegacyCompanyName(body.excerpt ?? "", companyName),
      coverImage: replaceLegacyCompanyName(body.coverImage ?? "", companyName),
      category: replaceLegacyCompanyName(body.category ?? "خدمات التنظيف", companyName),
      tags: replaceLegacyCompanyName(Array.isArray(body.tags) ? JSON.stringify(body.tags) : (body.tags ?? "[]"), companyName),
      status: body.status === "published" ? "published" : "draft",
      publishedAt: body.status === "published" ? (body.publishedAt || now) : (body.publishedAt ?? null),
      viewCount: 0,
      isActive: body.isActive ?? true,
      order: Number(body.order) || 0,
       seoTitle: replaceLegacyCompanyName(metadata.seoTitle, companyName),
       seoDescription: replaceLegacyCompanyName(metadata.seoDescription, companyName),
       seoKeywords: replaceLegacyCompanyName(metadata.seoKeywords, companyName),
      seoSlug: slug,
       ogImage: replaceLegacyCompanyName(metadata.ogImage, companyName),
       canonicalUrl: metadata.canonicalUrl,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return res.status(201).json(castRow(row, companyName));
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

router.patch("/admin/seo-pages/:id", requireAdmin, requireSectionPermission("seo_pages"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    const body = req.body as Record<string, any>;
    const now = new Date().toISOString();
    const companyName = await getSetting("company_name");
    const [existing] = await db.select().from(seoPagesTable).where(eq(seoPagesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });

    const metadata = generateSeoMetadata({
      kind: "page",
      id,
      title: body.title ?? existing.title,
      targetKeyword: body.targetKeyword ?? existing.targetKeyword,
      content: body.content ?? existing.content,
      excerpt: body.excerpt ?? existing.excerpt,
      category: body.category ?? existing.category,
      slug: body.slug !== undefined
        ? body.slug
        : (body.seoSlug !== undefined ? body.seoSlug : existing.slug),
      seoSlug: body.seoSlug !== undefined
        ? body.seoSlug
        : (body.slug !== undefined ? body.slug : existing.seoSlug || existing.slug),
      seoTitle: body.seoTitle !== undefined ? body.seoTitle : (body.title !== undefined ? "" : existing.seoTitle),
      seoDescription: body.seoDescription !== undefined
        ? body.seoDescription
        : ((body.title !== undefined || body.content !== undefined || body.excerpt !== undefined) ? "" : existing.seoDescription),
      seoKeywords: body.seoKeywords !== undefined ? body.seoKeywords : existing.seoKeywords,
      ogImage: body.ogImage !== undefined ? body.ogImage : existing.ogImage,
      coverImage: body.coverImage !== undefined ? body.coverImage : existing.coverImage,
    });
    const slugWasRequested = body.slug !== undefined || body.seoSlug !== undefined || !existing.slug;
    const finalSlug = slugWasRequested
      ? uniqueSlug(
          metadata.seoSlug,
          (await db.select({ slug: seoPagesTable.slug }).from(seoPagesTable)).map((row) => row.slug),
          existing.slug,
        )
      : existing.slug;
    metadata.seoSlug = finalSlug;
    metadata.canonicalUrl = `/page/${finalSlug}`;
    const update: Record<string, any> = { updatedAt: now };

    if (body.title !== undefined) update.title = replaceLegacyCompanyName(body.title, companyName);
    if (body.targetKeyword !== undefined) update.targetKeyword = replaceLegacyCompanyName(body.targetKeyword, companyName);
    if (body.content !== undefined) update.content = replaceLegacyCompanyName(body.content, companyName);
    if (body.excerpt !== undefined) update.excerpt = replaceLegacyCompanyName(body.excerpt, companyName);
    if (body.coverImage !== undefined) update.coverImage = replaceLegacyCompanyName(body.coverImage, companyName);
    if (body.category !== undefined) update.category = replaceLegacyCompanyName(body.category, companyName);
    if (body.tags !== undefined) update.tags = replaceLegacyCompanyName(Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags, companyName);
    if (body.status !== undefined) {
      update.status = body.status === "published" ? "published" : "draft";
      if (body.status === "published" && !body.publishedAt) update.publishedAt = now;
    }
    if (body.publishedAt !== undefined) update.publishedAt = body.publishedAt;
    if (body.isActive !== undefined) update.isActive = body.isActive;
    if (body.order !== undefined) update.order = Number(body.order) || 0;
    update.seoTitle = replaceLegacyCompanyName(metadata.seoTitle, companyName);
    update.seoDescription = replaceLegacyCompanyName(metadata.seoDescription, companyName);
    update.seoKeywords = replaceLegacyCompanyName(metadata.seoKeywords, companyName);
    update.seoSlug = metadata.seoSlug;
    update.slug = finalSlug;
    update.ogImage = replaceLegacyCompanyName(metadata.ogImage, companyName);
    update.canonicalUrl = metadata.canonicalUrl;

    const [row] = await db.update(seoPagesTable).set(update).where(eq(seoPagesTable.id, id)).returning();
    return res.json(castRow(row, companyName));
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

router.delete("/admin/seo-pages/:id", requireAdmin, requireSectionPermission("seo_pages"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    await db.delete(seoPagesTable).where(eq(seoPagesTable.id, id));
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

export default router;