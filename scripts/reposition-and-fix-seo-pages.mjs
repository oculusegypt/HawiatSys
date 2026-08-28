import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");

const dbs = [
  join(ROOT, "data", "sabaik.db"),
  join(ROOT, "data", "sabaik_7dbd.db")
];

for (const dbPath of dbs) {
  const db = new Database(dbPath);
  console.log(`Processing ${dbPath}...`);

  // 1. Fix misspelling (بالرخار -> بالبخار)
  db.prepare(`
    UPDATE seo_pages 
    SET title = 'شركة تنظيف مجالس بالبخار بالرياض | مؤسسة تقي جروب',
        target_keyword = 'تنظيف مجالس بالبخار بالرياض',
        seo_title = 'شركة تنظيف مجالس بالبخار بالرياض | مؤسسة تقي جروب',
        seo_description = 'أفضل شركة تنظيف وغسيل مجالس وكنب وسجاد بالبخار في الرياض بدرجة حرارة 140° مع التعقيم الفوري وإزالة البقع الصعبة والتجفيف السريع.',
        seo_keywords = 'تنظيف مجالس بالبخار بالرياض, غسيل مجالس بالبخار بالرياض, شركة تنظيف كنب بالبخار بالرياض'
    WHERE slug LIKE '%رخار%' OR title LIKE '%رخار%' OR target_keyword LIKE '%رخار%'
  `).run();

  // 2. Reposition "نقل العفش" to "تنظيف المنازل والفلل قبل وبعد نقل العفش بالرياض" (Move-in / Move-out Cleaning)
  const furniturePages = db.prepare("SELECT id, title, slug FROM seo_pages WHERE title LIKE '%نقل%' OR slug LIKE '%نقل%'").all();
  for (const page of furniturePages) {
    const updatedTitle = page.title
      .replace(/دينا نقل عفش بالرياض/, "تنظيف المنازل قبل وبعد نقل العفش بالرياض")
      .replace(/شركة نقل عفش بالرياض/, "تنظيف وتجهيز الفلل قبل نقل العفش بالرياض")
      .replace(/شركة نقل العفش داخل الرياض/, "خدمات تنظيف المنازل المصاحبة لنقل العفش بالرياض")
      .replace(/شركات نقل العفش بالرياض/, "دليل تنظيف وتعقيم المنازل بعد نقل الأثاث بالرياض")
      .replace(/ارخص شركة نقل اثاث بالرياض/, "تنظيف وتلميع الأثاث والمنازل بعد النقل بالرياض")
      .replace(/نقل اثاث شرق الرياض/, "تنظيف المنازل والفلل قبل النقل بشرق الرياض")
      .replace(/شركة نقل عفش بالخرج/, "تنظيف منازل وفلل قبل وبعد نقل الأثاث بالخرج")
      .replace(/نقل عفش بالرياض باكستاني/, "تنظيف عميق للمنازل والفلل بعد نقل الأثاث بالرياض")
      .replace(/نقل عفش شرق الرياض/, "تنظيف مجالس ومنازل بعد نقل العفش بشرق الرياض")
      .replace(/ونيـت نقل عفش بالرياض/, "تنظيف وتعقيم الشقق قبل الانتقال ونقل العفش بالرياض")
      .replace(/شركة نقل عفش شمال الرياض/, "تنظيف الفلل والقصور الجديدة قبل نقل العفش بشمال الرياض");

    const desc = `خدمات تنظيف وتطهير المنازل والفلل والشقق بالرياض قبل وبعد نقل الأثاث والعفش. تنظيف عميق وجلي للأرضيات وغسيل للمفروشات لضمان استلام منزلك نظيفاً ومعقماً بالكامل.`;

    db.prepare(`
      UPDATE seo_pages
      SET title = ?,
          seo_title = ?,
          seo_description = ?,
          seo_keywords = 'تنظيف منازل قبل نقل العفش بالرياض, تنظيف بعد نقل الاثاث بالرياض, شركة تنظيف بالرياض'
      WHERE id = ?
    `).run(updatedTitle, updatedTitle, desc, page.id);
  }

  console.log(`✅ Fixed misspelling and repositioned ${furniturePages.length} non-core pages to Move-in/Move-out Cleaning in ${dbPath}`);
  db.close();
}
