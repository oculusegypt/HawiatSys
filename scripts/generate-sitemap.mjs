#!/usr/bin/env node
/**
 * Generate the deployable static sitemap from the same SQLite database used by
 * the app. Keeping this in the build makes localhost URLs impossible to ship.
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { requirePublicOrigin } from "./public-origin.mjs";
import { entityPath } from "./friendly-slug.mjs";
import { ARABIC_AREA_SLUGS, assertAreaRouteParity } from "./seo-area-routes.mjs";
import { writeSeoInventory } from "./seo-inventory.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "lib", "db", "package.json"));
const dbPath = join(root, "data", "sabaik.db");
const outputPath = join(root, "artifacts", "sabaik-almasa", "public", "sitemap.xml");

if (!existsSync(dbPath)) throw new Error(`Database not found: ${dbPath}`);
const Database = require("better-sqlite3");
const db = new Database(dbPath, { readonly: true });
const settingRows = db.prepare("SELECT key, value FROM site_settings").all();
const settingMap = Object.fromEntries(settingRows.map(row => [row.key, row.value]));
const siteName = String(settingMap.company_name || "").trim() || "مؤسسة تقي جروب";
const baseUrl = requirePublicOrigin({ settings: settingMap });

const xmlEscape = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const absoluteUrl = (value) => {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `${baseUrl}${value.startsWith("/") ? "" : "/"}${value}`;
};

const tableExists = (tableName) => Boolean(
  db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName),
);

const localImageExists = (value) => {
  if (!value || /^https?:\/\//i.test(value)) return true;
  const pathValue = value.split(/[?#]/)[0];
  const normalizedPath = pathValue.replace(/^\/api\/uploads\//, "/uploads/");
  const candidates = [
    join(root, "artifacts", "sabaik-almasa", "public", normalizedPath.replace(/^\/+/, "")),
    join(root, "artifacts", "api-server", normalizedPath.replace(/^\/+/, "")),
    join(root, "artifacts", "api-server", "uploads", normalizedPath.split("/").pop() || ""),
  ];
  return candidates.some((candidate) => existsSync(candidate));
};

const normalizeImages = (images = []) => [...new Set(images
  .filter((image) => typeof image === "string" && image.trim())
  .map((image) => image.trim())
  .filter(localImageExists))].slice(0, 8);

const staticPages = [
  ["/", "1.0", "daily"],
  ["/about", "0.9", "monthly"],
  ["/pricing", "0.95", "weekly"],
  ["/containers", "0.9", "weekly"],
  ["/services", "0.95", "weekly"],
  ["/contact", "0.85", "monthly"],
  ["/partners", "0.75", "monthly"],
  ["/areas", "0.9", "weekly"],
  ["/faq", "0.85", "monthly"],
  ["/terms", "0.6", "monthly"],
  ["/privacy", "0.6", "monthly"],
  ["/why-us/leadership", "0.8", "monthly"],
  ["/why-us/what-we-do", "0.8", "monthly"],
  ["/why-us/commitment", "0.8", "monthly"],
  ["/why-us/experience", "0.8", "monthly"],
  ["/blog", "0.9", "daily"],
  ["/pages", "0.85", "weekly"],
];

const services = db.prepare(`
  SELECT id, title, seo_slug AS slug, images, image_url
  FROM services
  WHERE is_active = 1 AND seo_enabled = 1
  ORDER BY "order" ASC
`).all();

const packageRows = tableExists("packages") ? db.prepare(`
  SELECT id, name AS title, seo_slug AS slug, images, image_url
  FROM packages
  WHERE is_active = 1 AND seo_enabled = 1
  ORDER BY "order" ASC
`).all() : [];

const legacyContainerRows = tableExists("containers") ? db.prepare(`
  SELECT id, name AS title, seo_slug AS slug, images, image_url
  FROM containers
  WHERE is_active = 1 AND seo_enabled = 1
  ORDER BY "order" ASC
`).all() : [];
const containers = packageRows.length ? packageRows : legacyContainerRows;

const posts = db.prepare(`
   SELECT id, title, slug, seo_slug AS seoSlug, cover_image AS coverImage, og_image AS ogImage,
         published_at AS publishedAt, updated_at AS updatedAt
  FROM posts
   WHERE status = 'published' AND is_active = 1
     AND ((slug IS NOT NULL AND slug != '') OR (seo_slug IS NOT NULL AND seo_slug != ''))
  ORDER BY published_at DESC
`).all();

const seoPages = db.prepare(`
   SELECT id, title, slug, target_keyword AS targetKeyword,
         cover_image AS coverImage, og_image AS ogImage,
         published_at AS publishedAt, updated_at AS updatedAt
  FROM seo_pages
  WHERE status = 'published' AND is_active = 1 AND slug IS NOT NULL AND slug != ''
  ORDER BY published_at DESC, id DESC
`).all();

const today = new Date().toISOString().slice(0, 10);
const entries = [];
const seenUrls = new Set();

const addEntry = ({ path, priority, changefreq, title, lastmod = today, images = [] }) => {
  const loc = absoluteUrl(path);
  if (!loc || loc.includes("localhost") || seenUrls.has(loc)) return;
  seenUrls.add(loc);
  entries.push([
    "  <url>",
    `    <loc>${xmlEscape(loc)}</loc>`,
    `    <lastmod>${xmlEscape(String(lastmod).slice(0, 10))}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    `    <xhtml:link rel="alternate" hreflang="ar" href="${xmlEscape(loc)}"/>`,
    ...images.filter(Boolean).slice(0, 3).map((image, index) => [
      "    <image:image>",
      `      <image:loc>${xmlEscape(absoluteUrl(image))}</image:loc>`,
      `      <image:title>${xmlEscape(`${title || siteName} — صورة ${index + 1}`)}</image:title>`,
      "    </image:image>",
    ].join("\n")),
    "  </url>",
  ].join("\n"));
};

for (const [path, priority, changefreq] of staticPages) {
  const staticImages = path === "/"
    ? ["/images/hero-1.webp", "/images/logo.png", "/images/seo/taqi-home.jpg"]
    : path === "/services"
      ? ["/images/seo/taqi-services.jpg"]
      : [];
  addEntry({ path, priority, changefreq, title: siteName, images: staticImages });
}

const parseImages = (raw) => {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
};

const articleImage = (post) => {
  const text = `${post.slug || ""} ${post.title || ""}`.toLowerCase();
  const keywordMedia = [
    [["سعر", "أسعار", "تكلفة", "pricing"], "/images/seo/taqi-pricing.jpg"],
    [["مناطق", "أحياء", "تغطية", "areas"], "/images/seo/taqi-areas.jpg"],
    [["مطاعم", "مصانع", "مستودعات", "منشآت"], "/images/seo/taqi-services.jpg"],
    [["حاويات", "أنقاض", "مخلفات", "هدم", "بناء", "ترميم", "رفع", "نقل"], "/images/seo/taqi-containers.jpg"],
  ];
  return keywordMedia.find(([keywords]) => keywords.some(keyword => text.includes(keyword)))?.[1]
    || "/images/seo/taqi-blog.jpg";
};

const seoPageImage = (page) => {
  if (page.ogImage || page.coverImage) return page.ogImage || page.coverImage;
  const text = `${page.slug || ""} ${page.title || ""} ${page.targetKeyword || ""}`.toLowerCase();
  const keywordMedia = [
    [["سعر", "أسعار", "تكلفة", "pricing"], "/images/seo/taqi-pricing.jpg"],
    [["حي", "أحياء", "مناطق", "تغطية", "ضواحي", "areas"], "/images/seo/taqi-areas.jpg"],
    [["سؤال", "أسئلة", "faq"], "/images/seo/taqi-faq.jpg"],
    [["مطاعم", "مصانع", "مستودعات", "منشآت"], "/images/seo/taqi-services.jpg"],
    [["حاويات", "أنقاض", "مخلفات", "هدم", "بناء", "ترميم", "رفع", "نقل"], "/images/seo/taqi-containers.jpg"],
  ];
  return keywordMedia.find(([keywords]) => keywords.some(keyword => text.includes(keyword)))?.[1]
    || "/images/seo/taqi-blog.jpg";
};

for (const service of services) {
  addEntry({
    path: `/services/${entityPath({ slug: service.slug, title: service.title, id: service.id, fallback: "service" })}`,
    priority: "0.95",
    changefreq: "weekly",
    title: service.title,
    images: normalizeImages(parseImages(service.images).concat(service.image_url || [])),
  });
}

for (const container of containers) {
  addEntry({
    path: `/containers/${entityPath({ slug: container.slug, title: container.title, id: container.id, fallback: "container" })}`,
    priority: "0.90",
    changefreq: "weekly",
    title: container.title,
    images: normalizeImages(parseImages(container.images).concat(container.image_url || [])),
  });
}

for (const post of posts) {
  addEntry({
    path: `/blog/${entityPath({ slug: post.slug || post.seoSlug, title: post.title, id: post.id, fallback: "post" })}`,
    priority: "0.85",
    changefreq: "weekly",
    title: post.title,
    lastmod: post.updatedAt || post.publishedAt || today,
    images: normalizeImages([post.coverImage, post.ogImage, articleImage(post)].filter(Boolean)),
  });
}

for (const page of seoPages) {
  addEntry({
    path: `/page/${entityPath({ slug: page.slug, title: page.title, id: page.id, fallback: "page" })}`,
    priority: "0.88",
    changefreq: "weekly",
    title: page.title,
    lastmod: page.updatedAt || page.publishedAt || today,
    images: normalizeImages([page.ogImage, page.coverImage, seoPageImage(page)].filter(Boolean)),
  });
}

// صفحات كافة أحياء ومناطق الرياض (Local SEO Network)
const ALL_NEIGHBORHOODS = [
  // مناطق رئيسية
  { slug: "north-riyadh", arabic: "شمال-الرياض", name: "شمال الرياض" },
  { slug: "south-riyadh", arabic: "جنوب-الرياض", name: "جنوب الرياض" },
  { slug: "east-riyadh",  arabic: "شرق-الرياض", name: "شرق الرياض" },
  { slug: "west-riyadh",  arabic: "غرب-الرياض", name: "غرب الرياض" },
  { slug: "central-riyadh", arabic: "وسط-الرياض", name: "وسط الرياض" },
  // شمال الرياض
  { slug: "al-malqa",     arabic: "حي-الملقا", name: "حي الملقا" },
  { slug: "al-yasmin",    arabic: "حي-الياسمين", name: "حي الياسمين" },
  { slug: "al-narjis",    arabic: "حي-النرجس", name: "حي النرجس" },
  { slug: "al-aarid",     arabic: "حي-العارض", name: "حي العارض" },
  { slug: "hittin",       arabic: "حي-حطين", name: "حي حطين" },
  { slug: "al-sahafa",    arabic: "حي-الصحافة", name: "حي الصحافة" },
  { slug: "al-nafal",     arabic: "حي-النفل", name: "حي النفل" },
  { slug: "al-aqiq",      arabic: "حي-العقيق", name: "حي العقيق" },
  { slug: "al-rabi",      arabic: "حي-الربيع", name: "حي الربيع" },
  { slug: "al-ghadeer",   arabic: "حي-الغدير", name: "حي الغدير" },
  { slug: "al-wadi",      arabic: "حي-الوادي", name: "حي الوادي" },
  { slug: "al-nada",      arabic: "حي-الندى", name: "حي الندى" },
  { slug: "al-falah",     arabic: "حي-الفلاح", name: "حي الفلاح" },
  // شرق الرياض
  { slug: "al-qurtubah",  arabic: "حي-قرطبة", name: "حي قرطبة" },
  { slug: "al-munsiyah",  arabic: "حي-المونسية", name: "حي المونسية" },
  { slug: "al-yarmouk",   arabic: "حي-اليرموك", name: "حي اليرموك" },
  { slug: "al-qadesiya",  arabic: "حي-القادسية", name: "حي القادسية" },
  { slug: "al-rawdah",    arabic: "حي-الروضة", name: "حي الروضة" },
  { slug: "al-naseem",    arabic: "حي-النسيم", name: "حي النسيم" },
  { slug: "al-khaleej",   arabic: "حي-الخليج", name: "حي الخليج" },
  { slug: "al-nahdah",    arabic: "حي-النهضة", name: "حي النهضة" },
  { slug: "al-manar",     arabic: "حي-المنار", name: "حي المنار" },
  { slug: "al-hamra",     arabic: "حي-الحمراء", name: "حي الحمراء" },
  { slug: "al-shuhada",   arabic: "حي-الشهداء", name: "حي الشهداء" },
  // غرب الرياض
  { slug: "dhahrat-laban", arabic: "حي-ظهرة-لبن", name: "حي ظهرة لبن" },
  { slug: "al-suwaidi",   arabic: "حي-السويدي", name: "حي السويدي" },
  { slug: "al-uraija",    arabic: "حي-العريجاء", name: "حي العريجاء" },
  { slug: "al-hazm",      arabic: "حي-الحزم", name: "حي الحزم" },
  { slug: "al-badiyah",   arabic: "حي-البديعة", name: "حي البديعة" },
  { slug: "shubra",       arabic: "حي-شبرا", name: "حي شبرا" },
  { slug: "al-awali",     arabic: "حي-العوالي", name: "حي العوالي" },
  // جنوب الرياض
  { slug: "badr",         arabic: "حي-بدر", name: "حي بدر" },
  { slug: "al-shifa",     arabic: "حي-الشفا", name: "حي الشفاء" },
  { slug: "al-aziziyah",  arabic: "حي-العزيزية", name: "حي العزيزية" },
  { slug: "al-dar-al-baida", arabic: "حي-الدار-البيضاء", name: "حي الدار البيضاء" },
  { slug: "al-hair",      arabic: "حي-الحائر", name: "حي الحائر" },
  { slug: "al-manakh",    arabic: "حي-المناخ", name: "حي المناخ" },
  { slug: "al-iskan",     arabic: "حي-الإسكان", name: "حي الإسكان" },
  // وسط الرياض
  { slug: "al-olaya",     arabic: "حي-العليا", name: "حي العليا" },
  { slug: "al-sulaimaniya", arabic: "حي-السليمانية", name: "حي السليمانية" },
  { slug: "al-malaz",     arabic: "حي-الملز", name: "حي الملز" },
  { slug: "al-murabba",   arabic: "حي-المربع", name: "حي المربع" },
  { slug: "al-batha",     arabic: "حي-البطحاء", name: "حي البطحاء" },
  { slug: "al-wizarat",   arabic: "حي-الوزارات", name: "حي الوزارات" },
  { slug: "al-futah",     arabic: "حي-الفوطة", name: "حي الفوطة" },
];

for (const area of ALL_NEIGHBORHOODS) {
  if (!ARABIC_AREA_SLUGS[area.slug]) {
    throw new Error(`Missing canonical Arabic slug for area: ${area.slug}`);
  }
  const title = `تأجير حاويات ونقل مخلفات في ${area.name}`;
  addEntry({
    path: `/areas/${ARABIC_AREA_SLUGS[area.slug]}`,
    priority: "0.85",
    changefreq: "weekly",
    title,
    images: ["/images/hero-1.webp"],
  });
}
assertAreaRouteParity("generate-sitemap.mjs", ALL_NEIGHBORHOODS.map((area) => area.slug));

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  '        xmlns:xhtml="http://www.w3.org/1999/xhtml"',
  '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  "",
  entries.join("\n\n"),
  "",
  "</urlset>",
  "",
].join("\n");

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, xml, "utf8");
writeSeoInventory(root, db, baseUrl);
writeFileSync(
  join(root, "artifacts", "sabaik-almasa", "public", "robots.txt"),
  [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /api/",
    "",
    "# Tell search engines where the site's canonical URL inventory lives.",
    `Sitemap: ${baseUrl}/sitemap.xml`,
    "",
    "# AI Search Engine Crawlers - Allowed",
    "User-agent: GPTBot",
    "Allow: /",
    "",
    "User-agent: ChatGPT-User",
    "Allow: /",
    "",
    "User-agent: OAI-SearchBot",
    "Allow: /",
    "",
    "User-agent: Google-Extended",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    "User-agent: ClaudeBot",
    "Allow: /",
    "",
    "User-agent: anthropic-ai",
    "Allow: /",
    "",
    "User-agent: Bytespider",
    "Disallow: /",
    "",
  ].join("\n"),
  "utf8",
);
db.close();
console.log(`Generated ${entries.length} sitemap URLs at ${outputPath}`);