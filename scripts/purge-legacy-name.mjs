import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const ROOT = "e:/Hawiat";

// 1. Purge from Databases
const dbFiles = [
  path.join(ROOT, "data/sabaik.db"),
  path.join(ROOT, "data/sabaik_7dbd.db"),
  path.join(ROOT, "build_php/data/sabaik.db")
];

for (const dbPath of dbFiles) {
  if (!fs.existsSync(dbPath)) continue;
  console.log(`🧹 تنظيف قاعدة البيانات: ${dbPath}`);
  const db = new Database(dbPath);

  // Table posts
  try {
    db.prepare(`
      UPDATE posts 
      SET 
        title = REPLACE(REPLACE(REPLACE(title, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'تقي جروب'),
        content = REPLACE(REPLACE(REPLACE(content, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'تقي جروب'),
        author = REPLACE(REPLACE(REPLACE(author, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب'),
        seo_title = REPLACE(REPLACE(REPLACE(seo_title, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب'),
        seo_description = REPLACE(REPLACE(REPLACE(seo_description, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب')
    `).run();
    console.log("  ✅ تم تنظيف جدول posts");
  } catch (e) { console.log("  posts:", e.message); }

  // Table services
  try {
    db.prepare(`
      UPDATE services 
      SET 
        title = REPLACE(REPLACE(REPLACE(title, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب'),
        description = REPLACE(REPLACE(REPLACE(description, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب'),
        seo_title = REPLACE(REPLACE(REPLACE(seo_title, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب'),
        seo_description = REPLACE(REPLACE(REPLACE(seo_description, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب')
    `).run();
    console.log("  ✅ تم تنظيف جدول services");
  } catch (e) { console.log("  services:", e.message); }

  // Table seo_pages
  try {
    db.prepare(`
      UPDATE seo_pages 
      SET 
        title = REPLACE(REPLACE(REPLACE(title, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب'),
        content = REPLACE(REPLACE(REPLACE(content, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب'),
        excerpt = REPLACE(REPLACE(REPLACE(excerpt, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب'),
        seo_title = REPLACE(REPLACE(REPLACE(seo_title, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب'),
        seo_description = REPLACE(REPLACE(REPLACE(seo_description, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب'),
        seo_keywords = REPLACE(REPLACE(REPLACE(seo_keywords, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب')
    `).run();
    console.log("  ✅ تم تنظيف جدول seo_pages");
  } catch (e) { console.log("  seo_pages:", e.message); }

  // Table site_settings
  try {
    db.prepare(`
      UPDATE site_settings 
      SET value = REPLACE(REPLACE(REPLACE(value, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب')
    `).run();
    console.log("  ✅ تم تنظيف جدول site_settings");
  } catch (e) { console.log("  site_settings:", e.message); }

  // Table testimonials
  try {
    db.prepare(`
      UPDATE testimonials 
      SET content = REPLACE(REPLACE(REPLACE(content, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب')
    `).run();
    console.log("  ✅ تم تنظيف جدول testimonials");
  } catch (e) { console.log("  testimonials:", e.message); }

  // Table containers
  try {
    db.prepare(`
      UPDATE containers 
      SET 
        name = REPLACE(REPLACE(REPLACE(name, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب'),
        description = REPLACE(REPLACE(REPLACE(description, 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'مؤسسة تقي جروب', 'مؤسسة تقي جروب'), 'تقي جروب', 'مؤسسة تقي جروب')
    `).run();
    console.log("  ✅ تم تنظيف جدول containers");
  } catch (e) { console.log("  containers:", e.message); }

  db.close();
}

console.log("\n🎉 اكتمل تنظيف جميع قواعد البيانات بنجاح!");
