#!/usr/bin/env node
/**
 * Replace external stock-photo URLs with the generated local Riyadh imagery.
 * Run from the workspace root with:
 *   pnpm exec tsx scripts/update-local-cleaning-images.mjs
 */
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
// Resolve the database driver from the DB workspace package even when this
// utility is launched through a different workspace filter.
const require = createRequire(join(ROOT, "lib/db/package.json"));
const Database = require("better-sqlite3");
const db = new Database(join(ROOT, "data/sabaik.db"));

const heroImages = [
  "/images/hero-riyadh-cleaning.jpg",
  "/images/hero-riyadh-postconstruction.jpg",
  "/images/hero-riyadh-majlis.jpg",
  "/images/hero-riyadh-business.webp",
];

const serviceImages = {
  "تنظيف الشقق السكنية": "/images/service-apartments.jpg",
  "تنظيف الفلل والقصور": "/images/service-villas.jpg",
  "غسيل المجالس والكنب بالبخار": "/images/service-majlis.jpg",
  "تنظيف وغسيل المكيفات": "/images/service-ac.jpg",
  "مكافحة وإبادة الحشرات والتعقيم": "/images/service-pest.jpg",
  "تنظيف وتطهير خزانات المياه": "/images/service-tanks.jpg",
  "تنظيف وتعقيم المسابح": "/images/service-pool.jpg",
  "جلي وتلميع الرخام والبلاط": "/images/service-marble.jpg",
  "تنظيف واجهات المباني والمكاتب": "/images/service-facades.jpg",
  "تنظيف بعد البناء والتشطيب": "/images/service-postconstruction.jpg",
};

const categoryImages = {
  apartments: "/images/service-apartments.jpg",
  villas: "/images/service-villas.jpg",
  palaces: "/images/service-palace.jpg",
  move_clean: "/images/service-move.jpg",
  majlis: "/images/service-majlis.jpg",
  marble: "/images/service-marble.jpg",
  tanks: "/images/service-tanks.jpg",
  ac: "/images/service-ac.jpg",
  pest: "/images/service-pest.jpg",
  postcon: "/images/service-postconstruction.jpg",
  facades: "/images/service-facades.jpg",
  facilities: "/images/service-facilities.jpg",
};

const updateHero = db.prepare("UPDATE hero_slides SET image_url = ? WHERE \"order\" = ?");
const updateService = db.prepare("UPDATE services SET image_url = ?, images = ? WHERE title = ?");
const updateContainer = db.prepare("UPDATE containers SET image_url = ?, images = ? WHERE id = ?");

const updateAll = db.transaction(() => {
  for (let index = 0; index < heroImages.length; index += 1) {
    updateHero.run(heroImages[index], index);
  }

  for (const [title, image] of Object.entries(serviceImages)) {
    updateService.run(image, JSON.stringify([image]), title);
  }

  const packages = db.prepare("SELECT id, category FROM containers").all();
  for (const pkg of packages) {
    const image = categoryImages[pkg.category] || "/images/service-apartments.jpg";
    updateContainer.run(image, JSON.stringify([image]), pkg.id);
  }
});

updateAll();
db.close();
console.log("Updated hero slides, services, and cleaning packages with local generated images.");