#!/usr/bin/env node
/**
 * Give each article, SEO page, and service its own title-based image copy.
 *
 * Safe by default:
 *   node scripts/migrate-content-image-names.mjs
 *
 * The command above only prints the proposed changes. It does not modify the
 * database or files. Use --apply only after reviewing that report:
 *   node scripts/migrate-content-image-names.mjs --apply
 *
 * Original images are never deleted or renamed. This matters because old
 * prerendered pages, browser caches, and external search indexes can still
 * reference the old paths.
 */
import { createRequire } from "node:module";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const DB_PATH = resolve(valueAfter("--db", join(ROOT, "data", "sabaik.db")));
const PUBLIC_DIR = resolve(valueAfter("--public", join(ROOT, "artifacts", "sabaik-almasa", "public")));
const BACKUP_PATH = `${DB_PATH}.before-content-image-migration.bak`;

function valueAfter(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

if (args.has("--help")) {
  console.log(`
Usage:
  node scripts/migrate-content-image-names.mjs              # dry-run
  node scripts/migrate-content-image-names.mjs --apply      # copy + update
  node scripts/migrate-content-image-names.mjs --apply --db /path/to/sabaik.db
`);
  process.exit(0);
}

if (!existsSync(DB_PATH)) throw new Error(`Database not found: ${DB_PATH}`);
if (!existsSync(PUBLIC_DIR)) throw new Error(`Public directory not found: ${PUBLIC_DIR}`);

const db = new Database(DB_PATH, { readonly: !APPLY });
const plannedFiles = new Map();
const createdFiles = [];
const changes = [];
const skipped = [];

function hasTable(name) {
  return Boolean(db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
  ).get(name));
}

function columnsFor(table) {
  return new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map((column) => column.name));
}

function slugifyTitle(value, fallback) {
  const slug = String(value || "")
    .normalize("NFC")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[\/\\:*?"<>|#%{}[\]`]/g, "")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\u0660-\u0669-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140);
  return slug || fallback;
}

function localPathFromUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  let pathname = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (!["taqigroup.com", "www.taqigroup.com", "localhost", "127.0.0.1"].includes(url.hostname.toLowerCase())) {
        return null;
      }
      pathname = url.pathname;
    } catch {
      return null;
    }
  }

  try {
    pathname = decodeURIComponent(pathname.split(/[?#]/, 1)[0]);
  } catch {
    pathname = pathname.split(/[?#]/, 1)[0];
  }

  const clean = pathname.replace(/^\/+/, "");
  if (!clean || clean.split("/").includes("..")) return null;
  return clean;
}

function sourceForUrl(value) {
  const clean = localPathFromUrl(value);
  if (!clean) return null;

  const file = basename(clean);
  const candidates = [
    join(PUBLIC_DIR, clean),
    join(ROOT, clean),
    join(ROOT, "artifacts", "api-server", clean.replace(/^api\//, "")),
    join(ROOT, "artifacts", "api-server", "uploads", file),
    join(ROOT, "uploads", file),
    join(PUBLIC_DIR, "uploads", file),
  ];

  return candidates.find((candidate) => {
    try {
      return statSync(candidate).isFile();
    } catch {
      return false;
    }
  }) || null;
}

function sourceKey(value) {
  const source = sourceForUrl(value);
  return source ? resolve(source) : null;
}

function makeTarget(source, directory, basenameWithoutExtension) {
  const extension = extname(source).toLowerCase() || ".webp";
  const targetDir = join(PUBLIC_DIR, "images", directory);
  const base = `${basenameWithoutExtension}${extension}`;
  let target = join(targetDir, base);
  let counter = 2;

  while (
    (existsSync(target) && resolve(target) !== resolve(source)) ||
    plannedFiles.has(target)
  ) {
    target = join(targetDir, `${basenameWithoutExtension}-${counter}${extension}`);
    counter += 1;
  }
  return { target, targetDir };
}

function copyImage(rawUrl, directory, basenameWithoutExtension, perRecordSources) {
  const source = sourceForUrl(rawUrl);
  if (!source) {
    if (String(rawUrl || "").trim()) {
      skipped.push({ value: rawUrl, reason: "local source file not found or external URL" });
    }
    return null;
  }

  const key = sourceKey(rawUrl);
  if (key && perRecordSources.has(key)) return perRecordSources.get(key);

  const { target, targetDir } = makeTarget(source, directory, basenameWithoutExtension);
  const nextUrl = `/${relative(PUBLIC_DIR, target).replaceAll("\\", "/")}`;
  const result = { source, target, targetDir, nextUrl };
  if (key) perRecordSources.set(key, result);
  plannedFiles.set(target, result);
  return result;
}

function recordChange(table, rowId, column, current, next) {
  if (current === next) return;
  changes.push({ table, rowId, column, from: current || "", to: next });
}

function planSimpleImages(table, directory, rows, imageColumns) {
  for (const row of rows) {
    const base = slugifyTitle(row.title, `${directory.replaceAll("/", "-")}-${row.id}`);
    const perRecordSources = new Map();
    for (const column of imageColumns) {
      if (!String(row[column] || "").trim()) continue;
      const result = copyImage(row[column], directory, base, perRecordSources);
      if (result) recordChange(table, row.id, column, row[column], result.nextUrl);
    }
  }
}

function parseImageList(value) {
  if (!String(value || "").trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item || "")) : [];
  } catch {
    return [];
  }
}

function planServices(rows) {
  for (const row of rows) {
    const base = slugifyTitle(row.title, `service-${row.id}`);
    const perRecordSources = new Map();
    const imageUrlResult = row.image_url
      ? copyImage(row.image_url, "content/services", base, perRecordSources)
      : null;
    if (imageUrlResult) recordChange("services", row.id, "image_url", row.image_url, imageUrlResult.nextUrl);

    const images = parseImageList(row.images);
    if (!images.length) continue;
    const nextImages = images.map((image, index) => {
      if (!String(image).trim()) return image;
      const suffix = index === 0 ? "" : `-${index + 1}`;
      const result = copyImage(image, "content/services", `${base}${suffix}`, perRecordSources);
      return result?.nextUrl || image;
    });
    if (JSON.stringify(images) !== JSON.stringify(nextImages)) {
      recordChange("services", row.id, "images", row.images, JSON.stringify(nextImages));
    }
  }
}

const plans = [];
if (hasTable("posts")) {
  const columns = columnsFor("posts");
  const imageColumns = ["cover_image", "og_image"].filter((column) => columns.has(column));
  const rows = db.prepare("SELECT id, title, cover_image, og_image FROM posts NOT INDEXED").all();
  planSimpleImages("posts", "content/articles", rows, imageColumns);
  plans.push({ table: "posts", rows: rows.length, imageColumns });
}

if (hasTable("seo_pages")) {
  const columns = columnsFor("seo_pages");
  const imageColumns = ["cover_image", "og_image"].filter((column) => columns.has(column));
  const rows = db.prepare("SELECT id, title, cover_image, og_image FROM seo_pages NOT INDEXED").all();
  planSimpleImages("seo_pages", "content/pages", rows, imageColumns);
  plans.push({ table: "seo_pages", rows: rows.length, imageColumns });
}

if (hasTable("services")) {
  const columns = columnsFor("services");
  const selectColumns = ["id", "title", "image_url", "images"].filter((column) => columns.has(column));
  const rows = db.prepare(`SELECT ${selectColumns.join(", ")} FROM services NOT INDEXED`).all();
  planServices(rows);
  plans.push({ table: "services", rows: rows.length, imageColumns: selectColumns.slice(2) });
}

if (hasTable("hero_slides")) {
  const columns = columnsFor("hero_slides");
  if (columns.has("image_url")) {
    const rows = db.prepare("SELECT id, title, image_url FROM hero_slides NOT INDEXED").all();
    planSimpleImages("hero_slides", "content/hero", rows, ["image_url"]);
    plans.push({ table: "hero_slides", rows: rows.length, imageColumns: ["image_url"] });
  }
}

const updateStatements = new Map();
for (const change of changes) {
  const key = `${change.table}:${change.column}`;
  if (!updateStatements.has(key)) {
    updateStatements.set(key, db.prepare(`UPDATE "${change.table}" SET "${change.column}" = ? WHERE id = ?`));
  }
}

if (APPLY && changes.length) {
  if (!existsSync(BACKUP_PATH)) {
    await db.backup(BACKUP_PATH);
  }

  try {
    for (const file of plannedFiles.values()) {
      if (existsSync(file.target)) continue;
      mkdirSync(file.targetDir, { recursive: true });
      copyFileSync(file.source, file.target);
      createdFiles.push(file.target);
    }

    const applyChanges = db.transaction(() => {
      for (const change of changes) {
        updateStatements.get(`${change.table}:${change.column}`).run(change.to, change.rowId);
      }
    });
    applyChanges();
  } catch (error) {
    for (const file of createdFiles) rmSync(file, { force: true });
    throw error;
  }
}

console.log(JSON.stringify({
  mode: APPLY ? "apply" : "dry-run",
  database: DB_PATH,
  publicDirectory: PUBLIC_DIR,
  backup: APPLY && changes.length ? BACKUP_PATH : null,
  tables: plans,
  files: plannedFiles.size,
  changes: changes.length,
  skipped: skipped.length,
  examples: changes.slice(0, 20),
  skippedExamples: skipped.slice(0, 20),
}, null, 2));

db.close();