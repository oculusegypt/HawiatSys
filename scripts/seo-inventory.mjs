import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { entityPath } from "./friendly-slug.mjs";
import { ARABIC_AREA_SLUGS } from "./seo-area-routes.mjs";

export const INDEXABILITY = Object.freeze({
  INDEXABLE: "INDEXABLE",
  NOINDEX_COMPATIBILITY: "NOINDEX_COMPATIBILITY",
  INTERACTIVE: "INTERACTIVE",
  ADMIN: "ADMIN",
  NOT_FOUND: "NOT_FOUND",
  SEPARATE_ARTIFACT: "SEPARATE_ARTIFACT",
});

export const STATIC_SEO_ROUTES = Object.freeze([
  ["/", "homepage"],
  ["/about", "about"],
  ["/pricing", "pricing"],
  ["/containers", "container-list"],
  ["/services", "service-list"],
  ["/contact", "contact"],
  ["/partners", "partners"],
  ["/areas", "area-list"],
  ["/faq", "faq"],
  ["/terms", "legal"],
  ["/privacy", "legal"],
  ["/why-us/leadership", "why-us"],
  ["/why-us/what-we-do", "why-us"],
  ["/why-us/commitment", "why-us"],
  ["/why-us/experience", "why-us"],
  ["/blog", "blog-list"],
  ["/pages", "seo-page-index"],
]);

export const SEO_MEDIA_MANIFEST = Object.freeze([
  ["home", "/images/seo/taqi-home.jpg", ["/"]],
  ["services", "/images/seo/taqi-services.jpg", ["/services", "/why-us/what-we-do"]],
  ["containers", "/images/seo/taqi-containers.jpg", ["/containers"]],
  ["pricing", "/images/seo/taqi-pricing.jpg", ["/pricing"]],
  ["areas", "/images/seo/taqi-areas.jpg", ["/areas"]],
  ["blog", "/images/seo/taqi-blog.jpg", ["/blog"]],
  ["about", "/images/seo/taqi-about.jpg", ["/about", "/why-us/experience"]],
  ["contact", "/images/seo/taqi-contact.jpg", ["/contact", "/why-us/commitment"]],
  ["faq", "/images/seo/taqi-faq.jpg", ["/faq"]],
  ["partners", "/images/seo/taqi-partners.jpg", ["/partners"]],
  ["why-us", "/images/seo/taqi-why-us.jpg", ["/why-us/leadership"]],
  ["legal", "/images/seo/taqi-legal.jpg", ["/privacy", "/terms"]],
]);

function tableExists(db, tableName) {
  return Boolean(db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
  ).get(tableName));
}

function rows(db, sql) {
  try {
    return db.prepare(sql).all();
  } catch {
    return [];
  }
}

function dynamicEntry({ path, pageType, id, title, artifact = "sabaik-almasa" }) {
  return {
    path,
    canonical: path,
    pageType,
    indexability: INDEXABILITY.INDEXABLE,
    prerenderRequired: true,
    sitemapEligible: true,
    artifact,
    ...(id == null ? {} : { id }),
    ...(title ? { title } : {}),
  };
}

export function buildSeoInventory(db) {
  const entries = STATIC_SEO_ROUTES.map(([route, pageType]) => dynamicEntry({
    path: route,
    pageType,
  }));

  for (const [slug, arabic] of Object.entries(ARABIC_AREA_SLUGS)) {
    entries.push(dynamicEntry({
      path: `/areas/${arabic}`,
      pageType: "area",
      title: slug,
    }));
  }

  const services = rows(db, `
    SELECT id, title, seo_slug AS slug
    FROM services
    WHERE is_active = 1 AND seo_enabled = 1
    ORDER BY "order" ASC, id ASC
  `);
  for (const service of services) {
    entries.push(dynamicEntry({
      path: `/services/${entityPath({ slug: service.slug, title: service.title, id: service.id, fallback: "service" })}`,
      pageType: "service",
      id: service.id,
      title: service.title,
    }));
  }

  const packageTable = tableExists(db, "packages") ? "packages" : "containers";
  const packages = rows(db, `
    SELECT id, name AS title, seo_slug AS slug
    FROM "${packageTable}"
    WHERE is_active = 1 AND seo_enabled = 1
    ORDER BY "order" ASC, id ASC
  `);
  for (const item of packages) {
    entries.push(dynamicEntry({
      path: `/containers/${entityPath({ slug: item.slug, title: item.title, id: item.id, fallback: "container" })}`,
      pageType: "package",
      id: item.id,
      title: item.title,
    }));
  }

  const posts = rows(db, `
    SELECT id, title, slug, seo_slug AS seoSlug
    FROM posts
    WHERE status = 'published' AND is_active = 1
      AND ((slug IS NOT NULL AND slug != '') OR (seo_slug IS NOT NULL AND seo_slug != ''))
    ORDER BY published_at DESC, id DESC
  `);
  for (const post of posts) {
    entries.push(dynamicEntry({
      path: `/blog/${entityPath({ slug: post.slug || post.seoSlug, title: post.title, id: post.id, fallback: "post" })}`,
      pageType: "article",
      id: post.id,
      title: post.title,
    }));
  }

  const seoPages = rows(db, `
    SELECT id, title, slug
    FROM seo_pages
    WHERE status = 'published' AND is_active = 1 AND slug IS NOT NULL AND slug != ''
    ORDER BY published_at DESC, id DESC
  `);
  for (const page of seoPages) {
    entries.push(dynamicEntry({
      path: `/page/${entityPath({ slug: page.slug, title: page.title, id: page.id, fallback: "page" })}`,
      pageType: "seo-page",
      id: page.id,
      title: page.title,
    }));
  }

  entries.push({
    path: "/taqi-group-platform/",
    canonical: "/taqi-group-platform/",
    pageType: "platform",
    indexability: INDEXABILITY.SEPARATE_ARTIFACT,
    prerenderRequired: false,
    sitemapEligible: false,
    artifact: "taqi-group-platform",
  });

  return entries;
}

export function normalizeInventoryPath(value) {
  try {
    const url = new URL(value, "https://taqigroup.com");
    let pathname = decodeURIComponent(url.pathname);
    pathname = pathname.replace(/\/+$/u, "") || "/";
    return `${pathname}${url.search}`;
  } catch {
    return String(value || "").replace(/\/+$/u, "") || "/";
  }
}

export function inventoryJson(entries, siteUrl) {
  const canonical = entries
    .filter((entry) => entry.indexability === INDEXABILITY.INDEXABLE)
    .map((entry) => `${siteUrl}${normalizeInventoryPath(entry.canonical)}`);
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    siteUrl,
    entries,
    indexableRoutes: [...new Set(canonical)].sort(),
  };
}

export function writeSeoInventory(root, db, siteUrl) {
  const entries = buildSeoInventory(db);
  const destination = join(root, "artifacts", "sabaik-almasa", "public", "seo-inventory.json");
  writeFileSync(destination, JSON.stringify(inventoryJson(entries, siteUrl), null, 2) + "\n", "utf8");
  const mediaDestination = join(root, "artifacts", "sabaik-almasa", "public", "seo-media-manifest.json");
  writeFileSync(mediaDestination, JSON.stringify({
    version: 1,
    generatedAt: new Date().toISOString(),
    siteUrl,
    assets: SEO_MEDIA_MANIFEST.map(([key, path, pages]) => ({
      key,
      path,
      purpose: "SEO campaign image",
      pages,
      required: true,
    })),
  }, null, 2) + "\n", "utf8");
  return entries;
}

export function readSeoInventory(file) {
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return parsed && Array.isArray(parsed.entries) ? parsed : null;
  } catch {
    return null;
  }
}