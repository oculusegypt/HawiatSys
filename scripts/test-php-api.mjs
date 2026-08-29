import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { entitySlug } from "./friendly-slug.mjs";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "lib/db/package.json"));
const Database = require("better-sqlite3");
const db = new Database(path.join(ROOT, "build_php/data/sabaik.db"), {
  readonly: true,
});
const pages = db
  .prepare(
    "SELECT id, title, slug, seo_slug FROM seo_pages WHERE status = 'published' AND is_active = 1 ORDER BY id ASC",
  )
  .all();
db.close();

if (pages.length === 0) {
  throw new Error(
    "No published SEO pages found in the Hostinger archive database",
  );
}

for (const page of pages) {
  const publicSlug = entitySlug({
    slug: page.slug || page.seo_slug,
    title: page.title,
    id: page.id,
    fallback: "page",
  });
  const requestUri = `/api/pages/${encodeURIComponent(publicSlug)}`;
  const phpCode = `$_SERVER['REQUEST_METHOD']='GET';$_SERVER['REQUEST_URI']=${JSON.stringify(requestUri)};$_SERVER['HTTP_HOST']='taqigroup.com';require 'build_php/api/index.php';`;

  const output = execFileSync("php", ["-r", phpCode], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  let response;
  try {
    response = JSON.parse(output);
  } catch {
    throw new Error(
      `Invalid JSON for SEO page ${page.id}: ${output.slice(0, 200)}`,
    );
  }
  if (response?.id !== page.id) {
    throw new Error(
      `SEO page alias failed for ${publicSlug}: ${output.slice(0, 200)}`,
    );
  }
}

console.log(`PHP SEO page aliases: PASS (${pages.length}/${pages.length})`);
