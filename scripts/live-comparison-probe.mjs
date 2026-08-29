import https from "node:https";
import fs from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const ROOT = "e:/Hawiat";
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const db = new Database(join(ROOT, "data", "sabaik.db"), { readonly: true });

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

// 1. Text Similarity Helper (Jaccard on 3-word shingles)
function getShingles(text) {
  const words = text.toLowerCase().replace(/[^\u0600-\u06FFa-z0-9\s]/gi, " ").split(/\s+/).filter(Boolean);
  const shingles = new Set();
  for (let i = 0; i < words.length - 2; i++) {
    shingles.add(`${words[i]} ${words[i+1]} ${words[i+2]}`);
  }
  return shingles;
}

function jaccardSimilarity(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const s of setA) {
    if (setB.has(s)) intersection++;
  }
  return intersection / (setA.size + setB.size - intersection);
}

async function runLiveComparison() {
  console.log("Fetching live homepage from https://taqigroup.com/ ...");
  const liveHome = await fetchText("https://taqigroup.com/");
  const buildHome = fs.readFileSync("build_php/index.html", "utf8");

  // A. Compare Build vs Live Raw Homepage
  const extractHomeMeta = (html) => ({
    size: html.length,
    h1: html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.trim() || "NONE",
    h2s: [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim()),
    hasHero: html.includes("Hero") || html.includes("مؤسسة تقي جروب لخدمات تنظيف"),
    hasServices: html.includes("تنظيف الفلل والقصور") && html.includes("تنظيف الشقق السكنية"),
    hasPrices: html.includes("350") && html.includes("750") && html.includes("900"),
    hasReviews: html.includes("4.9") && html.includes("184"),
    hasAreas: html.includes("حي الملقا") && html.includes("حي الياسمين"),
    hasFAQ: html.includes("الأسئلة الشائعة حول خدمات التنظيف"),
    hasNoscriptList: html.includes("صفحات خدمات التنظيف والكلمات الرئيسية")
  });

  const buildMeta = extractHomeMeta(buildHome);
  const liveMeta = extractHomeMeta(liveHome.body);

  // B. Sitemap (162) vs SSG Build (168) Analysis
  const sitemapRaw = fs.readFileSync("live_sitemap_raw.xml", "utf8");
  const sitemapUrls = [...sitemapRaw.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  const sitemapUrlSet = new Set(sitemapUrls.map(u => u.replace(/\/$/, "")));

  // List all files generated in build_php
  function getHtmlFiles(dir, base = "") {
    let files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      const rel = base ? `${base}/${e.name}` : e.name;
      if (e.isDirectory()) {
        files = files.concat(getHtmlFiles(full, rel));
      } else if (e.name === "index.html") {
        files.push(base ? `https://taqigroup.com/${base}` : "https://taqigroup.com");
      }
    }
    return files;
  }

  const buildUrls = getHtmlFiles("build_php");
  const extraInBuild = buildUrls.filter(u => !sitemapUrlSet.has(u.replace(/\/$/, "")));

  // C. Area Pages Similarity Analysis (50 districts)
  const areasDir = "build_php/areas";
  const areaPages = [];
  if (fs.existsSync(areasDir)) {
    const areaFolders = fs.readdirSync(areasDir, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const af of areaFolders) {
      const htmlPath = join(areasDir, af.name, "index.html");
      if (fs.existsSync(htmlPath)) {
        const content = fs.readFileSync(htmlPath, "utf8");
        const bodyText = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        areaPages.push({
          slug: af.name,
          url: `https://taqigroup.com/areas/${af.name}`,
          wordCount: bodyText.split(/\s+/).filter(Boolean).length,
          shingles: getShingles(bodyText),
          text: bodyText
        });
      }
    }
  }

  // Calculate pairwise similarity
  const similarityPairs = [];
  for (let i = 0; i < areaPages.length; i++) {
    for (let j = i + 1; j < areaPages.length; j++) {
      const sim = jaccardSimilarity(areaPages[i].shingles, areaPages[j].shingles);
      similarityPairs.push({
        area1: areaPages[i].slug,
        area2: areaPages[j].slug,
        similarity: Math.round(sim * 100)
      });
    }
  }
  similarityPairs.sort((a, b) => b.similarity - a.similarity);
  const top10Sim = similarityPairs.slice(0, 10);

  // Save report data to JSON
  fs.writeFileSync("comparison_report.json", JSON.stringify({
    buildMeta,
    liveMeta,
    sitemapCount: sitemapUrls.length,
    buildCount: buildUrls.length,
    extraInBuild,
    areaCount: areaPages.length,
    top10Sim,
    areaSamples: areaPages.slice(0, 5).map(a => ({ slug: a.slug, words: a.wordCount }))
  }, null, 2));

  console.log("Comparison analysis complete. Saved to comparison_report.json");
  console.log("Build Meta:", buildMeta);
  console.log("Live Meta:", liveMeta);
  console.log("Extra in Build vs Sitemap:", extraInBuild);
  console.log("Top 10 Area Similarity Pairs:", top10Sim);
}

runLiveComparison().catch(console.error);
