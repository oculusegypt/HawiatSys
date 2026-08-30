#!/usr/bin/env node
/**
 * Release gate for the static SEO output and the final Hostinger archive.
 * The public origin is read from site_settings, never baked into the gate.
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { resolvePublicOrigin } from "./public-origin.mjs";
import {
  INDEXABILITY,
  normalizeInventoryPath,
  readSeoInventory,
} from "./seo-inventory.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const archivePath = join(root, process.env.HOSTINGER_ARCHIVE || "cleanflow-services-hostinger.zip");
const publicSitemap = join(root, "artifacts", "sabaik-almasa", "public", "sitemap.xml");
const distSitemap = join(root, "artifacts", "sabaik-almasa", "dist", "public", "sitemap.xml");
const buildSitemap = join(root, "build_php", "sitemap.xml");

const db = new Database(join(root, "data", "sabaik.db"), { readonly: true });
const configuredSiteUrl = String(
  db.prepare("SELECT value FROM site_settings WHERE key = 'site_public_url'").get()?.value || "",
).trim();
db.close();
const siteUrl = resolvePublicOrigin({
  settings: { site_public_url: configuredSiteUrl },
  env: process.env,
});

const failures = [];
const pass = (message) => console.log(`PASS ${message}`);
const fail = (message) => failures.push(message);
const requireFile = (file, label) => {
  if (existsSync(file)) pass(label);
  else fail(`${label}: missing ${file}`);
};
const decodePath = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const count = (source, pattern) => (source.match(pattern) || []).length;
const getAttribute = (tag, name) => tag.match(
  new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"),
)?.[1]?.trim() ?? "";
const getMeta = (html, name) => (html.match(/<meta\b[^>]*>/gi) ?? [])
  .find((tag) => getAttribute(tag, "name").toLowerCase() === name.toLowerCase())
  ? getAttribute(
    (html.match(/<meta\b[^>]*>/gi) ?? [])
      .find((tag) => getAttribute(tag, "name").toLowerCase() === name.toLowerCase()),
    "content",
  )
  : "";
const getCanonicalTags = (html) => (html.match(/<link\b[^>]*>/gi) ?? [])
  .filter((tag) => getAttribute(tag, "rel").toLowerCase() === "canonical");
const getJsonLdBlocks = (html) => [...html.matchAll(
  /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
)].map((match) => match[1]);
const expandJsonLd = (value) => {
  if (Array.isArray(value)) return value.flatMap(expandJsonLd);
  if (!value || typeof value !== "object") return [];
  const graph = Array.isArray(value["@graph"]) ? value["@graph"].flatMap(expandJsonLd) : [];
  return [value, ...graph];
};
const parseJsonLd = (html) => getJsonLdBlocks(html).flatMap((block) => {
  try {
    return expandJsonLd(JSON.parse(block));
  } catch {
    return [];
  }
});
const hasJsonLdType = (value, expected) => {
  if (!value || typeof value !== "object") return false;
  const type = value["@type"];
  return type === expected || (Array.isArray(type) && type.includes(expected));
};
const isInternalHtmlLink = (href) => {
  if (!href || href.startsWith("#") || href.startsWith("javascript:")) return false;
  if (href.startsWith("/")) return !href.startsWith("/admin") && !href.startsWith("/api");
  try {
    return new URL(href).origin === siteUrl;
  } catch {
    return false;
  }
};

const normalizeUrl = (value, origin = siteUrl) => {
  try {
    const parsed = new URL(String(value || ""), origin || undefined);
    let pathname = decodePath(parsed.pathname);
    pathname = pathname.replace(/\/+$/u, "") || "/";
    return `${parsed.origin.toLowerCase()}${pathname}${parsed.search}`;
  } catch {
    return "";
  }
};

const schemaHasType = (schema, expected) => hasJsonLdType(schema, expected);
const schemaText = (value) => {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .find(Boolean) || "";
  }
  return "";
};
const schemaUrlKeys = new Set([
  "url", "@id", "image", "logo", "contentUrl",
  "mainEntityOfPage", "publisher", "provider", "isPartOf",
]);

const schemaUrlsAreSameOrigin = (value, origin) => {
  if (Array.isArray(value)) return value.every((item) => schemaUrlsAreSameOrigin(item, origin));
  if (!value || typeof value !== "object") return true;
  for (const [key, child] of Object.entries(value)) {
    if (key === "@context") continue;
    if (schemaUrlKeys.has(key)) {
      const values = Array.isArray(child) ? child : [child];
      for (const item of values) {
        if (typeof item === "string" && /^https?:\/\//i.test(item)) {
          try {
            if (new URL(item).origin !== origin) return false;
          } catch {
            return false;
          }
        }
      }
    }
    if (!schemaUrlsAreSameOrigin(child, origin)) return false;
  }
  return true;
};

function schemaContract(pageType, schemas, canonical, html) {
  const requiredTypes = {
    homepage: ["LocalBusiness"],
    about: ["AboutPage"],
    contact: ["ContactPage"],
    faq: ["FAQPage"],
    service: ["Service"],
    package: ["Service"],
    article: ["BlogPosting"],
    "seo-page": ["WebPage"],
    area: ["Service", "Place"],
    "area-list": ["CollectionPage", "WebPage"],
    "service-list": ["CollectionPage", "WebPage"],
    "container-list": ["CollectionPage", "WebPage"],
    "blog-list": ["Blog", "CollectionPage", "WebPage"],
    "seo-page-index": ["WebPage"],
    partners: ["WebPage"],
    "why-us": ["WebPage"],
    legal: ["WebPage"],
  }[pageType] ?? ["WebPage"];
  const candidate = schemas.find((schema) =>
    requiredTypes.some((type) => schemaHasType(schema, type)),
  );
  if (!candidate || !schemaUrlsAreSameOrigin(schemas, siteUrl)) return false;
  if (schemaText(candidate.url) && normalizeUrl(candidate.url) !== canonical) return false;
  const needsNamedEntity = !["faq", "package"].includes(pageType);
  if (needsNamedEntity && !schemaText(candidate.name) && !schemaText(candidate.headline)) return false;
  if (pageType === "homepage") {
    if (!schemaText(candidate.telephone) || !candidate.address || !schemaText(candidate.url)) return false;
  }
  if (pageType === "service" || pageType === "area") {
    if (!candidate.provider || !schemaText(candidate.url)) return false;
  }
  if (pageType === "package" && !schemaText(candidate.url)) return false;
  if (pageType === "faq") {
    if (!Array.isArray(candidate.mainEntity) || candidate.mainEntity.length === 0) return false;
  }
  if (pageType === "article" && !schemaText(candidate.headline)) return false;
  const faq = schemas.find((schema) => schemaHasType(schema, "FAQPage"));
  if (faq) {
    if (!Array.isArray(faq.mainEntity) || faq.mainEntity.length === 0) return false;
    for (const question of faq.mainEntity) {
      const answer = question?.acceptedAnswer;
      if (!schemaText(question?.name) || !schemaText(answer?.text)) return false;
      if (!html.includes(question.name) || !html.includes(answer.text)) return false;
    }
  }
  return true;
}

if (!siteUrl || !/^https:\/\//i.test(siteUrl)) fail("a valid public HTTPS origin must be configured or passed as SITE_URL");
if (siteUrl && /localhost|replit\.dev|replit\.app/i.test(siteUrl)) fail("site_public_url points to a non-production origin");
else if (siteUrl) pass(`configured origin ${siteUrl}`);

requireFile(archivePath, "Hostinger archive");
requireFile(publicSitemap, "public sitemap");
requireFile(distSitemap, "dist sitemap");
requireFile(buildSitemap, "Hostinger sitemap");

let archiveDir = "";
try {
  archiveDir = mkdtempSync(join(tmpdir(), "cleanflow-seo-gate-"));
  execFileSync("unzip", ["-q", archivePath, "-d", archiveDir], { stdio: "pipe" });
  pass("archive extraction");
} catch (error) {
  fail(`archive extraction: ${error instanceof Error ? error.message : String(error)}`);
}

if (archiveDir) {
  const archiveSitemap = join(archiveDir, "sitemap.xml");
  const archiveInventory = join(archiveDir, "seo-inventory.json");
  const archiveMediaManifest = join(archiveDir, "seo-media-manifest.json");
  requireFile(archiveSitemap, "archive sitemap");
  requireFile(archiveInventory, "archive authoritative SEO inventory");
  requireFile(archiveMediaManifest, "archive SEO media manifest");
  if ([publicSitemap, distSitemap, buildSitemap, archiveSitemap].every(existsSync)) {
    const hashes = [publicSitemap, distSitemap, buildSitemap, archiveSitemap].map(sha256);
    if (new Set(hashes).size === 1) pass(`sitemap hashes match (${hashes[0]})`);
    else fail(`sitemap hashes differ: ${hashes.join(", ")}`);
  }

  for (const file of [
    "index.html",
    "robots.txt",
    "api/index.php",
    "images/logo.png",
    "images/hero-1.webp",
    "taqi-group-platform/index.html",
  ]) requireFile(join(archiveDir, file), `archive ${file}`);

  const sitemap = readFileSync(archiveSitemap, "utf8");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const sitemapImages = [...sitemap.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((match) => match[1]);
  const inventory = readSeoInventory(archiveInventory);
  const inventoryEntries = inventory?.entries ?? [];
  const indexableInventory = inventoryEntries.filter(
    (entry) => entry.indexability === INDEXABILITY.INDEXABLE && entry.sitemapEligible,
  );
  const expectedRoutes = new Set(indexableInventory.map((entry) =>
    normalizeUrl(`${siteUrl}${normalizeInventoryPath(entry.canonical)}`),
  ));
  if (!inventory) fail("archive authoritative SEO inventory is invalid JSON");
  else if (inventory.siteUrl !== siteUrl) fail(`inventory origin differs from configured origin (${inventory.siteUrl || "missing"})`);
  else if (expectedRoutes.size === 0) fail("authoritative SEO inventory has no indexable routes");
  else pass(`authoritative inventory loaded (${expectedRoutes.size} indexable routes)`);
  if (urls.length === new Set(urls).size) pass(`sitemap URLs unique (${urls.length})`);
  else fail("sitemap contains duplicate URLs");
  if (!urls.some((url) => /localhost|replit\.dev|replit\.app/i.test(url))) pass("sitemap has no preview URLs");
  else fail("sitemap contains a preview/local URL");
  if (!sitemap.includes("noindex")) pass("sitemap contains no noindex pages");
  else fail("sitemap contains a noindex marker");
  if (siteUrl && urls.every((url) => url.startsWith(siteUrl))) pass(`sitemap origin consistent (${siteUrl})`);
  else fail("sitemap contains an inconsistent origin");

  const badSitemapImages = sitemapImages.filter((url) => {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== siteUrl) return false;
       const localPath = decodePath(parsed.pathname).replace(/^\/api\/uploads\//, "/uploads/");
      return !existsSync(join(archiveDir, localPath.replace(/^\/+/, "")));
    } catch {
      return true;
    }
  });
  if (badSitemapImages.length === 0) pass(`sitemap images resolve (${sitemapImages.length})`);
  else fail(`missing sitemap images: ${badSitemapImages.join(", ")}`);

  const homepage = readFileSync(join(archiveDir, "index.html"), "utf8");
  const homepageChecks = [
    ["homepage title", /<title>[\s\S]*?<\/title>/i, 1],
    ["homepage description", /<meta\b[^>]*\bname=["']description["'][^>]*>/i, 1],
    ["homepage canonical", /<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, 1],
    ["homepage og:title", /<meta\b[^>]*\bproperty=["']og:title["'][^>]*>/i, 1],
    ["homepage og:description", /<meta\b[^>]*\bproperty=["']og:description["'][^>]*>/i, 1],
    ["homepage og:url", /<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/i, 1],
    ["homepage og:image", /<meta\b[^>]*\bproperty=["']og:image["'][^>]*>/i, 1],
    ["homepage robots", /<meta\b[^>]*\bname=["']robots["'][^>]*>/i, 1],
    ["homepage H1", /<h1\b/gi, 1],
  ];
  for (const [label, pattern, expected] of homepageChecks) {
    const actual = count(homepage, pattern);
    if (actual === expected) pass(`${label}: ${actual}`);
    else fail(`${label}: expected ${expected}, got ${actual}`);
  }
  const homepageJsonLd = count(homepage, /application\/ld\+json/gi);
  if (homepageJsonLd > 0) pass(`homepage JSON-LD: ${homepageJsonLd} blocks`);
  else fail("homepage JSON-LD is missing");
  const homepageSchemas = parseJsonLd(homepage);
  const localBusinessSchema = homepageSchemas.find((schema) => hasJsonLdType(schema, "LocalBusiness"));
  if (localBusinessSchema) pass("homepage LocalBusiness JSON-LD");
  else fail("homepage LocalBusiness JSON-LD is missing");
  if (localBusinessSchema?.hasMap || homepageSchemas.some((schema) =>
    Array.isArray(schema?.sameAs) && schema.sameAs.some((url) => /google\.[^/]+\/maps|maps\.google\./i.test(url)),
  )) pass("homepage Google Maps / Business Profile reference");
  else fail("homepage Google Maps / Business Profile reference is missing");
  const homepageOgImage = (homepage.match(/<meta\b[^>]*property=["']og:image["'][^>]*>/i) || [])[0] || "";
  const ogImageUrl = getAttribute(homepageOgImage, "content");
  if (/^https:\/\//i.test(ogImageUrl) && ogImageUrl.startsWith(`${siteUrl}/`)) pass("homepage og:image is absolute");
  else fail(`homepage og:image is not an absolute production URL (${ogImageUrl || "missing"})`);

  const htmlFiles = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith(".html")) htmlFiles.push(file);
    }
  };
  walk(archiveDir);
  // The operational platform is shipped beside the public site, sometimes
  // under both its current and compatibility directory names, but it is a
  // separate artifact with its own navigation and SEO contract. Keep both
  // platform copies out of the main site's canonical/sitemap inventory.
  const isMainSiteHtml = (file) => {
    const relative = file.replace(`${archiveDir}/`, "");
    return !relative.startsWith("taqi-group-platform/") && !relative.startsWith("cleanflow-platform/");
  };
  const archivePageRecords = htmlFiles
    .map((file) => {
      const source = readFileSync(file, "utf8");
      const canonicalTags = getCanonicalTags(source);
      const canonical = canonicalTags.length === 1 ? getAttribute(canonicalTags[0], "href") : "";
      const description = getMeta(source, "description");
      const jsonLdBlocks = getJsonLdBlocks(source);
      const schemas = parseJsonLd(source);
      const internalLinks = [...source.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
        .map((match) => match[1])
        .filter(isInternalHtmlLink);
      return {
        file,
        relative: file.replace(`${archiveDir}/`, ""),
        source,
        canonical,
        canonicalCount: canonicalTags.length,
        description,
        jsonLdBlocks,
        schemas,
        internalLinks,
        indexable: !/noindex/i.test(getMeta(source, "robots")),
        title: (source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim(),
        h1Count: count(source, /<h1\b/gi),
      };
    })
    .filter((page) => isMainSiteHtml(page.file));
  const archivePages = archivePageRecords.filter((page) => page.indexable);
  const archiveCanonicalSet = new Set(archivePages.map((page) => normalizeUrl(page.canonical)).filter(Boolean));
  const archiveSitemapSet = new Set(urls.map((url) => normalizeUrl(url)).filter(Boolean));
  const missingDescriptions = archivePages.filter((page) => !page.description);
  const lowQualityDescriptions = archivePages.filter(
    (page) => page.description.length < 120 || page.description.length > 160,
  );
  const missingCanonicals = archivePages.filter((page) => !page.canonical || page.canonicalCount !== 1);
  const wrongOriginCanonicals = archivePages.filter(
    (page) => {
      if (!page.canonical) return false;
      try {
        return new URL(page.canonical).origin !== siteUrl;
      } catch {
        return true;
      }
    },
  );
  const duplicateDescriptions = new Set(
    archivePages.map((page) => page.description).filter(Boolean),
  ).size !== archivePages.filter((page) => page.description).length;
  const invalidTitles = archivePages.filter((page) => !page.title || page.title.length > 65);
  const invalidH1 = archivePages.filter((page) => page.h1Count !== 1);
  const unknownInventoryRoutes = archivePages.filter((page) =>
    !expectedRoutes.has(normalizeUrl(page.canonical)),
  );
  const missingInventoryRoutes = [...expectedRoutes].filter((url) =>
    !archiveCanonicalSet.has(url),
  );
  const invalidSchemas = archivePages.filter((page) => {
    const canonical = normalizeUrl(page.canonical);
    const entry = indexableInventory.find((item) =>
      normalizeUrl(`${siteUrl}${normalizeInventoryPath(item.canonical)}`) === canonical,
    );
    return !entry || !schemaContract(entry.pageType, page.schemas, canonical, page.source);
  });
  const missingInternalLinks = archivePages.filter((page) => {
    const self = normalizeUrl(page.canonical);
    const usefulTargets = new Set(page.internalLinks
      .map((href) => normalizeUrl(href))
      .filter((target) => target && target !== siteUrl && target !== `${siteUrl}/` && target !== self)
      .filter((target) => expectedRoutes.has(target)));
    return usefulTargets.size === 0;
  });
  const canonicalOnly = [...archiveCanonicalSet].filter((url) => !archiveSitemapSet.has(url));
  const sitemapOnly = [...archiveSitemapSet].filter((url) => !archiveCanonicalSet.has(url));

  if (
    archiveCanonicalSet.size === expectedRoutes.size &&
    archiveSitemapSet.size === expectedRoutes.size &&
    archiveCanonicalSet.size === archivePages.length &&
    archiveSitemapSet.size === urls.length &&
    unknownInventoryRoutes.length === 0 &&
    missingInventoryRoutes.length === 0 &&
    canonicalOnly.length === 0 &&
    sitemapOnly.length === 0
  ) {
    pass(`authoritative routes = indexable HTML = canonical = sitemap (${expectedRoutes.size})`);
  } else {
    fail(
      `route set mismatch: inventory=${expectedRoutes.size}, HTML=${archivePages.length}, sitemap=${archiveSitemapSet.size}, ` +
      `unknown=${unknownInventoryRoutes.length}, missing=${missingInventoryRoutes.length}, ` +
      `canonical-only=${canonicalOnly.length}, sitemap-only=${sitemapOnly.length}`,
    );
  }
  if (missingDescriptions.length === 0) pass(`all indexable pages have meta descriptions (${archivePages.length})`);
  else fail(`missing meta descriptions: ${missingDescriptions.map((page) => page.relative).join(", ")}`);
  if (lowQualityDescriptions.length === 0) pass(`all meta descriptions are 120–160 characters (${archivePages.length})`);
  else fail(`meta descriptions outside 120–160 characters: ${lowQualityDescriptions.map((page) => `${page.relative} (${page.description.length})`).join(", ")}`);
  if (!duplicateDescriptions) pass("meta descriptions are unique");
  else fail("duplicate meta descriptions found");
  if (invalidTitles.length === 0) pass(`all indexable titles are present and concise (${archivePages.length})`);
  else fail(`invalid indexable titles: ${invalidTitles.map((page) => page.relative).join(", ")}`);
  if (invalidH1.length === 0) pass(`all indexable pages have exactly one H1 (${archivePages.length})`);
  else fail(`invalid H1 coverage: ${invalidH1.map((page) => `${page.relative} (${page.h1Count})`).join(", ")}`);
  if (missingCanonicals.length === 0 && wrongOriginCanonicals.length === 0) {
    pass(`all indexable pages have canonical URLs on ${siteUrl}`);
  } else {
    fail(
      `invalid canonical coverage: missing=${missingCanonicals.map((page) => page.relative).join(", ") || "0"}, ` +
      `wrong-origin=${wrongOriginCanonicals.map((page) => `${page.relative} (${page.canonical})`).join(", ") || "0"}`,
    );
  }
  if (invalidSchemas.length === 0) pass(`all indexable pages satisfy their JSON-LD contracts (${archivePages.length})`);
  else fail(`invalid JSON-LD contracts: ${invalidSchemas.map((page) => page.relative).join(", ")}`);
  if (missingInternalLinks.length === 0) pass(`all indexable pages have useful internal graph edges (${archivePages.length})`);
  else fail(`pages without internal links: ${missingInternalLinks.map((page) => page.relative).join(", ")}`);

  const candidates = {
    service: htmlFiles.find((file) => isMainSiteHtml(file) && /\/services\/[^/]+\/index\.html$/.test(file)),
    area: htmlFiles.find((file) => isMainSiteHtml(file) && /\/areas\/[^/]+\/index\.html$/.test(file)),
    article: htmlFiles.find((file) => isMainSiteHtml(file) && /\/blog\/[^/]+\/index\.html$/.test(file)),
  };
  for (const [label, file] of Object.entries(candidates)) {
    if (!file) {
      fail(`${label} HTML sample is missing`);
      continue;
    }
    const source = readFileSync(file, "utf8");
    if (count(source, /<h1\b/gi) === 1) pass(`${label} H1: 1`);
    else fail(`${label} H1 is not exactly one`);
    if (count(source, /<link\b[^>]*\brel=["']canonical["'][^>]*>/gi) === 1) pass(`${label} canonical: 1`);
    else fail(`${label} canonical is not exactly one`);
  }

  const referencedImages = new Set();
  for (const file of htmlFiles) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/(?:src|content)=["']([^"']*(?:\/images\/|\/uploads\/)[^"']+)["']/gi)) {
      referencedImages.add(match[1].split(/[?#]/)[0]);
    }
  }
  const badHtmlImages = [...referencedImages].filter((url) => {
    let pathname = url;
    if (/^https?:\/\//i.test(url)) {
      try {
        const parsed = new URL(url);
        if (parsed.origin !== siteUrl) return false;
        pathname = parsed.pathname;
      } catch {
        return true;
      }
    }
    const localPath = decodePath(pathname).replace(/^\/api\/uploads\//, "/uploads/");
    return !existsSync(join(archiveDir, localPath.replace(/^\/+/, "")));
  });
  if (badHtmlImages.length === 0) pass(`HTML images resolve (${referencedImages.size})`);
  else fail(`missing HTML images: ${badHtmlImages.join(", ")}`);

  let mediaManifest = null;
  try {
    mediaManifest = JSON.parse(readFileSync(archiveMediaManifest, "utf8"));
  } catch {
    fail("archive SEO media manifest is invalid JSON");
  }
  const mediaAssets = Array.isArray(mediaManifest?.assets) ? mediaManifest.assets : [];
  const allArchiveText = htmlFiles
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  const missingManifestAssets = mediaAssets.filter((asset) => {
    const localPath = decodePath(String(asset.path || "")).replace(/^\/+/, "");
    return !localPath || !existsSync(join(archiveDir, localPath));
  });
  const unusedRequiredMedia = mediaAssets.filter((asset) =>
    asset.required && !allArchiveText.includes(String(asset.path || "")) &&
    !sitemapImages.some((image) => decodePath(image).endsWith(String(asset.path || ""))),
  );
  if (missingManifestAssets.length === 0 && mediaAssets.length > 0) {
    pass(`SEO media manifest resolves (${mediaAssets.length})`);
  } else {
    fail(`missing SEO media manifest assets: ${missingManifestAssets.map((asset) => asset.path).join(", ") || "manifest empty"}`);
  }
  if (unusedRequiredMedia.length === 0) pass("all required SEO media assets are used by production output");
  else fail(`required SEO media assets are unused: ${unusedRequiredMedia.map((asset) => asset.path).join(", ")}`);

  rmSync(archiveDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`SEO QUALITY GATE: FAIL (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("SEO QUALITY GATE: PASS");
}