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
const parseJsonLd = (html) => getJsonLdBlocks(html).flatMap((block) => {
  try {
    const parsed = JSON.parse(block);
    return Array.isArray(parsed) ? parsed : [parsed];
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
  requireFile(archiveSitemap, "archive sitemap");
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
  const archivePages = htmlFiles
    .map((file) => {
      const source = readFileSync(file, "utf8");
      const canonicalTags = getCanonicalTags(source);
      const canonical = canonicalTags.length === 1 ? getAttribute(canonicalTags[0], "href") : "";
      const description = getMeta(source, "description");
      const jsonLdBlocks = getJsonLdBlocks(source);
      const internalLinks = [...source.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
        .map((match) => match[1])
        .filter(isInternalHtmlLink);
      return {
        file,
        relative: file.replace(`${archiveDir}/`, ""),
        source,
        canonical,
        description,
        jsonLdBlocks,
        internalLinks,
        indexable: !/noindex/i.test(getMeta(source, "robots")),
      };
    })
    .filter((page) => page.indexable);
  const archiveCanonicalSet = new Set(archivePages.map((page) => page.canonical).filter(Boolean));
  const archiveSitemapSet = new Set(urls);
  const missingDescriptions = archivePages.filter((page) => !page.description);
  const lowQualityDescriptions = archivePages.filter(
    (page) => page.description.length < 120 || page.description.length > 160,
  );
  const missingCanonicals = archivePages.filter((page) => !page.canonical);
  const wrongOriginCanonicals = archivePages.filter(
    (page) => page.canonical && !page.canonical.startsWith(`${siteUrl}/`) && page.canonical !== siteUrl,
  );
  const missingSchemas = archivePages.filter((page) => page.jsonLdBlocks.length === 0);
  const missingInternalLinks = archivePages.filter((page) => page.internalLinks.length === 0);
  const canonicalOnly = [...archiveCanonicalSet].filter((url) => !archiveSitemapSet.has(url));
  const sitemapOnly = [...archiveSitemapSet].filter((url) => !archiveCanonicalSet.has(url));

  if (
    archivePages.length === urls.length &&
    archiveCanonicalSet.size === urls.length &&
    canonicalOnly.length === 0 &&
    sitemapOnly.length === 0
  ) {
    pass(`all indexable HTML routes match sitemap (${archivePages.length})`);
  } else {
    fail(
      `indexable HTML/Sitemap mismatch: ${archivePages.length} pages, ${urls.length} sitemap URLs, ` +
      `${archiveCanonicalSet.size} canonical URLs, ${canonicalOnly.length} canonical-only, ${sitemapOnly.length} sitemap-only`,
    );
  }
  if (missingDescriptions.length === 0) pass(`all indexable pages have meta descriptions (${archivePages.length})`);
  else fail(`missing meta descriptions: ${missingDescriptions.map((page) => page.relative).join(", ")}`);
  if (lowQualityDescriptions.length === 0) pass(`all meta descriptions are 120–160 characters (${archivePages.length})`);
  else fail(`meta descriptions outside 120–160 characters: ${lowQualityDescriptions.map((page) => `${page.relative} (${page.description.length})`).join(", ")}`);
  if (missingCanonicals.length === 0 && wrongOriginCanonicals.length === 0) {
    pass(`all indexable pages have canonical URLs on ${siteUrl}`);
  } else {
    fail(
      `invalid canonical coverage: missing=${missingCanonicals.map((page) => page.relative).join(", ") || "0"}, ` +
      `wrong-origin=${wrongOriginCanonicals.map((page) => `${page.relative} (${page.canonical})`).join(", ") || "0"}`,
    );
  }
  if (missingSchemas.length === 0) pass(`all indexable pages have valid JSON-LD blocks (${archivePages.length})`);
  else fail(`missing JSON-LD blocks: ${missingSchemas.map((page) => page.relative).join(", ")}`);
  if (missingInternalLinks.length === 0) pass(`all indexable pages have internal links (${archivePages.length})`);
  else fail(`pages without internal links: ${missingInternalLinks.map((page) => page.relative).join(", ")}`);

  const candidates = {
    service: htmlFiles.find((file) => /\/services\/[^/]+\/index\.html$/.test(file)),
    area: htmlFiles.find((file) => /\/areas\/[^/]+\/index\.html$/.test(file)),
    article: htmlFiles.find((file) => /\/blog\/[^/]+\/index\.html$/.test(file)),
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

  rmSync(archiveDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`SEO QUALITY GATE: FAIL (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("SEO QUALITY GATE: PASS");
}