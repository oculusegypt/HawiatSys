import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable } from "@workspace/db";
import { eq, asc, desc, and, like } from "drizzle-orm";
import { getSetting } from "./settings";
import { replaceLegacyCompanyName } from "../lib/companyName";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";
import { entitySlug } from "../lib/friendlySlug";

const router = Router();

// ── DB migration: create posts table if it doesn't exist ─────────────────────
try {
  const client = (db as any).$client;
  client.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL DEFAULT '',
      excerpt TEXT NOT NULL DEFAULT '',
      cover_image TEXT DEFAULT '',
      author TEXT NOT NULL DEFAULT 'الشركة',
      category TEXT DEFAULT 'عام',
      tags TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TEXT,
      read_time INTEGER DEFAULT 3,
      view_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      "order" INTEGER NOT NULL DEFAULT 0,
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      seo_keywords TEXT NOT NULL DEFAULT '',
      seo_slug TEXT NOT NULL DEFAULT '',
      og_image TEXT NOT NULL DEFAULT '',
      canonical_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
} catch {}

function castRow(row: any, companyName: string) {
  const text = (value: unknown) => replaceLegacyCompanyName(value, companyName);

  return {
    id:             row.id,
    title:          text(row.title),
    slug:           row.slug,
    content:        text(row.content ?? ""),
    excerpt:        text(row.excerpt ?? ""),
    coverImage:     text(row.coverImage ?? row.cover_image ?? ""),
    author:         text(row.author ?? "الشركة"),
    category:       text(row.category ?? "عام"),
    tags:           text(row.tags ?? "[]"),
    status:         row.status ?? "draft",
    publishedAt:    row.publishedAt ?? row.published_at ?? null,
    readTime:       row.readTime ?? row.read_time ?? 3,
    viewCount:      row.viewCount ?? row.view_count ?? 0,
    isActive:       Boolean(row.isActive ?? row.is_active ?? true),
    order:          row.order ?? 0,
    seoTitle:       text(row.seoTitle ?? row.seo_title ?? ""),
    seoDescription: text(row.seoDescription ?? row.seo_description ?? ""),
    seoKeywords:    text(row.seoKeywords ?? row.seo_keywords ?? ""),
    seoSlug:        row.seoSlug ?? row.seo_slug ?? "",
    ogImage:        text(row.ogImage ?? row.og_image ?? ""),
    canonicalUrl:   text(row.canonicalUrl ?? row.canonical_url ?? ""),
    createdAt:      row.createdAt ?? row.created_at,
    updatedAt:      row.updatedAt ?? row.updated_at,
  };
}

function generateSlug(title: string): string {
  // Arabic-first slug: keep Arabic chars, numbers, hyphens — no transliteration
  const base = title
    .replace(/[\s_]+/g, "-")
    .replace(/[^\u0600-\u06FF0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-|-$/g, "");
  return base || `مقالة-${Date.now()}`;
}

function normalizeArabicSlug(value: unknown, fallbackTitle = "مقالة"): string {
  const normalized = generateSlug(typeof value === "string" ? value : "");
  return normalized || generateSlug(fallbackTitle);
}

// ── Public routes ─────────────────────────────────────────────────────────────

// GET /posts/categories — list unique categories (must come BEFORE /posts/:slug)
router.get("/posts/categories", async (_req, res) => {
  try {
    const rows = await db
      .select({ category: postsTable.category })
      .from(postsTable)
      .where(and(eq(postsTable.status, "published"), eq(postsTable.isActive, true)));
    const cats = [...new Set(rows.map(r => r.category).filter(Boolean))];
    return res.json(cats);
  } catch {
    return res.json([]);
  }
});

// GET /posts?category=&tag=&page=&limit=
router.get("/posts", async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
    const offset = (page - 1) * limit;

    const rows = await db
      .select()
      .from(postsTable)
      .where(and(eq(postsTable.status, "published"), eq(postsTable.isActive, true)))
      .orderBy(desc(postsTable.publishedAt))
      .limit(limit)
      .offset(offset);

    const all = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(and(eq(postsTable.status, "published"), eq(postsTable.isActive, true)));

    const category = req.query.category as string | undefined;
    const tag      = req.query.tag      as string | undefined;

    const companyName = await getSetting("company_name");
    let filtered = rows.map(row => castRow(row, companyName));
    if (category) filtered = filtered.filter(p => p.category === category);
    if (tag)      filtered = filtered.filter(p => {
      try { return (JSON.parse(p.tags) as string[]).includes(tag); } catch { return false; }
    });

    return res.json({ posts: filtered, total: all.length, page, limit });
  } catch (e) {
    return res.json({ posts: [], total: 0, page: 1, limit: 12 });
  }
});

// GET /posts/:slug — public single post (increments view count)
router.get("/posts/:slug", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(postsTable)
      .where(and(eq(postsTable.status, "published"), eq(postsTable.isActive, true)));
    const requestedSlug = decodeURIComponent(req.params.slug).trim().toLowerCase();
    const row = rows.find(candidate =>
      candidate.slug.toLowerCase() === requestedSlug
      || entitySlug({ slug: candidate.slug, title: candidate.title, id: candidate.id, fallback: "post" }) === requestedSlug
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    // increment view count
    try {
      const client = (db as any).$client;
      client.prepare("UPDATE posts SET view_count = view_count + 1 WHERE id = ?").run(row.id);
    } catch {}
    return res.json(castRow(row, await getSetting("company_name")));
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// GET /posts/categories — list unique categories
router.get("/posts/categories", async (_req, res) => {
  try {
    const rows = await db
      .select({ category: postsTable.category })
      .from(postsTable)
      .where(and(eq(postsTable.status, "published"), eq(postsTable.isActive, true)));
    const cats = [...new Set(rows.map(r => r.category).filter(Boolean))];
    return res.json(cats);
  } catch {
    return res.json([]);
  }
});

// ── Admin routes ──────────────────────────────────────────────────────────────

// GET /admin/posts
router.get("/admin/posts", requireAdmin, requireSectionPermission("blog"), async (_req, res) => {
  try {
    const rows = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt));
    const companyName = await getSetting("company_name");
    return res.json(rows.map(row => castRow(row, companyName)));
  } catch (e) {
    return res.json([]);
  }
});

// POST /admin/posts
router.post("/admin/posts", requireAdmin, requireSectionPermission("blog"), async (req, res) => {
  try {
    const {
      title, content, excerpt, coverImage, author, category, tags, status,
      publishedAt, readTime, isActive, order,
      seoTitle, seoDescription, seoKeywords, seoSlug, ogImage, canonicalUrl,
    } = req.body;

    const now  = new Date().toISOString();
    const slug = normalizeArabicSlug(seoSlug || title, title || "مقالة");
    const companyName = await getSetting("company_name");

    const [row] = await db.insert(postsTable).values({
      title:          replaceLegacyCompanyName(title || "مقالة جديدة", companyName),
      slug,
      content:        replaceLegacyCompanyName(content ?? "", companyName),
      excerpt:        replaceLegacyCompanyName(excerpt ?? "", companyName),
      coverImage:     replaceLegacyCompanyName(coverImage ?? "", companyName),
      author:         replaceLegacyCompanyName(author || companyName || "الشركة", companyName),
      category:       replaceLegacyCompanyName(category || "عام", companyName),
      tags:           replaceLegacyCompanyName(Array.isArray(tags) ? JSON.stringify(tags) : (tags ?? "[]"), companyName),
      status:         status         || "draft",
      publishedAt:    status === "published" ? (publishedAt || now) : publishedAt ?? null,
      readTime:       readTime       ?? 3,
      isActive:       isActive       ?? true,
      order:          order          ?? 0,
      seoTitle:       replaceLegacyCompanyName(seoTitle ?? "", companyName),
      seoDescription: replaceLegacyCompanyName(seoDescription ?? "", companyName),
      seoKeywords:    replaceLegacyCompanyName(seoKeywords ?? "", companyName),
      seoSlug:        slug,
      ogImage:        replaceLegacyCompanyName(ogImage ?? "", companyName),
      canonicalUrl:   replaceLegacyCompanyName(canonicalUrl ?? "", companyName),
      createdAt:      now,
      updatedAt:      now,
    }).returning();
    return res.status(201).json(castRow(row, companyName));
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// PATCH /admin/posts/:id
router.patch("/admin/posts/:id", requireAdmin, requireSectionPermission("blog"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const {
      title, content, excerpt, coverImage, author, category, tags, status,
      publishedAt, readTime, isActive, order,
      seoTitle, seoDescription, seoKeywords, seoSlug, ogImage, canonicalUrl,
    } = req.body;

    const now = new Date().toISOString();
    const companyName = await getSetting("company_name");
    const update: Record<string, any> = { updatedAt: now };

    if (title          !== undefined) update.title          = replaceLegacyCompanyName(title, companyName);
    if (content        !== undefined) update.content        = replaceLegacyCompanyName(content, companyName);
    if (excerpt        !== undefined) update.excerpt        = replaceLegacyCompanyName(excerpt, companyName);
    if (coverImage     !== undefined) update.coverImage     = replaceLegacyCompanyName(coverImage, companyName);
    if (author         !== undefined) update.author         = replaceLegacyCompanyName(author, companyName);
    if (category       !== undefined) update.category       = replaceLegacyCompanyName(category, companyName);
    if (tags           !== undefined) update.tags           = replaceLegacyCompanyName(Array.isArray(tags) ? JSON.stringify(tags) : tags, companyName);
    if (status         !== undefined) {
      update.status = status;
      if (status === "published" && !publishedAt) update.publishedAt = now;
    }
    if (publishedAt    !== undefined) update.publishedAt    = publishedAt;
    if (readTime       !== undefined) update.readTime       = readTime;
    if (isActive       !== undefined) update.isActive       = isActive;
    if (order          !== undefined) update.order          = order;
    if (seoTitle       !== undefined) update.seoTitle       = replaceLegacyCompanyName(seoTitle, companyName);
    if (seoDescription !== undefined) update.seoDescription = replaceLegacyCompanyName(seoDescription, companyName);
    if (seoKeywords    !== undefined) update.seoKeywords    = replaceLegacyCompanyName(seoKeywords, companyName);
    if (seoSlug        !== undefined) {
      const normalizedSlug = normalizeArabicSlug(seoSlug, title || "مقالة");
      update.seoSlug = normalizedSlug;
      update.slug = normalizedSlug;
    }
    if (ogImage        !== undefined) update.ogImage        = replaceLegacyCompanyName(ogImage, companyName);
    if (canonicalUrl   !== undefined) update.canonicalUrl   = replaceLegacyCompanyName(canonicalUrl, companyName);

    const [row] = await db.update(postsTable).set(update).where(eq(postsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(castRow(row, companyName));
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// DELETE /admin/posts/:id
router.delete("/admin/posts/:id", requireAdmin, requireSectionPermission("blog"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(postsTable).where(eq(postsTable.id, id));
    return res.status(204).send();
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

export default router;
