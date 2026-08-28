import Database from "better-sqlite3";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

const root = process.cwd();
const dbPath = join(root, "data", "sabaik.db");
const publicDir = join(root, "artifacts", "sabaik-almasa", "public");
const uploadsDir = join(root, "uploads");
const db = new Database(dbPath);

function slugifyTitle(value, fallback) {
  const slug = String(value || "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return slug || fallback;
}

function sourceForUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || /^https?:\/\//i.test(raw)) return null;
  const clean = raw.split("?")[0].replace(/^\/+/, "");
  const candidates = [
    join(publicDir, clean),
    join(root, clean),
    clean.startsWith("api/uploads/") ? join(uploadsDir, basename(clean)) : null,
    clean.startsWith("uploads/") ? join(uploadsDir, basename(clean)) : null,
  ].filter(Boolean);
  return candidates.find(existsSync) || null;
}

function migrateImage(rawUrl, directory, slug, fallbackExtension = ".webp") {
  const source = sourceForUrl(rawUrl);
  if (!source) return null;
  const extension = extname(source).toLowerCase() || fallbackExtension;
  const targetDir = join(publicDir, "images", directory);
  mkdirSync(targetDir, { recursive: true });
  const target = join(targetDir, `${slug}${extension}`);
  if (!existsSync(target)) copyFileSync(source, target);
  return `/images/${directory}/${slug}${extension}`;
}

const migrateRows = (table, directory, imageColumn, titleColumn) => {
  const rows = db.prepare(`SELECT id, ${titleColumn}, ${imageColumn} FROM ${table}`).all();
  const update = db.prepare(`UPDATE ${table} SET ${imageColumn} = ? WHERE id = ?`);
  let changed = 0;
  for (const row of rows) {
    const slug = slugifyTitle(row[titleColumn], `${directory}-${row.id}`);
    const image = migrateImage(row[imageColumn], directory, slug);
    if (!image) continue;
    update.run(image, row.id);
    changed++;
  }
  return { total: rows.length, changed };
};

const posts = migrateRows("posts", "content/articles", "cover_image", "title");
const postOg = db.prepare("SELECT id, title, og_image FROM posts").all();
const updatePostOg = db.prepare("UPDATE posts SET og_image = ? WHERE id = ?");
for (const row of postOg) {
  const image = migrateImage(row.og_image, "content/articles", slugifyTitle(row.title, `article-${row.id}`));
  if (image) updatePostOg.run(image, row.id);
}

const pages = migrateRows("seo_pages", "content/pages", "cover_image", "title");
const pageOg = db.prepare("SELECT id, title, og_image FROM seo_pages").all();
const updatePageOg = db.prepare("UPDATE seo_pages SET og_image = ? WHERE id = ?");
for (const row of pageOg) {
  const image = migrateImage(row.og_image, "content/pages", slugifyTitle(row.title, `page-${row.id}`));
  if (image) updatePageOg.run(image, row.id);
}

const slides = db.prepare("SELECT id, title, image_url FROM hero_slides").all();
const updateSlide = db.prepare("UPDATE hero_slides SET image_url = ? WHERE id = ?");
let slidesChanged = 0;
for (const row of slides) {
  const image = migrateImage(row.image_url, "hero", slugifyTitle(row.title, `slide-${row.id}`));
  if (!image) continue;
  updateSlide.run(image, row.id);
  slidesChanged++;
}

console.log(JSON.stringify({
  posts: { ...posts, ogUpdated: postOg.length },
  pages: { ...pages, ogUpdated: pageOg.length },
  slides: { total: slides.length, changed: slidesChanged },
}, null, 2));
db.close();