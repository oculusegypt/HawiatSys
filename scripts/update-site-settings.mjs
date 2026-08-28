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

const updates = [
  { key: "company_name", value: "مؤسسة تقي جروب" },
  { key: "site_public_url", value: "https://alsahmm.com" },
  { key: "seo_meta_title", value: "شركة تنظيف بالرياض | مؤسسة تقي جروب" },
  { key: "seo_meta_description", value: "مؤسسة تقي جروب لخدمات التنظيف بالرياض: تنظيف المنازل والفلل والشقق والمكاتب، والتنظيف بعد البناء، وغسيل المجالس والسجاد بالبخار، وجلي الرخام، وتنظيف الخزانات والمكيفات بأعلى معايير الجودة." },
  { key: "seo_meta_keywords", value: "شركة تنظيف بالرياض, شركة تنظيف منازل بالرياض, شركة تنظيف فلل بالرياض, تنظيف شقق بالرياض, تنظيف بعد البناء بالرياض, غسيل مجالس بالبخار بالرياض, جلي رخام بالرياض, تنظيف خزانات بالرياض, تنظيف مكيفات بالرياض, مؤسسة تقي جروب" },
  { key: "company_city", value: "الرياض" },
  { key: "company_region", value: "منطقة الرياض" },
  { key: "company_country", value: "SA" },
  { key: "company_address", value: "طريق الملك فهد، حي الصحافة، الرياض" },
  { key: "company_postal_code", value: "13321" },
  { key: "company_latitude", value: "24.7937" },
  { key: "company_longitude", value: "46.6371" },
  { key: "company_email", value: "info@alsahmm.com" },
  { key: "company_price_range", value: "$$" },
  { key: "company_payment_methods", value: "نقدي، مدى، فيزا، ماستركارد، تحويل بنكي" },
  { key: "vapid_subject", value: "mailto:info@alsahmm.com" }
];

for (const dbPath of dbs) {
  try {
    const db = new Database(dbPath);
    const now = new Date().toISOString();
    const upsert = db.prepare(`
      INSERT INTO site_settings (key, value, updated_at) VALUES (@key, @value, '${now}')
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = '${now}'
    `);
    const tx = db.transaction((rows) => {
      for (const row of rows) {
        upsert.run(row);
      }
    });
    tx(updates);
    db.close();
    console.log(`Updated settings successfully in ${dbPath}`);
  } catch (err) {
    console.error(`Error updating ${dbPath}:`, err);
  }
}
