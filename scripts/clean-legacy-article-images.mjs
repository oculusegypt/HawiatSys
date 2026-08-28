#!/usr/bin/env node
/**
 * Keep article media on the current hero collection and quarantine assets
 * left over from the previous project.
 *
 * The script is intentionally idempotent so the Hostinger build can run it
 * before generating the sitemap without changing already-clean records.
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");

const PUBLIC_IMAGES = join(ROOT, "artifacts", "sabaik-almasa", "public", "images");
const QUARANTINE_DIR = join(PUBLIC_IMAGES, "صور حسام");
const SOURCE_DB = join(ROOT, "data", "sabaik.db");

const HERO_IMAGES = [
  "/images/Taqi-hero1.webp",
  "/images/Taqi-hero2.webp",
  "/images/Taqi-hero3.webp",
  "/images/Taqi-hero4.webp",
  "/images/Taqi-hero5.webp",
];

const isLegacyArticleImage = (value) => {
  const image = String(value || "").trim();
  return (
    image.includes("/images/content/") ||
    /^\/images\/(?:container-[1-4]\.(?:webp|jpe?g)|hero-[1-4]\.webp)$/i.test(image) ||
    /^\/api\/uploads\/178\d+-[^/]+$/i.test(image)
  );
};

function stableHeroFor(id, title) {
  let hash = Number(id) || 0;
  for (const character of String(title || "")) {
    hash = (hash * 31 + character.codePointAt(0)) % 2147483647;
  }
  return HERO_IMAGES[Math.abs(hash) % HERO_IMAGES.length];
}

function updateLegacyRows(db, table) {
  const rows = db
    .prepare(`SELECT id, title, cover_image, og_image FROM "${table}" NOT INDEXED`)
    .all();
  const update = db.prepare(
    `UPDATE "${table}" SET cover_image = ?, og_image = ?, updated_at = ? WHERE id = ?`,
  );
  const now = new Date().toISOString();
  let updated = 0;

  for (const row of rows) {
    if (!isLegacyArticleImage(row.cover_image) && !isLegacyArticleImage(row.og_image)) continue;
    const image = stableHeroFor(row.id, row.title);
    update.run(image, image, now, row.id);
    updated += 1;
  }
  return updated;
}

function updateHomepageMedia(db) {
  const row = db
    .prepare(`SELECT id, value FROM site_settings NOT INDEXED WHERE key = 'homepage_content'`)
    .get();
  if (!row || typeof row.value !== "string") return 0;

  const value = row.value
    .replaceAll("/images/container-1.webp", "/images/Taqi-hero1.webp")
    .replaceAll("/images/container-2.webp", "/images/Taqi-hero2.webp")
    .replaceAll("/images/container-3.webp", "/images/Taqi-hero3.webp")
    .replaceAll("/images/container-4.jpeg", "/images/Taqi-hero4.webp");
  if (value === row.value) return 0;

  db.prepare("UPDATE site_settings SET value = ?, updated_at = ? WHERE id = ?")
    .run(value, new Date().toISOString(), row.id);
  return 1;
}

function moveUnusedImages() {
  mkdirSync(QUARANTINE_DIR, { recursive: true });
  let moved = 0;

  const move = (source, name) => {
    if (!existsSync(source)) return;
    const target = join(QUARANTINE_DIR, name);
    if (existsSync(target)) {
      rmSync(source, { force: true });
      return;
    }
    renameSync(source, target);
    moved += 1;
  };

  // Entirely unused, title-based article artwork from the previous project.
  const legacyContentDir = join(PUBLIC_IMAGES, "content");
  if (existsSync(legacyContentDir)) {
    for (const name of readdirSync(legacyContentDir)) {
      move(join(legacyContentDir, name), name);
    }
    if (readdirSync(legacyContentDir).length === 0) rmSync(legacyContentDir, { recursive: true, force: true });
  }

  // Timestamped copies in public/images are not served by the app. The live
  // upload source remains under artifacts/api-server/uploads when referenced.
  for (const name of readdirSync(PUBLIC_IMAGES)) {
    if (/^178\d+-[^/]+\.(?:webp|jpe?g|png)$/i.test(name)) {
      move(join(PUBLIC_IMAGES, name), name);
    }
  }

  // These former article/homepage copies are no longer referenced after the
  // live records and seed fallbacks use the current Taqi hero collection.
  for (const name of [
    "container-1.webp",
    "container-2.webp",
    "container-3.webp",
    "container-4.jpeg",
    "container-compactor-electric.webp",
    "container-debris-jumbo.webp",
    "container-debris-large.webp",
    "container-debris-medium.webp",
    "container-waste-medium.webp",
  ]) {
    move(join(PUBLIC_IMAGES, name), name);
  }

  return moved;
}

if (!existsSync(SOURCE_DB)) throw new Error(`Database not found: ${SOURCE_DB}`);

const db = new Database(SOURCE_DB);
try {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('posts', 'seo_pages')")
    .all()
    .map((row) => row.name);
  const update = db.transaction(() => ({
    articleRows: tables.reduce((sum, table) => sum + updateLegacyRows(db, table), 0),
    homepageSettings: updateHomepageMedia(db),
  }));
  const { articleRows, homepageSettings } = update();
  const movedFiles = moveUnusedImages();
  console.log(`تم تحديث ${articleRows} سجل مقال و${homepageSettings} إعداد واجهة إلى صور الهيرو الحالية.`);
  console.log(`تم نقل ${movedFiles} صورة غير مستخدمة إلى images/صور حسام.`);
} finally {
  db.close();
}