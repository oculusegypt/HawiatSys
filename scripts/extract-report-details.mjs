import fs from "node:fs";

const crawl = JSON.parse(fs.readFileSync("crawl_results.json", "utf8"));
const homeHtml = fs.readFileSync("live_homepage_raw.html", "utf8");

console.log("=== DETAILED EXTRACTION ===");

// 1. Homepage Extraction
const title = homeHtml.match(/<title>([^<]*)<\/title>/i)?.[1] || "";
const metaDesc = homeHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] || "";
const canonical = homeHtml.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1] || "";
const h1s = [...homeHtml.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
const h2s = [...homeHtml.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
const schemas = [...homeHtml.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);

console.log("Title:", title);
console.log("Meta Desc:", metaDesc);
console.log("Canonical:", canonical);
console.log("H1s:", h1s);
console.log("H2s:", h2s);

// Check if Hero, Core Services, Prices, 4.9/148, FAQ, Areas are in raw HTML:
console.log("Hero in HTML:", homeHtml.includes("HeroSlider") || homeHtml.includes("hero-slider") || (homeHtml.includes("مؤسسة تقي جروب") && homeHtml.includes("0555888767")));
console.log("Services in HTML:", homeHtml.includes("ServicesSection") || homeHtml.includes("تنظيف الشقق السكنية"));
console.log("Prices in HTML:", homeHtml.includes("750") || homeHtml.includes("350"));
console.log("Rating 4.9/148 in HTML:", homeHtml.includes("4.9") && homeHtml.includes("148"));
console.log("FAQ in HTML:", homeHtml.includes("FAQPage"));
console.log("Areas in HTML:", homeHtml.includes("الملقا"));

// 2. Sitemap All URLs summary
console.log("\nTotal URLs in Sitemap:", crawl.crawlResults.length);
const non200s = crawl.crawlResults.filter(r => r.status !== 200);
console.log("Non-200 URLs:", non200s);

// 3. Duplicate checks
const titles = {};
const descs = {};
const h1Map = {};

for (const r of crawl.crawlResults) {
  titles[r.title] = (titles[r.title] || 0) + 1;
  descs[r.metaDesc] = (descs[r.metaDesc] || 0) + 1;
  if (r.h1) h1Map[r.h1] = (h1Map[r.h1] || 0) + 1;
}

const dupTitles = Object.entries(titles).filter(([k, v]) => v > 1);
const dupDescs = Object.entries(descs).filter(([k, v]) => v > 1);
const dupH1s = Object.entries(h1Map).filter(([k, v]) => v > 1);

console.log("Duplicate Titles count:", dupTitles.length);
console.log("Duplicate Descriptions count:", dupDescs.length);
console.log("Duplicate H1s count:", dupH1s.length);

// 4. Raw schemas JSON-LD from homepage
console.log("\n=== ALL HOMEPAGE SCHEMAS ===");
schemas.forEach((s, i) => {
  console.log(`\n--- SCHEMA ${i + 1} ---`);
  console.log(s);
});
