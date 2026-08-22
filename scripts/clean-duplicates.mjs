import { existsSync, rmSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const publicDir = join(ROOT, "artifacts/sabaik-almasa/public");
const imagesDir = join(publicDir, "images");

// 1. Delete duplicate api/ folder in public
const apiUploads = join(publicDir, "api");
if (existsSync(apiUploads)) {
  rmSync(apiUploads, { recursive: true, force: true });
  console.log("Deleted duplicate public/api");
}

// 2. Delete legacy and unreferenced images in public and public/images
const unreferencedImages = [
  "ceo.webp", "Banner-Small.webp", "shareek-mawsouq.webp", "good.webp",
  "Banner-Big.webp", "No1-Banner.webp", "hawiyat-logo.webp",
  "container1.jpg", "container2.jpg", "container3.jpg", "container4.jpg",
  "container-1.webp", "container-2.webp", "container-3.webp", "container-4.jpeg",
  "hero1.jpg", "hero2.jpg", "hero3.jpg", "hero4.jpg",
  "hero-1.webp", "hero-2.webp", "hero-3.webp", "hero-4.webp",
  "partner1.jpg", "partner2.jpg", "partner3.jpg", "partner4.jpg", "partner5.jpg", "partner6.jpg"
];

for (const file of unreferencedImages) {
  const pRoot = join(publicDir, file);
  if (existsSync(pRoot)) {
    rmSync(pRoot, { force: true });
    console.log("Deleted root file:", file);
  }
  const pImg = join(imagesDir, file);
  if (existsSync(pImg)) {
    rmSync(pImg, { force: true });
    console.log("Deleted images/ file:", file);
  }
}
