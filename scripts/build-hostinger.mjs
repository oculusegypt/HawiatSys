#!/usr/bin/env node
/**
 * build-hostinger.mjs
 * ───────────────────
 * خطوات بناء كاملة لـ Hostinger:
 *  1. بناء الواجهة الأمامية (Vite)
 *  2. نسخ ملفات البناء → build_php/
 *  3. WAL checkpoint على قاعدة البيانات الأصلية
 *  4. نسخ قاعدة البيانات + تحويل عمود `order` → `sort_order` في الجداول المتأثرة
 *     (Drizzle ينشئ `order`، لكن PHP يقرأ `sort_order`)
 *  5. ضبط journal_mode=DELETE (WAL غير مدعوم على Hostinger shared hosting)
 *  6. تجهيز مجلد uploads بدون إعادة إدراج صور المشروع القديم
 *  7. تجهيز تعليمات النشر وضغط الأرشيف النهائي بمحتوى الموقع في جذر الأرشيف
 */

import { execSync } from "child_process";
import { randomBytes } from "crypto";
import { createRequire } from "module";
import { existsSync, mkdirSync, copyFileSync, rmSync, cpSync, writeFileSync, readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
function run(cmd, label, envVars = {}) {
  console.log(`\n▶ ${label}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...envVars } });
}

function step(label) {
  console.log(`\n${"─".repeat(60)}\n✦ ${label}`);
}

const SOURCE_DB = join(ROOT, "data/sabaik.db");
const ARCHIVE_SOURCE_DB = join(ROOT, "build_php/.archive-source.db");

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function normalizePublicOrigin(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    const host = parsed.hostname.toLowerCase();
    if (!["http:", "https:"].includes(parsed.protocol) || !host) return "";
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0|replit\.(dev|app)$/i.test(host)) return "";
    return `${parsed.protocol}//${host}${parsed.port ? `:${parsed.port}` : ""}`;
  } catch {
    return "";
  }
}

function archivePublicOrigin() {
  const requested = normalizePublicOrigin(process.env.SITE_URL);
  if (requested) return requested;
  const db = new Database(SOURCE_DB, { readonly: true });
  try {
    const value = db.prepare("SELECT value FROM site_settings WHERE key = 'site_public_url'").get()?.value;
    return normalizePublicOrigin(value);
  } finally {
    db.close();
  }
}

function rewritePlatformOrigin(directory, publicOrigin) {
  const legacyOrigins = /https:\/\/taqigroup\.com/g;
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const file = join(dir, entry);
      if (statSync(file).isDirectory()) walk(file);
      else if (/\.(html?|js|css|json|xml|txt|webmanifest)$/i.test(entry)) {
        const original = readFileSync(file, "utf8");
        const rewritten = original.replace(legacyOrigins, publicOrigin);
        if (rewritten !== original) writeFileSync(file, rewritten, "utf8");
      }
    }
  };
  walk(directory);
}

function inspectDatabase(dbPath) {
  const db = new Database(dbPath, { readonly: true });
  try {
    const integrity = db.pragma("integrity_check", { simple: true });
    const tables = db
      .prepare("SELECT name, rootpage FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all();
    return { integrity, tables };
  } finally {
    db.close();
  }
}

function prepareArchiveSourceDatabase() {
  rmSync(ARCHIVE_SOURCE_DB, { force: true });
  rmSync(`${ARCHIVE_SOURCE_DB}-wal`, { force: true });
  rmSync(`${ARCHIVE_SOURCE_DB}-shm`, { force: true });
  mkdirSync(dirname(ARCHIVE_SOURCE_DB), { recursive: true });

  const sourceInfo = inspectDatabase(SOURCE_DB);
  if (sourceInfo.integrity === "ok") {
    copyFileSync(SOURCE_DB, ARCHIVE_SOURCE_DB);
    for (const suffix of ["-wal", "-shm"]) {
      if (existsSync(`${SOURCE_DB}${suffix}`)) copyFileSync(`${SOURCE_DB}${suffix}`, `${ARCHIVE_SOURCE_DB}${suffix}`);
    }
    console.log("  ✅ قاعدة المصدر سليمة — ستُستخدم مباشرة في الأرشيف");
    return;
  }

  console.warn(`  ⚠️ قاعدة المصدر غير سليمة — سيتم إنشاء نسخة أرشيفية آمنة: ${sourceInfo.integrity}`);
  const fallbackCandidates = [
    join(ROOT, "build_php/data/sabaik.db"),
    join(ROOT, "backups/sabaik-before-container-record-reset-20260825-110138.db"),
    join(ROOT, "backups/sabaik-before-final-seo-hardening.db"),
    join(ROOT, "data/sabaik_7dbd.db"),
  ];
  const fallback = fallbackCandidates.find((candidate) => {
    if (!existsSync(candidate)) return false;
    try {
      return inspectDatabase(candidate).integrity === "ok";
    } catch {
      return false;
    }
  });
  if (!fallback) throw new Error("لم أعثر على نسخة SQLite سليمة يمكن استخدامها لبناء الأرشيف");
  copyFileSync(fallback, ARCHIVE_SOURCE_DB);
  console.log(`  ✅ النسخة السليمة الأساسية: ${fallback.replace(`${ROOT}/`, "")}`);

  const badRootPages = new Set(
    [...String(sourceInfo.integrity).matchAll(/\bTree\s+(\d+)\b/g)].map((match) => Number(match[1])),
  );
  const sourceDb = new Database(SOURCE_DB, { readonly: true });
  const archiveDb = new Database(ARCHIVE_SOURCE_DB);
  try {
    archiveDb.pragma("foreign_keys=OFF");
    const sourceTables = sourceInfo.tables;
    const copyTable = archiveDb.transaction((table, columns, rows) => {
      const tableName = quoteIdentifier(table);
      const columnList = columns.map(quoteIdentifier).join(", ");
      archiveDb.prepare(`DELETE FROM ${tableName}`).run();
      const insert = archiveDb.prepare(
        `INSERT INTO ${tableName} (${columnList}) VALUES (${columns.map(() => "?").join(", ")})`,
      );
      for (const row of rows) insert.run(...columns.map((column) => row[column]));
    });

    let copiedTables = 0;
    for (const table of sourceTables) {
      const tableIsKnownCorrupt = badRootPages.has(Number(table.rootpage));
      const sourceTable = quoteIdentifier(table.name);
      const sourceColumns = sourceDb.prepare(`PRAGMA table_info(${sourceTable})`).all().map((column) => column.name);
      const archiveColumns = archiveDb.prepare(`PRAGMA table_info(${sourceTable})`).all().map((column) => column.name);
      const columns = sourceColumns.filter((column) => archiveColumns.includes(column));
      if (columns.length !== sourceColumns.length || columns.length === 0) {
        console.warn(`  ⏭  تم تجاوز ${table.name} لاختلاف مخطط الأعمدة`);
        continue;
      }
      let rows;
      try {
        rows = sourceDb.prepare(
          `SELECT ${columns.map(quoteIdentifier).join(", ")} FROM ${sourceTable} NOT INDEXED`,
        ).all();
      } catch (error) {
        console.warn(`  ⏭  تعذر قراءة ${table.name}${tableIsKnownCorrupt ? " (جدول متضرر)" : ""}: ${error.message}`);
        continue;
      }
      if (tableIsKnownCorrupt) {
        console.warn(`  ⚠️ تمت قراءة ${table.name} عبر NOT INDEXED رغم تلف فهرسه`);
      }
      copyTable(table.name, columns, rows);
      copiedTables += 1;
    }
    console.log(`  ✅ تم دمج ${copiedTables} جدولاً سليماً من أحدث نسخة للمشروع`);
  } finally {
    archiveDb.close();
    sourceDb.close();
  }
}

// Normalize article media and quarantine unused legacy images before taking
// the archive database snapshot and generating the sitemap.
run(
  "node scripts/clean-legacy-article-images.mjs",
  "استبدال صور المقالات القديمة ونقل الصور غير المستخدمة",
  {},
);

// ── 0. إصلاح metadata وslugs مرة واحدة قبل أخذ ناتج البناء ───────────────────
step("تحديث بيانات SEO قبل البناء (migration صريحة)");
run(
  "node node_modules/.pnpm/tsx@4.23.0/node_modules/tsx/dist/cli.mjs scripts/backfill-seo.mts",
  "إكمال metadata وslugs الناقصة/المكررة",
  {},
);

// Snapshot only after the explicit data migration so the archive, sitemap,
// prerender and PHP API all consume the same database state.
prepareArchiveSourceDatabase();

// ── 1. توليد الخريطة قبل Vite حتى تدخل النسخة الحالية إلى dist ───────────────
step("توليد خريطة الموقع قبل بناء الواجهة");
run(
  "pnpm --filter @workspace/scripts run generate-sitemap",
  "توليد خريطة الموقع النهائية مع صور الخدمات والمقالات",
  { SITE_URL: process.env.SITE_URL || undefined },
);

// ── 2. بناء الواجهة الأمامية ─────────────────────────────────────────────────
step("بناء الواجهة الأمامية (Vite)");
const sabaikDistDir = join(ROOT, "artifacts/sabaik-almasa/dist");
const platformDistDir = join(ROOT, "artifacts/sabaik-platform/dist");
if (existsSync(sabaikDistDir)) rmSync(sabaikDistDir, { recursive: true, force: true });
if (existsSync(platformDistDir)) rmSync(platformDistDir, { recursive: true, force: true });

run(
  "pnpm --filter @workspace/cleanflow-services run build",
  "vite build",
  { PORT: "19770", BASE_PATH: "/", NODE_ENV: "production" }
);
run(
  "pnpm --filter @workspace/cleanflow-platform run build",
  "بناء صفحة CleanFlow Platform",
  { PORT: "19040", BASE_PATH: "/taqi-group-platform/", NODE_ENV: "production" }
);

// ── 1b. Pre-rendering — HTML ثابت لكل مقال وخدمة وحاوية ─────────────────────
step("Pre-rendering الصفحات (SSG)");
run(
  "node scripts/prerender.mjs",
  "توليد HTML ثابت لجميع مقالات المدونة والخدمات والحاويات",
  {}
);
// ── 3. نسخ ملفات البناء ───────────────────────────────────────────────────────
step("نسخ ملفات الواجهة → build_php/");

// Always start the production output from a clean directory. Keeping files from
// a previous build makes the PHP SEO scanner count stale HTML, canonical URLs,
// images, and old branding that are no longer part of the current sitemap.
// Keep only the temporary database snapshot until it is copied into the final
// archive database below.
const buildPhpDir = join(ROOT, "build_php");
if (existsSync(buildPhpDir)) {
  for (const entry of readdirSync(buildPhpDir)) {
    if (entry === ".archive-source.db" || entry === ".archive-source.db-wal" || entry === ".archive-source.db-shm") continue;
    rmSync(join(buildPhpDir, entry), { recursive: true, force: true });
  }
}
mkdirSync(buildPhpDir, { recursive: true });
console.log("  ✅ تم تنظيف ناتج Hostinger السابق مع الحفاظ على نسخة قاعدة البيانات المؤقتة");

// نسخ assets/
rmSync(join(ROOT, "build_php/assets"), { recursive: true, force: true });
rmSync(join(ROOT, "build_php/images"), { recursive: true, force: true });
rmSync(join(ROOT, "build_php/container"), { recursive: true, force: true });
rmSync(join(ROOT, "build_php/api/uploads"), { recursive: true, force: true });
rmSync(join(ROOT, "build_php/taqi-group-platform"), { recursive: true, force: true });
rmSync(join(ROOT, "build_php/cleanflow-platform"), { recursive: true, force: true });

for (const legacyImage of [
  "Banner-Big.webp", "Banner-Small.webp", "No1-Banner.webp", "good.webp",
  "shareek-mawsouq.webp", "container1.jpg", "container2.jpg", "container3.jpg", "container4.jpg",
  "hero1.jpg", "hero2.jpg", "hero3.jpg", "hero4.jpg", "ceo.webp", "hawiyat-logo.webp",
  "partner1.jpg", "partner2.jpg", "partner3.jpg", "partner4.jpg", "partner5.jpg", "partner6.jpg",
  "logo.png", "favicon.png", "notification-icon.png"
]) {
  rmSync(join(ROOT, "build_php", legacyImage), { force: true });
}
const SKIP_FILES = new Set(["api"]);
const LEGACY_PRODUCTION_BASENAMES = new Set([
  "1784880738437-4f946616f9a9",
  "1784880757820-804463c77f13",
  "1784882025820-49ef14f7bcd4",
  "1784882033731-85f21c7eda4f",
  "1784887232848-88a8998bb09c",
  "1785255325266-4cc5c495fd6c",
  "1785255348822-1765d023ab6b",
  "1785255370019-1e0ecd0713bb",
  "1785255383693-202a8c3ca609",
  "1785257611922-fc9bf51eac24",
  "1785354077655-5e88594b40d9",
  "1785354097174-a0cca97c9f9e",
  "1785354132506-ea72050b634a",
  "1785354146906-ce9aa9e1c391",
  "1785354183144-d7bf9cbadf55",
  "1785354189577-a14df34802cf",
  "1785354200379-71f2dc852bef",
  "1785354314084-e9d133e457b0",
  "1785354327071-7df0d634363d",
  "1785354339551-5be8106e52d7",
  "1785354343959-b28bddab35d2",
  "1785354462050-46de33cb28d2",
  "1785354476427-472433a3487c",
  "1786046507655-3963740b2785",
  "1786048541217-6f6bb80fac50",
  "1786575435928-f3bc01c96a5a",
  "1786576602625-1e9aa3b17cae",
  "1786580706278-a17684d9aa89",
  "1786590530851-baf2cf1d98f4",
  "1786590827707-becaf3702c0b",
  "1786590833367-23f06943c4d8",
  "1786590919358-48b4454a24fl",
  "1786590941352-fb358374525f",
  "1786852381998-7b9fc2691361",
  "1786852410628-3417524d6e46",
  "1786852441444-7bdcaa7c2133",
  "1786852469840-8c9465939c93",
  "1786852497754-e23a365fc223",
  "1786852526916-f43fb6a35802",
  "banner-big",
  "banner-small",
  "no1-banner",
  "ceo",
  "container-1",
  "container-2",
  "container-3",
  "container-4",
  "container-compactor-electric",
  "container-debris-jumbo",
  "container-debris-large",
  "container-debris-medium",
  "container-debris-small",
]);
const LEGACY_PRODUCTION_NUMERIC_PREFIXES = new Set(
  [...LEGACY_PRODUCTION_BASENAMES].filter((stem) => /^\d+-/.test(stem)),
);
const isLegacyProductionAsset = (relativePath) => {
  const segments = relativePath.replaceAll("\\", "/").split("/");
  if (segments.includes("صور حسام")) return true;
  const filename = segments.at(-1) || "";
  const stem = filename.replace(/\.[^.]+$/, "").toLowerCase();
  return LEGACY_PRODUCTION_BASENAMES.has(stem)
    || [...LEGACY_PRODUCTION_NUMERIC_PREFIXES].some((prefix) => stem.startsWith(`${prefix}-`));
};
const distPublic = join(ROOT, "artifacts/sabaik-almasa/dist/public");

function copyDirRecursive(srcDir, dstDir, relativeDir = "") {
  mkdirSync(dstDir, { recursive: true });
  for (const item of readdirSync(srcDir)) {
    if (SKIP_FILES.has(item)) continue;
    const relativePath = relativeDir ? `${relativeDir}/${item}` : item;
    if (isLegacyProductionAsset(relativePath)) continue;
    const srcPath = join(srcDir, item);
    const dstPath = join(dstDir, item);
    try {
      const stat = statSync(srcPath);
      if (stat.isDirectory()) {
        copyDirRecursive(srcPath, dstPath, relativePath);
      } else {
        copyFileSync(srcPath, dstPath);
      }
    } catch {}
  }
}

copyDirRecursive(distPublic, join(ROOT, "build_php"));
console.log("  ✅ تم نسخ جميع المجلدات والصفحات الثابتة إلى build_php/");

// بعض السجلات القديمة في SQLite تشير إلى /images/<file> بينما الملف المصدر
// موجود في public/uploads/<file>. أنشئ نسخة توافقية في images/ حتى تعمل
// المدونة والباقات بعد نقل الموقع إلى Hostinger بنفس مسارات الواجهة الحالية.
{
  const compatibilityImages = new Set();
  const imageDb = new Database(ARCHIVE_SOURCE_DB, { readonly: true });
  for (const table of imageDb
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()) {
    const safeTable = String(table.name).replaceAll('"', '""');
    const columns = imageDb.prepare(`PRAGMA table_info("${safeTable}")`).all();
    for (const column of columns.filter((item) => String(item.type || "").toUpperCase().includes("TEXT"))) {
      const safeColumn = String(column.name).replaceAll('"', '""');
      for (const row of imageDb.prepare(`SELECT "${safeColumn}" AS value FROM "${safeTable}"`).iterate()) {
        const value = typeof row.value === "string" ? row.value : "";
        for (const match of value.matchAll(/(?:^|["'])\/images\/([^/"'\\\s?#]+)/g)) {
          compatibilityImages.add(match[1]);
        }
      }
    }
  }
  imageDb.close();
  const sourceUploads = join(ROOT, "artifacts/sabaik-almasa/public/uploads");
  const targetImages = join(ROOT, "build_php/images");
  mkdirSync(targetImages, { recursive: true });
  for (const filename of compatibilityImages) {
    const target = join(targetImages, filename);
    if (existsSync(target)) continue;
    const source = join(sourceUploads, filename);
    if (existsSync(source)) {
      copyFileSync(source, target);
      console.log(`  ✅ توافق مسار الصورة: /images/${filename}`);
    }
  }
}

// Some Hostinger/Nginx configurations do not honor DirectoryIndex for
// static folders even when index.html exists. Keep PHP entry points beside
// the prerendered hubs so /blog/ and /areas/ resolve without a directory
// listing or a SPA fallback.
for (const hub of ["blog", "areas"]) {
  const hubDir = join(ROOT, "build_php", hub);
  if (existsSync(join(hubDir, "index.html"))) {
    writeFileSync(
      join(hubDir, "index.php"),
      `<?php readfile(__DIR__ . '/index.html');`,
      "utf8",
    );
  }
}
// ضمان وجود ملف PHP API الأساسي في build_php/api/index.php
mkdirSync(join(ROOT, "build_php/api"), { recursive: true });
copyFileSync(join(ROOT, "scripts/api-index.php"), join(ROOT, "build_php/api/index.php"));
copyFileSync(join(ROOT, "scripts/container-system.php"), join(ROOT, "build_php/api/container-system.php"));
// Hostinger has no environment-variable manager in the deployed PHP process.
// Give each archive its own signing secret instead of shipping the historical
// public fallback secret in the production API.
{
  const phpApiPath = join(ROOT, "build_php/api/index.php");
  const phpApi = readFileSync(phpApiPath, "utf8");
  const hostingerSecret = randomBytes(32).toString("hex");
  writeFileSync(
    phpApiPath,
    phpApi.replaceAll("__HOSTINGER_TOKEN_SECRET__", hostingerSecret),
    "utf8",
  );
}
console.log("  ✅ تم تجهيز طبقة PHP لنظام الحاويات والمالية والتدقيق");
console.log("  ✅ تم تجهيز ملف PHP API في build_php/api/index.php لبيئة Hostinger");

console.log("  ✅ assets/ + sitemap.xml + الملفات الثابتة + الصفحات المُولَّدة مسبقاً (prerendered) نُسخت");

// ── 2b. نسخ صفحة المنصة التسويقية ─────────────────────────────────────────────
step("نسخ صفحة المنصة التسويقية → build_php/taqi-group-platform/");
const platformDist = join(ROOT, "artifacts/sabaik-platform/dist/public");
rmSync(join(ROOT, "build_php/hawiat-platform"), { recursive: true, force: true });
const platformTarget = join(ROOT, "build_php/taqi-group-platform");
rmSync(platformTarget, { recursive: true, force: true });
mkdirSync(platformTarget, { recursive: true });
cpSync(platformDist, platformTarget, { recursive: true });
// The artifact is previewed under /cleanflow-platform/ while older public
// links and the production SEO inventory use /taqi-group-platform/. Ship both
// directories so either established URL remains reachable on static hosting.
const platformCompatibilityTarget = join(ROOT, "build_php/cleanflow-platform");
rmSync(platformCompatibilityTarget, { recursive: true, force: true });
mkdirSync(platformCompatibilityTarget, { recursive: true });
cpSync(platformDist, platformCompatibilityTarget, { recursive: true });
const publicOriginForPlatform = archivePublicOrigin();
if (!publicOriginForPlatform) {
  throw new Error("لم يمكن تحديد نطاق HTTPS عام لإعادة ضبط SEO الخاصة بمنصة CleanFlow");
}
rewritePlatformOrigin(platformTarget, publicOriginForPlatform);
rewritePlatformOrigin(platformCompatibilityTarget, publicOriginForPlatform);
console.log("  ✅ صفحة المنصة + الشعار + الأصول نُسخت");

// ── 3. WAL checkpoint ─────────────────────────────────────────────────────────
step("WAL checkpoint على قاعدة البيانات الأصلية");

{
  const srcDb = new Database(ARCHIVE_SOURCE_DB);
  srcDb.pragma("wal_checkpoint(TRUNCATE)");
  srcDb.close();
  console.log("  ✅ WAL checkpoint");
}

// ── 4. نسخ قاعدة البيانات مع تحويل order → sort_order ───────────────────────
step("نسخ وتحويل قاعدة البيانات");

const DEST_DB = join(ROOT, "build_php/data/sabaik.db");
mkdirSync(dirname(DEST_DB), { recursive: true });

// انسخ أولاً من النسخة الآمنة التي أُعدت أعلى الملف.
copyFileSync(ARCHIVE_SOURCE_DB, DEST_DB);

{
  const db = new Database(DEST_DB);

  /**
   * الجداول التي يُنشئها Drizzle بعمود `order`
   * لكن PHP يقرأها بعمود `sort_order`
   */
  /**
   * الجداول التي يُنشئها Drizzle بعمود `order`
   * لكن PHP يقرأها بعمود `sort_order`
   */
  const SORT_ORDER_TABLES = [
    "hero_slides",
    "services",
    "containers",
    "packages",
    "partners",
    "company_values",
  ];

  db.transaction(() => {
    const requestedOrigin = String(process.env.SITE_URL ?? "").trim();
    let publicOrigin = "";
    try {
      const parsed = new URL(requestedOrigin);
      const host = parsed.hostname.toLowerCase();
      if (
        (parsed.protocol === "http:" || parsed.protocol === "https:") &&
        host &&
        !/localhost|127\.0\.0\.1|0\.0\.0\.0|replit\.(dev|app)$/i.test(host)
      ) {
        publicOrigin = `${parsed.protocol}//${host}${parsed.port ? `:${parsed.port}` : ""}`;
      }
    } catch {}
    if (publicOrigin) {
      db.prepare(
        "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      ).run("site_public_url", publicOrigin, new Date().toISOString());
      console.log(`  ✅ تم حفظ رابط الموقع العام داخل الإعدادات: ${publicOrigin}`);
    }

    // Make the archive enforce the same public identity rule as the Node
    // database. Existing duplicate legacy slugs are repaired by id order in
    // the archive copy only; the source database is never rewritten here.
    for (const table of ["services", "packages"]) {
      const rows = db.prepare(
        `SELECT id, seo_slug FROM ${table} WHERE seo_slug IS NOT NULL AND trim(seo_slug) <> '' ORDER BY id ASC`,
      ).all();
      const used = new Set();
      const updateSlug = db.prepare(`UPDATE ${table} SET seo_slug = ? WHERE id = ?`);
      for (const row of rows) {
        const original = String(row.seo_slug).trim();
        let candidate = original;
        let suffix = 2;
        while (used.has(candidate.toLowerCase())) candidate = `${original}-${suffix++}`;
        if (candidate !== row.seo_slug) updateSlug.run(candidate, row.id);
        used.add(candidate.toLowerCase());
      }
      db.exec(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_${table}_seo_slug_unique ON ${table}(seo_slug) WHERE seo_slug IS NOT NULL AND trim(seo_slug) <> ''`,
      );
    }

    // Resolve all legacy editorial mentions to the administrator-configured
    // company name before the SQLite file is packaged. This keeps imported blog
    // content and testimonials aligned with site settings on shared hosting.
    const siteNameRow = db.prepare("SELECT value FROM site_settings WHERE key = 'company_name'").get();
    const siteName = String(siteNameRow?.value || "").trim() || "الشركة";
    const legacyNames = [
      String.fromCodePoint(1587, 1576, 1575, 1574, 1610, 32, 1575, 1604, 1605, 1575, 1587, 1577),
      String.fromCodePoint(1605, 1572, 1587, 1587, 1587, 1577, 32, 1587, 1576, 1575, 1574, 1610, 32, 1575, 1604, 1585, 1575, 1587, 1577),
    ];
    for (const table of db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()) {
      const safeTable = String(table.name).replaceAll('"', '""');
      const textColumns = db.prepare(`PRAGMA table_info("${safeTable}")`).all()
        .filter((column) => String(column.type || "").toUpperCase().includes("TEXT"));
      for (const column of textColumns) {
        const safeColumn = String(column.name).replaceAll('"', '""');
        for (const legacyName of legacyNames) {
          db.prepare(`UPDATE "${safeTable}" SET "${safeColumn}" = REPLACE("${safeColumn}", ?, ?) WHERE "${safeColumn}" LIKE ?`)
            .run(legacyName, siteName, `%${legacyName}%`);
        }
      }
    }
    console.log(`  ✅ تم توحيد محتوى SQLite على اسم الموقع من الإعدادات: ${siteName}`);

    // ── جداول order → sort_order ─────────────────────────────────────────────
    for (const table of SORT_ORDER_TABLES) {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
      const hasOrder     = cols.includes("order");
      const hasSortOrder = cols.includes("sort_order");

      if (!hasOrder && hasSortOrder) {
        console.log(`  ⏭  ${table}: sort_order موجود مسبقاً — تخطي`);
        continue;
      }

      if (!hasOrder && !hasSortOrder) {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`).run();
        console.log(`  ➕ ${table}: أضفت sort_order (القيم الافتراضية)`);
        continue;
      }

      if (hasOrder && !hasSortOrder) {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`).run();
        db.prepare(`UPDATE ${table} SET sort_order = "order"`).run();
        console.log(`  ✅ ${table}: order → sort_order (${db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c} سجل)`);
      }

      if (hasOrder && hasSortOrder) {
        db.prepare(`UPDATE ${table} SET sort_order = "order" WHERE sort_order = 0 AND "order" != 0`).run();
        console.log(`  🔄 ${table}: تزامن order → sort_order`);
      }
    }

    // ── جدول ads: order → ad_order ───────────────────────────────────────────
    {
      const cols = db.prepare(`PRAGMA table_info(ads)`).all().map((c) => c.name);
      const hasOrder   = cols.includes("order");
      const hasAdOrder = cols.includes("ad_order");

      if (!hasOrder && hasAdOrder) {
        console.log(`  ⏭  ads: ad_order موجود مسبقاً — تخطي`);
      } else if (!hasOrder && !hasAdOrder) {
        db.prepare(`ALTER TABLE ads ADD COLUMN ad_order INTEGER NOT NULL DEFAULT 0`).run();
        console.log(`  ➕ ads: أضفت ad_order (القيم الافتراضية)`);
      } else if (hasOrder && !hasAdOrder) {
        db.prepare(`ALTER TABLE ads ADD COLUMN ad_order INTEGER NOT NULL DEFAULT 0`).run();
        db.prepare(`UPDATE ads SET ad_order = "order"`).run();
        console.log(`  ✅ ads: order → ad_order (${db.prepare(`SELECT COUNT(*) AS c FROM ads`).get().c} سجل)`);
      } else if (hasOrder && hasAdOrder) {
        db.prepare(`UPDATE ads SET ad_order = "order" WHERE ad_order = 0 AND "order" != 0`).run();
        console.log(`  🔄 ads: تزامن order → ad_order`);
      }
    }
  })();

  // ── 5. journal_mode=DELETE (WAL غير مدعوم على Hostinger) ──────────────────
  db.pragma("journal_mode=DELETE");
  console.log("  ✅ journal_mode=DELETE");

  db.close();
}

// ── 6. تجهيز uploads ───────────────────────────────────────────────────────────
// الصور الحالية للخدمات والباقات والشركاء والمدير التنفيذي أصبحت أصولاً
// ثابتة داخل الواجهة. نحتفظ فقط بالصور المرفوعة التي ما زالت قاعدة البيانات
// تشير إليها حتى لا تعود صور المشاريع القديمة إلى أرشيف Hostinger.
step("تجهيز مجلد uploads بدون صور قديمة");
const uploadsDir = join(ROOT, "build_php/uploads");
rmSync(uploadsDir, { recursive: true, force: true });
mkdirSync(uploadsDir, { recursive: true });
const sourceUploadsDir = join(ROOT, "artifacts/api-server/uploads");
const referencedUploads = new Set();
const sourceDb = new Database(ARCHIVE_SOURCE_DB, { readonly: true });
try {
  const tables = sourceDb
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((row) => row.name);
  for (const table of tables) {
    const safeTable = table.replaceAll('"', '""');
    const columns = sourceDb.prepare(`PRAGMA table_info("${safeTable}")`).all();
    for (const column of columns) {
      if (column.type && column.type !== "TEXT") continue;
      const safeColumn = column.name.replaceAll('"', '""');
      for (const row of sourceDb
        .prepare(`SELECT "${safeColumn}" AS value FROM "${safeTable}" WHERE "${safeColumn}" LIKE '%/uploads/%'`)
        .iterate()) {
        const value = typeof row.value === "string" ? row.value : "";
        for (const match of value.matchAll(/(?:\/api)?\/uploads\/([^/"'\\\]\s,}]+)/g)) {
          referencedUploads.add(match[1]);
        }
      }
    }
  }
} finally {
  sourceDb.close();
}
for (const filename of referencedUploads) {
  if (isLegacyProductionAsset(filename)) {
    console.log(`  ⏭  استبعاد الصورة القديمة من uploads/: ${filename}`);
    continue;
  }
  const source = join(sourceUploadsDir, filename);
  if (existsSync(source)) {
    copyFileSync(source, join(uploadsDir, filename));
    console.log(`  ✅ احتفظت بالصورة المستخدمة: ${filename}`);
  } else {
    console.warn(`  ⚠️ صورة مذكورة في قاعدة البيانات غير موجودة محلياً: ${filename}`);
  }
}
console.log(`  ✅ uploads/ يحتوي على ${referencedUploads.size} صورة مستخدمة فقط`);

// ── 7. كتابة .htaccess مع إصلاح Authorization header ─────────────────────────
step("كتابة ملفات .htaccess");

writeFileSync(join(ROOT, "build_php/.htaccess"), `DirectoryIndex index.html index.php

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # ── Pass request headers through Apache (Hostinger strips them by default) ──
  RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization},E=HTTP_X_HTTP_METHOD_OVERRIDE:%{HTTP:X-HTTP-Method-Override}]

  # Block access to sensitive directories
  RewriteRule ^data/  - [F,L]
  RewriteRule ^\\\\\.     - [F,L]

  # Directory indexes can be disabled by the host. Resolve public SEO hubs
  # explicitly so /blog/ and /areas/ never become a 403 or SPA soft fallback.
   RewriteRule ^services/?$ services/index.html [END]
   RewriteRule ^blog/?$ blog/index.html [END]
  RewriteRule ^areas/?$ areas/index.html [END]

  # Allow direct access to existing files and directories
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Route /api/* to the PHP handler
  RewriteRule ^api/  api/index.php  [L,QSA]

  # The sitemap is generated by the PHP API and must stay reachable at
  # the standard public /sitemap.xml URL instead of falling through to SPA HTML.
  RewriteRule ^sitemap\\.xml$ api/index.php  [L,QSA]

  # Never serve index.html as JavaScript/CSS. Missing hashed assets must be a
  # real 404 so stale HTML cannot trigger a module MIME-type error.
  RewriteRule ^assets/ - [END]

  # SPA fallback — everything else loads index.html
  RewriteRule ^  index.html  [L]
</IfModule>

# Compress text responses on Apache where the hosting plan exposes the module.
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain text/html text/xml text/css
  AddOutputFilterByType DEFLATE application/javascript application/x-javascript application/json
  AddOutputFilterByType DEFLATE application/xml image/svg+xml
</IfModule>

# Brotli is preferred when available; mod_deflate remains the fallback.
<IfModule mod_brotli.c>
  AddOutputFilterByType BROTLI_COMPRESS text/plain text/html text/xml text/css
  AddOutputFilterByType BROTLI_COMPRESS application/javascript application/json application/xml image/svg+xml
</IfModule>

# Vite assets are content-hashed and can be cached for a year. Documents and
# manifests stay short-lived so publishing new content never requires a cache purge.
<IfModule mod_headers.c>
  Header append Vary Accept-Encoding
  Header set X-Content-Type-Options "nosniff"
  <FilesMatch "\\.(?:css|js|mjs|map|webp|avif|jpe?g|png|gif|svg|ico|woff2?)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.(?:html|xml|txt|json|webmanifest)$">
    Header set Cache-Control "public, max-age=300, must-revalidate"
  </FilesMatch>
  <Files "sw.js">
    Header set Cache-Control "no-cache, must-revalidate"
  </Files>
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/avif "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>
`);

writeFileSync(join(ROOT, "build_php/api/.htaccess"), `DirectoryIndex index.php

<IfModule mod_rewrite.c>
  RewriteEngine On

  # ── Pass request headers through Apache (Hostinger strips them by default) ──
  RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization},E=HTTP_X_HTTP_METHOD_OVERRIDE:%{HTTP:X-HTTP-Method-Override}]

  RewriteRule ^ index.php [L,QSA]
</IfModule>
`);
console.log("  ✅ .htaccess مكتوبان مع Authorization passthrough");

// ── 8. كتابة بصمة البناء وتعليمات النشر ───────────────────────────────────────
// يجب أن تُستخرج محتويات هذا الأرشيف مباشرة إلى public_html، وليس إلى مجلد
// فرعي باسم build_php؛ لأن مسارات /api و /uploads و /data تعتمد على جذر الموقع.
step("كتابة معلومات النسخة وتعليمات النشر");
{
  const sourceDb = new Database(ARCHIVE_SOURCE_DB, { readonly: true });
  const tableCounts = {};
  for (const table of sourceDb
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()) {
    const safeTable = String(table.name).replaceAll('"', '""');
    tableCounts[table.name] = sourceDb.prepare(`SELECT COUNT(*) AS count FROM "${safeTable}"`).get().count;
  }
  sourceDb.close();
  const sitemap = readFileSync(join(ROOT, "build_php/sitemap.xml"), "utf8");
  const sitemapUrls = [...sitemap.matchAll(/<loc>[^<]+<\/loc>/g)].length;
  const sitemapImages = [...sitemap.matchAll(/<image:loc>[^<]+<\/image:loc>/g)].length;
  const arabicAreaUrls = [...sitemap.matchAll(/<loc>[^<]+\/areas\/([^<]+)<\/loc>/gu)]
    .filter((match) => /[^\u0000-\u007F]/u.test(match[1])).length;
  const articleUrlsWithImages = sitemap
    .split("<url>")
    .filter((block) => block.includes("/blog/") && block.includes("<image:loc>"))
    .length;
  const publicOrigin = sitemap.match(/<loc>(https?:\/\/[^/]+)/)?.[1] || "";
  writeFileSync(
    join(ROOT, "build_php/BUILD_INFO.json"),
    JSON.stringify({
      buildType: "full-hostinger-archive",
      builtAt: new Date().toISOString(),
      sourceDatabase: "data/sabaik.db",
      tableCounts,
      verification: {
        publicOrigin,
        sitemapUrls,
        sitemapImages,
        arabicAreaUrls,
        articleUrlsWithImages,
        command: `SITE_URL=${publicOrigin || "https://your-domain.tld"} pnpm --filter @workspace/scripts run seo-quality-gate`,
      },
      deployment: "Extract the archive contents directly into public_html; do not keep a build_php subfolder.",
    }, null, 2),
    "utf8",
  );
  writeFileSync(
    join(ROOT, "build_php/UPLOAD_INSTRUCTIONS.txt"),
    [
      "أرشيف كامل من آخر نسخة حالية للمشروع.",
      "",
      "طريقة النشر:",
      "1) استخرج محتويات الأرشيف مباشرة داخل public_html.",
      "2) يجب أن تكون index.html و api/ و data/ و uploads/ في جذر public_html.",
      "3) لا تترك مجلداً باسم build_php داخل public_html.",
      "4) هذه حزمة استبدال كاملة وليست تحديثاً جزئياً؛ احذف ملفات الموقع العامة القديمة من public_html قبل فك الضغط حتى لا تبقى صفحات HTML أو صور أو مجلدات قديمة.",
      "5) خذ نسخة احتياطية من data/ و uploads/ قبل الاستبدال إذا كان الموقع يعمل مسبقاً.",
      "6) لا تدمج الحزمة فوق الملفات القديمة. بعد الرفع يجب ألا تبقى مجلدات قديمة مثل page/ أو pages/ أو container/ أو package/ إذا لم تكن موجودة في الحزمة.",
      "",
       "يشمل الأرشيف قاعدة البيانات وواجهة PHP والواجهة الرئيسية وCleanFlow Platform وجميع الأصول.",
       "يتضمن api/index.php مسار DELETE /api/admin/employees/{id} مع حماية الحساب الحالي وآخر مدير.",
       "روابط المناطق العامة في sitemap.xml عربية، وصور المقالات وصفحات SEO تشير فقط إلى ملفات موجودة داخل الأرشيف.",
       "",
       "التحقق بعد البناء (على بيئة البناء):",
        `SITE_URL=${publicOrigin || "https://your-domain.tld"} pnpm --filter @workspace/scripts run seo-quality-gate`,
    ].join("\n"),
    "utf8",
  );
  console.log(`  ✅ BUILD_INFO.json — ${tableCounts.posts ?? 0} مقالة و${tableCounts.container_system_records ?? 0} سجل حاويات`);
}

// ── 8. ضغط الأرشيف ───────────────────────────────────────────────────────────
step("تنظيف اسم العلامة القديمة من ملفات Hostinger");
{
  const siteDb = new Database(DEST_DB, { readonly: true });
  const siteNameRow = siteDb.prepare("SELECT value FROM site_settings WHERE key = 'company_name'").get();
  siteDb.close();
  const siteName = String(siteNameRow?.value || "").trim() || "الشركة";
  const legacyPatterns = [
    [/مؤسسة\s+مؤسسة\s+تقي\s+جروب/gu, siteName],
    [/مؤسسة\s+تقي\s+جروب\s+الماسة/gu, siteName],
    [/شركة\s+تقي\s+جروب\s+الماسة/gu, siteName],
    [/تقي\s+جروب\s+الماسة/gu, siteName],
  ];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const file = join(dir, entry);
      if (statSync(file).isDirectory()) walk(file);
      else if (/\.(html?|js|css|json|xml|txt|php|webmanifest)$/i.test(entry)) {
        const original = readFileSync(file, "utf8");
        const clean = legacyPatterns.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), original);
        if (clean !== original) writeFileSync(file, clean);
      }
    }
  };
  walk(join(ROOT, "build_php"));
  console.log(`  ✅ ملفات الأرشيف تستخدم اسم الإعدادات: ${siteName}`);
}

rmSync(ARCHIVE_SOURCE_DB, { force: true });
rmSync(`${ARCHIVE_SOURCE_DB}-wal`, { force: true });
rmSync(`${ARCHIVE_SOURCE_DB}-shm`, { force: true });

step("إنشاء الأرشيف cleanflow-services-hostinger.zip");
const zipPath = join(ROOT, "cleanflow-services-hostinger.zip");
const compatibilityZipPath = join(ROOT, "taqi-group-hostinger.zip");
rmSync(zipPath, { force: true });
rmSync(compatibilityZipPath, { force: true });

if (process.platform === "win32") {
  execSync(`powershell -Command "Compress-Archive -Path '${join(ROOT, "build_php")}' -DestinationPath '${zipPath}' -Force"`, { cwd: ROOT, stdio: "inherit" });
} else {
  // اضغط محتوى build_php لا المجلد نفسه؛ Hostinger يفك الأرشيف مباشرة داخل
  // public_html، ولذلك يجب أن تكون index.html وapi/ وdata/ وuploads/ في الجذر.
  run("cd build_php && zip -r ../cleanflow-services-hostinger.zip .", "zip");
}

if (existsSync(zipPath)) {
  // Keep the former filename as an exact compatibility copy so an existing
  // upload workflow cannot accidentally select an older archive.
  copyFileSync(zipPath, compatibilityZipPath);
  const sizeKb = Math.round(statSync(zipPath).size / 1024);
  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ الأرشيف الرسمي جاهز: cleanflow-services-hostinger.zip (${sizeKb} KB)`);
  console.log("✅ نسخة توافقية مطابقة: taqi-group-hostinger.zip");
  console.log(`${"═".repeat(60)}\n`);
  run(
    "pnpm --filter @workspace/scripts run seo-quality-gate",
    "تشغيل بوابة SEO على الأرشيف النهائي",
  );
}
