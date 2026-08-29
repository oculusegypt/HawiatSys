import https from "node:https";

const BASE = "https://taqigroup.com";

const URLS = [
  "/",
  "/favicon.ico",
  "/favicon.svg",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
  "/services/tanzeef-filal-alryad/",
  "/services/tanzeef-bad-altashteeb-alryad/",
  "/services/jaly-rakham-alryad/",
  "/services/gaseel-majalis-bukhar-alryad/",
  "/services/tanzeef-mokeyafat-alryad/",
  "/services/tanzeef-khazanat-alryad/",
  "/areas/al-malqa/",
  "/areas/al-yasmin/",
  "/areas/north-riyadh/",
  "/areas/",
  "/about/",
  "/pricing/",
  "/contact/",
  "/blog/",
  "/blog/%D8%A7%D8%B3%D8%B9%D8%A7%D8%B1-%D8%B4%D8%B1%D9%83%D8%A7%D8%AA-%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%A7%D9%84%D9%85%D9%86%D8%A7%D8%B2%D9%84-%D9%88%D8%A7%D9%84%D9%81%D9%84%D9%84-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6-2026/",
  "/api/settings",
  "/api/services",
  "/api/posts"
];

function fetchUrl(path) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.get(BASE + path, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
      },
      timeout: 10000
    }, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        const duration = Date.now() - start;
        resolve({
          path,
          status: res.statusCode,
          duration,
          headers: res.headers,
          body,
          size: body.length
        });
      });
    });
    req.on("error", err => resolve({ path, error: err.message }));
    req.on("timeout", () => { req.destroy(); resolve({ path, error: "TIMEOUT" }); });
  });
}

async function runDeepLiveAnalysis() {
  console.log(`🚀 Executing Live Automated Deep Probe for: ${BASE} ...\n`);
  const probeResults = [];
  for (const u of URLS) {
    const res = await fetchUrl(u);
    probeResults.push(res);
  }

  // 1. Overall Status Report
  const total = probeResults.length;
  const ok200 = probeResults.filter(r => r.status === 200).length;
  const avgResponseTime = Math.round(probeResults.reduce((acc, r) => acc + (r.duration || 0), 0) / total);
  
  console.log(`[Summary] Tested: ${total} endpoints | 200 OK: ${ok200}/${total} | Avg Latency: ${avgResponseTime}ms`);

  // 2. Homepage Deep Inspection
  const home = probeResults.find(r => r.path === "/");
  let homeAnalysis = {};
  if (home && home.body) {
    const title = home.body.match(/<title>([^<]*)<\/title>/i)?.[1] || "";
    const desc = home.body.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] || "";
    const canon = home.body.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1] || "";
    const schemas = [...home.body.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
    
    let hasRating = false;
    let hasOfferCatalog = false;
    let hasFAQ = false;
    let offersCount = 0;
    let businessName = "";
    
    for (const s of schemas) {
      try {
        const obj = JSON.parse(s);
        const graph = obj["@graph"] || [obj];
        for (const item of graph) {
          if (item["@type"]?.includes("LocalBusiness") || item["@type"]?.includes("HousekeepingService")) {
            businessName = item.name;
            if (item.aggregateRating) hasRating = true;
            if (item.hasOfferCatalog) {
              hasOfferCatalog = true;
              offersCount = item.hasOfferCatalog.itemListElement?.length || 0;
            }
          }
          if (item["@type"] === "FAQPage") hasFAQ = true;
        }
      } catch (e) {}
    }

    homeAnalysis = {
      title,
      descLength: desc.length,
      canonical: canon,
      businessName,
      hasRating,
      hasOfferCatalog,
      offersCount,
      hasFAQ,
      schemasCount: schemas.length
    };
  }

  // 3. Sitemap Analysis
  const sitemap = probeResults.find(r => r.path === "/sitemap.xml");
  let sitemapCount = 0;
  if (sitemap && sitemap.body) {
    sitemapCount = (sitemap.body.match(/<loc>/g) || []).length;
  }

  // 4. Service Page Deep Inspection
  const villa = probeResults.find(r => r.path === "/services/tanzeef-filal-alryad/");
  let villaAnalysis = {};
  if (villa && villa.body) {
    villaAnalysis = {
      title: villa.body.match(/<title>([^<]*)<\/title>/i)?.[1] || "",
      size: villa.size,
      hasQuickAnswer: villa.body.includes("⚡ ملخص الخدمة") || villa.body.includes("الإجابة المباشرة") || villa.body.includes("Quick Facts") || villa.body.includes("متوسط السعر"),
      hasTechSpecs: villa.body.includes("المواصفات الفنية") || villa.body.includes("المعدات") || villa.body.includes("Klindex") || villa.body.includes("150 بار"),
      hasWorkflow: villa.body.includes("خطوات") || villa.body.includes("مراحل التنفيذ"),
      hasFaq: villa.body.includes("الأسئلة الشائعة"),
      hasWhatsAppCTA: villa.body.includes("wa.me")
    };
  }

  // 5. Area Page Deep Inspection
  const malqa = probeResults.find(r => r.path === "/areas/al-malqa/");
  let malqaAnalysis = {};
  if (malqa && malqa.body) {
    malqaAnalysis = {
      title: malqa.body.match(/<title>([^<]*)<\/title>/i)?.[1] || "",
      size: malqa.size,
      hasLocalDetails: malqa.body.includes("الملقا") && (malqa.body.includes("شمال الرياض") || malqa.body.includes("فلل")),
      hasServicesLinks: malqa.body.includes("/services/"),
      hasNearbyAreas: malqa.body.includes("/areas/")
    };
  }

  // 6. Blog Contextual Links Inspection
  const blog = probeResults.find(r => r.path.startsWith("/blog/%D8%A7%D8%B3%D8%B9%D8%A7%D8%B1"));
  let blogAnalysis = {};
  if (blog && blog.body) {
    blogAnalysis = {
      title: blog.body.match(/<title>([^<]*)<\/title>/i)?.[1] || "",
      hasContextualLinks: blog.body.includes("/services/tanzeef-filal-alryad") || blog.body.includes("/services/"),
      hasServiceHub: blog.body.includes("article-service-hub") || blog.body.includes("خدمات التنظيف ذات الصلة")
    };
  }

  console.log("\n--- DETAILED PROBE DATA ---");
  console.log("Homepage:", homeAnalysis);
  console.log("Sitemap URL Count:", sitemapCount);
  console.log("Service Detail:", villaAnalysis);
  console.log("Area Detail:", malqaAnalysis);
  console.log("Blog Post Links:", blogAnalysis);
}

runDeepLiveAnalysis().catch(console.error);
