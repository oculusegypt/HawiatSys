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
  { key: "site_public_url", value: "https://taqigroup.com" },
  { key: "seo_meta_title", value: "تأجير حاويات ونقل مخلفات البناء بالرياض | مؤسسة تقي جروب" },
  { key: "seo_meta_description", value: "مؤسسة تقي جروب لتأجير حاويات الأنقاض والنفايات ونقل مخلفات البناء بالرياض، مع توصيل وسحب منسق وحلول مناسبة للمشاريع والمنشآت." },
  { key: "seo_meta_keywords", value: "تأجير حاويات بالرياض, حاويات أنقاض, حاويات نفايات, نقل مخلفات البناء, مكابس نفايات, عقود مواقع, مؤسسة تقي جروب" },
  { key: "company_city", value: "الرياض" },
  { key: "company_region", value: "منطقة الرياض" },
  { key: "company_country", value: "SA" },
  { key: "company_address", value: "طريق الملك فهد، حي الصحافة، الرياض" },
  { key: "company_postal_code", value: "13321" },
  { key: "company_latitude", value: "24.7937" },
  { key: "company_longitude", value: "46.6371" },
  { key: "company_email", value: "info@taqigroup.com" },
  { key: "company_price_range", value: "$$" },
  { key: "company_payment_methods", value: "نقدي، مدى، فيزا، ماستركارد، تحويل بنكي" },
  { key: "company_google_business_profile", value: "https://maps.google.com/maps?ll=24.54038,46.650611&z=16&t=m&hl=ar&gl=EG&mapclient=embed&cid=16777605780937543839" },
  { key: "social_facebook", value: "https://www.facebook.com/Aiservx" },
  { key: "social_x", value: "https://x.com/Aiservx" },
  { key: "social_instagram", value: "https://www.instagram.com/Aiservx/" },
  { key: "social_tiktok", value: "https://www.tiktok.com/@Aiservx" },
  { key: "social_snapchat", value: "https://www.snapchat.com/add/Aiservx" },
  { key: "social_youtube", value: "https://www.youtube.com/@Aiservx" },
  { key: "social_linkedin", value: "https://www.linkedin.com/company/aiservx" },
  { key: "analytics_google_tag_id", value: "G-B6TYSZHY0T" },
  { key: "vapid_subject", value: "mailto:info@taqigroup.com" }
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
    db.pragma("journal_mode = DELETE");
    db.exec("VACUUM");
    db.close();
    console.log(`Updated settings successfully in ${dbPath}`);
  } catch (err) {
    console.error(`Error updating ${dbPath}:`, err);
  }
}
