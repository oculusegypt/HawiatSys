import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(import.meta.url);
const Database = require(join(ROOT, "lib/db/node_modules/better-sqlite3"));
const db = new Database(join(ROOT, "data/sabaik.db"));
const now = new Date().toISOString();
const siteNameRow = db.prepare("SELECT value FROM site_settings WHERE key = 'company_name'").get();
const siteName = String(siteNameRow?.value || "").trim() || "الشركة";

db.exec(`
  CREATE TABLE IF NOT EXISTS seo_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    target_keyword TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    excerpt TEXT NOT NULL DEFAULT '',
    cover_image TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'خدمات الحاويات ونقل المخلفات',
    tags TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    published_at TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    seo_title TEXT NOT NULL DEFAULT '',
    seo_description TEXT NOT NULL DEFAULT '',
    seo_keywords TEXT NOT NULL DEFAULT '',
    seo_slug TEXT NOT NULL DEFAULT '',
    og_image TEXT NOT NULL DEFAULT '',
    canonical_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

const keywords = [
  "تأجير حاويات بالرياض", "حاويات أنقاض بالرياض", "حاويات مخلفات البناء بالرياض",
  "أسعار تأجير الحاويات بالرياض", "نقل الأنقاض والمخلفات بالرياض", "حاويات نفايات بالرياض",
  "مكبس نفايات بالرياض", "حاويات للمقاولين بالرياض", "حاويات للشركات بالرياض",
  "حاوية 6 ياردة بالرياض", "حاوية 12 ياردة بالرياض", "حاوية 20 ياردة بالرياض",
  "تأجير حاويات شمال الرياض", "تأجير حاويات شرق الرياض", "تأجير حاويات غرب الرياض",
  "تأجير حاويات جنوب الرياض", "نقل مخلفات الترميم بالرياض", "رفع مخلفات الهدم بالرياض",
  "حاويات للمطاعم بالرياض", "حاويات للمصانع بالرياض", "حاويات للمستودعات بالرياض",
  "عقود حاويات للمشاريع", "تبديل حاويات بالرياض", "سحب حاويات بالرياض",
  "نقل مخلفات البناء من الموقع", "حلول إدارة النفايات بالرياض",
];

const unsupported = /تصليح|فني مكيفات|نقل مكيفات|فك وتركيب مكيفات|صيانة مكيفات|نقل عفش|نقل اثاث|نقل مخلفات|غسيل سيارات|كشف تسربات|تسليك مجاري|عزل خزانات|عزل اسطح|مستعمل|دينا|وني.?ت|تطبيق|air-conditioner/i;
const serviceRows = db.prepare("SELECT title, description, seo_title, seo_description, seo_keywords FROM services").all();
const packageRows = db.prepare("SELECT name AS title, description, seo_title, seo_description, seo_keywords FROM containers").all();
const postRows = db.prepare("SELECT title, excerpt, seo_title, seo_description, seo_keywords FROM posts").all();
const coveredText = [...serviceRows, ...packageRows, ...postRows]
  .map(row => Object.values(row).join(" ").toLowerCase())
  .join(" ");
const hasExactCoverage = keyword => coveredText.includes(keyword.toLowerCase());

const slugify = value => value
  .toLowerCase()
  .replace(/[\s_]+/g, "-")
  .replace(/[^\u0600-\u06FFa-z0-9-]/g, "")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 90) || `صفحة-seo-${Date.now()}`;

const insert = db.prepare(`
  INSERT INTO seo_pages
    (title, slug, target_keyword, content, excerpt, cover_image, category, tags, status,
     published_at, view_count, is_active, "order", seo_title, seo_description,
     seo_keywords, seo_slug, og_image, canonical_url, created_at, updated_at)
  VALUES
    (@title, @slug, @target_keyword, @content, @excerpt, @cover_image, @category, @tags, @status,
     @published_at, 0, 1, @order, @seo_title, @seo_description,
     @seo_keywords, @seo_slug, @og_image, @canonical_url, @created_at, @updated_at)
`);
const exists = db.prepare("SELECT id FROM seo_pages WHERE target_keyword = ? OR slug = ?");

let created = 0;
let skippedExisting = 0;
let skippedDuplicate = 0;
for (const keyword of keywords) {
  const slug = slugify(keyword);
  if (exists.get(keyword, slug)) {
    skippedDuplicate++;
    continue;
  }
  // Do not create a thin duplicate where an existing service/article already
  // targets the exact phrase. The admin page still supports adding it manually.
  if (hasExactCoverage(keyword)) {
    skippedExisting++;
    continue;
  }

  const isSupported = !unsupported.test(keyword);
  const status = isSupported ? "published" : "draft";
  const title = `${keyword} | ${siteName}`;
  const excerpt = isSupported
    ? `تعرف على خدمة ${keyword} من ${siteName}، مع حاويات وتجهيزات مناسبة لإدارة مخلفات المشاريع والمنشآت في الرياض والمناطق القريبة. اطلب عرض السعر.`
    : `صفحة بحثية لكلمة "${keyword}". تحقق من نطاق الخدمات المتاحة لدى ${siteName} قبل نشر الصفحة للزوار.`;
  const content = isSupported
    ? `<h2>${keyword} في الرياض</h2><p>تقدم ${siteName} حلولاً لتأجير الحاويات ونقل مخلفات البناء والترميم والنفايات للمنشآت، مع تحديد المقاس والموعد المناسبين لكل موقع.</p><h2>ماذا تشمل الخدمة؟</h2><ul><li>تحديد نوع المخلفات والمقاس المطلوب.</li><li>توصيل الحاوية وسحبها أو تبديلها حسب الجدول.</li><li>تنسيق منظم مع مسؤول المشروع أو المنشأة.</li></ul><h2>اطلب الخدمة</h2><p>أرسل تفاصيل موقعك واحتياجك إلى ${siteName} للحصول على توصية وعرض سعر مناسبين.</p>`
    : `<h2>حول البحث عن ${keyword}</h2><p>هذه الصفحة محفوظة كمسودة للمراجعة الداخلية. تحقق من نطاق الخدمات المتاحة لدى ${siteName} قبل نشر الصفحة للزوار.</p>`;
  const keywordsText = `${keyword}، تأجير الحاويات ونقل المخلفات بالرياض، ${siteName}`;
  insert.run({
    title,
    slug,
    target_keyword: keyword,
    content,
    excerpt,
    cover_image: "/images/seo/taqi-containers.jpg",
    category: isSupported ? "خدمات الحاويات ونقل المخلفات" : "مراجعة قبل النشر",
    tags: JSON.stringify([keyword, "الرياض", siteName]),
    status,
    published_at: status === "published" ? now : null,
    order: created,
    seo_title: `${keyword} | خدمة موثوقة بالرياض`,
    seo_description: excerpt.slice(0, 160),
    seo_keywords: keywordsText,
    seo_slug: slug,
    og_image: "/images/seo/taqi-containers.jpg",
    canonical_url: `/page/${slug}`,
    created_at: now,
    updated_at: now,
  });
  created++;
}

db.close();
console.log(`تم إنشاء ${created} صفحة SEO جديدة، وتجاوز ${skippedExisting} كلمة لها تغطية حالية، وتجاوز ${skippedDuplicate} مكررة.`);