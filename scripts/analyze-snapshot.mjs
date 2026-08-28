import fs from "node:fs";

const rawHome = fs.readFileSync("live_homepage_raw.html", "utf8");
const crawl = JSON.parse(fs.readFileSync("crawl_results.json", "utf8"));

console.log("=== 1. HOMEPAGE RAW AUDIT ===");
const title = rawHome.match(/<title>([^<]*)<\/title>/i)?.[1] || "";
const metaDesc = rawHome.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] || "";
const canonical = rawHome.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1] || "";
const h1s = [...rawHome.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
const h2s = [...rawHome.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
const schemas = [...rawHome.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);

console.log("Title:", title);
console.log("Meta Description:", metaDesc);
console.log("Canonical:", canonical);
console.log("H1s:", h1s);
console.log("H2s Count:", h2s.length, h2s);
console.log("Schemas Count:", schemas.length);
console.log("Raw HTML Size (bytes):", rawHome.length);

// Check if Hero/Content is in raw HTML or JS only:
const hasHeroInHtml = rawHome.includes("مؤسسة تقي جروب") && (rawHome.includes("تنظيف المنازل والفلل") || rawHome.includes("hero") || rawHome.includes("خدمات"));
const hasServicesInHtml = rawHome.includes("تنظيف الفلل") || rawHome.includes("تنظيف الشقق");
const hasPricesInHtml = rawHome.includes("750") || rawHome.includes("350") || rawHome.includes("ريال");
const hasRatingInHtml = rawHome.includes("4.9") || rawHome.includes("148");
const hasFaqInHtml = rawHome.includes("FAQPage") || rawHome.includes("الأسئلة الشائعة");
const hasAreasInHtml = rawHome.includes("الملقا") || rawHome.includes("الياسمين") || rawHome.includes("أحياء الرياض");

console.log("HTML Flags:", {
  hasHeroInHtml,
  hasServicesInHtml,
  hasPricesInHtml,
  hasRatingInHtml,
  hasFaqInHtml,
  hasAreasInHtml
});

// Check for the "صفحات خدمات التنظيف والكلمات الرئيسية" phrase in raw HTML:
console.log("Contains 'صفحات خدمات التنظيف والكلمات الرئيسية'?:", rawHome.includes("صفحات خدمات التنظيف والكلمات الرئيسية"));
console.log("Contains 'دليل موضوعات'?:", rawHome.includes("دليل موضوعات"));

console.log("\n=== 2. SITEMAP AUDIT ===");
const results = crawl.crawlResults;
const statusDist = {};
let non200Count = 0;
let canonicalMismatchCount = 0;
let noindexCount = 0;

for (const r of results) {
  statusDist[r.status] = (statusDist[r.status] || 0) + 1;
  if (r.status !== 200) non200Count++;
  if (r.canonical && r.canonical !== r.url && r.canonical !== r.url.replace(/\/$/, "")) {
    canonicalMismatchCount++;
  }
  if (r.hasRobotsNoindex) noindexCount++;
}

console.log("Total URLs in sitemap:", results.length);
console.log("Status distribution:", statusDist);
console.log("Non-200 URLs:", non200Count);
console.log("Canonical mismatches:", canonicalMismatchCount);
console.log("Noindex in sitemap:", noindexCount);

console.log("\n=== 3. DUPLICATE & CANNIBALIZATION AUDIT ===");
const titleMap = {};
const descMap = {};
const h1Map = {};

for (const r of results) {
  if (r.title) {
    titleMap[r.title] = (titleMap[r.title] || []);
    titleMap[r.title].push(r.url);
  }
  if (r.metaDesc) {
    descMap[r.metaDesc] = (descMap[r.metaDesc] || []);
    descMap[r.metaDesc].push(r.url);
  }
  if (r.h1) {
    h1Map[r.h1] = (h1Map[r.h1] || []);
    h1Map[r.h1].push(r.url);
  }
}

const dupTitles = Object.entries(titleMap).filter(([_, urls]) => urls.length > 1);
const dupDescs = Object.entries(descMap).filter(([_, urls]) => urls.length > 1);
const dupH1s = Object.entries(h1Map).filter(([_, urls]) => urls.length > 1);

console.log("Duplicate Titles count:", dupTitles.length, dupTitles);
console.log("Duplicate Descriptions count:", dupDescs.length, dupDescs);
console.log("Duplicate H1s count:", dupH1s.length, dupH1s);

console.log("\n=== 4. CONTENT QUALITY & THIN CONTENT ===");
const wordCounts = results.map(r => r.wordCount);
const minWords = Math.min(...wordCounts);
const maxWords = Math.max(...wordCounts);
const avgWords = Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length);
const thinPages = results.filter(r => r.wordCount < 150);

console.log(`Word Counts -> Min: ${minWords}, Max: ${maxWords}, Avg: ${avgWords}`);
console.log(`Thin Pages (< 150 words): ${thinPages.length}`, thinPages.map(p => ({ url: p.url, words: p.wordCount })));

console.log("\n=== 5. SCHEMAS EXTRACTED FROM HOMEPAGE RAW ===");
schemas.forEach((s, idx) => {
  console.log(`--- Schema #${idx + 1} ---`);
  console.log(s.substring(0, 500) + (s.length > 500 ? "... [truncated]" : ""));
});
