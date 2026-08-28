#!/usr/bin/env node
/**
 * build-hostinger-update.mjs
 * ──────────────────────────
 * بناء ملفات الكود فقط لرفعها على Hostinger دون المساس بالصور وقاعدة البيانات.
 *
 * الملفات الناتجة في sabaik-update.zip:
 *   assets/       ← JS/CSS المبنية من Vite
 *   index.html    ← صفحة HTML الرئيسية
 *   الصفحات المولدة/    ← صفحات SEO الثابتة بروابط assets متطابقة
 *   sw.js         ← Service Worker لإظهار الإشعارات وفتح الرابط الصحيح
 *   notification-icon.webp ← أيقونة إشعارات الهاتف
 *   api/index.php ← ملف PHP المحدَّث
 *   .htaccess و api/.htaccess ← توجيه API وتمرير Authorization
 *
 * طريقة الرفع على Hostinger:
 *   1. استخرج الأرشيف
 *   2. ارفع المجلد api/ إلى public_html/api/
 *   3. ارفع assets/ و index.html إلى public_html/
 *   (لا تلمس uploads/ ولا data/)
 */

import { execSync }                  from "child_process";
import { randomBytes }               from "crypto";
import { existsSync, mkdirSync, copyFileSync, rmSync, cpSync, writeFileSync, readdirSync, readFileSync } from "fs";
import { join, dirname }             from "path";
import { fileURLToPath }             from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");

function run(cmd, label) {
  console.log(`\n▶ ${label}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

function step(label) {
  console.log(`\n${"─".repeat(60)}\n✦ ${label}`);
}

// ── 1. بناء الواجهة الأمامية ──────────────────────────────────────────────────
step("بناء الواجهة الأمامية (Vite)");
run(
  "PORT=19770 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/cleanflow-services run build",
  "vite build"
);
run(
  "node scripts/prerender.mjs",
  "تحديث الصفحات الثابتة بروابط assets الجديدة"
);

// ── 2. تجميع ملفات التحديث فقط في مجلد مؤقت ─────────────────────────────────
step("تجميع ملفات التحديث");
const STAGING = join(ROOT, "_update_staging");
rmSync(STAGING, { recursive: true, force: true });
mkdirSync(join(STAGING, "assets"),     { recursive: true });
mkdirSync(join(STAGING, "api"),        { recursive: true });
mkdirSync(join(STAGING, "images"),     { recursive: true });

// أصول Vite
cpSync(
  join(ROOT, "artifacts/sabaik-almasa/dist/public/assets"),
  join(STAGING, "assets"),
  { recursive: true }
);
// Keep the exact asset URLs from the previous deployment available while
// caches expire. The new HTML still uses the freshly generated canonical names.
const compatibilityAliases = [
  ["index-ChILh_On.js", /^index-[^/]+\.js$/],
  ["index-DVBBl5cX.css", /^index-[^/]+\.css$/],
  ["index-BRF6LCBA.js", /^index-[^/]+\.js$/],
  ["index-80cL6Fpf.css", /^index-[^/]+\.css$/],
  ["index-XKmgbX4P.js", /^index-[^/]+\.js$/],
  ["index-CwjPgsoo.js", /^index-[^/]+\.js$/],
  ["index-DjNEGUy7.css", /^index-[^/]+\.css$/],
];
const stagedAssets = join(STAGING, "assets");
const currentAssets = readdirSync(stagedAssets);
for (const [legacyName, pattern] of compatibilityAliases) {
  const currentName = currentAssets.find((name) => pattern.test(name));
  if (currentName && currentName !== legacyName) {
    copyFileSync(join(stagedAssets, currentName), join(stagedAssets, legacyName));
  }
}
copyFileSync(
  join(ROOT, "artifacts/sabaik-almasa/dist/public/index.html"),
  join(STAGING, "index.html")
);
for (const publicFile of [
  "sw.js",
  "notification-icon.png",
  "notification-icon.webp",
  "favicon.svg",
  "favicon.png",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "favicon-512x512.png",
  "favicon.ico",
]) {
  const source = join(ROOT, "artifacts/sabaik-almasa/public", publicFile);
  if (existsSync(source)) {
    copyFileSync(source, join(STAGING, publicFile));
  }
}
const logoSource = join(ROOT, "artifacts/sabaik-almasa/public/images/logo.png");
if (existsSync(logoSource)) copyFileSync(logoSource, join(STAGING, "images/logo.png"));
console.log("  ✅ assets/ و index.html وملفات الإشعارات");

// صفحات SEO المولدة مسبقاً تحمل روابط hashed إلى JavaScript. يجب تحديثها
// مع assets في نفس الحزمة، وإلا ستبقى /faq/ وغيرها تشير إلى chunks قديمة.
const GENERATED_ROUTES = [
  "blog", "services", "container", "package", "packages", "page", "pages",
  "pricing", "faq", "الأسئلة-الشائعة", "privacy", "سياسة-الخصوصية",
  "terms", "الشروط-والأحكام", "contact", "اتصل-بنا", "about", "من-نحن", "areas",
];
for (const route of GENERATED_ROUTES) {
  const source = join(ROOT, "artifacts/sabaik-almasa/dist/public", route);
  if (existsSync(source)) {
    cpSync(source, join(STAGING, route), { recursive: true });
  }
}
console.log("  ✅ الصفحات الثابتة المولدة بروابط assets متطابقة");

// ملف PHP — نحتفظ بمفتاح الحزمة السابقة حتى تبقى كلمة مرور FTP المحفوظة
// قابلة للفك بعد رفع باتش جديد.
const apiTemplatePath = join(ROOT, "scripts/api-index.php");
const previousApiPath = join(ROOT, "build_php/api/index.php");
const previousApi = existsSync(previousApiPath) ? readFileSync(previousApiPath, "utf8") : "";
const previousSecret = previousApi.match(/SESSION_SECRET'\)\s*\?:\s*'([0-9a-f]{64})'/)?.[1] || randomBytes(32).toString("hex");
const apiSource = readFileSync(apiTemplatePath, "utf8").replaceAll("__HOSTINGER_TOKEN_SECRET__", previousSecret);
writeFileSync(join(STAGING, "api/index.php"), apiSource, "utf8");
copyFileSync(
  join(ROOT, "scripts/container-system.php"),
  join(STAGING, "api/container-system.php")
);
console.log("  ✅ api/index.php");
console.log("  ✅ api/container-system.php");

// ملفات Apache الضرورية لمسارات API وتمرير Authorization في Hostinger
for (const htaccess of [
  ["build_php/.htaccess", ".htaccess"],
  ["build_php/api/.htaccess", "api/.htaccess"],
]) {
  const [source, destination] = htaccess;
  if (existsSync(join(ROOT, source))) {
    copyFileSync(join(ROOT, source), join(STAGING, destination));
  }
}
console.log("  ✅ .htaccess و api/.htaccess");

// تعليمات رفع بسيطة
writeFileSync(join(STAGING, "UPLOAD_INSTRUCTIONS.txt"), [
  "═══════════════════════════════════════════",
  "  تعليمات الرفع على Hostinger",
  "═══════════════════════════════════════════",
  "",
  "ارفع هذه الملفات فقط إلى public_html/:",
  "  • assets/       ← مجلد كامل",
  "  • index.html    ← ملف واحد",
  "  • sw.js و notification-icon.png و notification-icon.webp ← ملفات إشعارات الهاتف",
  "  • favicon.* و images/logo.png ← هوية الموقع وصورة المعاينة",
  "  • api/index.php و api/container-system.php و api/.htaccess ← ملفات API",
  "  • .htaccess ← ملف التوجيه الرئيسي (استبدله إن كان لديك الإصدار القديم)",
  "",
  "⚠️  لا تلمس:",
  "  • data/sabaik.db   (قاعدة البيانات)",
  "  • uploads/         (الصور المرفوعة)",
  "",
  "═══════════════════════════════════════════",
].join("\n"), "utf-8");

// ── 3. ضغط الأرشيف (من داخل مجلد التجميع فقط) ────────────────────────────────
step("إنشاء sabaik-update.zip");
const ZIP_PATH = join(ROOT, "sabaik-update.zip");
rmSync(ZIP_PATH, { force: true });
// نضغط من داخل مجلد _update_staging كي يكون مسار الملفات نظيفاً
execSync(`zip -r "${ZIP_PATH}" .`, { cwd: STAGING, stdio: "inherit" });

// تنظيف
rmSync(STAGING, { recursive: true, force: true });

const sizeKb = Math.round(
  parseInt(execSync(`du -sb "${join(ROOT, "sabaik-update.zip")}"`, { cwd: ROOT }).toString()) / 1024
);
console.log(`\n${"═".repeat(60)}`);
console.log(`✅ جاهز: sabaik-update.zip (${sizeKb} KB)`);
  console.log(`   يحتوي على: assets/ + index.html + favicon.* + images/logo.png + sw.js + notification-icon.png + notification-icon.webp + api/index.php + api/container-system.php + .htaccess`);
console.log(`   لا يحتوي على: uploads/ ولا data/ (بياناتك بأمان ✔)`);
console.log(`${"═".repeat(60)}\n`);
