import https from "node:https";
import fs from "node:fs";
import { join } from "node:path";

const BASE = "https://taqigroup.com";

function fetchText(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
      timeout: 15000
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on("error", err => resolve({ status: 0, error: err.message, body: "" }));
  });
}

async function runSnapshotAudit() {
  console.log("Starting Live Raw Snapshot Audit...");

  // 1. Fetch Homepage
  const home = await fetchText(BASE + "/");
  fs.writeFileSync("live_homepage_raw.html", home.body);

  // 2. Fetch Sitemap
  const sitemapRes = await fetchText(BASE + "/sitemap.xml");
  fs.writeFileSync("live_sitemap_raw.xml", sitemapRes.body);

  const urls = [...sitemapRes.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  console.log(`Found ${urls.length} URLs in live sitemap.xml`);

  // 3. Fetch robots.txt
  const robotsRes = await fetchText(BASE + "/robots.txt");
  
  // 4. Crawl all sitemap URLs
  const crawlResults = [];
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    const res = await fetchText(u);
    
    // Extract metadata
    const title = res.body.match(/<title>([^<]*)<\/title>/i)?.[1] || "";
    const metaDesc = res.body.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] || "";
    const canonical = res.body.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1] || "";
    const h1 = res.body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
    const h2s = [...res.body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
    const h3s = [...res.body.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
    
    // Text and word count
    const strippedBody = res.body
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const wordCount = strippedBody.split(/\s+/).filter(Boolean).length;

    // Schemas
    const schemas = [...res.body.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);

    // Images
    const imgs = [...res.body.matchAll(/<img\b([^>]*)>/gi)];
    const imgsWithAlt = imgs.filter(m => /alt=["'][^"']+["']/i.test(m[1])).length;

    // Links
    const internalLinks = [...res.body.matchAll(/href=["'](https?:\/\/taqigroup\.com[^"']*|\/[^"']*)["']/gi)].length;
    const externalLinks = [...res.body.matchAll(/href=["']https?:\/\/(?!taqigroup\.com)[^"']+["']/gi)].length;

    crawlResults.push({
      index: i + 1,
      url: u,
      status: res.status,
      title,
      metaDesc,
      canonical,
      h1,
      h2Count: h2s.length,
      h3Count: h3s.length,
      h2s,
      wordCount,
      schemasCount: schemas.length,
      schemas,
      imgsCount: imgs.length,
      imgsWithAlt,
      internalLinks,
      externalLinks,
      hasRobotsNoindex: /noindex/i.test(res.body)
    });

    if ((i + 1) % 25 === 0 || i === urls.length - 1) {
      console.log(`Crawled ${i + 1}/${urls.length} pages...`);
    }
  }

  fs.writeFileSync("crawl_results.json", JSON.stringify({
    homepageStatus: home.status,
    sitemapUrlCount: urls.length,
    robotsTxt: robotsRes.body,
    crawlResults
  }, null, 2));

  console.log("Live Crawl Snapshot complete. Data saved to crawl_results.json");
}

runSnapshotAudit().catch(console.error);
