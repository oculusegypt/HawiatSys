import fs from "fs";
import path from "path";
import { getSetting } from "../routes/settings";

export type SeoMetricStatus = "pass" | "warning" | "fail" | "not_verified";

export interface SeoMetric {
  key: string;
  label: string;
  status: SeoMetricStatus;
  value: string;
  detail: string;
  source: string;
  entities?: string[];
}

export interface SeoMetricsSnapshot {
  generatedAt: string;
  source: string;
  siteUrl: string;
  metrics: SeoMetric[];
}

interface HtmlPage {
  file: string;
  html: string;
  canonical: string;
  description: string;
  robots: string;
  jsonLdTypes: string[];
  faq: boolean;
  internalLinks: number;
}

function relativeProductionPath(file: string, productionRoot: string): string {
  return path.relative(productionRoot, file).replaceAll(path.sep, "/");
}

function isFaqEligiblePage(page: HtmlPage, productionRoot: string): boolean {
  const relativePath = relativeProductionPath(page.file, productionRoot);
  return relativePath === "index.html"
    || /^faq\/index\.html$/u.test(relativePath)
    || /^pricing\/index\.html$/u.test(relativePath)
    || /^areas\/[^/]+\/index\.html$/u.test(relativePath)
    || /^containers\/[^/]+\/index\.html$/u.test(relativePath)
    || /^services\/[^/]+\/index\.html$/u.test(relativePath)
    || /^page\/[^/]+\/index\.html$/u.test(relativePath)
    || /^pages\/[^/]+\/index\.html$/u.test(relativePath);
}

const LEGACY_BRANDING = /sabaik|سبائك|الماسة/iu;
const TEXT_EXTENSIONS = /\.(html?|css|js|json|xml|txt|php|webmanifest)$/i;
const SEO_MEDIA_EXTENSIONS = /\.(png|jpe?g|webp|gif|svg)$/i;

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function readText(file: string): string {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function findProjectRoot(): string {
  const candidates = unique([
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../.."),
  ]);
  return candidates.find((candidate) =>
    fs.existsSync(path.join(candidate, "data", "sabaik.db")) ||
    fs.existsSync(path.join(candidate, "build_php")),
  ) ?? process.cwd();
}

function getProductionRoot(root: string): { root: string; label: string } {
  const candidates = [
    { root: path.join(root, "build_php"), label: "آخر أرشيف Hostinger مبني" },
    { root: path.join(root, "artifacts/sabaik-almasa/dist/public"), label: "آخر ناتج بناء للواجهة" },
    { root: path.join(root, "artifacts/sabaik-almasa/public"), label: "مصدر SEO العام" },
  ];
  const selected = candidates.find((candidate) => fs.existsSync(candidate.root));
  return selected ?? candidates[candidates.length - 1];
}

function walkFiles(directory: string, files: string[] = []): string[] {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "cleanflow-platform" || entry.name === "assets") continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walkFiles(file, files);
    else files.push(file);
  }
  return files;
}

function getAttribute(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match?.[1]?.trim() ?? "";
}

function getMeta(html: string, key: string, property = false): string {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const attr = property ? "property" : "name";
  const tag = tags.find((candidate) => getAttribute(candidate, attr).toLowerCase() === key.toLowerCase());
  return tag ? getAttribute(tag, "content") : "";
}

function getCanonical(html: string): string {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const tag = tags.find((candidate) => getAttribute(candidate, "rel").toLowerCase() === "canonical");
  return tag ? getAttribute(tag, "href") : "";
}

function getJsonLdTypes(html: string): string[] {
  const types: string[] = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const visit = (value: unknown) => {
        if (Array.isArray(value)) {
          value.forEach(visit);
        } else if (value && typeof value === "object") {
          const object = value as Record<string, unknown>;
          if (typeof object["@type"] === "string") types.push(object["@type"]);
          if (Array.isArray(object["@type"])) {
            object["@type"].filter((type): type is string => typeof type === "string").forEach((type) => types.push(type));
          }
          Object.values(object).forEach(visit);
        }
      };
      visit(JSON.parse(match[1]));
    } catch {
      // A malformed JSON-LD block is reflected by the structured-data metric.
    }
  }
  return unique(types);
}

function isInternalLink(href: string, siteUrl: string): boolean {
  if (!href || href.startsWith("#") || href.startsWith("javascript:")) return false;
  if (href.startsWith("/")) return !href.startsWith("/admin") && !href.startsWith("/api");
  try {
    const url = new URL(href);
    return url.origin === siteUrl;
  } catch {
    return false;
  }
}

function parsePage(file: string, siteUrl: string): HtmlPage {
  const html = readText(file);
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((href) => isInternalLink(href, siteUrl));
  const jsonLdTypes = getJsonLdTypes(html);
  return {
    file,
    html,
    canonical: getCanonical(html),
    description: getMeta(html, "description"),
    robots: getMeta(html, "robots"),
    jsonLdTypes,
    faq: jsonLdTypes.includes("FAQPage") || /الأسئلة الشائعة|faqpage/i.test(html),
    internalLinks: links.length,
  };
}

function ratioStatus(numerator: number, denominator: number): SeoMetricStatus {
  if (!denominator) return "not_verified";
  const ratio = numerator / denominator;
  if (ratio >= 1) return "pass";
  if (ratio >= 0.8) return "warning";
  return "fail";
}

function metric(
  key: string,
  label: string,
  status: SeoMetricStatus,
  value: string,
  detail: string,
  source: string,
  entities?: string[],
): SeoMetric {
  return { key, label, status, value, detail, source, ...(entities ? { entities } : {}) };
}

function getOrigin(value: string): string {
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return "";
  }
}

function normalizeSeoUrl(value: string, siteUrl: string): string {
  const raw = value.trim().replace(/&amp;/gi, "&");
  if (!raw) return "";
  try {
    const url = new URL(raw, siteUrl || undefined);
    let pathname = url.pathname;
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
      // Keep the encoded pathname if it contains malformed escape sequences.
    }
    pathname = pathname.replace(/\/+$/u, "") || "/";
    return `${url.origin.toLowerCase()}${pathname}${url.search}`;
  } catch {
    return raw.replace(/\/+$/u, "") || "/";
  }
}

function compareUrlSets(canonicalUrls: string[], sitemapUrls: string[], siteUrl: string): {
  status: SeoMetricStatus;
  value: string;
  detail: string;
} {
  if (!canonicalUrls.length || !sitemapUrls.length) {
    return {
      status: "not_verified",
      value: "NOT VERIFIED",
      detail: "لا توجد مجموعة Canonical وSitemap مكتملة للمقارنة",
    };
  }

  const canonicalSet = new Set(canonicalUrls.map((url) => normalizeSeoUrl(url, siteUrl)).filter(Boolean));
  const sitemapSet = new Set(sitemapUrls.map((url) => normalizeSeoUrl(url, siteUrl)).filter(Boolean));
  const matched = [...canonicalSet].filter((url) => sitemapSet.has(url)).length;
  const unionSize = new Set([...canonicalSet, ...sitemapSet]).size;
  const ratio = unionSize ? matched / unionSize : 0;
  const status: SeoMetricStatus = ratio >= 1 ? "pass" : ratio >= 0.8 ? "warning" : "fail";

  return {
    status,
    value: `${Math.round(ratio * 100)}%`,
    detail: `${matched} رابطًا متطابقًا من ${canonicalSet.size} canonical و${sitemapSet.size} رابط Sitemap`,
  };
}

export async function getSeoMetrics(): Promise<SeoMetricsSnapshot> {
  const projectRoot = findProjectRoot();
  const production = getProductionRoot(projectRoot);
  const allFiles = walkFiles(production.root);
  const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
  const sitemapFile = path.join(production.root, "sitemap.xml");
  const sitemap = readText(sitemapFile);
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
  const sitemapOrigin = getOrigin(sitemapUrls[0] ?? "");
  const homepage = htmlFiles.find((file) => path.relative(production.root, file) === "index.html");
  const homepageHtml = homepage ? readText(homepage) : "";
  const siteUrl = sitemapOrigin || getOrigin(getMeta(homepageHtml, "site-public-url"));
  const pages = htmlFiles.map((file) => parsePage(file, siteUrl)).filter((page) => !/noindex/i.test(page.robots));
  const canonicalUrls = unique(pages.map((page) => page.canonical).filter(Boolean));
  const descriptions = pages.map((page) => page.description).filter(Boolean);
  const qualityDescriptions = descriptions.filter((description) => description.length >= 120 && description.length <= 160);
  const pagesWithCanonical = pages.filter((page) => Boolean(page.canonical));
  const pagesWithSchema = pages.filter((page) => page.jsonLdTypes.length > 0);
  const faqEligiblePages = pages.filter((page) => isFaqEligiblePage(page, production.root));
  const faqPages = faqEligiblePages.filter((page) => page.faq);
  const linkedPages = pages.filter((page) => page.internalLinks > 0);
  const entityTypes = unique(pages.flatMap((page) => page.jsonLdTypes));
  const sitemapUnique = unique(sitemapUrls);
  const validSitemapUrls = sitemapUrls.filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" && Boolean(parsed.hostname) && !/\s|[<>]/.test(url);
    } catch {
      return false;
    }
  });

  const mediaFiles = allFiles.filter((file) =>
    path.dirname(file).endsWith(`${path.sep}images${path.sep}seo`) &&
    SEO_MEDIA_EXTENSIONS.test(file),
  );
  const mediaPaths = unique(mediaFiles.map((file) => `/images/${path.relative(path.join(production.root, "images"), file).replaceAll(path.sep, "/")}`));
  const referencedMedia = unique(
    allFiles
      .filter((file) => TEXT_EXTENSIONS.test(file))
      .flatMap((file) => {
        const text = readText(file);
        return mediaPaths.filter((mediaPath) => text.includes(mediaPath));
      }),
  );

  const publicFiles = allFiles.filter((file) =>
    TEXT_EXTENSIONS.test(file) &&
    !file.includes(`${path.sep}api${path.sep}`) &&
    !file.includes(`${path.sep}cleanflow-platform${path.sep}`) &&
    !["BUILD_INFO.json", "UPLOAD_INSTRUCTIONS.txt"].includes(path.basename(file)),
  );
  const legacyFiles = publicFiles.filter((file) => LEGACY_BRANDING.test(readText(file)));
  const settingsName = (await getSetting("company_name")).trim();
  const settingsCity = (await getSetting("company_city")).trim();
  const settingsPhone = (await getSetting("company_phone_call")).trim() || (await getSetting("company_phone_whatsapp")).trim();
  const homepageJson = getJsonLdTypes(homepageHtml);
  const contactConsistent = Boolean(
    settingsName &&
    settingsCity &&
    settingsPhone &&
    homepageHtml.includes(settingsCity) &&
    homepageHtml.includes(settingsPhone),
  );
  const expectedOrigins = unique([
    siteUrl,
    ...sitemapUrls.map(getOrigin).filter(Boolean),
    getOrigin(getAttribute((homepageHtml.match(/<meta\b[^>]+name=["']site-public-url["'][^>]*>/i) ?? [""])[0], "content")),
    ...pages.map((page) => getOrigin(page.canonical)).filter(Boolean),
  ]);
  const siteUrlConsistent = Boolean(siteUrl) && expectedOrigins.length === 1 && expectedOrigins[0] === siteUrl;

  const source = production.label;
  const hasBuild = fs.existsSync(path.join(production.root, "index.html")) && htmlFiles.length > 0;
  const seoMediaValue = mediaFiles.length ? `${referencedMedia.length}/${mediaFiles.length}` : "—";
  const canonicalSitemapParity = compareUrlSets(canonicalUrls, sitemapUnique, siteUrl);

  return {
    generatedAt: new Date().toISOString(),
    source,
    siteUrl: siteUrl || "",
    metrics: [
      metric(
        "prerender",
        "SEO HTML / Prerender",
        hasBuild ? "pass" : "not_verified",
        hasBuild ? `${canonicalUrls.length} routes` : "—",
        hasBuild ? `${htmlFiles.length} HTML files موجودة، مع ${canonicalUrls.length} canonical فريد` : "لم يُعثر على ناتج HTML قابل للفحص",
        source,
      ),
      metric(
        "page_count",
        "Indexable HTML Pages / Routes",
        hasBuild ? "pass" : "not_verified",
        hasBuild ? `${pages.length} pages / ${sitemapUnique.length} routes` : "NOT VERIFIED",
        hasBuild ? `${pages.length} صفحة HTML قابلة للفهرسة، مع ${sitemapUnique.length} رابط Sitemap` : "لم يُعثر على ناتج HTML قابل للفحص",
        source,
      ),
      metric(
        "meta_coverage",
        "Meta Description Coverage",
        ratioStatus(descriptions.length, pages.length),
        pages.length ? `${Math.round((descriptions.length / pages.length) * 100)}%` : "—",
        `${descriptions.length} من ${pages.length} صفحة قابلة للفهرسة لديها وصف`,
        source,
      ),
      metric(
        "meta_quality",
        "Meta Description Quality",
        ratioStatus(qualityDescriptions.length, pages.length),
        pages.length ? `${Math.round((qualityDescriptions.length / pages.length) * 100)}%` : "—",
        `${qualityDescriptions.length} وصفًا ضمن 120–160 حرفًا`,
        source,
      ),
      metric(
        "canonical_coverage",
        "Canonical Coverage",
        ratioStatus(pagesWithCanonical.length, pages.length),
        pages.length ? `${Math.round((pagesWithCanonical.length / pages.length) * 100)}%` : "—",
        `${pagesWithCanonical.length} من ${pages.length} صفحة لديها canonical`,
        source,
      ),
      metric(
        "canonical_sitemap_parity",
        "Canonical ↔ Sitemap Parity",
        canonicalSitemapParity.status,
        canonicalSitemapParity.value,
        canonicalSitemapParity.detail,
        source,
      ),
      metric(
        "sitemap",
        "Sitemap Health",
        sitemap && sitemapUrls.length === sitemapUnique.length && validSitemapUrls.length === sitemapUrls.length ? "pass" : "fail",
        sitemapUrls.length ? `${sitemapUrls.length} URLs` : "—",
        sitemap ? `${sitemapUnique.length} رابطًا فريدًا، ${validSitemapUrls.length} رابط HTTPS صالح` : "sitemap.xml غير موجود",
        source,
      ),
      metric(
        "structured_data",
        "Structured Data",
        ratioStatus(pagesWithSchema.length, pages.length),
        pagesWithSchema.length === pages.length ? "PASS" : `${pagesWithSchema.length}/${pages.length}`,
        entityTypes.length ? `الكيانات الفعلية: ${entityTypes.join("، ")}` : "لم يُعثر على JSON-LD صالح",
        source,
        entityTypes,
      ),
      metric(
        "faq_geo",
        "FAQ / GEO Content",
        ratioStatus(faqPages.length, faqEligiblePages.length),
        faqEligiblePages.length ? `${faqPages.length}/${faqEligiblePages.length}` : "—",
        `${faqPages.length} من ${faqEligiblePages.length} صفحة تجارية/خدمية مؤهلة تحتوي FAQ فعليًا في HTML أو JSON-LD؛ الصفحات القانونية والتفاعلية والمقالات مستثناة منطقيًا`,
        source,
      ),
      metric(
        "internal_links",
        "Internal Linking",
        ratioStatus(linkedPages.length, pages.length),
        pages.length ? `${Math.round((linkedPages.length / pages.length) * 100)}%` : "—",
        `${linkedPages.length} من ${pages.length} صفحة تحتوي روابط داخلية قابلة للفحص`,
        source,
      ),
      metric(
        "seo_media",
        "SEO Media",
        mediaFiles.length && referencedMedia.length === mediaFiles.length ? "pass" : mediaFiles.length ? "warning" : "not_verified",
        seoMediaValue,
        `${referencedMedia.length} من ${mediaFiles.length} ملف SEO مستخدم في الناتج`,
        source,
      ),
      metric(
        "legacy_branding",
        "Legacy Branding",
        legacyFiles.length === 0 ? "pass" : "fail",
        legacyFiles.length === 0 ? "CLEAN" : `${legacyFiles.length} files`,
        legacyFiles.length === 0 ? "لا توجد إشارات للعلامات القديمة في مخرجات الموقع العامة" : `إشارات موجودة في ${legacyFiles.length} ملفًا عامًا`,
        source,
      ),
      metric(
        "contact_consistency",
        "Business Contact Consistency",
        contactConsistent ? "pass" : "warning",
        contactConsistent ? "PASS" : "NOT VERIFIED",
        contactConsistent ? "بيانات الاتصال الأساسية متسقة بين الإعدادات وHTML العام" : "تعذر إثبات اتساق الاسم والمدينة وبيانات الاتصال من المصدرين",
        source,
      ),
      metric(
        "site_url",
        "Site URL",
        siteUrlConsistent ? "pass" : "warning",
        siteUrl || "NOT VERIFIED",
        siteUrlConsistent ? "النطاق متسق بين sitemap وcanonical وبيانات HTML" : "لم يمكن إثبات نطاق إنتاج واحد من جميع المخرجات",
        source,
      ),
    ],
  };
}