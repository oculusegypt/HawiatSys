#!/usr/bin/env node
/**
 * prerender.mjs
 * ──────────────
 * يولّد ملفات HTML ثابتة (SSG) لجميع صفحات المدونة والخدمات والحاويات
 * مما يُمكّن جوجل من فهرسة المحتوى الكامل فور الزيارة الأولى بدون JavaScript.
 *
 * هيكل الإخراج:
 *   dist/public/blog/[slug]/index.html
 *   dist/public/services/[seo_slug]/index.html
 *   dist/public/container/[seo_slug]/index.html
 */

import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { requirePublicOrigin } from "./public-origin.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const db = new Database(join(ROOT, "data", "sabaik.db"), { readonly: true });

const distPublic = join(ROOT, "artifacts/sabaik-almasa/dist/public");

const settingRows = db.prepare("SELECT key, value FROM site_settings").all();
const settingMap = Object.fromEntries(settingRows.map(row => [row.key, row.value]));
const SEO_DEFAULTS = {
  companyName: "مؤسسة تقي جروب",
  description: "تأجير حاويات الأنقاض والنفايات والمكابس ونقل مخلفات البناء والهدم وعقود النظافة الإلكترونية بالرياض.",
  phone: "0554498403",
  address: "الرياض",
  city: "الرياض",
  region: "منطقة الرياض",
  country: "SA",
  priceRange: "$$",
  image: "/images/hero-1.webp",
};
// The administrator-configured public URL is the only production origin.
const SITE_URL = requirePublicOrigin({ settings: settingMap });
const siteCompanyName = settingMap.company_name?.trim() || SEO_DEFAULTS.companyName;
const siteDescription = settingMap.site_desc?.trim() || SEO_DEFAULTS.description;
const siteLogo = settingMap.company_logo?.trim() || "/images/logo.png";
let sitePhones = [];
try {
  const parsed = JSON.parse(settingMap.company_phones || "[]");
  if (Array.isArray(parsed)) sitePhones = parsed.filter(phone => typeof phone === "string" && phone.trim());
} catch {}
if (!sitePhones.length) sitePhones = [SEO_DEFAULTS.phone];
const sitePhoneWhatsapp = settingMap.company_phone_whatsapp || sitePhones[0] || "";
const sitePhoneCall = settingMap.company_phone_call || sitePhones[0] || sitePhoneWhatsapp;
const sitePhoneAdditional = sitePhones.find(phone => phone !== sitePhoneWhatsapp && phone !== sitePhoneCall)
  || sitePhones.find(phone => phone !== sitePhoneWhatsapp)
  || "";
const sitePhoneText = [sitePhoneWhatsapp, sitePhoneCall, sitePhoneAdditional].filter(Boolean).filter((phone, index, list) => list.indexOf(phone) === index).join(" — ");
const toInternational = (phone) => {
  const cleaned = String(phone || "").replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned : `+966${cleaned.replace(/^0/, "")}`;
};
const waLink = (phone, text) => phone
  ? `https://wa.me/${toInternational(phone).replace("+", "")}?text=${encodeURIComponent(text)}`
  : "";
const socialLinks = [
  settingMap.social_facebook,
  settingMap.social_x,
  settingMap.social_instagram,
  settingMap.social_tiktok,
  settingMap.social_snapchat,
  settingMap.social_youtube,
].map(value => String(value || "").trim()).filter(Boolean);
const address = {
  address: settingMap.company_address?.trim() || SEO_DEFAULTS.address,
  city: settingMap.company_city?.trim() || SEO_DEFAULTS.city,
  region: settingMap.company_region?.trim() || SEO_DEFAULTS.region,
  country: settingMap.company_country?.trim() || SEO_DEFAULTS.country,
  postalCode: settingMap.company_postal_code?.trim() || "",
};
function buildAddressSchema() {
  return {
    "@type": "PostalAddress",
    streetAddress: address.address || SEO_DEFAULTS.address,
    addressLocality: address.city || SEO_DEFAULTS.city,
    addressRegion: address.region || SEO_DEFAULTS.region,
    addressCountry: address.country || SEO_DEFAULTS.country,
    ...(address.postalCode ? { postalCode: address.postalCode } : {}),
  };
}
const coordinates = {
  latitude: Number(settingMap.company_latitude),
  longitude: Number(settingMap.company_longitude),
};
const dynamicServices = db.prepare(`
  SELECT title, description FROM services
  WHERE is_active = 1
  ORDER BY "order" ASC
  LIMIT 20
`).all();
const heroLcpImage = String(
  db.prepare(`
    SELECT image_url
    FROM hero_slides
    WHERE is_active = 1
    ORDER BY "order" ASC, id ASC
    LIMIT 1
  `).get()?.image_url || SEO_DEFAULTS.image,
).trim() || SEO_DEFAULTS.image;

if (!existsSync(join(distPublic, "index.html"))) {
  console.error("❌ لم يُعثر على dist/public/index.html — شغّل vite build أولاً");
  process.exit(1);
}

const rawIndexHtml = readFileSync(join(distPublic, "index.html"), "utf8");
let indexHtml = rawIndexHtml;

// كل هذه المسارات تُولّد من قاعدة البيانات في كل تشغيل. احذف الناتج السابق
// أولاً حتى لا تبقى صفحات SEO لحاويات/خدمات/مقالات حُذفت أو تعطّلت.
for (const generatedRoute of ["blog", "services", "container", "pricing", "areas"]) {
  rmSync(join(distPublic, generatedRoute), { recursive: true, force: true });
}

// استخراج روابط الأصول (CSS/JS) من الـ index.html المبني
// Vite may emit `href="..." rel="stylesheet"` (rather than the opposite
// attribute order). Only capture the local built stylesheet, not Google Fonts.
const cssLinks = [...indexHtml.matchAll(/<link[^>]+href="((?:\/)?assets\/[^"]+\.css)"[^>]*>/gi)]
  .map(match => match[1]);
const cssMatch = cssLinks.find(href => !/leaflet/i.test(href)) || cssLinks[cssLinks.length - 1];
const jsMatch   = indexHtml.match(/<script[^>]+type="module"[^>]+src="([^"]+\.js)"/);
// جمع جميع روابط modulepreload
const preloads  = [...indexHtml.matchAll(/<link[^>]+rel="modulepreload"[^>]+>/g)].map(m => m[0]);
// CSS للـ leaflet إن وُجد كـ chunk منفصل
const leafletCss = indexHtml.match(/<link[^>]+href="([^"]*leaflet[^"]*\.css)"[^>]*>/i)?.[0] || "";

const cssHref = cssMatch ? `/${cssMatch.replace(/^\/+/, "")}` : "/assets/index.css";
const jsHref  = jsMatch?.[1] || "/assets/index.js";

// ── أدوات مساعدة ──────────────────────────────────────────────────────────
function esc(s)  { return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function raw(s)  { return String(s || ""); }
function sanitizeHtml(html) {
  return (html || "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    // تحويل روابط الصور النسبية إلى root-relative (تعمل مع أي دومين)
    .replace(/src="(?!https?:\/\/|\/\/)([^/""][^"]*?)"/g, (_, p) => `src="/${p.replace(/^\/+/, "")}"`);
}

function absoluteImg(url) {
  if (!url) return `${SITE_URL}/images/logo.png`;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function imageMimeType(url) {
  const pathname = String(url || "").split(/[?#]/)[0].toLowerCase();
  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
  if (pathname.endsWith(".gif")) return "image/gif";
  if (pathname.endsWith(".svg")) return "image/svg+xml";
  if (pathname.endsWith(".ico")) return "image/x-icon";
  return "image/png";
}

function jsonLd(obj) {
  return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
}

function breadcrumbSchema(items) {
  const base = SITE_URL;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => {
      let rawUrl = item.url || item.path || "/";
      let fullUrl = rawUrl.startsWith("http") ? rawUrl : `${base}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
      return {
        "@type": "ListItem",
        "position": i + 1,
        "name": item.name,
        "item": fullUrl
      };
    })
  };
}

function breadcrumbHtml(items) {
  return items.map((b, i) => {
    const isLast = i === items.length - 1;
    const href = b.path || b.url;
    return isLast
      ? `<span aria-current="page">${esc(b.name)}</span>`
      : `<a href="${esc(href)}">${esc(b.name)}</a><span aria-hidden="true"> › </span>`;
  }).join("");
}

function homeSeoLinksNoscript() {
  const pages = db.prepare(`
    SELECT title, slug, target_keyword, seo_keywords
    FROM seo_pages
    WHERE status = 'published' AND is_active = 1
    ORDER BY published_at DESC, id DESC
  `).all();
  if (!pages.length) return "";

  const links = pages.map((page) => {
    const keyword = page.target_keyword || String(page.seo_keywords || "").split(/[，,]/)[0]?.trim() || "خدمات التنظيف بالرياض";
    const href = `${SITE_URL}/page/${encodeURIComponent(page.slug)}`;
    return `<a href="${esc(href)}" style="display:inline-block;margin:4px 6px;padding:7px 12px;border:1px solid #bee3f8;border-radius:8px;color:#1e3a5f;text-decoration:none;font-size:13px">${esc(page.title)} — ${esc(keyword)}</a>`;
  }).join("");

  return `
    <noscript>
      <section aria-label="صفحات خدمات التنظيف والكلمات الرئيسية" style="font-family:'Cairo',Arial,sans-serif;direction:rtl;max-width:1100px;margin:0 auto;padding:28px 16px;line-height:1.8">
        <h2 style="font-size:22px;color:#1e3a5f;margin:0 0 8px">صفحات خدمات التنظيف والكلمات الرئيسية</h2>
        <p style="font-size:15px;color:#4a5568;margin:0 0 14px">أدلة منشورة عن خدمات التنظيف في الرياض والمناطق القريبة.</p>
        <nav aria-label="روابط صفحات SEO">${links}</nav>
      </section>
    </noscript>`;
}

// ── المولّد الرئيسي للصفحة ────────────────────────────────────────────────
function renderPage({ title, description, keywords = "", canonical, ogImage, ogType = "website", schemas = [], breadcrumbs = [], bodyContent }) {
  // Keep canonical and social URLs absolute so crawlers do not have to infer
  // the preferred origin from a relative URL.
  const canonicalUrl = canonical || `${SITE_URL}/`;
  const imgUrl = ogImage || `${SITE_URL}/images/logo.png`;
  const imgAlt   = title.replace(/\|.*/,"").trim();

  const schemaTags = schemas.map((schema) => jsonLd(schema)).join("\n  ");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl" class="no-js">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script>
    document.documentElement.classList.remove("no-js");
    document.documentElement.classList.add("js");
  </script>
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  ${keywords ? `<meta name="keywords" content="${esc(keywords)}" />` : ""}
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="language" content="Arabic" />
  <meta name="site-public-url" content="${esc(SITE_URL)}" />
  <link rel="canonical" href="${esc(canonicalUrl)}" />

  <!-- Open Graph — root-relative image works on any domain -->
  <meta property="og:type" content="${esc(ogType)}" />
  <meta property="og:locale" content="ar_SA" />
  <meta property="og:site_name" content="${esc(siteCompanyName)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonicalUrl)}" />
  <meta property="og:image" content="${esc(imgUrl)}" />
  <meta property="og:image:type" content="${imageMimeType(imgUrl)}" />
  <meta property="og:image:alt" content="${esc(imgAlt)}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(imgUrl)}" />
  <meta name="twitter:image:alt" content="${esc(imgAlt)}" />

  <!-- Favicon -->
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="icon" type="image/x-icon" sizes="16x16 24x24 32x32 48x48 64x64 96x96 128x128 256x256" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.json" />

  <!-- Schema.org JSON-LD — emitted with the configured public origin -->
  ${schemaTags}

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

  <style>
    /*
      Keep SEO content available when JavaScript is disabled, but do not let
      it flash in a normal browser while the live React/API page boots.
    */
    #seo-static-page-content { display: none; }
    html.no-js #seo-static-page-content { display: block; }
  </style>

  <!-- App assets -->
  ${leafletCss}
  ${preloads.join("\n  ")}
  <link rel="stylesheet" crossorigin href="${esc(cssHref)}" />
</head>
<body>
  <!-- SEO-visible content for search engines & AI overviews -->
  <div id="seo-static-page-content" class="seo-crawler-content">
    <div style="font-family:'Cairo',Arial,sans-serif;direction:rtl;max-width:920px;margin:0 auto;padding:24px 16px;color:#1a202c;line-height:1.8">
      <nav aria-label="breadcrumb" style="font-size:14px;color:#718096;margin-bottom:20px">${breadcrumbHtml(breadcrumbs)}</nav>
      ${bodyContent}
    </div>
  </div>

  <!-- React mounts here — replaces loading indicator with full styled app -->
  <div id="root">
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Cairo',Arial,sans-serif;background:#f7fafc">
      <div style="text-align:center;color:#718096">
        <div style="width:40px;height:40px;border:4px solid #e2e8f0;border-top-color:#1e3a5f;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px"></div>
        <p style="font-size:14px;margin:0">جاري التحميل...</p>
      </div>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  </div>

  <script type="module" crossorigin src="${esc(jsHref)}"></script>
</body>
</html>`;
}

function publicUrl(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return SITE_URL ? `${SITE_URL}${normalized}` : normalized;
}

function dynamicHomeSchema() {
  const addressData = buildAddressSchema();
  const sameAs = [...socialLinks];
  if (sitePhoneWhatsapp) sameAs.push(`https://wa.me/${toInternational(sitePhoneWhatsapp).replace("+", "")}`);
  const business = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "HousekeepingService"],
    "@id": `${publicUrl("/")}#business`,
    "name": siteCompanyName,
    ...(siteDescription ? { description: siteDescription } : {}),
    "url": publicUrl("/"),
    "logo": absoluteImg(siteLogo),
    "image": absoluteImg(settingMap.company_image?.trim() || siteLogo || SEO_DEFAULTS.image),
    "telephone": sitePhones.length === 1 ? toInternational(sitePhones[0]) : sitePhones.map(toInternational),
    "priceRange": settingMap.company_price_range?.trim() || SEO_DEFAULTS.priceRange,
    ...(settingMap.company_payment_methods ? { paymentAccepted: settingMap.company_payment_methods } : {}),
    "address": addressData,
    ...(Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude)
      ? { geo: { "@type": "GeoCoordinates", latitude: coordinates.latitude, longitude: coordinates.longitude } }
      : {}),
    "areaServed": { "@type": "City", name: address.city || "الرياض" },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "07:00",
        "closes": "23:00"
      }
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "184",
      "bestRating": "5",
      "worstRating": "1"
    },
    ...(dynamicServices.length ? {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: siteCompanyName,
        itemListElement: dynamicServices.map(service => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: service.title,
            ...(service.description ? { description: service.description } : {}),
          },
        })),
      },
    } : {}),
    ...(sameAs.length ? { sameAs: [...new Set(sameAs)] } : {}),
  };
  return [
    business,
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "url": publicUrl("/"),
      "name": siteCompanyName,
      "inLanguage": "ar",
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${publicUrl("/blog")}?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": `ما هي خدمات التنظيف التي تقدمها ${siteCompanyName} بالرياض؟`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "نقدم تنظيف الفلل والقصور والشقق والمنازل، والتنظيف بعد البناء والتشطيب، وغسيل المجالس والكنب بالبخار، وجلي وتلميع الرخام، وغسيل المكيفات بالضغط، وتنظيف وتعقيم الخزانات ومكافحة الحشرات."
          }
        },
        {
          "@type": "Question",
          "name": `كم أسعار خدمات التنظيف في الرياض لدى ${siteCompanyName}؟`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "تبدأ أسعار تنظيف الشقق من 350 ريال، الفلل من 750 ريال، غسيل المجالس بالبخار من 200 ريال، غسيل المكيفات من 80 ريال، وجلي الرخام من 15 ريال للمتر المربع، مع معاينة مجانية وضمان كامل."
          }
        },
        {
          "@type": "Question",
          "name": "هل تقدمون ضماناً رسمياً على خدمات التنظيف؟",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "نعم، نقدم ضماناً كاملاً على جودة التنفيذ وتسليم الموقع بالملاحظات المطلوبة مع استعداد تام لمعاينة أي تعديلات مجاناً فوراً."
          }
        },
        {
          "@type": "Question",
          "name": "هل تغطون جميع أحياء شمال وشرق وغرب وجنوب ووسط الرياض؟",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "نعم، تغطي فرقنا الميدانية أكثر من 50 حياً بالرياض مع سرعة وصول تتراوح بين 30 إلى 45 دقيقة."
          }
        }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "الرئيسية",
          "item": publicUrl("/")
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "خدمات التنظيف",
          "item": publicUrl("/#services")
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "باقات النظافة",
          "item": publicUrl("/pricing")
        }
      ]
    }
  ];
}

function generateFullHomepageStaticContent() {
  const phoneCall = sitePhoneCall || "0554498403";
  const phoneWa = sitePhoneWhatsapp || "0554498403";
  const waUrl = waLink(phoneWa, "السلام عليكم، أرغب في حجز خدمة تنظيف بالرياض");

  return `
  <header style="background:#1e3a5f;color:#fff;padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.1)">
    <div style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <div style="display:flex;align-items:center;gap:12px">
        <img src="/images/logo.png" alt="${esc(siteCompanyName)}" width="48" height="48" style="height:48px;width:auto;border-radius:8px" />
        <span style="font-size:20px;font-weight:800">${esc(siteCompanyName)}</span>
      </div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <a href="tel:${esc(phoneCall)}" style="background:#2b6cb0;color:#fff;padding:8px 16px;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px">📞 ${esc(phoneCall)}</a>
        <a href="${esc(waUrl)}" style="background:#25d366;color:#fff;padding:8px 16px;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px">واتساب فوري ↗</a>
      </div>
    </div>
  </header>

  <main style="max-width:1200px;margin:0 auto;padding:24px 16px;color:#1a202c;line-height:1.8">
    <!-- Hero Section -->
    <section id="hero" style="text-align:center;padding:40px 16px;background:linear-gradient(180deg,#ebf8ff 0%,#fff 100%);border-radius:20px;margin-bottom:40px;border:1px solid #bee3f8">
      <span style="display:inline-block;background:#ebf4ff;color:#2b6cb0;padding:6px 16px;border-radius:20px;font-size:14px;font-weight:700;margin-bottom:16px">⭐ الخيار الأول لخدمات تنظيف المنازل والفلل بالرياض</span>
      <h1 style="font-size:clamp(26px,5vw,42px);font-weight:900;color:#1e3a5f;margin:0 0 16px;line-height:1.3">
        مؤسسة تقي جروب لخدمات تنظيف المنازل والفلل بالرياض
      </h1>
      <p style="font-size:18px;color:#4a5568;max-width:850px;margin:0 auto 24px;line-height:1.8">
        نقدم خدمات النظافة المتخصصة والشاملة للفلل، القصور، الشقق، والمباني بعد التشطيب، وغسيل المجالس والمفروشات بالبخار 140°، وجلي وتلميع الرخام بالألماس، وصيانة وتنظيف المكيفات مع ضمان 100% وسرعة وصول خلال 30 إلى 45 دقيقة لكافة أحياء الرياض.
      </p>
      <div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin-bottom:24px">
        <a href="tel:${esc(phoneCall)}" style="background:#1e3a5f;color:#fff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:800;text-decoration:none">اتصال مباشر: ${esc(phoneCall)}</a>
        <a href="${esc(waUrl)}" style="background:#25d366;color:#fff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:800;text-decoration:none">حجز موعد عبر واتساب ↗</a>
      </div>
      <div style="display:flex;justify-content:center;gap:24px;flex-wrap:wrap;font-size:14px;color:#4a5568;font-weight:700">
        <span>⏱️ وصول خلال 30-45 دقيقة</span>
        <span>🛡️ ضمان كامل على العمل</span>
        <span>✨ ماكينات إيطالية ومواد معتمدة</span>
        <span>★ 4.9 تقييم العملاء (184 تقييماً)</span>
      </div>
    </section>

    <!-- Services Pillars -->
    <section id="services" style="margin-bottom:48px">
      <div style="text-align:center;margin-bottom:32px">
        <h2 style="font-size:28px;font-weight:800;color:#1e3a5f;margin:0 0 8px">خدماتنا الأساسية للتنظيف المتخصص بالرياض</h2>
        <p style="font-size:16px;color:#718096;margin:0">خدمات متكاملة للمباني السكنية والتجارية بأحدث المعدات الفنية والعمالة المدربة</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px">
        <div style="padding:24px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
          <h3 style="font-size:20px;font-weight:800;color:#2b6cb0;margin:0 0 10px"><a href="/services/tanzeef-filal-alryad" style="color:inherit;text-decoration:none">تنظيف الفلل والقصور</a></h3>
          <p style="font-size:15px;color:#4a5568;margin-bottom:16px">تنظيف شامل للأدوار، الأجنحة، المسابح، الواجهات، والحدائق مع التعقيم الشامل.</p>
          <a href="/services/tanzeef-filal-alryad" style="color:#3182ce;font-weight:700;text-decoration:none">تفاصيل الخدمة والأسعار ←</a>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
          <h3 style="font-size:20px;font-weight:800;color:#2b6cb0;margin:0 0 10px"><a href="/services/tanzeef-shaqaq-alryad" style="color:inherit;text-decoration:none">تنظيف الشقق السكنية</a></h3>
          <p style="font-size:15px;color:#4a5568;margin-bottom:16px">غسيل السيراميك، المطابخ، الحمامات، الدرايش، وتطهير كامل بأحدث المنظفات.</p>
          <a href="/services/tanzeef-shaqaq-alryad" style="color:#3182ce;font-weight:700;text-decoration:none">تفاصيل الخدمة والأسعار ←</a>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
          <h3 style="font-size:20px;font-weight:800;color:#2b6cb0;margin:0 0 10px"><a href="/services/tanzeef-bad-altashteeb-alryad" style="color:inherit;text-decoration:none">تنظيف بعد البناء والتشطيب</a></h3>
          <p style="font-size:15px;color:#4a5568;margin-bottom:16px">إزالة بقايا الإسمنت، الدهان، الترويبة، وتلميع الأرضيات وتسليم مفتاح جاهز للسكن.</p>
          <a href="/services/tanzeef-bad-altashteeb-alryad" style="color:#3182ce;font-weight:700;text-decoration:none">تفاصيل الخدمة والأسعار ←</a>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
          <h3 style="font-size:20px;font-weight:800;color:#2b6cb0;margin:0 0 10px"><a href="/services/gaseel-majalis-bukhar-alryad" style="color:inherit;text-decoration:none">غسيل المجالس والكنب بالبخار</a></h3>
          <p style="font-size:15px;color:#4a5568;margin-bottom:16px">تنظيف حراري بدرجة 140° وتعقيم وإزالة البقع الصعبة مع تجفيف فوري خلال 30 دقيقة.</p>
          <a href="/services/gaseel-majalis-bukhar-alryad" style="color:#3182ce;font-weight:700;text-decoration:none">تفاصيل الخدمة والأسعار ←</a>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
          <h3 style="font-size:20px;font-weight:800;color:#2b6cb0;margin:0 0 10px"><a href="/services/tanzeef-mokeyafat-alryad" style="color:inherit;text-decoration:none">تنظيف وغسيل المكيفات</a></h3>
          <p style="font-size:15px;color:#4a5568;margin-bottom:16px">غسيل بضغط ماء 150 بار مع جراب الحماية المائي لمنع تناثر المياه وفحص الفريون.</p>
          <a href="/services/tanzeef-mokeyafat-alryad" style="color:#3182ce;font-weight:700;text-decoration:none">تفاصيل الخدمة والأسعار ←</a>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
          <h3 style="font-size:20px;font-weight:800;color:#2b6cb0;margin:0 0 10px"><a href="/services/jaly-rakham-alryad" style="color:inherit;text-decoration:none">جلي وتلميع الرخام والبلاط</a></h3>
          <p style="font-size:15px;color:#4a5568;margin-bottom:16px">جلي مائي بأقراص الألماس وتلميع بالكريستال الإيطالي لإعادة البريق ولمعان المرآة.</p>
          <a href="/services/jaly-rakham-alryad" style="color:#3182ce;font-weight:700;text-decoration:none">تفاصيل الخدمة والأسعار ←</a>
        </div>
      </div>
    </section>

    <!-- Pricing Packages -->
    <section id="packages" style="margin-bottom:48px;padding:32px 20px;background:#f7fafc;border-radius:20px;border:1px solid #e2e8f0">
      <div style="text-align:center;margin-bottom:28px">
        <h2 style="font-size:26px;font-weight:800;color:#1e3a5f;margin:0 0 8px">باقات وأسعار التنظيف في الرياض</h2>
        <p style="font-size:15px;color:#718096;margin:0">أسعار واضحة وشفافة بدون أي رسوم خفية مع معاينة مجانية</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">
        <div style="padding:20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;text-align:center">
          <h3 style="font-size:18px;font-weight:700;margin:0 0 8px">تنظيف الشقق السكنية</h3>
          <div style="font-size:24px;font-weight:900;color:#2b6cb0;margin-bottom:8px">يبدأ من 350 <span style="font-size:14px;font-weight:600">ريال</span></div>
          <p style="font-size:13px;color:#718096;margin:0">تنظيف وتعقيم كامل للغرف والمطبخ والحمامات</p>
        </div>
        <div style="padding:20px;background:#fff;border-radius:12px;border:2px solid #2b6cb0;text-align:center;position:relative">
          <span style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#2b6cb0;color:#fff;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700">الأكثر طلباً</span>
          <h3 style="font-size:18px;font-weight:700;margin:0 0 8px">تنظيف الفلل والقصور</h3>
          <div style="font-size:24px;font-weight:900;color:#2b6cb0;margin-bottom:8px">يبدأ من 750 <span style="font-size:14px;font-weight:600">ريال</span></div>
          <p style="font-size:13px;color:#718096;margin:0">تنظيف شامل للأدوار والدرج والأحواش والمسابح</p>
        </div>
        <div style="padding:20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;text-align:center">
          <h3 style="font-size:18px;font-weight:700;margin:0 0 8px">تنظيف بعد التشطيب</h3>
          <div style="font-size:24px;font-weight:900;color:#2b6cb0;margin-bottom:8px">يبدأ من 900 <span style="font-size:14px;font-weight:600">ريال</span></div>
          <p style="font-size:13px;color:#718096;margin:0">إزالة الإسمنت والدهان والترويبة وتسليم مفتاح</p>
        </div>
        <div style="padding:20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;text-align:center">
          <h3 style="font-size:18px;font-weight:700;margin:0 0 8px">غسيل المجالس بالبخار</h3>
          <div style="font-size:24px;font-weight:900;color:#2b6cb0;margin-bottom:8px">يبدأ من 200 <span style="font-size:14px;font-weight:600">ريال</span></div>
          <p style="font-size:13px;color:#718096;margin:0">تنظيف عميق بالبخار 140° مع التجفيف الفوري</p>
        </div>
        <div style="padding:20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;text-align:center">
          <h3 style="font-size:18px;font-weight:700;margin:0 0 8px">غسيل المكيفات سبليت</h3>
          <div style="font-size:24px;font-weight:900;color:#2b6cb0;margin-bottom:8px">يبدأ من 80 <span style="font-size:14px;font-weight:600">ريال</span></div>
          <p style="font-size:13px;color:#718096;margin:0">غسيل بالضغط العالي مع جراب الحماية المائي</p>
        </div>
        <div style="padding:20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;text-align:center">
          <h3 style="font-size:18px;font-weight:700;margin:0 0 8px">جلي وتلميع الرخام</h3>
          <div style="font-size:24px;font-weight:900;color:#2b6cb0;margin-bottom:8px">يبدأ من 15 <span style="font-size:14px;font-weight:600">ريال / م²</span></div>
          <p style="font-size:13px;color:#718096;margin:0">جلي بالألماس وتلميع بالكريستال الإيطالي</p>
        </div>
      </div>
    </section>

    <!-- Why Choose Us & Trust Evidence -->
    <section id="why-us" style="margin-bottom:48px;padding:32px 24px;background:#1e3a5f;color:#fff;border-radius:20px">
      <div style="text-align:center;margin-bottom:28px">
        <h2 style="font-size:26px;font-weight:800;margin:0 0 8px">لماذا تختار مؤسسة تقي جروب بالرياض؟</h2>
        <p style="font-size:16px;color:#cbd5e0;margin:0">نلتزم بأعلى معايير الجودة والاحترافية لتقديم تجربة تنظيف استثنائية</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px">
        <div style="padding:16px;background:rgba(255,255,255,0.08);border-radius:12px">
          <h4 style="font-size:17px;font-weight:700;margin:0 0 8px">🛠️ أحدث المعدات العالمية</h4>
          <p style="font-size:14px;color:#e2e8f0;margin:0">ماكينات جلي الرخام الإيطالية (Klindex)، ومضخات غسيل 150 بار، وأجهزة بخار 140°C.</p>
        </div>
        <div style="padding:16px;background:rgba(255,255,255,0.08);border-radius:12px">
          <h4 style="font-size:17px;font-weight:700;margin:0 0 8px">🌿 مواد آمنة ومعتمدة</h4>
          <p style="font-size:14px;color:#e2e8f0;margin:0">منظفات ومعقمات ألمانية مصرحة وصديقة للبيئة بدون أي روائح نفاذة أو أضرار صحية.</p>
        </div>
        <div style="padding:16px;background:rgba(255,255,255,0.08);border-radius:12px">
          <h4 style="font-size:17px;font-weight:700;margin:0 0 8px">🛡️ ضمان الجودة 100%</h4>
          <p style="font-size:14px;color:#e2e8f0;margin:0">تسليم الموقع وفق جدول ملاحظات العميل مع استعداد تام لمعاينة وتعديل أي ملاحظة مجاناً.</p>
        </div>
        <div style="padding:16px;background:rgba(255,255,255,0.08);border-radius:12px">
          <h4 style="font-size:17px;font-weight:700;margin:0 0 8px">📍 تغطية شاملة لكافة الأحياء</h4>
          <p style="font-size:14px;color:#e2e8f0;margin:0">أكثر من 50 حياً في شمال وشرق وغرب وجنوب ووسط الرياض مع فرق ميدانية سريعة الانتشار.</p>
        </div>
      </div>
    </section>

    <!-- Verified Customer Reviews (E-E-A-T) -->
    <section id="reviews" style="margin-bottom:48px">
      <div style="text-align:center;margin-bottom:24px">
        <h2 style="font-size:24px;font-weight:800;color:#1e3a5f;margin:0 0 6px">آراء وتقييمات العملاء الموثقة في الرياض</h2>
        <p style="font-size:15px;color:#718096;margin:0">★ 4.9 من 5 بناءً على 184 تقييماً موثقاً لخدمات التنظيف بالرياض</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">
        <div style="padding:20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
          <div style="color:#d69e2e;font-size:16px;margin-bottom:6px">★★★★★ (5/5)</div>
          <p style="font-size:14px;color:#4a5568;margin:0 0 10px;line-height:1.7">"خدمة تنظيف فيلا بعد التشطيب بحي الملقا ممتازة جداً. تمت إزالة كل بقع الدهان والإسمنت وتلميع الرخام باحتراف عالي."</p>
          <strong style="font-size:13px;color:#1e3a5f">— أبو فهد القحطاني (حي الملقا)</strong>
        </div>
        <div style="padding:20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
          <div style="color:#d69e2e;font-size:16px;margin-bottom:6px">★★★★★ (5/5)</div>
          <p style="font-size:14px;color:#4a5568;margin:0 0 10px;line-height:1.7">"غسيل مجالس وكنب بالبخار وتنظيف 4 مكيفات سبليت. شغل نظيف جداً وتجفيف سريع بدون أي فوضى."</p>
          <strong style="font-size:13px;color:#1e3a5f">— سلطان العتيبي (حي الياسمين)</strong>
        </div>
        <div style="padding:20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
          <div style="color:#d69e2e;font-size:16px;margin-bottom:6px">★★★★★ (5/5)</div>
          <p style="font-size:14px;color:#4a5568;margin:0 0 10px;line-height:1.7">"جلي وتلميع رخام الصالة بالكريستال الإيطالي، النتيجة كانت مبهرة وعاد الرخام كالجديد تماماً."</p>
          <strong style="font-size:13px;color:#1e3a5f">— خالد الدوسري (حي النرجس)</strong>
        </div>
      </div>
    </section>

    <!-- Service Areas (50 Districts) -->
    <section id="areas" style="margin-bottom:48px;padding:28px 20px;background:#ebf8ff;border-radius:20px;border:1px solid #bee3f8">
      <div style="text-align:center;margin-bottom:20px">
        <h2 style="font-size:24px;font-weight:800;color:#1e3a5f;margin:0 0 6px">أحياء ومناطق الخدمة في مدينة الرياض</h2>
        <p style="font-size:15px;color:#4a5568;margin:0">نغطي أكثر من 50 حياً مع وصول سريع لفرقنا الميدانية المجهزة</p>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">
        <a href="/areas/حي-الملقا" style="padding:6px 14px;background:#fff;color:#2b6cb0;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;border:1px solid #bee3f8">حي الملقا</a>
        <a href="/areas/حي-الياسمين" style="padding:6px 14px;background:#fff;color:#2b6cb0;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;border:1px solid #bee3f8">حي الياسمين</a>
        <a href="/areas/حي-النرجس" style="padding:6px 14px;background:#fff;color:#2b6cb0;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;border:1px solid #bee3f8">حي النرجس</a>
        <a href="/areas/حي-حطين" style="padding:6px 14px;background:#fff;color:#2b6cb0;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;border:1px solid #bee3f8">حي حطين</a>
        <a href="/areas/حي-الصحافة" style="padding:6px 14px;background:#fff;color:#2b6cb0;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;border:1px solid #bee3f8">حي الصحافة</a>
        <a href="/areas/حي-العارض" style="padding:6px 14px;background:#fff;color:#2b6cb0;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;border:1px solid #bee3f8">حي العارض</a>
        <a href="/areas/حي-الروضة" style="padding:6px 14px;background:#fff;color:#2b6cb0;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;border:1px solid #bee3f8">حي الروضة</a>
        <a href="/areas/حي-المونسية" style="padding:6px 14px;background:#fff;color:#2b6cb0;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;border:1px solid #bee3f8">حي المونسية</a>
        <a href="/areas/حي-اليرموك" style="padding:6px 14px;background:#fff;color:#2b6cb0;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;border:1px solid #bee3f8">حي اليرموك</a>
        <a href="/areas/حي-قرطبة" style="padding:6px 14px;background:#fff;color:#2b6cb0;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;border:1px solid #bee3f8">حي قرطبة</a>
        <a href="/areas/حي-السويدي" style="padding:6px 14px;background:#fff;color:#2b6cb0;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;border:1px solid #bee3f8">حي السويدي</a>
        <a href="/areas/ظهرة-لبن" style="padding:6px 14px;background:#fff;color:#2b6cb0;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;border:1px solid #bee3f8">ظهرة لبن</a>
        <a href="/areas/حي-العليا" style="padding:6px 14px;background:#fff;color:#2b6cb0;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;border:1px solid #bee3f8">حي العليا</a>
        <a href="/areas/حي-السليمانية" style="padding:6px 14px;background:#fff;color:#2b6cb0;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;border:1px solid #bee3f8">حي السليمانية</a>
        <a href="/areas" style="padding:6px 14px;background:#2b6cb0;color:#fff;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700">تصفح كافة الـ 50 حياً ←</a>
      </div>
    </section>

    <!-- FAQ Section -->
    <section id="faq" style="margin-bottom:48px">
      <div style="text-align:center;margin-bottom:24px">
        <h2 style="font-size:24px;font-weight:800;color:#1e3a5f;margin:0 0 6px">الأسئلة الشائعة حول خدمات التنظيف بالرياض</h2>
        <p style="font-size:15px;color:#718096;margin:0">إجابات مباشرة على أكثر الاستفسارات شيوعاً</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="padding:18px 20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
          <h3 style="font-size:16px;font-weight:800;color:#1e3a5f;margin:0 0 6px">ما هي الخدمات التي تقدمها مؤسسة تقي جروب بالرياض؟</h3>
          <p style="font-size:14px;color:#4a5568;margin:0;line-height:1.7">نقدم تنظيف الفلل، القصور، الشقق، المباني بعد التشطيب وإزالة الإسمنت، غسيل المجالس والكنب بالبخار 140°، جلي وتلميع الرخام بالألماس، تنظيف المكيفات سبليت، وتعقيم الخزانات ومكافحة الحشرات.</p>
        </div>
        <div style="padding:18px 20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
          <h3 style="font-size:16px;font-weight:800;color:#1e3a5f;margin:0 0 6px">كم تبدأ أسعار خدمات التنظيف لديكم؟</h3>
          <p style="font-size:14px;color:#4a5568;margin:0;line-height:1.7">تبدأ أسعار الشقق من 350 ريال، الفلل من 750 ريال، غسيل المجالس من 200 ريال، غسيل المكيفات من 80 ريال، وجلي الرخام من 15 ريال/م²، مع معاينة مجانية وضمان كامل.</p>
        </div>
        <div style="padding:18px 20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
          <h3 style="font-size:16px;font-weight:800;color:#1e3a5f;margin:0 0 6px">ما هي مدة وصول الفريق بعد تأكيد الحجز؟</h3>
          <p style="font-size:14px;color:#4a5568;margin:0;line-height:1.7">تصل فرقنا الميدانية المجهزة بكافة المعدات والمواد إلى موقع العميل في أي حي داخل الرياض خلال 30 إلى 45 دقيقة.</p>
        </div>
        <div style="padding:18px 20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
          <h3 style="font-size:16px;font-weight:800;color:#1e3a5f;margin:0 0 6px">هل تقدمون ضماناً على خدمات التنظيف وجلي الرخام؟</h3>
          <p style="font-size:14px;color:#4a5568;margin:0;line-height:1.7">نعم، نقدم ضماناً كاملاً على جودة التنفيذ وعدم وجود أي تلفيات، مع تسليم الموقع وفق قائمة فحص دقيقة ومطابقة لاشتراطات العميل.</p>
        </div>
      </div>
    </section>

    <!-- Categorized Directory -->
    <section id="directory" style="margin-bottom:32px;padding:24px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0">
      <h2 style="font-size:20px;font-weight:800;color:#1e3a5f;margin:0 0 12px;text-align:center">دليل موضوعات وخدمات النظافة المتخصصة بالرياض</h2>
      <p style="font-size:14px;color:#718096;text-align:center;margin:0 0 20px">فهرس منظم لأدلة وموضوعات التنظيف المصنفة لخدمة سكان ومنشآت مدينة الرياض</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">
        ${db.prepare(`SELECT title, slug FROM seo_pages WHERE status = 'published' AND is_active = 1 LIMIT 30`).all().map(p => 
          `<a href="/page/${esc(p.slug)}" style="padding:6px 12px;background:#fff;color:#4a5568;border-radius:8px;text-decoration:none;font-size:12px;border:1px solid #e2e8f0">${esc(p.title.replace(/\|.*/, "").trim())}</a>`
        ).join("")}
      </div>
    </section>
  </main>
  `;
}

function generateHomepageStaticContent() {
  const phoneCall = sitePhoneCall || SEO_DEFAULTS.phone;
  const phoneWa = sitePhoneWhatsapp || phoneCall;
  const phoneHref = `tel:${phoneCall}`;
  const waHref = waLink(phoneWa, `السلام عليكم، أرغب في طلب خدمة من ${siteCompanyName}`);
  const logoUrl = absoluteImg(siteLogo);
  const heroUrl = absoluteImg(heroLcpImage);
  const internalLinks = [
    ["/pricing", "أسعار وخدمات تأجير الحاويات"],
    ["/packages", "باقات الحاويات المتاحة"],
    ["/areas", "مناطق التغطية في الرياض"],
    ["/blog", "دليل تأجير الحاويات ونقل المخلفات"],
  ];

  return `
    <header style="border-bottom:1px solid #dbe7ec;background:#ffffff">
      <div style="max-width:1180px;margin:0 auto;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap">
        <a href="/" style="display:flex;align-items:center;gap:12px;color:#12384b;text-decoration:none;font-weight:800">
          <img src="${esc(logoUrl)}" alt="${esc(siteCompanyName)}" width="52" height="52" style="width:52px;height:52px;object-fit:contain;border-radius:12px" />
          <span>${esc(siteCompanyName)}</span>
        </a>
        <nav aria-label="الروابط الأساسية" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;font-size:14px">
          ${internalLinks.slice(0, 3).map(([href, label]) => `<a href="${href}" style="color:#406170;text-decoration:none;font-weight:700">${esc(label)}</a>`).join("")}
          <a href="${esc(phoneHref)}" style="background:#12384b;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:800">اتصل الآن</a>
        </nav>
      </div>
    </header>
    <main style="max-width:1180px;margin:0 auto;padding:28px 20px 56px;color:#163b4c;line-height:1.8">
      <section style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr);align-items:center;gap:34px;padding:28px 0 42px">
        <div>
          <p style="margin:0 0 12px;color:#2b8f8b;font-size:14px;font-weight:800">حلول موثوقة للمخلفات في الرياض</p>
          <h1 style="margin:0 0 18px;color:#12384b;font-size:clamp(28px,5vw,48px);line-height:1.25;font-weight:900">${esc(siteCompanyName)} — تأجير حاويات الأنقاض والنفايات بالرياض</h1>
          <p style="margin:0 0 24px;max-width:720px;color:#52707c;font-size:18px">${esc(siteDescription)}</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <a href="${esc(waHref)}" style="background:#2b8f8b;color:#fff;padding:13px 22px;border-radius:11px;text-decoration:none;font-weight:800">اطلب عرضًا عبر واتساب</a>
            <a href="${esc(phoneHref)}" style="border:1px solid #b9ced4;color:#12384b;padding:13px 22px;border-radius:11px;text-decoration:none;font-weight:800">اتصال مباشر ${esc(phoneCall)}</a>
          </div>
        </div>
        <img src="${esc(heroUrl)}" alt="حاويات ونقل مخلفات البناء في الرياض" width="1200" height="675" style="width:100%;height:auto;max-height:340px;object-fit:cover;border-radius:22px;box-shadow:0 18px 40px rgba(18,56,75,.16)" />
      </section>
      <section style="border-top:1px solid #e5eef1;padding-top:30px">
        <h2 style="margin:0 0 10px;color:#12384b;font-size:26px;font-weight:900">تأجير الحاويات ونقل المخلفات بخدمة واضحة</h2>
        <p style="margin:0 0 20px;color:#52707c;font-size:16px">نوفر حاويات متعددة المقاسات للمنازل والمشاريع والمنشآت، مع التوصيل والسحب ونقل الأنقاض ومخلفات البناء داخل أحياء الرياض.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${internalLinks.map(([href, label]) => `<a href="${href}" style="display:inline-block;border:1px solid #d2e2e6;border-radius:10px;padding:9px 13px;color:#246b70;text-decoration:none;font-weight:700;font-size:14px">${esc(label)}</a>`).join("")}
        </div>
      </section>
    </main>
  `;
}

function updateIndexSeo(html) {
  const title = siteCompanyName;
  const description = siteDescription;
  const logo = siteLogo ? absoluteImg(siteLogo) : publicUrl("/images/logo.png");
  const heroPreload = `<link rel="preload" as="image" href="${esc(absoluteImg(heroLcpImage))}" fetchpriority="high" imagesizes="100vw" data-lcp-hero="true" />`;
  const replace = (source, pattern, value) => source.replace(pattern, value);
  const upsert = (source, pattern, tag) => pattern.test(source)
    ? source.replace(pattern, tag)
    : source.replace(/<\/head>/i, `${tag}\n</head>`);
  let next = html;
  next = next.replace(/<html\b([^>]*)>/i, (_, attrs) => `<html${attrs} class="no-js">`);
  next = next.replace(
    /<head>/i,
    `<head>
  <script>
    document.documentElement.classList.remove("no-js");
    document.documentElement.classList.add("js");
  </script>
  <style>
    /* Keep the SEO snapshot for crawlers/no-JS clients, never as stale first paint for live users. */
    #seo-static-page-content { display: none; }
    html.no-js #seo-static-page-content { display: block; }
    html.no-js #app-loading-shell { display: none; }
  </style>`,
  );
  next = replace(next, /<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  next = replace(next, /(<meta\s+name="description"\s+content=")[^"]*(")/i, `$1${esc(description)}$2`);
  next = replace(next, /(<meta\s+name="author"\s+content=")[^"]*(")/i, `$1${esc(siteCompanyName)}$2`);
  next = upsert(next, /<meta\s+name=["']site-public-url["'][^>]*>/i, `<meta name="site-public-url" content="${esc(SITE_URL)}" />`);
  next = upsert(next, /<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${esc(publicUrl("/"))}" />`);
  next = upsert(next, /<link[^>]+data-lcp-hero=["']true["'][^>]*>/i, heroPreload);
  next = replace(next, /(<meta\s+property="og:site_name"\s+content=")[^"]*(")/i, `$1${esc(siteCompanyName)}$2`);
  next = replace(next, /(<meta\s+property="og:title"\s+content=")[^"]*(")/i, `$1${esc(title)}$2`);
  next = replace(next, /(<meta\s+property="og:description"\s+content=")[^"]*(")/i, `$1${esc(description)}$2`);
  next = upsert(next, /<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${esc(publicUrl("/"))}" />`);
  next = replace(next, /(<meta\s+property="og:image"\s+content=")[^"]*(")/i, `$1${esc(logo)}$2`);
  next = upsert(next, /<meta\s+property=["']og:image:type["'][^>]*>/i, `<meta property="og:image:type" content="${imageMimeType(logo)}" />`);
  next = replace(next, /(<meta\s+property="og:image:alt"\s+content=")[^"]*(")/i, `$1${esc(siteCompanyName)}$2`);
  next = replace(next, /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/i, `$1${esc(title)}$2`);
  next = replace(next, /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/i, `$1${esc(description)}$2`);
  next = replace(next, /(<meta\s+name="twitter:image"\s+content=")[^"]*(")/i, `$1${esc(logo)}$2`);
  next = next.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, "");
  const schemaIds = ["home-local-business-schema", "home-website-schema", "home-faq-schema", "home-breadcrumbs-schema"];
  const schemas = dynamicHomeSchema().map((schema, index) =>
    `<script id="${schemaIds[index] || `home-schema-${index}`}" type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`,
  ).join("\n");
  const withSchemas = next.replace(/<\/head>/i, `${schemas}\n</head>`);
  
  // The client clears this mount point before React renders. Keep the
  // data-backed snapshot for crawlers/no-JS clients, but hide it immediately
  // for live users so stale content cannot flash before the API response.
  return withSchemas.replace(
    /<div id="root">\s*<\/div>/i,
    `<div id="root">
      <div id="seo-static-page-content" class="seo-crawler-content">${generateHomepageStaticContent()}</div>
      <div id="app-loading-shell" style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Tajawal',Arial,sans-serif;background:#f7fafc">
        <div style="text-align:center;color:#718096">
          <div style="width:40px;height:40px;border:4px solid #e2e8f0;border-top-color:#1e3a5f;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px"></div>
          <p style="font-size:14px;margin:0">جاري تجهيز البيانات الحقيقية...</p>
        </div>
      </div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>`,
  );
}

// Replace the source index metadata during every build so the first HTML
// response cannot expose an identity or domain from a previous project.
indexHtml = updateIndexSeo(rawIndexHtml);
writeFileSync(join(distPublic, "index.html"), indexHtml, "utf8");

function savePage(relPath, html) {
  const fullPath = join(distPublic, relPath, "index.html");
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, html, "utf8");
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. مقالات المدونة
// ══════════════════════════════════════════════════════════════════════════════
const posts = db.prepare(`
  SELECT id, title, slug, content, excerpt, cover_image, og_image, author, category,
         seo_title, seo_description, seo_keywords, seo_slug,
         published_at, updated_at, created_at, read_time
  FROM posts
  WHERE status = 'published' AND is_active = 1
  ORDER BY id ASC
`).all();

console.log(`\n📝 إنشاء ${posts.length} صفحة مقالات...`);

for (const post of posts) {
  const slug = post.slug || post.seo_slug;
  if (!slug) continue;

  const canonical   = `${SITE_URL}/blog/${encodeURIComponent(slug)}`;
  const title       = post.seo_title || `${post.title} | ${siteCompanyName}`;
  const description = post.seo_description || post.excerpt || post.title;
  const ogImage     = post.og_image || post.cover_image || `${SITE_URL}/images/hero-1.webp`;
  const postDate    = post.published_at || post.created_at || new Date().toISOString();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": description,
    "image": absoluteImg(ogImage),
    "datePublished": postDate,
    "dateModified": post.updated_at || postDate,
    "mainEntityOfPage": { "@type": "WebPage", "@id": canonical },
    "inLanguage": "ar",
    "author": {
      "@type": "Organization",
      "name": siteCompanyName,
      "url": SITE_URL
    },
    "publisher": {
      "@type": "Organization",
      "name": siteCompanyName,
      "logo": { "@type": "ImageObject", "url": absoluteImg(siteLogo) }
    }
  };

  const crumbs = [
    { name: "الرئيسية", url: SITE_URL },
    { name: "المدونة",  url: `${SITE_URL}/blog` },
    { name: post.title, url: canonical }
  ];

  const bodyContent = `
    <article itemscope itemtype="https://schema.org/BlogPosting">
      <h1 itemprop="headline" style="font-size:clamp(24px,4vw,36px);font-weight:800;color:#1a202c;margin:0 0 16px;line-height:1.3">
        ${esc(post.title)}
      </h1>
      <div style="display:flex;gap:12px;font-size:14px;color:#718096;margin-bottom:24px;align-items:center;flex-wrap:wrap">
        <span>بواسطة: <strong>${esc(post.author || siteCompanyName)}</strong></span>
        ${post.category ? `<span style="background:#ebf4ff;color:#2b6cb0;padding:2px 10px;border-radius:20px;font-weight:600">${esc(post.category)}</span>` : ""}
        ${post.read_time ? `<span>⏱ ${post.read_time} دقائق قراءة</span>` : ""}
      </div>
      ${ogImage ? `<img src="${esc(absoluteImg(ogImage))}" alt="${esc(post.title)}" style="width:100%;max-height:420px;object-fit:cover;border-radius:12px;margin-bottom:28px" loading="eager" />` : ""}
      <div itemprop="articleBody" class="article-content" style="font-size:17px;line-height:1.9;color:#2d3748">
        ${sanitizeHtml(post.content)}
      </div>
      <div style="margin-top:40px;padding:24px;background:#ebf8ff;border-radius:12px;border-right:4px solid #3182ce">
        <p style="font-weight:700;color:#2b6cb0;margin:0 0 8px;font-size:18px">هل تحتاج إلى استشارة أو خدمة تنظيف متخصصة بالرياض؟</p>
        <p style="color:#4a5568;margin:0 0 16px;font-size:15px">تواصل معنا الآن لتحصل على عرض سعر مجاني واستجابة سريعة من فريق عملنا المتخصص.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <a href="tel:${esc(sitePhoneCall)}" style="background:#2b6cb0;color:white;padding:10px 20px;border-radius:8px;font-weight:700;text-decoration:none">📞 اتصال: ${esc(sitePhoneCall)}</a>
          <a href="${waLink(sitePhoneWhatsapp, `استفسار بخصوص مقال: ${post.title}`)}" style="background:#25d366;color:white;padding:10px 20px;border-radius:8px;font-weight:700;text-decoration:none">واتساب ↗</a>
        </div>
      </div>
    </article>`;

  const html = renderPage({
    title, description, canonical, ogImage,
    ogType: "article",
    keywords: post.seo_keywords || "",
    schemas: [articleSchema, breadcrumbSchema(crumbs)],
    breadcrumbs: crumbs,
    bodyContent
  });

  savePage(`blog/${slug}`, html);
}
console.log(`   ✅ ${posts.length} مقالة`);

// ── صفحة قائمة المدونة /blog/index.html ──────────────────────────────────────
{
  const blogCanonical  = `${SITE_URL}/blog`;
  const blogTitle      = `مدونة النظافة والعناية بالمنزل | ${siteCompanyName} بالرياض`;
  const blogDesc       = siteDescription || "مقالات ونصائح تساعدك على اختيار الخدمات المناسبة والعناية بالمكان.";
  const blogOgImage    = posts[0]?.cover_image || `${SITE_URL}/images/hero-1.webp`;

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": blogTitle,
    "description": blogDesc,
    "url": blogCanonical,
    "inLanguage": "ar",
    "publisher": {
      "@type": "Organization",
      "name": siteCompanyName,
      "logo": { "@type": "ImageObject", "url": absoluteImg(siteLogo) }
    }
  };

  const crumbs = [
    { name: "الرئيسية", url: SITE_URL },
    { name: "المدونة",  url: blogCanonical },
  ];

  const postCardsHtml = posts.slice(0, 30).map(post => {
    const slug   = post.slug || post.seo_slug;
    const img    = post.cover_image || post.og_image || "";
    const date   = (post.published_at || post.created_at || "").slice(0, 10);
    return `
    <a href="${esc(SITE_URL)}/blog/${esc(slug)}" style="display:flex;gap:16px;padding:20px;border-radius:12px;background:#fff;border:1px solid #e2e8f0;text-decoration:none;color:inherit;transition:box-shadow .2s">
      ${img ? `<img src="${esc(absoluteImg(img))}" alt="${esc(post.title)}" width="120" height="80" style="width:120px;height:80px;object-fit:cover;border-radius:8px;flex-shrink:0" loading="lazy" />` : ""}
      <div style="min-width:0">
        ${post.category ? `<span style="font-size:12px;color:#3182ce;font-weight:700">${esc(post.category)}</span>` : ""}
        <h2 style="font-size:16px;font-weight:800;color:#1a202c;margin:4px 0 6px;line-height:1.4">${esc(post.title)}</h2>
        ${post.excerpt ? `<p style="font-size:14px;color:#718096;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(post.excerpt)}</p>` : ""}
        <div style="font-size:12px;color:#a0aec0;margin-top:8px">${date}${post.read_time ? ` · ${post.read_time} دقائق` : ""}</div>
      </div>
    </a>`;
  }).join("\n");

  const bodyContent = `
    <h1 style="font-size:clamp(22px,4vw,30px);font-weight:800;color:#1a202c;margin:0 0 8px;line-height:1.4">${esc(blogTitle)}</h1>
    <p style="font-size:16px;color:#718096;margin:0 0 28px">${esc(blogDesc)}</p>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${postCardsHtml}
    </div>
    ${posts.length > 30 ? `<p style="text-align:center;color:#718096;margin-top:24px;font-size:14px">عرض أحدث 30 مقالاً — تصفّح الموقع لرؤية المزيد</p>` : ""}`;

  const html = renderPage({
    title: blogTitle, description: blogDesc, canonical: blogCanonical,
    ogImage: blogOgImage, ogType: "website",
    keywords: "مدونة تنظيف منازل الرياض, نصائح تنظيف الفلل, شركة تنظيف بالرياض, جلي الرخام بالرياض",
    schemas: [blogSchema, breadcrumbSchema(crumbs)],
    breadcrumbs: crumbs,
    bodyContent,
  });

  savePage("blog", html);
  console.log(`   ✅ صفحة قائمة المدونة /blog`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. صفحات الخدمات
// ══════════════════════════════════════════════════════════════════════════════
const services = db.prepare(`
  SELECT id, title, description, icon, image_url, images,
         seo_slug, seo_title, seo_description, seo_keywords
  FROM services
  WHERE is_active = 1 AND seo_enabled = 1
    AND seo_slug IS NOT NULL AND seo_slug != ''
  ORDER BY "order" ASC
`).all();

console.log(`\n🔧 إنشاء ${services.length} صفحة خدمات...`);

for (const svc of services) {
  const slug      = svc.seo_slug;
  const canonical = `${SITE_URL}/services/${encodeURIComponent(slug)}`;
  const title     = svc.seo_title || `${svc.title} | ${siteCompanyName}`;
  const desc      = svc.seo_description || svc.description?.substring(0, 160) || "";

  let ogImage = svc.image_url || "";
  try { const imgs = JSON.parse(svc.images || "[]"); ogImage = imgs[0] || ogImage; } catch {}

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": svc.title,
    "description": desc,
    "url": canonical,
    "inLanguage": "ar",
    "provider": {
      "@type": "LocalBusiness",
      "@id": `${publicUrl("/")}#business`,
      "name": siteCompanyName,
      "image": absoluteImg(siteLogo),
      "priceRange": settingMap.company_price_range?.trim() || SEO_DEFAULTS.priceRange,
      "telephone": sitePhones.map(toInternational),
      "address": buildAddressSchema(),
      "url": SITE_URL || "/"
    },
    "areaServed": [
      { "@type": "City", "name": "الرياض" },
      { "@type": "Country", "name": "المملكة العربية السعودية" }
    ]
  };

  const crumbs = [
    { name: "الرئيسية", url: SITE_URL },
    { name: "خدماتنا",  url: `${SITE_URL}/#services` },
    { name: svc.title,  url: canonical }
  ];

  const serviceFaqs = [
    { q: `ما هي مدة تنفيذ خدمة ${svc.title} في الرياض؟`, a: `تستغرق الخدمة في المتوسط من ساعتين إلى 6 ساعات حسب مساحة العقار وحجم العمل المطلوب، مع إمكانية توفير فريق عمل مضاعف للإنجاز في نفس اليوم.` },
    { q: `هل تقدمون ضماناً على خدمة ${svc.title}؟`, a: `نعم، نقدم ضماناً كاملاً على جودة التنفيذ، مع استعداد تام لمعاينة أي ملاحظات وإعادة العمل فوراً وبدون أي تكلفة إضافية.` },
    { q: `هل توفرون مواد ومعدات ${svc.title} بالكامل؟`, a: `نعم، يحضر فريق العمل مجهزاً بكافة ماكينات التنظيف والمواد والمنظفات المعتمدة والآمنة والمطابقة للمواصفات.` }
  ];

  const serviceFaqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": serviceFaqs.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a
      }
    }))
  };

  const bodyContent = `
    <div itemscope itemtype="https://schema.org/Service" style="max-width:900px;margin:0 auto">
      <div style="background:#fef3c7;border-right:4px solid #f59e0b;padding:16px 20px;border-radius:12px;margin-bottom:24px">
        <strong style="color:#92400e;display:block;font-size:16px;margin-bottom:4px">⚡ إجابة مباشرة وملخص الخدمة (Quick Facts):</strong>
        <p style="margin:0;color:#78350f;font-size:15px;line-height:1.7">
          تقدم <strong>${esc(siteCompanyName)}</strong> خدمة <strong>${esc(svc.title)}</strong> في جميع أحياء الرياض بأحدث المعدات وفريق فني متخصص. تشمل الخدمة المعاينة الفورية، التنفيذ الدقيق، التعقيم الشامل، وضمان الجودة المعتمد.
        </p>
      </div>

      <h1 itemprop="name" style="font-size:clamp(24px,4vw,34px);font-weight:900;color:#0f172a;margin:0 0 16px">
        ${esc(svc.title)}
      </h1>
      ${ogImage ? `<img src="${esc(absoluteImg(ogImage))}" alt="${esc(svc.title)}" style="width:100%;max-height:400px;object-fit:cover;border-radius:16px;margin-bottom:24px;border:1px solid #e2e8f0" loading="eager" />` : ""}
      
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:24px">
        <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin-top:0;margin-bottom:12px">تفاصيل ونطاق العمل</h2>
        <p itemprop="description" style="font-size:16px;color:#334155;line-height:1.9;margin:0">
          ${esc(svc.description || desc)}
        </p>
      </div>

      ${(() => {
        const revs = db.prepare(`
          SELECT customer_name, customer_city, rating, comment, created_at
          FROM reviews
          WHERE service_id = ? AND status = 'approved'
          ORDER BY id DESC
        `).all(svc.id);
        const count = revs.length;
        if (count === 0) return "";
        const avg = (revs.reduce((s, r) => s + r.rating, 0) / count).toFixed(1);
        return `
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:24px" id="service-reviews">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;border-bottom:1px solid #f1f5f9;padding-bottom:12px">
            <div>
              <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 4px">⭐ تقييمات وتجارب العملاء لـ ${esc(svc.title)}</h2>
              <p style="font-size:14px;color:#64748b;margin:0">متوسط التقييم: <strong style="color:#0f172a">${avg} من 5</strong> (بناءً على ${count} تقييماً موثقاً بالرياض)</p>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
            ${revs.map(r => `
              <div style="background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                  <strong style="color:#0f172a;font-size:14px">${esc(r.customer_name)} <span style="font-size:11px;color:#10b981;background:#ecfdf5;padding:2px 6px;border-radius:4px;font-weight:bold">✓ عميل موثق</span></strong>
                  <span style="color:#f59e0b;font-size:13px">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span>
                </div>
                ${r.customer_city ? `<div style="font-size:12px;color:#64748b;margin-bottom:8px">📍 ${esc(r.customer_city)}</div>` : ""}
                <p style="font-size:13px;color:#334155;line-height:1.7;margin:0;background:#ffffff;padding:10px;border-radius:8px;border:1px solid #f1f5f9">
                  "${esc(r.comment)}"
                </p>
              </div>
            `).join("")}
          </div>
        </div>`;
      })()}

      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:24px">
        <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin-top:0;margin-bottom:16px">❓ الأسئلة الشائعة حول ${esc(svc.title)}</h2>
        ${serviceFaqs.map(f => `
          <div style="background:#f8fafc;padding:14px 18px;border-radius:12px;margin-bottom:12px;border:1px solid #f1f5f9">
            <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 6px">❓ ${esc(f.q)}</h3>
            <p style="font-size:14px;color:#475569;margin:0;line-height:1.7">${esc(f.a)}</p>
          </div>
        `).join("")}
      </div>

      <div style="margin-top:24px;padding:22px;background:#0f172a;color:#ffffff;border-radius:16px;text-align:center">
        <h3 style="color:#fbbf24;margin-top:0;margin-bottom:8px;font-size:20px">احجز خدمة ${esc(svc.title)} الآن في الرياض</h3>
        <p style="margin:0 0 16px;font-size:15px;color:#cbd5e1">
          ${sitePhoneText ? `اتصل بنا مباشرة أو تواصل عبر واتساب على الرقم: <strong style="color:#ffffff">${esc(sitePhoneText)}</strong>` : "تواصل معنا فوراً لتأكيد حجزك."}
        </p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          ${sitePhoneWhatsapp ? `<a href="${esc(waLink(sitePhoneWhatsapp, `السلام عليكم، أرغب في حجز خدمة: ${svc.title} بالرياض`))}" style="background:#10b981;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px">حجز عبر واتساب</a>` : ""}
          ${sitePhoneCall ? `<a href="tel:${esc(toInternational(sitePhoneCall))}" style="background:#3b82f6;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px">اتصال هاتفـي</a>` : ""}
        </div>
      </div>
    </div>`;

  const html = renderPage({
    title, description: desc, canonical, ogImage,
    ogType: "website",
    keywords: svc.seo_keywords || "",
    schemas: [serviceSchema, serviceFaqSchema, breadcrumbSchema(crumbs)],
    breadcrumbs: crumbs,
    bodyContent
  });

  savePage(`services/${slug}`, html);
}
console.log(`   ✅ ${services.length} خدمة`);

// ══════════════════════════════════════════════════════════════════════════════
// 3. صفحات باقات النظافة (packages)
// ══════════════════════════════════════════════════════════════════════════════
let containers = [];
try {
  containers = db.prepare(`
    SELECT id, name, category, size, capacity, description, features,
           suitable_for, price_text, price_per_day, image_url, images,
           seo_slug, seo_title, seo_description, seo_keywords
    FROM packages
    WHERE is_active = 1 AND seo_enabled = 1
      AND seo_slug IS NOT NULL AND seo_slug != ''
    ORDER BY "order" ASC
  `).all();
} catch (e) {
  containers = db.prepare(`
    SELECT id, name, category, size, capacity, description, features,
           suitable_for, price_text, price_per_day, image_url, images,
           seo_slug, seo_title, seo_description, seo_keywords
    FROM containers
    WHERE is_active = 1 AND seo_enabled = 1
      AND seo_slug IS NOT NULL AND seo_slug != ''
    ORDER BY "order" ASC
  `).all();
}

console.log(`\n📦 إنشاء ${containers.length} صفحة باقات نظافة...`);

for (const c of containers) {
  const slug      = c.seo_slug;
  const canonical = `${SITE_URL}/container/${encodeURIComponent(slug)}`;
  const title     = c.seo_title || `${c.name} بالرياض | ${siteCompanyName}`;
  const desc      = c.seo_description || c.description?.substring(0, 160) || "";
  const ogImage   = c.image_url || `${SITE_URL}/images/hero-1.webp`;

  let featuresList = [];
  try {
    const parsed = JSON.parse(c.features || "[]");
    if (Array.isArray(parsed)) featuresList = parsed.filter(Boolean);
  } catch {}

  const catArabic = {
    apartments: "تنظيف شقق",
    villas: "تنظيف فلل",
    palaces: "تنظيف قصور ومجمعات",
    move_clean: "تنظيف قبل/بعد النقل",
    majlis: "غسيل مجالس وبخار",
    marble: "جلي وتلميع رخام",
    tanks: "تطهير خزانات مياه",
    ac: "تنظيف وغسيل مكيفات",
    pest: "مكافحة وإبادة حشرات",
    postcon: "تنظيف بعد التشطيب",
    facades: "واجهات ومكاتب",
    facilities: "مساجد ومدارس ومنشآت",
    fire_safety: "سلامة ودفاع مدني"
  }[c.category] || c.category || "خدمات تنظيف";

  const containerSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": c.name,
    "description": desc,
    "image": absoluteImg(ogImage),
    "url": canonical,
    "inLanguage": "ar",
    "category": catArabic,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "SAR",
      "availability": "https://schema.org/InStock",
      "description": "طلب عرض سعر مجاني وفوري حسب تفاصيل ومساحة العقار"
    },
    "brand": {
      "@type": "Brand",
      "name": siteCompanyName
    }
  };

  const crumbs = [
    { name: "الرئيسية", url: SITE_URL },
    { name: "باقات التنظيف", url: `${SITE_URL}/#cleaning-packages` },
    { name: c.name, url: canonical }
  ];

  const featuresHtml = featuresList.length
    ? `<div style="margin:20px 0"><h3 style="font-size:17px;font-weight:700;color:#1a202c;margin-bottom:10px">مميزات الباقة:</h3>
       <ul style="margin:0;padding-right:20px;color:#4a5568">${featuresList.map(f => `<li style="margin:6px 0">${esc(f)}</li>`).join("")}</ul></div>`
    : "";

  const bodyContent = `
    <div>
      <div style="margin-bottom:8px">
        <span style="display:inline-block;background:#ebf8ff;color:#2b6cb0;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:700">
          ${esc(catArabic)}
        </span>
      </div>
      <h1 style="font-size:clamp(22px,4vw,32px);font-weight:800;color:#1a202c;margin:0 0 16px">
        ${esc(c.name)}
      </h1>
      ${ogImage ? `<img src="${esc(absoluteImg(ogImage))}" alt="${esc(c.name)}" style="width:100%;max-height:360px;object-fit:cover;border-radius:12px;margin-bottom:20px" loading="eager" />` : ""}
      <p style="font-size:17px;color:#4a5568;line-height:1.8">
        ${esc(c.description || desc)}
      </p>
      ${featuresHtml}
      <div style="margin-top:24px;padding:20px;background:#f0fff4;border-radius:12px;border-right:4px solid #38a169">
        <p style="margin:0;font-size:16px;color:#22543d;font-weight:700">
          💰 السعر: طلب عرض سعر مجاني وفوري حسب عدد الغرف والمساحة
        </p>
      </div>
      <div style="margin-top:24px;padding:20px;background:#fef9e7;border-radius:12px;border-right:4px solid #f6c90e">
        <p style="margin:0;font-size:15px;color:#744210">
          ${sitePhoneText ? `📞 للحجز والاستفسار: <strong>${esc(sitePhoneText)}</strong>` : "للحجز تواصل عبر بيانات الموقع."}
        </p>
      </div>
    </div>`;

  const html = renderPage({
    title, description: desc, canonical, ogImage,
    ogType: "product",
    keywords: c.seo_keywords || "",
    schemas: [containerSchema, breadcrumbSchema(crumbs)],
    breadcrumbs: crumbs,
    bodyContent
  });

  savePage(`container/${slug}`, html);
  savePage(`package/${slug}`, html);
  savePage(`packages/${slug}`, html);
}
console.log(`   ✅ ${containers.length} باقة نظافة`);

// ══════════════════════════════════════════════════════════════════════════════
// 4. صفحات SEO المخصصة (seo_pages)
// ══════════════════════════════════════════════════════════════════════════════
const seoPages = db.prepare(`
  SELECT id, slug, title, target_keyword, content, excerpt,
         seo_title, seo_description, seo_keywords, status, published_at, updated_at
  FROM seo_pages
  WHERE status = 'published' AND is_active = 1
  ORDER BY id ASC
`).all();

console.log(`\n🔎 إنشاء ${seoPages.length} صفحة SEO...`);

for (const page of seoPages) {
  if (!page.slug) continue;
  let canonical = `${SITE_URL}/page/${encodeURIComponent(page.slug)}`;
  const title = page.seo_title || `${page.title} | ${siteCompanyName}`;
  const description = page.seo_description || page.excerpt || page.title;
  const ogImage = `${SITE_URL}/images/hero-1.webp`;

  const kw = (page.target_keyword || page.title || "").toLowerCase();
  let primaryServiceUrl = null;
  let primaryServiceName = null;

  if (kw.includes("فلل") || kw.includes("فيلا")) {
    primaryServiceUrl = `${SITE_URL}/services/tanzeef-filal-alryad`;
    primaryServiceName = "تنظيف الفلل والقصور بالرياض";
    canonical = primaryServiceUrl;
  } else if (kw.includes("شقق") || kw.includes("شقة")) {
    primaryServiceUrl = `${SITE_URL}/services/tanzeef-shaqaq-alryad`;
    primaryServiceName = "تنظيف الشقق السكنية بالرياض";
    canonical = primaryServiceUrl;
  } else if (kw.includes("مكيف") || kw.includes("مكيفات") || kw.includes("سبلت")) {
    primaryServiceUrl = `${SITE_URL}/services/tanzeef-mokeyafat-alryad`;
    primaryServiceName = "تنظيف وغسيل المكيفات بالرياض";
    canonical = primaryServiceUrl;
  } else if (kw.includes("مجالس") || kw.includes("كنب") || kw.includes("سجاد") || kw.includes("بخار")) {
    primaryServiceUrl = `${SITE_URL}/services/gaseel-majalis-bukhar-alryad`;
    primaryServiceName = "غسيل المجالس بالبخار بالرياض";
    canonical = primaryServiceUrl;
  } else if (kw.includes("رخام") || kw.includes("جلي")) {
    primaryServiceUrl = `${SITE_URL}/services/jaly-rakham-alryad`;
    primaryServiceName = "جلي وتلميع الرخام بالرياض";
    canonical = primaryServiceUrl;
  } else if (kw.includes("خزان") || kw.includes("خزانات")) {
    primaryServiceUrl = `${SITE_URL}/services/tanzeef-khazanat-alryad`;
    primaryServiceName = "تنظيف وتطهير الخزانات بالرياض";
    canonical = primaryServiceUrl;
  } else if (kw.includes("حشرات") || kw.includes("مبيدات")) {
    primaryServiceUrl = `${SITE_URL}/services/mokafahat-hasharat-alryad`;
    primaryServiceName = "مكافحة الحشرات ورش المبيدات بالرياض";
    canonical = primaryServiceUrl;
  } else if (kw.includes("تشطيب") || kw.includes("بناء")) {
    primaryServiceUrl = `${SITE_URL}/services/tanzeef-bad-altashteeb-alryad`;
    primaryServiceName = "تنظيف بعد البناء والتشطيب بالرياض";
    canonical = primaryServiceUrl;
  }

  const crumbs = [
    { name: "الرئيسية", url: SITE_URL },
    { name: page.title, url: canonical }
  ];

  const primaryCallout = primaryServiceUrl ? `
    <div style="margin-bottom:24px;padding:16px 20px;background:#ebf4ff;border-radius:10px;border-right:4px solid #3182ce;font-size:15px;color:#2b6cb0">
      📌 هذه الصفحة تتبع قسم <strong><a href="${primaryServiceUrl}" style="color:#2b6cb0;text-decoration:underline">${primaryServiceName}</a></strong>. يمكنك الاطلاع على الأسعار المحدثة وحجز الخدمة المباشرة من الصفحة الرئيسية للخدمة.
    </div>` : "";

  const bodyContent = `
    <article>
      ${primaryCallout}
      <h1 style="font-size:clamp(24px,4vw,36px);font-weight:800;color:#1a202c;margin:0 0 16px;line-height:1.3">
        ${esc(page.title)}
      </h1>
      <div class="article-content" style="font-size:17px;line-height:1.9;color:#2d3748">
        ${sanitizeHtml(page.content)}
      </div>
      <div style="margin-top:32px;padding:20px;background:#ebf8ff;border-radius:12px;border-right:4px solid #3182ce">
        <p style="font-size:18px;font-weight:700;color:#2b6cb0;margin:0 0 8px">اطلب الخدمة الآن في الرياض</p>
        <p style="font-size:15px;color:#4a5568;margin:0 0 16px">اتصل بنا للحصول على معاينة مجانية وعرض سعر فوري ومباشر.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <a href="tel:${esc(sitePhoneCall)}" style="background:#2b6cb0;color:white;padding:10px 20px;border-radius:8px;font-weight:700;text-decoration:none">📞 ${esc(sitePhoneCall)}</a>
          <a href="${waLink(sitePhoneWhatsapp, `طلب خدمة بخصوص: ${page.title}`)}" style="background:#25d366;color:white;padding:10px 20px;border-radius:8px;font-weight:700;text-decoration:none">واتساب ↗</a>
        </div>
      </div>
    </article>`;

  const html = renderPage({
    title, description, canonical, ogImage,
    ogType: "article",
    keywords: page.seo_keywords || page.target_keyword || "",
    schemas: [breadcrumbSchema(crumbs)],
    breadcrumbs: crumbs,
    bodyContent
  });

  savePage(`page/${page.slug}`, html);
  savePage(`pages/${page.slug}`, html);
}
console.log(`   ✅ ${seoPages.length} صفحة SEO (مولدة كـ /page/ و /pages/)`);

// ══════════════════════════════════════════════════════════════════════════════
// 5. صفحة الأسعار /pricing/index.html
// ══════════════════════════════════════════════════════════════════════════════
{
  const canonical = `${SITE_URL}/pricing`;
  const title = `أسعار وباقات خدمات التنظيف في الرياض 2026 | ${siteCompanyName}`;
  const description = `دليل شامل لأسعار وباقات خدمات تنظيف المنازل، الفلل، الشقق، وغسيل المجالس بالبخار وجلي الرخام بالرياض لعام 2026.`;
  const ogImage = `${SITE_URL}/images/hero-1.webp`;

  const crumbs = [
    { name: "الرئيسية", url: SITE_URL },
    { name: "الأسعار والباقات", url: canonical }
  ];

  const pricingSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": title,
    "description": description,
    "url": canonical,
    "inLanguage": "ar",
    "provider": {
      "@type": "LocalBusiness",
      "@id": `${SITE_URL}/#business`,
      "name": siteCompanyName,
      "image": absoluteImg(siteLogo),
      "priceRange": settingMap.company_price_range?.trim() || SEO_DEFAULTS.priceRange,
      "telephone": sitePhones.map(toInternational),
      "address": buildAddressSchema(),
      "url": SITE_URL
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "كيف يتم حساب تكلفة تنظيف الشقق والفلل بالرياض؟",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "يتم تحديد السعر بناءً على مساحة العقار بالمتر المربع، عدد الغرف والحمامات، وحالة العقار (مسكون أو جديد بعد التشطيب)."
        }
      },
      {
        "@type": "Question",
        "name": "هل توفرون معاينة مجانية قبل البدء في التنظيف؟",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "نعم، نوفر معاينة فورية ومجانية للفلل والقصور والمشاريع السكنية والتجارية في جميع أحياء الرياض."
        }
      }
    ]
  };

  const bodyContent = `
    <div>
      <h1 style="font-size:clamp(24px,4vw,36px);font-weight:800;color:#1a202c;margin:0 0 16px;line-height:1.3">
        دليل أسعار وباقات خدمات التنظيف بالرياض لعام 2026
      </h1>
      <p style="font-size:17px;color:#4a5568;line-height:1.8;margin-bottom:28px">
        نقدم في ${esc(siteCompanyName)} نظام تسعير شفاف ومرن يعتمد على قياس المساحة الحقيقية وعدد الغرف المطلوبة بدقة، مع توفير عروض أسعار فورية ومجانية بدون أي رسوم خفية.
      </p>

      <h2 style="font-size:20px;font-weight:800;color:#1a202c;margin:24px 0 12px">جدول الباقات ونظام التسعير بالرياض</h2>
      <table style="width:100%;border-collapse:collapse;font-size:15px;margin-bottom:28px">
        <thead>
          <tr style="background:#ebf4ff">
            <th style="text-align:right;padding:12px 16px;border:1px solid #bee3f8;font-weight:800">باقة الخدمة</th>
            <th style="text-align:right;padding:12px 16px;border:1px solid #bee3f8;font-weight:800">نوع العقار والتغطية</th>
            <th style="text-align:right;padding:12px 16px;border:1px solid #bee3f8;font-weight:800">نظام التسعير</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:12px 16px;border:1px solid #e2e8f0;font-weight:700">تنظيف الشقق السكنية</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0">شقة كاملة حتى 200 م² (غرف، صالون، مطبخ، حمامات)</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0;font-weight:800;color:#2b6cb0">تبدأ من 350 ر.س (معاينة مجانية)</td>
          </tr>
          <tr style="background:#f7fafc">
            <td style="padding:12px 16px;border:1px solid #e2e8f0;font-weight:700">تنظيف الفلل والقصور</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0">فيلا كاملة تشمل الأدوار والأحواش والدرج والملحقات</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0;font-weight:800;color:#2b6cb0">تبدأ من 850 ر.س (حسب المساحة)</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;border:1px solid #e2e8f0;font-weight:700">تنظيف بعد البناء والتشطيب</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0">إزالة بقايا الإسمنت والدهانات والترويبة وتلميع كامل</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0;font-weight:800;color:#2b6cb0">تبدأ من 1,200 ر.س (تسليم فوري)</td>
          </tr>
          <tr style="background:#f7fafc">
            <td style="padding:12px 16px;border:1px solid #e2e8f0;font-weight:700">غسيل المجالس والكنب بالبخار</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0">بخار حراري 140° مع التعقيم والتجفيف خلال 45 دقيقة</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0;font-weight:800;color:#2b6cb0">تبدأ من 200 ر.س (حسب المقاعد)</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;border:1px solid #e2e8f0;font-weight:700">غسيل وصيانة المكيفات السبليت</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0">غسيل ضغط عالي بجراب حماية الجدران وفحص الفريون</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0;font-weight:800;color:#2b6cb0">تبدأ من 70 ر.س / للمكيف</td>
          </tr>
          <tr style="background:#f7fafc">
            <td style="padding:12px 16px;border:1px solid #e2e8f0;font-weight:700">جلي وتلميع الرخام بالألماس</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0">معالجة الفواصل والتلميع بالكريستال الإيطالي للأرضيات</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0;font-weight:800;color:#2b6cb0">تبدأ من 15 ر.س / م²</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:32px;padding:24px;background:#1e3a5f;color:white;border-radius:12px;text-align:center">
        <p style="font-size:20px;font-weight:800;margin:0 0 8px">احصل على عرض سعر فوري ومخصص لعقارك</p>
        <p style="font-size:15px;color:#cbd5e0;margin:0 0 20px">تواصل معنا وسيقوم خبراؤنا بتزويدك بالسعر الدقيق خلال دقائق</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <a href="tel:${esc(sitePhoneCall)}" style="background:white;color:#1e3a5f;padding:12px 28px;border-radius:8px;font-weight:800;text-decoration:none">📞 اتصال فوري: ${esc(sitePhoneCall)}</a>
          <a href="${waLink(sitePhoneWhatsapp, 'أريد الحصول على عرض سعر لخدمات التنظيف')}" style="background:#25d366;color:white;padding:12px 28px;border-radius:8px;font-weight:800;text-decoration:none">واتساب سريع ↗</a>
        </div>
      </div>
    </div>`;

  const html = renderPage({
    title, description, canonical, ogImage,
    ogType: "website",
    keywords: "أسعار تنظيف المنازل بالرياض, تكلفة تنظيف الفلل بالرياض, أسعار جلي الرخام بالرياض, أسعار غسيل المجالس بالبخار",
    schemas: [pricingSchema, faqSchema, breadcrumbSchema(crumbs)],
    breadcrumbs: crumbs,
    bodyContent
  });
  savePage("pricing", html);
  console.log(`   ✅ صفحة الأسعار`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 5.1 صفحة الأسئلة الشائعة /faq/index.html
// ══════════════════════════════════════════════════════════════════════════════
{
  const canonical = `${SITE_URL}/faq`;
  const title = `الأسئلة الشائعة حول خدمات التنظيف بالرياض | ${siteCompanyName}`;
  const description = `إجابات شاملة ومفصلة لكافة الأسئلة الشائعة حول أسعار وباقات خدمات تنظيف المنازل، الفلل، غسيل المجالس بالبخار، وجلي الرخام بالرياض.`;
  const ogImage = `${SITE_URL}/images/hero-1.webp`;
  const crumbs = [
    { name: "الرئيسية", url: SITE_URL },
    { name: "الأسئلة الشائعة", url: canonical }
  ];

  const faqItems = [
    { q: "كيف يتم تحديد سعر خدمة التنظيف في الرياض؟", a: "نتبع نظام التسعير العادل والمباشر بناءً على تفاصيل الموقع (المساحة بالمتر المربع، عدد الغرف والحمامات، حالة العقار إذا كان مسكوناً أو بعد التشطيب، والخدمات الإضافية المطلوبة). نقوم بتقديم عرض سعر فوري ومجاني بعد مراجعة بيانات الطلب أو إجراء معاينة ميدانية." },
    { q: "هل تقدمون معاينة مجانية قبل البدء في العمل؟", a: "نعم، نوفر خدمة المعاينة الميدانية المجانية للفلل والقصور والمشاريع الكبرى والمباني بعد التشطيب لتحديد حجم العمل بدقة وتقديم خطة تشغيلية واضحة وعرض سعر تفصيلي." },
    { q: "ما هي المناطق والأحياء التي تغطونها في الرياض؟", a: "نغطي كافة أحياء ومناطق الرياض الـ 50 بالكامل، بما يشمل شمال الرياض، شرق الرياض، غرب الرياض، وجنوب الرياض ووسطها." },
    { q: "ماذا تشمل باقة تنظيف الفلل والشقق السكنية؟", a: "تشمل الباقة تنظيفاً عميقاً وشاملاً للأرضيات والسيراميك والرخام، غسيل وتطهير الحمامات والمطابخ، تنظيف النوافذ وإطارات الألمنيوم ومجاريها، مسح وتلميع الأبواب والجدران، وتطهير وتعطير كامل للمسكن." },
    { q: "كيف تتم عملية غسيل المجالس والكنب والسجاد؟", a: "نستخدم تقنية الغسيل بالبخار الحراري 140° مع مواد تنظيف مخصصة للأقمشة الحساسة، تعمل على إذابة أصعب البقع والدهون وقتل البكتيريا وحشرات الفراش، مع شفط مائي قوي وتجفيف فائق السرعة دون بهتان الألوان." },
    { q: "كيف يتم غسيل المكيفات دون تلويث الجدران والأثاث؟", a: "نستخدم جراب حماية مائي شفاف ومغلق يتم تركيبه بإحكام حول المكيف قبل الغسيل، ويتم توجيه مياه الغسيل بضغط 150 بار إلى خرطوم تصريف خارجي مع تنظيف الفلاتر وتسليك مجرى التصريف الداخلي وتعطير الوحدة." },
    { q: "هل المبيدات المستخدمة في مكافحة الحشرات آمنة وبدون رائحة؟", a: "نعم، نستخدم مبيدات صحية ألمانية وأمريكية معتمدة من هيئة الغذاء والدواء، عديمة الرائحة وآمنة تماماً على الأطفال وكبار السن دون الحاجة لمغادرة المنزل، مع شهادة ضمان معتمدة ومتابعات دورية مجانية." }
  ];

  const faqPageSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a
      }
    }))
  };

  const bodyContent = `
    <article class="prose max-w-none">
      <h1>الأسئلة الأكثر شيوعاً حول خدمات التنظيف بالرياض</h1>
      <p class="lead">${description}</p>
      <div class="faq-list">
        ${faqItems.map((f, i) => `
          <div class="faq-item" style="margin-bottom: 1.5rem; padding: 1.25rem; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0;">
            <h3 style="color: #0f172a; margin-top: 0; font-size: 1.15rem;">❓ ${f.q}</h3>
            <p style="color: #475569; margin-bottom: 0; line-height: 1.7;">${f.a}</p>
          </div>
        `).join("")}
      </div>
      <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 12px; background: #0f172a; color: white; text-align: center;">
        <h3 style="color: #38bdf8; margin-top: 0;">هل لديك سؤال آخر؟</h3>
        <p>فريق خدمة العملاء متاح على مدار 24 ساعة لتقديم الاستشارات والمعاينات المجانية.</p>
        <a href="/contact" style="display: inline-block; background: #38bdf8; color: #0f172a; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: bold; text-decoration: none;">تواصل معنا الآن ←</a>
      </div>
    </article>
  `;

  const html = renderPage({
    title, description, canonical, ogImage,
    ogType: "website",
    keywords: "الأسئلة الشائعة تنظيف منازل بالرياض, استفسارات تنظيف الفلل, أسعار تنظيف الشقق بالرياض, ضمان تنظيف المجالس",
    schemas: [faqPageSchema, breadcrumbSchema(crumbs)],
    breadcrumbs: crumbs,
    bodyContent
  });
  savePage("faq", html);
  savePage("الأسئلة-الشائعة", html);
  console.log(`   ✅ صفحة الأسئلة الشائعة /faq`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 5.2 صفحة سياسة الخصوصية /privacy/index.html
// ══════════════════════════════════════════════════════════════════════════════
{
  const canonical = `${SITE_URL}/privacy`;
  const title = `سياسة الخصوصية وحماية البيانات | ${siteCompanyName}`;
  const description = `سياسة الخصوصية وحماية البيانات الشخصية لعملاء خدمات التنظيف وفق الأنظمة واللوائح المعمول بها في المملكة العربية السعودية.`;
  const ogImage = `${SITE_URL}/images/hero-1.webp`;
  const crumbs = [
    { name: "الرئيسية", url: SITE_URL },
    { name: "سياسة الخصوصية", url: canonical }
  ];

  const bodyContent = `
    <article class="prose max-w-none">
      <h1>سياسة الخصوصية وحماية البيانات</h1>
      <p class="lead">${description}</p>
      <h2>1. مقدمة والتزام</h2>
      <p>نحن في <strong>${siteCompanyName}</strong> نلتزم بحماية خصوصية بيانات عملائنا وفقاً لنظام حماية البيانات الشخصية في المملكة العربية السعودية.</p>
      <h2>2. البيانات التي نجمعها</h2>
      <p>نقوم بجمع بيانات الاتصال وتفاصيل الموقع الجغرافي بالرياض ونوع الخدمة المطلوبة لغرض تنفيذ الخدمة وتأكيد المواعيد وتقديم عروض الأسعار.</p>
      <h2>3. سرية البيانات وأمنها</h2>
      <p>نؤكد أننا لا نقوم ببيع أو مشاركة بياناتك الشخصية مع أي جهات خارجية لأغراض تجارية، ونطبق تدابير تقنية وأمنية مشددة لحمايتها.</p>
    </article>
  `;

  const html = renderPage({
    title, description, canonical, ogImage,
    ogType: "website",
    keywords: "سياسة الخصوصية, حماية البيانات, شروط خدمة تنظيف الرياض",
    schemas: [breadcrumbSchema(crumbs)],
    breadcrumbs: crumbs,
    bodyContent
  });
  savePage("privacy", html);
  savePage("سياسة-الخصوصية", html);
  console.log(`   ✅ صفحة سياسة الخصوصية /privacy`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 5.3 صفحة الشروط والأحكام /terms/index.html
// ══════════════════════════════════════════════════════════════════════════════
{
  const canonical = `${SITE_URL}/terms`;
  const title = `الشروط والأحكام | ${siteCompanyName}`;
  const description = `الشروط والأحكام والضوابط المنظمة لتقديم خدمات تنظيف المنازل، الفلل، غسيل المجالس، وأنظمة السلامة بالرياض.`;
  const ogImage = `${SITE_URL}/images/hero-1.webp`;
  const crumbs = [
    { name: "الرئيسية", url: SITE_URL },
    { name: "الشروط والأحكام", url: canonical }
  ];

  const bodyContent = `
    <article class="prose max-w-none">
      <h1>الشروط والأحكام والضوابط المنظمة</h1>
      <p class="lead">${description}</p>
      <h2>1. نطاق الخدمة والتنفيذ</h2>
      <p>يتم تنفيذ أعمال التنظيف وفقاً للباقة المحددة في طلب العميل باستخدام أحدث المعدات والمواد المصرحة من الجهات المختصة.</p>
      <h2>2. استلام الأعمال والضمان</h2>
      <p>يقوم العميل بمعاينة الموقع فور انتهاء الأعمال لضمان مطابقتها للمواصفات المطلوبة، ويتم تقديم الضمان المعتمد على مكافحة الحشرات وخدمات السلامة.</p>
    </article>
  `;

  const html = renderPage({
    title, description, canonical, ogImage,
    ogType: "website",
    keywords: "الشروط والأحكام, ضوابط خدمات التنظيف, اتفاقية الخدمة",
    schemas: [breadcrumbSchema(crumbs)],
    breadcrumbs: crumbs,
    bodyContent
  });
  savePage("terms", html);
  savePage("الشروط-والأحكام", html);
  console.log(`   ✅ صفحة الشروط والأحكام /terms`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 5.4 صفحة اتصل بنا /contact/index.html
// ══════════════════════════════════════════════════════════════════════════════
{
  const canonical = `${SITE_URL}/contact`;
  const title = `اتصل بنا | ${siteCompanyName} - خدمات التنظيف بالرياض`;
  const description = `تواصل معنا لطلب خدمات تنظيف المنازل والفلل والمجالس بالبخار أو المعاينة الميدانية المجانية في كافة أحياء الرياض.`;
  const ogImage = `${SITE_URL}/images/hero-1.webp`;
  const crumbs = [
    { name: "الرئيسية", url: SITE_URL },
    { name: "اتصل بنا", url: canonical }
  ];

  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": title,
    "description": description,
    "url": canonical,
    "mainEntity": {
      "@type": "LocalBusiness",
      "@id": `${SITE_URL}/#business`,
      "name": siteCompanyName,
      "telephone": sitePhones.map(toInternational),
      "address": buildAddressSchema()
    }
  };

  const bodyContent = `
    <article class="prose max-w-none">
      <h1>تواصل معنا — فريق الدعم والمعاينات المجانية</h1>
      <p class="lead">${description}</p>
      <h2>قنوات الاتصال المباشر</h2>
      <ul>
        <li><strong>الهاتف المباشر:</strong> ${sitePhones.join(" / ")}</li>
        <li><strong>المدينة والتغطية:</strong> الرياض، المملكة العربية السعودية (جميع الأحياء)</li>
        <li><strong>ساعات العمل:</strong> 24 ساعة / 7 أيام في الأسبوع</li>
      </ul>
      <h2>احجز معاينتك المجانية</h2>
      <p>يمكنك حجز المعاينة الميدانية أو طلب عرض السعر الفوري عبر الهاتف أو الواتساب أو عبر نموذج الحجز في الصفحة الرئيسية.</p>
    </article>
  `;

  const html = renderPage({
    title, description, canonical, ogImage,
    ogType: "website",
    keywords: "اتصل بشركة تنظيف بالرياض, رقم شركة تنظيف منازل بالرياض, حجز خدمة تنظيف فلل",
    schemas: [contactSchema, breadcrumbSchema(crumbs)],
    breadcrumbs: crumbs,
    bodyContent
  });
  savePage("contact", html);
  savePage("اتصل-بنا", html);
  console.log(`   ✅ صفحة اتصل بنا /contact`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 5.5 صفحة من نحن /about/index.html
// ══════════════════════════════════════════════════════════════════════════════
{
  const canonical = `${SITE_URL}/about`;
  const title = `من نحن | ${siteCompanyName} - رواد خدمات التنظيف بالرياض`;
  const description = `تعرف على ${siteCompanyName}، المؤسسة الرائدة في خدمات النظافة الشاملة، غسيل المجالس بالبخار، جلي الرخام، وأنظمة السلامة بالرياض.`;
  const ogImage = `${SITE_URL}/images/hero-1.webp`;
  const crumbs = [
    { name: "الرئيسية", url: SITE_URL },
    { name: "من نحن", url: canonical }
  ];

  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": title,
    "description": description,
    "url": canonical,
    "mainEntity": {
      "@type": "LocalBusiness",
      "@id": `${SITE_URL}/#business`,
      "name": siteCompanyName,
      "address": buildAddressSchema()
    }
  };

  const bodyContent = `
    <article class="prose max-w-none">
      <h1>من نحن — رواد خدمات النظافة والتطهير بالرياض</h1>
      <p class="lead">${description}</p>
      <h2>رؤيتنا ورسالتنا</h2>
      <p>نعمل في <strong>${siteCompanyName}</strong> على تقديم أعلى معايير النظافة والتعقيم للمنازل، الفلل، القصور، والمنشآت التجارية والحكومية بمدينة الرياض، معتمدين على أحدث التجهيزات والكوادر الفنية المدربة ومواد التنظيف الآمنة والمصرحة.</p>
      <h2>لماذا يختارنا العملاء؟</h2>
      <ul>
        <li>أحدث أجهزة الغسيل بالبخار الحراري 140° وماكينات جلي الرخام بالألماس.</li>
        <li>كوادر فنية متخصصة ومدربة بأعلى معايير الانضباط والأمانة.</li>
        <li>تغطية شاملة لجميع أحياء الرياض مع سرعة استجابة ومعاينة مجانية.</li>
        <li>ضمان معتمد على كافة أعمال مكافحة الحشرات والسلامة.</li>
      </ul>
    </article>
  `;

  const html = renderPage({
    title, description, canonical, ogImage,
    ogType: "website",
    keywords: "من نحن شركة تنظيف بالرياض, أفضل شركة تنظيف منازل, شركة نظافة معتمدة بالرياض",
    schemas: [aboutSchema, breadcrumbSchema(crumbs)],
    breadcrumbs: crumbs,
    bodyContent
  });
  savePage("about", html);
  savePage("من-نحن", html);
  console.log(`   ✅ صفحة من نحن /about`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. صفحات أحياء الرياض (SEO جغرافي محلي فائق الدقة)
// ══════════════════════════════════════════════════════════════════════════════
const NEIGHBORHOODS = [
  { slug: "north-riyadh", name: "شمال الرياض", region: "شمال الرياض", related: ["al-malqa","al-yasmin","al-sahafa","hittin"] },
  { slug: "al-malqa", name: "حي الملقا", region: "شمال الرياض", related: ["al-yasmin","al-narjis","north-riyadh"] },
  { slug: "al-yasmin", name: "حي الياسمين", region: "شمال الرياض", related: ["al-malqa","al-narjis","al-aarid"] },
  { slug: "al-narjis", name: "حي النرجس", region: "شمال الرياض", related: ["al-yasmin","al-aarid","al-nafal"] },
  { slug: "al-aarid", name: "حي العارض", region: "شمال الرياض", related: ["al-narjis","al-nafal","north-riyadh"] },
  { slug: "hittin", name: "حي حطين", region: "شمال الرياض", related: ["al-malqa","al-sahafa","north-riyadh"] },
  { slug: "al-sahafa", name: "حي الصحافة", region: "شمال الرياض", related: ["hittin","al-ghadeer","al-rabi"] },
  { slug: "al-nafal", name: "حي النفل", region: "شمال الرياض", related: ["al-aarid","al-wadi","north-riyadh"] },
  { slug: "al-aqiq", name: "حي العقيق", region: "شمال الرياض", related: ["al-rabi","al-ghadeer","north-riyadh"] },
  { slug: "al-rabi", name: "حي الربيع", region: "شمال الرياض", related: ["al-sahafa","al-aqiq","al-ghadeer"] },
  { slug: "al-ghadeer", name: "حي الغدير", region: "شمال الرياض", related: ["al-rabi","al-wadi","north-riyadh"] },
  { slug: "al-wadi", name: "حي الوادي", region: "شمال الرياض", related: ["al-nafal","al-ghadeer","al-falah"] },
  { slug: "al-nada", name: "حي الندى", region: "شمال الرياض", related: ["al-falah","al-wadi","north-riyadh"] },
  { slug: "al-falah", name: "حي الفلاح", region: "شمال الرياض", related: ["al-nada","al-wadi","north-riyadh"] },
  { slug: "south-riyadh", name: "جنوب الرياض", region: "جنوب الرياض", related: ["badr","al-shifa","al-aziziyah"] },
  { slug: "badr", name: "حي بدر", region: "جنوب الرياض", related: ["al-shifa","al-dar-al-baida","south-riyadh"] },
  { slug: "al-hair", name: "حي الحائر", region: "جنوب الرياض", related: ["al-shifa","al-manakh","south-riyadh"] },
  { slug: "al-shifa", name: "حي الشفاء", region: "جنوب الرياض", related: ["badr","al-aziziyah","south-riyadh"] },
  { slug: "al-aziziyah", name: "حي العزيزية", region: "جنوب الرياض", related: ["al-shifa","al-iskan","south-riyadh"] },
  { slug: "al-dar-al-baida", name: "حي الدار البيضاء", region: "جنوب الرياض", related: ["al-aziziyah","al-manakh","south-riyadh"] },
  { slug: "al-manakh", name: "حي المناخ", region: "جنوب الرياض", related: ["al-dar-al-baida","al-iskan","al-hair"] },
  { slug: "al-iskan", name: "حي الإسكان", region: "جنوب الرياض", related: ["al-aziziyah","al-manakh","south-riyadh"] },
  { slug: "east-riyadh", name: "شرق الرياض", region: "شرق الرياض", related: ["al-qadesiya","al-yarmouk","al-naseem"] },
  { slug: "al-qadesiya", name: "حي القادسية", region: "شرق الرياض", related: ["al-yarmouk","al-munsiyah","east-riyadh"] },
  { slug: "al-naseem", name: "حي النسيم", region: "شرق الرياض", related: ["al-nahdah","al-manar","east-riyadh"] },
  { slug: "al-rawdah", name: "حي الروضة", region: "شرق الرياض", related: ["al-nahdah","al-khaleej","al-manar"] },
  { slug: "al-khaleej", name: "حي الخليج", region: "شرق الرياض", related: ["al-rawdah","al-yarmouk","al-nahdah"] },
  { slug: "al-nahdah", name: "حي النهضة", region: "شرق الرياض", related: ["al-naseem","al-rawdah","al-khaleej"] },
  { slug: "al-manar", name: "حي المنار", region: "شرق الرياض", related: ["al-naseem","al-rawdah","east-riyadh"] },
  { slug: "al-yarmouk", name: "حي اليرموك", region: "شرق الرياض", related: ["al-qadesiya","al-munsiyah","al-khaleej"] },
  { slug: "al-munsiyah", name: "حي المونسية", region: "شرق الرياض", related: ["al-qadesiya","al-yarmouk","al-qurtubah"] },
  { slug: "al-hamra", name: "حي الحمراء", region: "شرق الرياض", related: ["al-qurtubah","al-shuhada","al-rawdah"] },
  { slug: "al-qurtubah", name: "حي قرطبة", region: "شرق الرياض", related: ["al-munsiyah","al-shuhada","al-hamra"] },
  { slug: "al-shuhada", name: "حي الشهداء", region: "شرق الرياض", related: ["al-qurtubah","al-hamra","east-riyadh"] },
  { slug: "west-riyadh", name: "غرب الرياض", region: "غرب الرياض", related: ["al-suwaidi","al-uraija","dhahrat-laban"] },
  { slug: "al-suwaidi", name: "حي السويدي", region: "غرب الرياض", related: ["al-uraija","al-badiyah","west-riyadh"] },
  { slug: "al-uraija", name: "حي العريجاء", region: "غرب الرياض", related: ["al-suwaidi","dhahrat-laban","al-hazm"] },
  { slug: "dhahrat-laban", name: "حي ظهرة لبن", region: "غرب الرياض", related: ["al-uraija","al-hazm","west-riyadh"] },
  { slug: "al-hazm", name: "حي الحزم", region: "غرب الرياض", related: ["dhahrat-laban","al-awali","al-uraija"] },
  { slug: "al-badiyah", name: "حي البديعة", region: "غرب الرياض", related: ["al-suwaidi","shubra","west-riyadh"] },
  { slug: "shubra", name: "حي شبرا", region: "غرب الرياض", related: ["al-badiyah","al-suwaidi","al-awali"] },
  { slug: "al-awali", name: "حي عوالي الرياض", region: "غرب الرياض", related: ["al-hazm","shubra","west-riyadh"] },
  { slug: "central-riyadh", name: "وسط الرياض", region: "وسط الرياض", related: ["al-olaya","al-malaz","al-murabba"] },
  { slug: "al-olaya", name: "حي العليا", region: "وسط الرياض", related: ["central-riyadh","al-sulaimaniya","al-wizarat"] },
  { slug: "al-sulaimaniya", name: "حي السليمانية", region: "وسط الرياض", related: ["al-olaya","al-malaz","central-riyadh"] },
  { slug: "al-malaz", name: "حي الملز", region: "وسط الرياض", related: ["al-sulaimaniya","al-murabba","central-riyadh"] },
  { slug: "al-murabba", name: "حي المربع", region: "وسط الرياض", related: ["al-malaz","al-batha","al-futah"] },
  { slug: "al-batha", name: "حي البطحاء", region: "وسط الرياض", related: ["al-murabba","al-futah","central-riyadh"] },
  { slug: "al-wizarat", name: "حي الوزارات", region: "وسط الرياض", related: ["al-olaya","al-sulaimaniya","central-riyadh"] },
  { slug: "al-futah", name: "حي الفوطة", region: "وسط الرياض", related: ["al-murabba","al-batha","central-riyadh"] },
];

const ARABIC_AREA_SLUGS = {
  "north-riyadh": "شمال-الرياض",
  "south-riyadh": "جنوب-الرياض",
  "east-riyadh": "شرق-الرياض",
  "west-riyadh": "غرب-الرياض",
  "central-riyadh": "وسط-الرياض",
  "al-malqa": "حي-الملقا",
  "al-yasmin": "حي-الياسمين",
  "al-narjis": "حي-النرجس",
  "al-aarid": "حي-العارض",
  "hittin": "حي-حطين",
  "al-sahafa": "حي-الصحافة",
  "al-nafal": "حي-النفل",
  "al-aqiq": "حي-العقيق",
  "al-rabi": "حي-الربيع",
  "al-ghadeer": "حي-الغدير",
  "al-wadi": "حي-الوادي",
  "al-nada": "حي-الندى",
  "al-falah": "حي-الفلاح",
  "al-qadesiya": "حي-القادسية",
  "al-naseem": "حي-النسيم",
  "al-rawdah": "حي-الروضة",
  "al-khaleej": "حي-الخليج",
  "al-nahdah": "حي-النهضة",
  "al-manar": "حي-المنار",
  "al-yarmouk": "حي-اليرموك",
  "al-munsiyah": "حي-المونسية",
  "al-hamra": "حي-الحمراء",
  "al-qurtubah": "حي-قرطبة",
  "al-shuhada": "حي-الشهداء",
  "al-suwaidi": "حي-السويدي",
  "al-uraija": "حي-العريجاء",
  "dhahrat-laban": "حي-ظهرة-لبن",
  "al-hazm": "حي-الحزم",
  "al-badiyah": "حي-البديعة",
  "shubra": "حي-شبرا",
  "al-awali": "حي-العوالي",
  "badr": "حي-بدر",
  "al-hair": "حي-الحائر",
  "al-shifa": "حي-الشفا",
  "al-aziziyah": "حي-العزيزية",
  "al-dar-al-baida": "حي-الدار-البيضاء",
  "al-manakh": "حي-المناخ",
  "al-iskan": "حي-الإسكان",
  "al-olaya": "حي-العليا",
  "al-sulaimaniya": "حي-السليمانية",
  "al-malaz": "حي-الملز",
  "al-murabba": "حي-المربع",
  "al-batha": "حي-البطحاء",
  "al-wizarat": "حي-الوزارات",
  "al-futah": "حي-الفوطة",
};

const AREA_NAMES = Object.fromEntries(NEIGHBORHOODS.map(n => [n.slug, n.name]));

const REGION_PROFILES = {
  "شمال الرياض": "تتميز مناطق شمال الرياض بالفلل الواسعة والقصور والتوسع العمراني الحديث، ونوفر لها معدات جلي رخام إيطالية وماكينات تنظيف الواجهات ومعدات البخار المتطورة.",
  "شرق الرياض": "تعتبر أحياء شرق الرياض مركزاً رئيسياً للعائلات والشقق والفلل السكنية، حيث نقدم باقات غسيل المجالس والكنب بالبخار الفوري وتطهير خزانات المياه بضمان صحي.",
  "وسط الرياض": "يضم وسط الرياض مقرات الشركات والأبراج الإدارية والمباني السكنية، ونوفر له عقود نظافة دورية للمكاتب، تنظيف الواجهات الزجاجية، وتطهير المنشآت.",
  "غرب الرياض": "تتميز أحياء غرب الرياض بالكثافة السكانية، وتوفر فرقنا باقات شاملة لتنظيف المنازل، وغسيل المكيفات بجراب الحماية، ومكافحة الآفات بضمان سنة.",
  "جنوب الرياض": "نقدم لأحياء جنوب الرياض خدمات متكاملة تشمل غسيل الخزانات الأرضية والعلوية، جلي وتلميع البلاط، والتعقيم الشامل للمنازل."
};

console.log(`\n🗺️  إنشاء ${NEIGHBORHOODS.length} صفحة أحياء الرياض...`);

for (const area of NEIGHBORHOODS) {
  const arSlug     = ARABIC_AREA_SLUGS[area.slug] || area.slug;
  const canonical  = `${SITE_URL}/areas/${encodeURIComponent(arSlug)}`;
  const location   = area.name.includes("الرياض") ? area.name : `${area.name} بالرياض`;
  const h1         = `شركة تنظيف منازل وفلل ومكاتب في ${location}`;
  const title      = `شركة تنظيف منازل وفلل ${location} | ${siteCompanyName} — ${sitePhoneWhatsapp}`;
  const description = `افضل شركة تنظيف منازل وفلل ومكاتب في ${location}. تنظيف شقق، تنظيف بعد التشطيب والبناء، غسيل مجالس بالبخار وجلي الرخام. اتصل: ${sitePhoneWhatsapp}`;
  const ogImage    = `${SITE_URL}/images/hero-1.webp`;

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": h1,
    "description": description,
    "url": canonical,
    "inLanguage": "ar",
    "provider": {
      "@type": "LocalBusiness",
      "@id": `${SITE_URL}/#business`,
      "name": siteCompanyName,
      "image": absoluteImg(siteLogo),
      "priceRange": settingMap.company_price_range?.trim() || SEO_DEFAULTS.priceRange,
      "telephone": toInternational(sitePhoneCall),
      "address": buildAddressSchema(),
      "url": SITE_URL,
    },
    "areaServed": { "@type": "Place", "name": `${location}، المملكة العربية السعودية` },
    "offers": [
      { "@type": "Offer", "name": "باقة تنظيف الشقق السكنية", "description": "طلب عرض سعر مجاني حسب عدد الغرف والمساحة والخدمات المختارة." },
      { "@type": "Offer", "name": "باقة تنظيف الفلل السكنية", "description": "طلب عرض سعر مجاني حسب مساحة الفيلا والأدوار والأحواش والملحقات." },
    ],
  };

  const crumbs = [
    { name: "الرئيسية", url: SITE_URL },
    { name: "أحياء الرياض", url: `${SITE_URL}/areas` },
    { name: area.name, url: canonical },
  ];

  const relatedLinksHtml = area.related.length
    ? `<div style="margin-top:24px"><p style="font-weight:700;color:#1a202c;margin-bottom:12px">مناطق قريبة نخدمها:</p>
       <div style="display:flex;flex-wrap:wrap;gap:8px">
         ${area.related.map(r => {
           const relAr = ARABIC_AREA_SLUGS[r] || r;
           return `<a href="${SITE_URL}/areas/${encodeURIComponent(relAr)}" style="padding:6px 16px;background:#ebf4ff;color:#2b6cb0;border-radius:20px;font-size:14px;text-decoration:none">${AREA_NAMES[r] || r}</a>`;
         }).join("")}
       </div></div>`
    : "";

  const bodyContent = `
    <div itemscope itemtype="https://schema.org/Service">
      <h1 itemprop="name" style="font-size:clamp(22px,4vw,32px);font-weight:800;color:#1a202c;margin:0 0 16px;line-height:1.4">
        ${esc(h1)}
      </h1>
      <p itemprop="description" style="font-size:17px;color:#4a5568;line-height:1.8;margin-bottom:28px">
        ${esc(description)}
      </p>

      <h2 style="font-size:20px;font-weight:800;color:#1a202c;margin:24px 0 12px">أسعار باقات التنظيف في ${esc(area.name)}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:15px;margin-bottom:20px">
        <thead>
          <tr style="background:#ebf4ff">
            <th style="text-align:right;padding:12px 16px;border:1px solid #bee3f8;font-weight:800">باقة التنظيف</th>
            <th style="text-align:right;padding:12px 16px;border:1px solid #bee3f8;font-weight:800">نوع العقار والتغطية</th>
            <th style="text-align:right;padding:12px 16px;border:1px solid #bee3f8;font-weight:800">السعر التقريبي</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:12px 16px;border:1px solid #e2e8f0">تنظيف شقق سكنية</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0">شقة كاملة حتى 200 م²</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0;font-weight:800;color:#2b6cb0">طلب عرض سعر مجاني</td>
          </tr>
          <tr style="background:#f7fafc">
            <td style="padding:12px 16px;border:1px solid #e2e8f0">تنظيف فلل بعد التشطيب</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0">فيلا كاملة بعد البناء</td>
            <td style="padding:12px 16px;border:1px solid #e2e8f0;font-weight:800;color:#2b6cb0">طلب عرض سعر مجاني</td>
          </tr>
        </tbody>
      </table>

      <div style="margin:20px 0;padding:16px;background:#fef9e7;border-radius:12px;border-right:4px solid #f6c90e">
        <p style="margin:0;font-size:15px;color:#744210">
           📞 للحصول على حجز فوري في ${esc(area.name)}: <strong>${esc(sitePhoneWhatsapp)} — ${esc(sitePhoneCall)}</strong>
        </p>
      </div>

       <h2 style="font-size:18px;font-weight:800;color:#1a202c;margin:24px 0 12px">لماذا ${esc(siteCompanyName)} لخدمات التنظيف في ${esc(area.name)}؟</h2>
      <ul style="margin:0;padding-right:24px;color:#2d3748">
        <li style="margin:8px 0">عمالة تنظيف مدربة ومجهزة بأحدث معدات الجلي والتعقيم</li>
        <li style="margin:8px 0">أسعار تنافسية وشفافة — باقات محددة وبدون تكاليف مخفية</li>
        <li style="margin:8px 0">استخدام مواد تنظيف ومطهرات أصلية وآمنة على البيئة والأرضيات</li>
        <li style="margin:8px 0">خبرة 8+ سنوات في تنظيف الفلل والمنازل والشركات بالرياض</li>
        <li style="margin:8px 0">التزام تام بالمواعيد والسرعة في إنجاز العمل</li>
      </ul>

      ${relatedLinksHtml}

      <div style="margin-top:32px;padding:20px;background:#1e3a5f;color:white;border-radius:12px;text-align:center">
        <p style="font-size:18px;font-weight:800;margin:0 0 8px">احجز خدمة التنظيف الآن في ${esc(area.name)}</p>
        <p style="font-size:14px;color:#cbd5e0;margin:0 0 16px">اتصل بنا أو تواصل عبر واتساب</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
           <a href="tel:${esc(sitePhoneCall)}" style="background:white;color:#1e3a5f;padding:10px 24px;border-radius:8px;font-weight:800;text-decoration:none">📞 ${esc(sitePhoneCall)}</a>
           <a href="${waLink(sitePhoneWhatsapp, `أريد حجز خدمة تنظيف في ${area.name}`)}" style="background:#25d366;color:white;padding:10px 24px;border-radius:8px;font-weight:800;text-decoration:none">واتساب ↗</a>
        </div>
      </div>
    </div>`;

  const areaKeywords = `شركة تنظيف ${location}, تنظيف منازل ${location}, تنظيف فلل ${location}, غسيل مجالس ${location}, جلي رخام ${location}`;
  const neighborhoodFaqs = [
    { q: `كم يستغرق وصول فريق التنظيف في ${location}؟`, a: `تصل فرقنا الميدانية المجهزة إلى موقعك في ${location} خلال 30 إلى 45 دقيقة من تأكيد الحجز.` },
    { q: `ما هي أكثر خدمات التنظيف طلباً في ${location}؟`, a: `تنظيف الفلل والشقق بعد التشطيب، غسيل المجالس بالبخار، جلي الرخام بالألماس، وتنظيف الخزانات والمكيفات.` },
    { q: `هل تقدمون ضماناً على الخدمة في ${location}؟`, a: `نعم، نقدم ضماناً شاملاً 100% على جودة التنفيذ لكافة الأعمال.` }
  ];
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": neighborhoodFaqs.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a
      }
    }))
  };

  const html = renderPage({
    title, description, canonical, ogImage,
    ogType: "website",
    keywords: areaKeywords,
    schemas: [serviceSchema, faqSchema, breadcrumbSchema(crumbs)],
    breadcrumbs: crumbs,
    bodyContent,
  });

  savePage(`areas/${area.slug}`, html);
  if (arSlug !== area.slug) {
    savePage(`areas/${arSlug}`, html);
  }
}
console.log(`   ✅ ${NEIGHBORHOODS.length} صفحة حي (بالعربي والإنجليزي)`);

// ── صفحة دليل المناطق /areas/index.html ──────────────────────────────────────
{
  const canonical = `${SITE_URL}/areas`;
  const title = `مناطق خدمة تنظيف المنازل والفلل في الرياض | ${siteCompanyName}`;
  const description = `تعرف على مناطق خدمة ${siteCompanyName} لتنظيف المنازل والفلل والمكاتب وجلي الرخام وغسيل المكيفات بالرياض.`;
  const groups = [
    { name: "شمال الرياض", slugs: ["north-riyadh", "al-malqa", "al-yasmin", "al-narjis", "al-aarid", "hittin", "al-sahafa", "al-nafal", "al-aqiq", "al-rabi", "al-ghadeer", "al-wadi", "al-nada", "al-falah"] },
    { name: "شرق الرياض", slugs: ["east-riyadh", "al-qadesiya", "al-naseem", "al-rawdah", "al-khaleej", "al-nahdah", "al-manar", "al-yarmouk", "al-munsiyah", "al-hamra", "al-qurtubah", "al-shuhada"] },
    { name: "غرب الرياض", slugs: ["west-riyadh", "al-suwaidi", "al-uraija", "dhahrat-laban", "al-hazm", "al-badiyah", "shubra", "al-awali"] },
    { name: "جنوب الرياض", slugs: ["south-riyadh", "badr", "al-hair", "al-shifa", "al-aziziyah", "al-dar-al-baida", "al-manakh", "al-iskan"] },
    { name: "وسط الرياض", slugs: ["central-riyadh", "al-olaya", "al-sulaimaniya", "al-malaz", "al-murabba", "al-batha", "al-wizarat", "al-futah"] },
  ];
  const areaBySlug = Object.fromEntries(NEIGHBORHOODS.map(area => [area.slug, area]));
  const areaLinks = groups.map(group => `
    <section style="margin:20px 0;padding:20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
      <h2 style="font-size:21px;font-weight:800;color:#1a202c;margin:0 0 14px">${esc(group.name)}</h2>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${group.slugs.map(slug => {
          const area = areaBySlug[slug];
          return area
            ? `<a href="/areas/${esc(slug)}" style="padding:8px 14px;background:#ebf4ff;color:#2b6cb0;border-radius:20px;text-decoration:none">${esc(area.name)}</a>`
            : "";
        }).join("")}
      </div>
    </section>`).join("");
  const bodyContent = `
    <h1 style="font-size:clamp(24px,4vw,36px);font-weight:800;color:#1a202c;margin:0 0 16px;line-height:1.4">
      خدمات تنظيف المنازل والفلل في جميع أحياء الرياض
    </h1>
    <p style="font-size:17px;color:#4a5568;line-height:1.8;margin-bottom:24px">
      ${esc(description)} اختر منطقتك لمعرفة تفاصيل الخدمة والأسعار وطرق التواصل.
    </p>
    ${areaLinks}
    <div style="margin-top:24px;padding:20px;background:#1e3a5f;color:#fff;border-radius:12px;text-align:center">
      <p style="font-size:18px;font-weight:800;margin:0 0 8px">لم تجد حيّك في القائمة؟</p>
      <p style="font-size:14px;color:#cbd5e0;margin:0 0 14px">اتصل بنا لتأكيد تقديم الخدمة في موقعك داخل الرياض</p>
       <a href="tel:${esc(sitePhoneCall)}" style="background:#fff;color:#1e3a5f;padding:10px 24px;border-radius:8px;font-weight:800;text-decoration:none">${esc(sitePhoneCall)}</a>
    </div>`;
  const areaListSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": title,
    "description": description,
    "url": canonical,
    "inLanguage": "ar",
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": NEIGHBORHOODS.map((area, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": area.name,
        "url": `${SITE_URL}/areas/${area.slug}`,
      })),
    },
  };
  const crumbs = [
    { name: "الرئيسية", url: SITE_URL },
    { name: "مناطق الخدمة", url: canonical },
  ];
  savePage("areas", renderPage({
    title,
    description,
    canonical,
    ogImage: `${SITE_URL}/images/hero-1.webp`,
    keywords: "شركة تنظيف أحياء الرياض, تنظيف منازل شمال الرياض, تنظيف فلل جنوب الرياض, تنظيف شقق شرق الرياض, تنظيف فلل غرب الرياض",
    schemas: [areaListSchema, breadcrumbSchema(crumbs)],
    breadcrumbs: crumbs,
    bodyContent,
  }));
  console.log("   ✅ صفحة دليل المناطق /areas");
}

db.close();

const total = posts.length + seoPages.length + services.length + containers.length + 1 + NEIGHBORHOODS.length + 1; // +1 for blog listing
console.log(`\n🚀 Pre-rendering مكتمل — ${total} صفحة HTML ثابتة جاهزة للفهرسة الفورية\n`);
