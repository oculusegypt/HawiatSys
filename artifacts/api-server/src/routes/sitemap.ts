import { Router, Request, Response } from "express";
import { db, servicesTable, containersTable, postsTable, seoPagesTable } from "@workspace/db";
import { asc, and, eq, desc } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { getSetting } from "./settings";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";
import { entityPath } from "../lib/friendlySlug";

const router = Router();

// Resolve the frontend public folder from either the workspace root or the
// api-server package directory. The managed workflow may use either cwd.
function getSitemapPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "artifacts/sabaik-almasa/public/sitemap.xml"),
    path.resolve(process.cwd(), "../sabaik-almasa/public/sitemap.xml"),
    path.resolve(process.cwd(), "../../artifacts/sabaik-almasa/public/sitemap.xml"),
  ];
  return candidates.find((candidate) => fs.existsSync(path.dirname(candidate))) ?? candidates[0];
}

/** Use the configured public origin so preview and production generate the same URLs. */
async function getBaseUrl(req: Request): Promise<string> {
  const configuredOrigin = process.env.SITE_URL || await getSetting("site_public_url");
  if (configuredOrigin?.trim()) {
    try {
      const parsed = new URL(configuredOrigin.trim());
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.origin;
      }
    } catch {
      // Fall through to the request origin when the setting is malformed.
    }
  }

  // Fallback for installations that have not configured a public origin.
  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim() || req.protocol || "https";
  const host  = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim()  || req.headers.host || "";
  return host ? `${proto}://${host}` : "";
}

const NEIGHBORHOODS = [
  { slug: "north-riyadh", name: "شمال الرياض" },
  { slug: "al-malqa", name: "حي الملقا" },
  { slug: "al-yasmin", name: "حي الياسمين" },
  { slug: "al-narjis", name: "حي النرجس" },
  { slug: "al-aarid", name: "حي العارض" },
  { slug: "hittin", name: "حي حطين" },
  { slug: "al-sahafa", name: "حي الصحافة" },
  { slug: "al-nafal", name: "حي النفل" },
  { slug: "al-aqiq", name: "حي العقيق" },
  { slug: "al-rabi", name: "حي الربيع" },
  { slug: "al-ghadeer", name: "حي الغدير" },
  { slug: "al-wadi", name: "حي الوادي" },
  { slug: "al-nada", name: "حي الندى" },
  { slug: "al-falah", name: "حي الفلاح" },
  { slug: "south-riyadh", name: "جنوب الرياض" },
  { slug: "badr", name: "حي بدر" },
  { slug: "al-hair", name: "حي الحائر" },
  { slug: "al-shifa", name: "حي الشفاء" },
  { slug: "al-aziziyah", name: "حي العزيزية" },
  { slug: "al-dar-al-baida", name: "حي الدار البيضاء" },
  { slug: "al-manakh", name: "حي المناخ" },
  { slug: "al-iskan", name: "حي الإسكان" },
  { slug: "east-riyadh", name: "شرق الرياض" },
  { slug: "al-qadesiya", name: "حي القادسية" },
  { slug: "al-naseem", name: "حي النسيم" },
  { slug: "al-rawdah", name: "حي الروضة" },
  { slug: "al-khaleej", name: "حي الخليج" },
  { slug: "al-nahdah", name: "حي النهضة" },
  { slug: "al-manar", name: "حي المنار" },
  { slug: "al-yarmouk", name: "حي اليرموك" },
  { slug: "al-munsiyah", name: "حي المونسية" },
  { slug: "al-hamra", name: "حي الحمراء" },
  { slug: "al-qurtubah", name: "حي قرطبة" },
  { slug: "al-shuhada", name: "حي الشهداء" },
  { slug: "west-riyadh", name: "غرب الرياض" },
  { slug: "al-suwaidi", name: "حي السويدي" },
  { slug: "al-uraija", name: "حي العريجاء" },
  { slug: "dhahrat-laban", name: "حي ظهرة لبن" },
  { slug: "al-hazm", name: "حي الحزم" },
  { slug: "al-badiyah", name: "حي البديعة" },
  { slug: "shubra", name: "حي شبرا" },
  { slug: "al-awali", name: "حي عوالي الرياض" },
  { slug: "central-riyadh", name: "وسط الرياض" },
  { slug: "al-olaya", name: "حي العليا" },
  { slug: "al-sulaimaniya", name: "حي السليمانية" },
  { slug: "al-malaz", name: "حي الملز" },
  { slug: "al-murabba", name: "حي المربع" },
  { slug: "al-batha", name: "حي البطحاء" },
  { slug: "al-wizarat", name: "حي الوزارات" },
  { slug: "al-futah", name: "حي الفوطة" },
];

function getArabicAreaSlug(name: string): string {
  if (name === "حي عوالي الرياض") return "حي-العوالي";
  return name
    .replace("حي الشفاء", "حي الشفا")
    .trim()
    .replace(/\s+/g, "-");
}

function getStaticPages(base: string, siteName: string) {
  return [
    { path: "/",                               priority: "1.0",  freq: "daily",   images: [
      { loc: `${base}/images/hero-1.webp`, title: `${siteName} — خدمات الرياض` },
      { loc: `${base}/images/logo.png`,    title: `شعار ${siteName}` },
    ]},
    { path: "/about",                          priority: "0.9",  freq: "monthly", images: [
      { loc: `${base}/images/shareek-mawsouq.webp`, title: `رسالة المدير التنفيذي — ${siteName}` },
    ]},
    { path: "/pricing",                        priority: "0.95", freq: "weekly",  images: [] },
    { path: "/containers",                     priority: "0.9",  freq: "weekly",  images: [
      { loc: `${base}/images/seo/taqi-containers.jpg`, title: "حاويات الأنقاض والنفايات بالرياض" },
    ]},
    { path: "/services",                       priority: "0.95", freq: "weekly",  images: [
      { loc: `${base}/images/seo/taqi-services.jpg`, title: "خدمات الرياض" },
    ]},
    { path: "/contact",                        priority: "0.85", freq: "monthly", images: [] },
    { path: "/partners",                       priority: "0.75", freq: "monthly", images: [] },
    { path: "/areas",                          priority: "0.9",  freq: "weekly",  images: [] },
    { path: "/faq",                            priority: "0.85", freq: "monthly", images: [] },
    { path: "/terms",                          priority: "0.6",  freq: "monthly", images: [] },
    { path: "/privacy",                        priority: "0.6",  freq: "monthly", images: [] },
    { path: "/why-us/leadership",              priority: "0.8",  freq: "monthly", images: [] },
    { path: "/why-us/what-we-do",              priority: "0.8",  freq: "monthly", images: [] },
    { path: "/why-us/commitment",              priority: "0.8",  freq: "monthly", images: [] },
    { path: "/why-us/experience",              priority: "0.8",  freq: "monthly", images: [] },
    { path: "/blog",                           priority: "0.9",  freq: "daily",   images: [] },
  ];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function buildXml(baseUrl: string): Promise<{ xml: string; totalUrls: number; staticPages: number; areaPages: number; servicePages: number; containerPages: number; blogPages: number; seoPages: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const siteName = (await getSetting("company_name")).trim() || "الشركة";
  const STATIC_PAGES = getStaticPages(baseUrl, siteName);

  // Fetch SEO-enabled services
  let seoServices: Array<{ id: number; seoSlug: string; seoTitle: string; images: string; title: string }> = [];
  try {
    const rows = await db.select().from(servicesTable).orderBy(asc(servicesTable.order));
    seoServices = (rows as any[])
      .filter(r => Boolean(r.seo_enabled ?? r.seoEnabled) && Boolean(r.is_active ?? r.isActive ?? true))
      .map(r => ({
        id:        r.id,
        seoSlug:  r.seo_slug  || r.seoSlug  || "",
        seoTitle: r.seo_title || r.seoTitle  || r.title || "",
        images:   r.images ?? "[]",
        title:    r.title || "",
      }))
      ;
  } catch {}

  // Fetch published blog posts
  let blogPosts: Array<{ id: number; slug: string; title: string; coverImage: string; ogImage: string; publishedAt: string | null; updatedAt: string }> = [];
  try {
    const rows = await db
      .select()
      .from(postsTable)
      .where(and(eq(postsTable.status, "published"), eq(postsTable.isActive, true)))
      .orderBy(desc(postsTable.publishedAt));
    blogPosts = (rows as any[]).map(r => ({
      id:          r.id,
      slug:        r.slug || r.seo_slug || "",
      title:       r.title || "",
      coverImage:  r.cover_image || r.coverImage || "",
      ogImage:     r.og_image || r.ogImage || "",
      publishedAt: r.published_at || r.publishedAt || null,
      updatedAt:   r.updated_at  || r.updatedAt  || today,
    })).filter(r => r.slug);
  } catch {}

  let seoPages: Array<{ id: number; slug: string; title: string; coverImage: string; publishedAt: string | null; updatedAt: string }> = [];
  try {
    const rows = await db
      .select()
      .from(seoPagesTable)
      .where(and(eq(seoPagesTable.status, "published"), eq(seoPagesTable.isActive, true)))
      .orderBy(desc(seoPagesTable.publishedAt));
    seoPages = (rows as any[])
      .map(r => ({
        id:          r.id,
        slug:        r.slug || r.seo_slug || "",
        title:       r.title || "",
        coverImage:  r.cover_image || r.coverImage || "",
        publishedAt: r.published_at || r.publishedAt || null,
        updatedAt:   r.updated_at || r.updatedAt || today,
      }))
      .filter(r => r.slug);
  } catch {}

  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml"`,
    `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ``,
  ];
  const seenUrls = new Set<string>();
  const addUrl = (url: string): boolean => {
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  };

  // Static pages
  for (const page of STATIC_PAGES) {
    if (!addUrl(baseUrl + page.path)) continue;
    lines.push(`  <url>`);
    lines.push(`    <loc>${escapeXml(baseUrl + page.path)}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push(`    <changefreq>${page.freq}</changefreq>`);
    lines.push(`    <priority>${page.priority}</priority>`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(baseUrl + page.path)}"/>`);
    for (const img of page.images) {
      lines.push(`    <image:image>`);
      lines.push(`      <image:loc>${escapeXml(img.loc)}</image:loc>`);
      lines.push(`      <image:title>${escapeXml(img.title)}</image:title>`);
      lines.push(`    </image:image>`);
    }
    lines.push(`  </url>`);
    lines.push(``);
  }

  // Neighborhood area pages (50 Riyadh areas)
  for (const n of NEIGHBORHOODS) {
    const url = `${baseUrl}/areas/${encodeURIComponent(getArabicAreaSlug(n.name))}`;
    if (!addUrl(url)) continue;
    lines.push(`  <!-- حي: ${n.name} -->`);
    lines.push(`  <url>`);
    lines.push(`    <loc>${escapeXml(url)}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push(`    <changefreq>monthly</changefreq>`);
    lines.push(`    <priority>0.80</priority>`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(url)}"/>`);
    lines.push(`    <image:image>`);
    lines.push(`      <image:loc>${escapeXml(baseUrl + "/images/hero-1.webp")}</image:loc>`);
    lines.push(`      <image:title>${escapeXml(`تأجير حاويات ${n.name} الرياض`)}</image:title>`);
    lines.push(`    </image:image>`);
    lines.push(`  </url>`);
    lines.push(``);
  }

  // Dynamic container pages
  let seoContainers: Array<{ id: number; seoSlug: string; seoTitle: string; images: string; title: string }> = [];
  try {
    const crows = await db.select().from(containersTable).orderBy(asc(containersTable.order));
    seoContainers = (crows as any[])
      .filter(r => Boolean(r.seo_enabled ?? r.seoEnabled) && Boolean(r.is_active ?? r.isActive ?? true))
      .map(r => ({
        id:        r.id,
        seoSlug:  r.seo_slug  || r.seoSlug  || "",
        seoTitle: r.seo_title || r.seoTitle  || r.title || "",
        images:   r.images ?? "[]",
        title:    r.title || "",
      }))
      ;
  } catch {}

  // Dynamic service pages
  for (const svc of seoServices) {
    const url = `${baseUrl}/services/${entityPath({ slug: svc.seoSlug, title: svc.title, id: svc.id, fallback: "service" })}`;
    if (!addUrl(url)) continue;
    let imgs: Array<{ loc: string; title: string }> = [];
    try {
      const parsed: string[] = JSON.parse(svc.images || "[]");
      imgs = parsed
        .filter(u => u.trim())
        .slice(0, 3)
        .map((u, i) => ({
          loc:   u.startsWith("http") ? u : baseUrl + u,
          title: `${svc.seoTitle} — صورة ${i + 1}`,
        }));
    } catch {}

    lines.push(`  <!-- خدمة: ${svc.title} -->`);
    lines.push(`  <url>`);
    lines.push(`    <loc>${escapeXml(url)}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push(`    <changefreq>monthly</changefreq>`);
    lines.push(`    <priority>0.85</priority>`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(url)}"/>`);
    for (const img of imgs) {
      lines.push(`    <image:image>`);
      lines.push(`      <image:loc>${escapeXml(img.loc)}</image:loc>`);
      lines.push(`      <image:title>${escapeXml(img.title)}</image:title>`);
      lines.push(`    </image:image>`);
    }
    lines.push(`  </url>`);
    lines.push(``);
  }

  // Dynamic container pages
  for (const c of seoContainers) {
    const url = `${baseUrl}/containers/${entityPath({ slug: c.seoSlug, title: c.title, id: (c as any).id, fallback: "container" })}`;
    if (!addUrl(url)) continue;
    let imgs: Array<{ loc: string; title: string }> = [];
    try {
      const parsed: string[] = JSON.parse(c.images || "[]");
      imgs = parsed
        .filter(u => u.trim())
        .slice(0, 3)
        .map((u, i) => ({
          loc:   u.startsWith("http") ? u : baseUrl + u,
          title: `${c.seoTitle} — صورة ${i + 1}`,
        }));
    } catch {}

    lines.push(`  <!-- باقة: ${c.title} -->`);
    lines.push(`  <url>`);
    lines.push(`    <loc>${escapeXml(url)}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push(`    <changefreq>monthly</changefreq>`);
    lines.push(`    <priority>0.85</priority>`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(url)}"/>`);
    for (const img of imgs) {
      lines.push(`    <image:image>`);
      lines.push(`      <image:loc>${escapeXml(img.loc)}</image:loc>`);
      lines.push(`      <image:title>${escapeXml(img.title)}</image:title>`);
      lines.push(`    </image:image>`);
    }
    lines.push(`  </url>`);
    lines.push(``);
  }

  // Blog listing page
  const blogListingUrl = `${baseUrl}/blog`;
  if (addUrl(blogListingUrl)) {
    lines.push(`  <url>`);
    lines.push(`    <loc>${escapeXml(blogListingUrl)}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push(`    <changefreq>daily</changefreq>`);
    lines.push(`    <priority>0.9</priority>`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(blogListingUrl)}"/>`);
    lines.push(`  </url>`);
    lines.push(``);
  }

  // Individual blog posts
  for (const post of blogPosts) {
    const url     = `${baseUrl}/blog/${entityPath({ slug: post.slug, title: post.title, id: post.id, fallback: "post" })}`;
    const lastmod = (post.publishedAt || post.updatedAt || today).slice(0, 10);
    if (!addUrl(url)) continue;
    lines.push(`  <!-- مقالة: ${post.title} -->`);
    lines.push(`  <url>`);
    lines.push(`    <loc>${escapeXml(url)}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push(`    <changefreq>monthly</changefreq>`);
    lines.push(`    <priority>0.75</priority>`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(url)}"/>`);
    const articleImage = post.coverImage || post.ogImage || "/images/seo/taqi-blog.jpg";
    if (articleImage) {
      const imgLoc = articleImage.startsWith("http") ? articleImage : `${baseUrl}${articleImage}`;
      lines.push(`    <image:image>`);
      lines.push(`      <image:loc>${escapeXml(imgLoc)}</image:loc>`);
      lines.push(`      <image:title>${escapeXml(post.title)}</image:title>`);
      lines.push(`    </image:image>`);
    }
    lines.push(`  </url>`);
    lines.push(``);
  }

  // Standalone SEO landing pages
  for (const page of seoPages) {
    const url = `${baseUrl}/page/${entityPath({ slug: page.slug, title: page.title, id: page.id, fallback: "page" })}`;
    const lastmod = (page.publishedAt || page.updatedAt || today).slice(0, 10);
    if (!addUrl(url)) continue;
    lines.push(`  <!-- صفحة SEO: ${page.title} -->`);
    lines.push(`  <url>`);
    lines.push(`    <loc>${escapeXml(url)}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push(`    <changefreq>monthly</changefreq>`);
    lines.push(`    <priority>0.82</priority>`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(url)}"/>`);
    if (page.coverImage) {
      const imgLoc = page.coverImage.startsWith("http") ? page.coverImage : `${baseUrl}${page.coverImage}`;
      lines.push(`    <image:image>`);
      lines.push(`      <image:loc>${escapeXml(imgLoc)}</image:loc>`);
      lines.push(`      <image:title>${escapeXml(page.title)}</image:title>`);
      lines.push(`    </image:image>`);
    }
    lines.push(`  </url>`);
    lines.push(``);
  }

  lines.push(`</urlset>`);

  const staticCount = STATIC_PAGES.length;
  const areaCount   = NEIGHBORHOODS.length;
  return {
    xml: lines.join("\n"),
    totalUrls:      seenUrls.size,
    staticPages:    staticCount,
    areaPages:      areaCount,
    servicePages:   seoServices.length,
    containerPages: seoContainers.length,
    // /blog is already included in staticPages; count detail pages only here.
    blogPages:      blogPosts.length,
    seoPages:      seoPages.length,
  };
}

// ── POST /api/admin/sitemap/save ──────────────────────────────────────────────
// Generate sitemap and write it directly to the frontend public folder
router.post(
  "/admin/sitemap/save",
  requireAdmin,
  requireSectionPermission("seo"),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const baseUrl = await getBaseUrl(req);
    const { xml, totalUrls, staticPages, areaPages, servicePages, containerPages, blogPages, seoPages } = await buildXml(baseUrl);
    const dest = getSitemapPath();
    fs.writeFileSync(dest, xml, "utf-8");
    res.json({
      ok: true,
      summary: {
        totalUrls,
        staticPages,
        areaPages,
        servicePages,
        containerPages,
        blogPages,
        seoPages,
        generatedAt: new Date().toISOString().slice(0, 10),
        savedTo: "/sitemap.xml",
      },
    });
  } catch (err: any) {
    req.log?.error({ err }, "Failed to save sitemap");
    res.status(500).json({ error: err?.message || "فشل حفظ الخريطة" });
  }
  },
);

// ── GET /api/sitemap/generate ─────────────────────────────────────────────────
// Preview only — returns the XML string (used by the panel preview section)
router.get("/sitemap/generate", async (req: Request, res: Response): Promise<void> => {
  try {
    const baseUrl = await getBaseUrl(req);
    const data = await buildXml(baseUrl);
    res.json({ ...data, generatedAt: new Date().toISOString().slice(0, 10) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل توليد الخريطة" });
  }
});

export default router;
