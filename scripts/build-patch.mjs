import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, rmSync, mkdirSync, copyFileSync, cpSync, statSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { randomBytes, createHash, createCipheriv } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PATCH_DIR = join(ROOT, "build_patch");
const ZIP_OUT = join(ROOT, "hawiat-update-patch.zip");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");

console.log("🚀 [Hawiat Micro Patch] تجهيز حزمة تحديث خفيفة (كود فقط بدون صور)...");

function hostingerPatchSecret() {
  const previousApiPath = join(ROOT, "build_php/api/index.php");
  const previousApi = existsSync(previousApiPath) ? readFileSync(previousApiPath, "utf8") : "";
  return previousApi.match(/SESSION_SECRET'\)\s*\?:\s*'([0-9a-f]{64})'/)?.[1] || randomBytes(32).toString("hex");
}

function encryptHostingerPassword(password, secret) {
  const key = createHash("sha256").update(`hostinger-ftp:${secret}`).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

// 1. Rebuild frontend
console.log("▶ بناء ملفات الواجهة الأمامية المحدثة...");
execSync("pnpm --filter @workspace/cleanflow-services run build", { cwd: ROOT, stdio: "inherit" });
console.log("▶ إعادة توليد صفحات HTML الثابتة بنفس أصول البناء...");
execSync("node scripts/prerender.mjs", { cwd: ROOT, stdio: "inherit" });

// 2. Clean & recreate build_patch
if (existsSync(PATCH_DIR)) rmSync(PATCH_DIR, { recursive: true, force: true });
mkdirSync(PATCH_DIR, { recursive: true });

// 3. Copy ONLY compiled JS/CSS assets and main index.html (NO images, NO uploads)
const distPublic = join(ROOT, "artifacts/sabaik-almasa/dist/public");
const assetsSrc = join(distPublic, "assets");
const assetsDst = join(PATCH_DIR, "assets");
if (existsSync(assetsSrc)) {
  cpSync(assetsSrc, assetsDst, { recursive: true });
  console.log("✓ تم نسخ ملفات JS / CSS المحدثة فقط.");

  // Compatibility aliases for cached HTML from the previous patch. Some
  // browsers/CDNs can keep old lazy-import URLs after index.html changes;
  // keep the current chunks available at the exact URLs reported by Hostinger.
  const compatibilityAliases = [
    // Names observed on the currently published Hostinger build. Keep these
    // aliases so a stale HTML document or CDN cache can still load the
    // corrected workflow code after the patch is uploaded.
    ["index-XKmgbX4P.js", /^index-[^/]+\.js$/],
    ["ContainerSystem-CLh5-87j.js", /^ContainerSystem-[^/]+\.js$/],
    ["vendor-react-cjBsqQw7.js", /^vendor-react-[^/]+\.js$/],
    ["vendor-radix-DY7cewM8.js", /^vendor-radix-[^/]+\.js$/],
    ["vendor-radix-DsAyEHzj.js", /^vendor-radix-[^/]+\.js$/],
    ["vendor-leaflet-B2P7CRh1.js", /^vendor-leaflet-[^/]+\.js$/],
    ["vendor-motion-Cd1BIfVU.js", /^vendor-motion-[^/]+\.js$/],
    ["index-DjNEGUy7.css", /^index-[^/]+\.css$/],
    ["index-CwjPgsoo.js", /^index-[^/]+\.js$/],
    ["index-ChILh_On.js", /^index-[^/]+\.js$/],
    ["index-B5fMjRUj.js", /^index-[^/]+\.js$/],
    ["index-DVBBl5cX.css", /^index-[^/]+\.css$/],
    ["index-BRF6LCBA.js", /^index-[^/]+\.js$/],
    ["index-80cL6Fpf.css", /^index-[^/]+\.css$/],
    ["FaqPage-R3henCVg.js", /^FaqPage-[^/]+\.js$/],
    ["Requests-C30AogZw.js", /^Requests-[^/]+\.js$/],
  ];
  for (const [legacyName, currentPattern] of compatibilityAliases) {
    const currentName = readdirSync(assetsSrc).find((name) => currentPattern.test(name));
    if (currentName && currentName !== legacyName) {
      copyFileSync(join(assetsSrc, currentName), join(assetsDst, legacyName));
      console.log(`✓ اسم توافق قديم: ${currentName} → ${legacyName}`);
    }
  }
}

const indexSrc = join(distPublic, "index.html");
if (existsSync(indexSrc)) {
  copyFileSync(indexSrc, join(PATCH_DIR, "index.html"));
  console.log("✓ تم نسخ index.html.");
}

// Static SEO pages (including /faq/) must be shipped with the same HTML
// asset references as the current Vite build. Otherwise an older page can
// remain on Hostinger while its hashed assets have already been replaced.
let copiedHtmlPages = 0;
function copyHtmlPages(sourceDir, relativeDir = "") {
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = join(sourceDir, entry.name);
    const relativePath = join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      copyHtmlPages(sourcePath, relativePath);
      continue;
    }
    if (!entry.name.endsWith(".html") || relativePath === "index.html") continue;
    const destinationPath = join(PATCH_DIR, relativePath);
    mkdirSync(dirname(destinationPath), { recursive: true });
    copyFileSync(sourcePath, destinationPath);
    copiedHtmlPages++;
  }
}
copyHtmlPages(distPublic);
console.log(`✓ تم نسخ ${copiedHtmlPages} صفحة HTML ثابتة محدثة، منها صفحة /faq/.`);

// 4. Copy PHP API router and .htaccess
const apiDir = join(PATCH_DIR, "api");
mkdirSync(apiDir, { recursive: true });
// Preserve the secret generated by the last full archive. FTP credentials in
// site_settings are encrypted with that secret; replacing it with the source
// placeholder makes /admin/hostinger/test and /deploy fail with HTTP 500.
const apiTemplatePath = join(ROOT, "scripts/api-index.php");
const previousSecret = hostingerPatchSecret();
const apiSource = readFileSync(apiTemplatePath, "utf8").replaceAll("__HOSTINGER_TOKEN_SECRET__", previousSecret);
writeFileSync(join(apiDir, "index.php"), apiSource, "utf8");
copyFileSync(join(ROOT, "scripts/container-system.php"), join(apiDir, "container-system.php"));

const htaccessRoot = join(ROOT, "build_php/.htaccess");
if (existsSync(htaccessRoot)) copyFileSync(htaccessRoot, join(PATCH_DIR, ".htaccess"));
const htaccessApi = join(ROOT, "build_php/api/.htaccess");
if (existsSync(htaccessApi)) copyFileSync(htaccessApi, join(apiDir, ".htaccess"));

// 5. Copy notification worker assets. They are not emitted into Vite's assets/
// directory, but they are required for Web Push on an existing Hostinger site.
for (const publicFile of ["sw.js", "notification-icon.webp"]) {
  const source = join(ROOT, "artifacts/sabaik-almasa/public", publicFile);
  if (existsSync(source)) copyFileSync(source, join(PATCH_DIR, publicFile));
}

// 6. Copy SQLite database. The patch must carry schema/settings changes
// (including push_subscriptions and VAPID settings) without touching uploads/.
const dataDir = join(PATCH_DIR, "data");
mkdirSync(dataDir, { recursive: true });
const dbSrc = join(ROOT, "data/sabaik.db");
if (existsSync(dbSrc)) {
  // The dev API uses WAL, so the newest heartbeat/message writes may still be
  // in sidecar files. Checkpoint before copying and make the patch portable
  // for Hostinger, which runs PHP/SQLite without the WAL sidecars.
  const sourceDb = new Database(dbSrc);
  try {
    sourceDb.pragma("wal_checkpoint(TRUNCATE)");
  } finally {
    sourceDb.close();
  }
  copyFileSync(dbSrc, join(dataDir, "sabaik.db"));
  const patchDb = new Database(join(dataDir, "sabaik.db"));
  try {
    patchDb.pragma("journal_mode=DELETE");
    const hostingerPassword = String(process.env.HOSTINGER_FTP_PASSWORD ?? "").trim();
    if (hostingerPassword) {
      const encryptedPassword = encryptHostingerPassword(hostingerPassword, hostingerPatchSecret());
      const now = new Date().toISOString();
      const existing = patchDb.prepare("SELECT key FROM site_settings WHERE key = ?").get("hostinger_ftp_password");
      if (existing) {
        patchDb.prepare("UPDATE site_settings SET value = ?, updated_at = ? WHERE key = ?").run(encryptedPassword, now, "hostinger_ftp_password");
      } else {
        patchDb.prepare("INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)").run("hostinger_ftp_password", encryptedPassword, now);
      }
      console.log("✓ تم تثبيت كلمة مرور Hostinger مشفرة داخل نسخة قاعدة بيانات الباتش.");
    }
    const integrity = patchDb.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") throw new Error(`فشل فحص سلامة قاعدة بيانات الباتش: ${integrity}`);
  } finally {
    patchDb.close();
  }
  console.log("✓ تم نسخ قاعدة البيانات data/sabaik.db.");
}

writeFileSync(join(PATCH_DIR, "UPLOAD_INSTRUCTIONS.txt"), [
  "تحديث Patch لموقع Hostinger",
  "",
  "ارفع جميع الملفات والمجلدات الموجودة هنا إلى public_html/ مع الاستبدال:",
  "  assets/ + index.html + api/ + .htaccess + data/sabaik.db",
  "  sw.js + notification-icon.webp",
  "",
  "لا تحذف uploads/ الموجودة على Hostinger.",
  "خذ نسخة احتياطية من data/sabaik.db الحالية قبل الاستبدال.",
  "كلمة مرور FTP لا تُحفظ كنص صريح؛ يتم تثبيتها مشفرة تلقائياً من مخزن الأسرار الآمن.",
].join("\n"), "utf8");

// 7. Compress patch with portable forward-slash paths (same root layout as
// the historical hawiat-update-patch.zip, without a build_patch/ prefix).
if (existsSync(ZIP_OUT)) rmSync(ZIP_OUT, { force: true });
try {
  if (process.platform === "win32") {
    execSync(`powershell -Command "Compress-Archive -Path '${PATCH_DIR}\\*' -DestinationPath '${ZIP_OUT}' -Force"`, { cwd: ROOT, stdio: "inherit" });
  } else {
    execSync(`zip -r "${ZIP_OUT}" .`, { cwd: PATCH_DIR, stdio: "inherit" });
  }
  const sizeMb = (statSync(ZIP_OUT).size / (1024 * 1024)).toFixed(2);
  console.log(`\n🎉 تم إنشاء حزمة التحديث الخفيفة بنجاح: hawiat-update-patch.zip (الحجم: ${sizeMb} ميجابايت فقط!)`);
} catch (err) {
  console.error("فشل ضغط ملف التحديث:", err);
}
