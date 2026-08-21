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
 *  7. ضغط الأرشيف النهائي
 */

import { execSync } from "child_process";
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

// ── 1. بناء الواجهة الأمامية ─────────────────────────────────────────────────
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
  { PORT: "19040", BASE_PATH: "/cleanflow-platform/", NODE_ENV: "production" }
);

// ── 1b. Pre-rendering — HTML ثابت لكل مقال وخدمة وحاوية ─────────────────────
step("Pre-rendering الصفحات (SSG)");
run(
  "node scripts/prerender.mjs",
  "توليد HTML ثابت لجميع مقالات المدونة والخدمات والحاويات",
  {}
);

// ── 2. نسخ ملفات البناء ───────────────────────────────────────────────────────
step("نسخ ملفات الواجهة → build_php/");

// نسخ assets/
rmSync(join(ROOT, "build_php/assets"), { recursive: true, force: true });
rmSync(join(ROOT, "build_php/images"), { recursive: true, force: true });
rmSync(join(ROOT, "build_php/container"), { recursive: true, force: true });
rmSync(join(ROOT, "build_php/api/uploads"), { recursive: true, force: true });
rmSync(join(ROOT, "build_php/sabaik-platform"), { recursive: true, force: true });

for (const legacyImage of [
  "Banner-Big.png", "Banner-Small.png", "No1-Banner.png", "good.png",
  "shareek-mawsouq.png", "container1.jpg", "container2.jpg", "container3.jpg", "container4.jpg",
  "hero1.jpg", "hero2.jpg", "hero3.jpg", "hero4.jpg", "ceo.png", "hawiyat-logo.png",
  "partner1.jpg", "partner2.jpg", "partner3.jpg", "partner4.jpg", "partner5.jpg", "partner6.jpg"
]) {
  rmSync(join(ROOT, "build_php", legacyImage), { force: true });
}
const SKIP_FILES = new Set(["sitemap.xml", "api"]);
const distPublic = join(ROOT, "artifacts/sabaik-almasa/dist/public");

function copyDirRecursive(srcDir, dstDir) {
  mkdirSync(dstDir, { recursive: true });
  for (const item of readdirSync(srcDir)) {
    if (SKIP_FILES.has(item)) continue;
    const srcPath = join(srcDir, item);
    const dstPath = join(dstDir, item);
    try {
      const stat = statSync(srcPath);
      if (stat.isDirectory()) {
        copyDirRecursive(srcPath, dstPath);
      } else {
        copyFileSync(srcPath, dstPath);
      }
    } catch {}
  }
}

copyDirRecursive(distPublic, join(ROOT, "build_php"));
console.log("  ✅ تم نسخ جميع المجلدات والصفحات الثابتة إلى build_php/");

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
console.log("  ✅ تم تجهيز طبقة PHP لنظام الحاويات والمالية والتدقيق");
console.log("  ✅ تم تجهيز ملف PHP API في build_php/api/index.php لبيئة Hostinger");

// تأكد من حذف sitemap.xml الثابت من build_php/ إن وُجد من بناء سابق
const staleStatic = join(ROOT, "build_php/sitemap.xml");
if (existsSync(staleStatic)) rmSync(staleStatic);
console.log("  ✅ assets/ + الملفات الثابتة + الصفحات المُولَّدة مسبقاً (prerendered) نُسخت");

// ── 2b. نسخ صفحة CleanFlow Platform التسويقية ─────────────────────────────────
step("نسخ صفحة CleanFlow Platform التسويقية → build_php/cleanflow-platform/");
const platformDist = join(ROOT, "artifacts/sabaik-platform/dist/public");
rmSync(join(ROOT, "build_php/hawiat-platform"), { recursive: true, force: true });
const platformTarget = join(ROOT, "build_php/cleanflow-platform");
rmSync(platformTarget, { recursive: true, force: true });
mkdirSync(platformTarget, { recursive: true });
cpSync(platformDist, platformTarget, { recursive: true });
console.log("  ✅ صفحة CleanFlow + الشعار + الأصول نُسخت");

// ── 3. WAL checkpoint ─────────────────────────────────────────────────────────
step("WAL checkpoint على قاعدة البيانات الأصلية");

{
  const srcDb = new Database(join(ROOT, "data/sabaik.db"));
  srcDb.pragma("wal_checkpoint(TRUNCATE)");
  srcDb.close();
  console.log("  ✅ WAL checkpoint");
}

// ── 4. نسخ قاعدة البيانات مع تحويل order → sort_order ───────────────────────
step("نسخ وتحويل قاعدة البيانات");

const DEST_DB = join(ROOT, "build_php/data/sabaik.db");
mkdirSync(dirname(DEST_DB), { recursive: true });

// انسخ أولاً
copyFileSync(join(ROOT, "data/sabaik.db"), DEST_DB);

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
const sourceDb = new Database(join(ROOT, "data/sabaik.db"), { readonly: true });
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

// ── 8. ضغط الأرشيف ───────────────────────────────────────────────────────────
step("تنظيف اسم العلامة القديمة من ملفات Hostinger");
{
  const siteDb = new Database(DEST_DB, { readonly: true });
  const siteNameRow = siteDb.prepare("SELECT value FROM site_settings WHERE key = 'company_name'").get();
  siteDb.close();
  const siteName = String(siteNameRow?.value || "").trim() || "الشركة";
  const legacyPatterns = [
    [/مؤسسة\s+مؤسسة\s+السهم\s+كلين/gu, siteName],
    [/مؤسسة\s+السهم كلين\s+الماسة/gu, siteName],
    [/شركة\s+السهم كلين\s+الماسة/gu, siteName],
    [/السهم كلين\s+الماسة/gu, siteName],
    [/منصة\s+حاويات/gu, siteName],
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

step("إنشاء الأرشيف cleanflow-services-hostinger.zip");
const zipPath = join(ROOT, "cleanflow-services-hostinger.zip");
rmSync(zipPath, { force: true });

if (process.platform === "win32") {
  execSync(`powershell -Command "Compress-Archive -Path '${join(ROOT, "build_php")}' -DestinationPath '${zipPath}' -Force"`, { cwd: ROOT, stdio: "inherit" });
} else {
  run("zip -r cleanflow-services-hostinger.zip build_php", "zip");
}

if (existsSync(zipPath)) {
  const sizeKb = Math.round(statSync(zipPath).size / 1024);
  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ الأرشيف جاهز: cleanflow-services-hostinger.zip (${sizeKb} KB)`);
  console.log(`${"═".repeat(60)}\n`);
}
