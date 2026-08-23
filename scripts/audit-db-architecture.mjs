import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");

const db = new Database(join(ROOT, "data", "sabaik.db"));

console.log("=== 1. SEO Pages Audit ===");
const seoPages = db.prepare("SELECT id, slug, title, target_keyword, is_active FROM seo_pages").all();
console.log(`Total seo_pages: ${seoPages.length}`);

// Check for misspellings, non-core services, or duplicates
const problematic = [];
const nonCore = [];
const cleanKeywordAudit = [];

for (const p of seoPages) {
  const fullText = (p.title + " " + p.slug + " " + (p.target_keyword || "")).toLowerCase();
  
  if (fullText.includes("رخار") || fullText.includes("بالرخار")) {
    problematic.push({ id: p.id, type: "misspelling", title: p.title, slug: p.slug });
  }
  if (fullText.includes("نقل") && (fullText.includes("عفش") || fullText.includes("اثاث"))) {
    nonCore.push({ id: p.id, type: "non-core (moving furniture)", title: p.title, slug: p.slug });
  }
}

console.log("Problematic / Misspelled pages found:", problematic);
console.log("Non-core (moving furniture) pages found:", nonCore);

console.log("\n=== 2. Services Audit ===");
const services = db.prepare("SELECT id, title, seo_slug, is_active FROM services").all();
for (const s of services) {
  console.log(`[${s.id}] ${s.title} (${s.seo_slug})`);
}

console.log("\n=== 3. Containers / Packages Audit ===");
const containers = db.prepare("SELECT id, name, size, seo_slug, is_active FROM containers").all();
for (const c of containers) {
  console.log(`[${c.id}] ${c.name} - ${c.size} (${c.seo_slug})`);
}

db.close();
