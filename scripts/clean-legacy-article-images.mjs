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
  statSync,
} from "node:fs";
import { join, relative } from "node:path";
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

const LEGACY_IMAGE_REPLACEMENTS = new Map([
  ["/images/Banner-Big.webp", "/images/Taqi-hero2.webp"],
  ["/images/Banner-Small.webp", "/images/Taqi-hero3.webp"],
  ["/images/ceo.webp", "/images/shareek-mawsouq.webp"],
  ["/images/container-1.webp", "/images/Taqi-hero1.webp"],
  ["/images/container-2.webp", "/images/Taqi-hero2.webp"],
  ["/images/container-3.webp", "/images/Taqi-hero3.webp"],
  ["/images/container-4.jpeg", "/images/Taqi-hero4.webp"],
  ["/images/container-compactor-electric.webp", "/images/Taqi-hero2.webp"],
  ["/images/container-debris-jumbo.webp", "/images/Taqi-hero1.webp"],
  ["/images/container-debris-large.webp", "/images/Taqi-hero2.webp"],
  ["/images/container-debris-medium.webp", "/images/Taqi-hero3.webp"],
  ["/images/container-debris-small.webp", "/images/Taqi-hero3.webp"],
]);
const LEGACY_UPLOAD_PREFIXES = [
  "1784880738437", "1784880757820", "1784882025820", "1784882033731",
  "1784887232848", "1785255325266", "1785255348822", "1785255370019",
  "1785255383693", "1785257611922", "1785354077655", "1785354097174",
  "1785354132506", "1785354146906", "1785354183144", "1785354189577",
  "1785354200379", "1785354314084", "1785354327071", "1785354339551",
  "1785354343959", "1785354462050", "1785354476427", "1786046507655",
  "1786048541217", "1786575435928", "1786576606278", "1786580706278",
  "1786590530851", "1786590827707", "1786590833367", "1786590919358",
  "1786590941352", "1786852381998", "1786852410628", "1786852441444",
  "1786852469840", "1786852497754", "1786852526916",
];
const legacyUploadPattern = new RegExp(
  String.raw`/(?:api/)?uploads/(?:${LEGACY_UPLOAD_PREFIXES.join("|")})-[^/"'\\\s?#]+`,
  "gi",
);

function replaceLegacyImagePaths(value) {
  let result = String(value || "");
  for (const [legacy, current] of LEGACY_IMAGE_REPLACEMENTS) {
    result = result.replaceAll(legacy, current);
  }
  result = result.replace(legacyUploadPattern, "/images/Taqi-hero4.webp");
  return result;
}

const isLegacyArticleImage = (value) => {
  const image = String(value || "").trim();
  return (
    replaceLegacyImagePaths(image) !== image ||
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

  const value = replaceLegacyImagePaths(row.value);
  if (value === row.value) return 0;

  db.prepare("UPDATE site_settings SET value = ?, updated_at = ? WHERE id = ?")
    .run(value, new Date().toISOString(), row.id);
  return 1;
}

function updateLegacyReferences(db) {
  let updated = 0;
  const candidateTables = [
    "site_settings",
    "posts",
    "seo_pages",
    "services",
    "packages",
    "containers",
    "hero_slides",
    "testimonials",
    "partners",
  ];
  for (const tableName of candidateTables) {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName)) continue;
    const table = tableName.replaceAll('"', '""');
    const columns = db.prepare(`PRAGMA table_info("${table}")`).all()
      .filter((column) => String(column.type || "").toUpperCase().includes("TEXT"));
    for (const column of columns) {
      const name = String(column.name).replaceAll('"', '""');
      const values = db.prepare(`SELECT DISTINCT "${name}" AS value FROM "${table}" NOT INDEXED WHERE "${name}" IS NOT NULL`).all();
      for (const row of values) {
        if (typeof row.value !== "string") continue;
        const nextValue = replaceLegacyImagePaths(row.value);
        if (nextValue === row.value) continue;
        db.prepare(`UPDATE "${table}" SET "${name}" = ? WHERE "${name}" = ?`)
          .run(nextValue, row.value);
        updated += 1;
      }
    }
  }
  return updated;
}

function moveUnusedImages(db) {
  mkdirSync(QUARANTINE_DIR, { recursive: true });
  let moved = 0;
  const referencedContentFiles = new Set();

  for (const table of ["posts", "seo_pages"]) {
    const exists = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table);
    if (!exists) continue;
    const columns = db.prepare(`PRAGMA table_info("${table}")`).all().map((column) => column.name);
    const imageColumns = ["cover_image", "og_image"].filter((column) => columns.includes(column));
    if (!imageColumns.length) continue;
    for (const row of db.prepare(`SELECT ${imageColumns.join(", ")} FROM "${table}" NOT INDEXED`).all()) {
      for (const value of imageColumns.map((column) => row[column])) {
        const image = String(value || "").split(/[?#]/, 1)[0];
        if (image.startsWith("/images/content/")) {
          referencedContentFiles.add(image.slice("/images/".length));
        }
      }
    }
  }

  // The title-based migration also creates service galleries and hero images.
  // Keep those files when the Hostinger build runs its legacy cleanup.
  for (const table of ["services", "hero_slides"]) {
    const exists = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table);
    if (!exists) continue;
    const columns = db.prepare(`PRAGMA table_info("${table}")`).all().map((column) => column.name);
    const imageColumns = ["image_url", "images"].filter((column) => columns.includes(column));
    for (const row of db.prepare(`SELECT ${imageColumns.join(", ")} FROM "${table}" NOT INDEXED`).all()) {
      for (const column of imageColumns) {
        const values = column === "images"
          ? (() => {
              try {
                const parsed = JSON.parse(row[column] || "[]");
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })()
          : [row[column]];
        for (const value of values) {
          const image = String(value || "").split(/[?#]/, 1)[0];
          if (image.startsWith("/images/content/")) {
            referencedContentFiles.add(image.slice("/images/".length));
          }
        }
      }
    }
  }

  // A previous build may have quarantined a file before this reference-aware
  // protection was added. Restore referenced assets from the quarantine by
  // basename before deciding what is unused. The migration intentionally
  // stores each generated content asset with a unique title-based basename,
  // so this also repairs an already-built workspace without losing originals.
  for (const relativeName of referencedContentFiles) {
    const target = join(PUBLIC_IMAGES, relativeName);
    if (existsSync(target)) continue;
    const quarantined = join(QUARANTINE_DIR, relativeName.split("/").pop());
    if (!existsSync(quarantined)) continue;
    mkdirSync(join(target, ".."), { recursive: true });
    renameSync(quarantined, target);
  }

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

  // Preserve any title-based files still referenced by the current database.
  // Only unreferenced leftovers are quarantined.
  const legacyContentDir = join(PUBLIC_IMAGES, "content");
  if (existsSync(legacyContentDir)) {
    const walk = (directory) => {
      for (const name of readdirSync(directory)) {
        const source = join(directory, name);
        const relativeName = relative(PUBLIC_IMAGES, source).replaceAll("\\", "/");
        if (statSync(source).isDirectory()) {
          walk(source);
        } else if (!referencedContentFiles.has(relativeName)) {
          move(source, name);
        }
      }
    };
    walk(legacyContentDir);
  }

  // Remove only empty folders left behind by quarantining unreferenced files.
  const removeEmptyDirectories = (directory) => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) removeEmptyDirectories(join(directory, entry.name));
    }
    if (readdirSync(directory).length === 0) rmSync(directory, { recursive: true, force: true });
  };
  removeEmptyDirectories(legacyContentDir);

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
  const legacyReferences = updateLegacyReferences(db);
  const movedFiles = moveUnusedImages(db);
  console.log(`تم تحديث ${articleRows} سجل مقال و${homepageSettings} إعداد واجهة إلى صور الهيرو الحالية.`);
  console.log(`تم تحديث ${legacyReferences} قيمة تحتوي على مراجع صور قديمة.`);
  console.log(`تم نقل ${movedFiles} صورة غير مستخدمة إلى images/صور حسام.`);
} finally {
  db.close();
}