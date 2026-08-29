import https from "node:https";

const TARGET_URL = "https://taqigroup.com";

const ENDPOINTS_TO_TEST = [
  "/",
  "/favicon.ico",
  "/favicon.svg",
  "/favicon.webp",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
  "/services/tanzeef-filal-alryad/",
  "/services/tanzeef-bad-altashteeb-alryad/",
  "/services/gaseel-majalis-bukhar-alryad/",
  "/services/tanzeef-mokeyafat-alryad/",
  "/services/jaly-rakham-alryad/",
  "/services/tanzeef-khazanat-alryad/",
  "/areas/al-malqa/",
  "/areas/%D8%AD%D9%8A-%D8%A7%D9%84%D9%85%D9%84%D9%82%D8%A7/",
  "/areas/al-yasmin/",
  "/areas/north-riyadh/",
  "/about/",
  "/pricing/",
  "/contact/",
  "/blog/",
  "/blog/%D8%A7%D8%B3%D8%B9%D8%A7%D8%B1-%D8%B4%D8%B1%D9%83%D8%A7%D8%AA-%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%A7%D9%84%D9%85%D9%86%D8%A7%D8%B2%D9%84-%D9%88%D8%A7%D9%84%D9%81%D9%84%D9%84-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6-2026/",
  "/api/settings",
  "/api/services",
  "/api/posts"
];

function fetchEndpoint(path) {
  return new Promise((resolve) => {
    const url = TARGET_URL + path;
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Googlebot/2.1 (+http://www.google.com/bot.html)" }, timeout: 10000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          path,
          status: res.statusCode,
          headers: res.headers,
          body: data,
          size: data.length
        });
      });
    });

    req.on("error", (err) => {
      resolve({ path, error: err.message });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ path, error: "TIMEOUT" });
    });
  });
}

async function runAudit() {
  console.log(`🔍 Deep Live Audit for: ${TARGET_URL}\n`);
  const results = [];

  for (const ep of ENDPOINTS_TO_TEST) {
    const res = await fetchEndpoint(ep);
    results.push(res);
    if (res.error) {
      console.log(`❌ ${ep} -> Error: ${res.error}`);
    } else {
      console.log(`✅ [${res.status}] ${ep} (${res.size} bytes) - Type: ${res.headers["content-type"] || "unknown"}`);
    }
  }

  // Inspect Service Detail
  const s = results.find(r => r.path === "/services/tanzeef-filal-alryad/");
  if (s && s.body) {
    console.log("\n================== SERVICE PAGE DETAILS ==================");
    console.log("Title:", s.body.match(/<title>([^<]*)<\/title>/i)?.[1]);
    console.log("Canonical:", s.body.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1]);
    console.log("Has Direct Answer:", s.body.includes("⚡ ملخص الخدمة والإجابة المباشرة"));
    console.log("Has Technical Specs Table:", s.body.includes("المواصفات الفنية والمعدات المعتمدة"));
    console.log("Has Step-by-Step Workflow:", s.body.includes("خطة ومراحل التنفيذ المعتمدة"));
    console.log("Has Pricing Factors Table:", s.body.includes("عوامل تحديد التكلفة والأسعار الشفافة"));
    console.log("Has FAQ Block:", s.body.includes("الأسئلة الشائعة حول"));
    console.log("Has Schema Markup:", s.body.includes("__ld_json_raw") || s.body.includes("application/ld+json"));
  }

  // Inspect Area Detail
  const a = results.find(r => r.path === "/areas/al-malqa/");
  if (a && a.body) {
    console.log("\n================== NEIGHBORHOOD PAGE DETAILS ==================");
    console.log("Title:", a.body.match(/<title>([^<]*)<\/title>/i)?.[1]);
    console.log("Canonical:", a.body.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1]);
    console.log("Has Local Profile:", a.body.includes("طبيعة عقارات") || a.body.includes("نطاق الخدمة في"));
    console.log("Has Core Services Links:", a.body.includes("/services/tanzeef-filal-alryad"));
    console.log("Has Localized FAQs:", a.body.includes("الأسئلة الشائعة"));
  }

  // Inspect Blog Detail
  const b = results.find(r => r.path.startsWith("/blog/%D8%A7%D8%B3%D8%B9%D8%A7%D8%B1"));
  if (b && b.body) {
    console.log("\n================== BLOG POST DETAILS ==================");
    console.log("Title:", b.body.match(/<title>([^<]*)<\/title>/i)?.[1]);
    console.log("Has Injected Contextual Links:", b.body.includes("/services/tanzeef-filal-alryad") || b.body.includes("/services/"));
    console.log("Has Service Hub Navigation Box:", b.body.includes("article-service-hub"));
  }
}

runAudit().catch(console.error);
