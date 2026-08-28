#!/usr/bin/env node
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const db = new Database(join(root, "data", "sabaik.db"));

const arabicSlugs = {
  "north-riyadh": "شمال-الرياض",
  "east-riyadh": "شرق-الرياض",
  "west-riyadh": "غرب-الرياض",
  "south-riyadh": "جنوب-الرياض",
  "central-riyadh": "وسط-الرياض",
  "al-diriyah": "الدرعية-والضواحي",
};

const setting = db
  .prepare("SELECT value FROM site_settings WHERE key = 'homepage_content' LIMIT 1")
  .get();
if (!setting?.value) throw new Error("homepage_content غير موجود في قاعدة البيانات");

const content = JSON.parse(setting.value);
if (!content.areas || !Array.isArray(content.areas.items)) {
  throw new Error("بنية مناطق الصفحة الرئيسية غير صالحة");
}

let changed = 0;
for (const area of content.areas.items) {
  const nextSlug = arabicSlugs[area.slug] || area.slug;
  if (nextSlug !== area.slug) {
    area.slug = nextSlug;
    changed++;
  }
}

const now = new Date().toISOString();
db.prepare(`
  INSERT INTO site_settings (key, value, updated_at)
  VALUES ('homepage_content', ?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`).run(JSON.stringify(content), now);
db.close();
console.log(`تم توحيد ${changed} روابط مناطق إلى أسماء عربية في قاعدة البيانات`);