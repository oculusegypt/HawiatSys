import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const TARGET_DIRS = [
  path.join(ROOT, "lib"),
  path.join(ROOT, "scripts"),
  path.join(ROOT, "artifacts/api-server"),
  path.join(ROOT, "artifacts/sabaik-almasa/src"),
  path.join(ROOT, "artifacts/sabaik-almasa/public"),
  path.join(ROOT, "docs"),
  path.join(ROOT, "README.md"),
  path.join(ROOT, "DEPLOYMENT.md"),
  path.join(ROOT, "replit.md"),
];

function walk(dir, files = []) {
  if (/\.(md|txt)$/i.test(dir) && fs.statSync(dir).isFile()) return [dir];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== "dist" && entry.name !== "build_php") {
        walk(fullPath, files);
      }
    } else if (/\.(ts|tsx|js|mjs|json|md)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

let modifiedCount = 0;

for (const targetDir of TARGET_DIRS) {
  const files = walk(targetDir);
  for (const file of files) {
    // skip this purge script itself
    if (file.includes("purge-codebase-legacy-strings.mjs")) continue;
    
    let content = fs.readFileSync(file, "utf8");
    const legacyArabic = ["سب", "ائك", " ", "الماسة"].join("");
    const legacyArabicAlt = ["سب", "ائك", " ", "الماسه"].join("");
    const previousReplacement = ["السهم", "كلين"].join(" ");
    const legacyLatin = ["Sa", "ba", "ik", " Almasa"].join("");
    if (content.includes(legacyArabic) || content.includes(legacyArabicAlt) || content.includes(previousReplacement) || content.includes(legacyLatin)) {
      const updated = content
        .replaceAll(legacyArabic, "مؤسسة تقي جروب")
        .replaceAll(legacyArabicAlt, "مؤسسة تقي جروب")
        .replaceAll(`مؤسسة ${previousReplacement}`, "مؤسسة تقي جروب")
        .replaceAll(previousReplacement, "تقي جروب")
        .replaceAll(legacyLatin, "Taqi Group");
      
      fs.writeFileSync(file, updated, "utf8");
      modifiedCount++;
      console.log(`✅ Updated: ${path.relative(ROOT, file)}`);
    }
  }
}

console.log(`\n🎉 تم تنظيف ${modifiedCount} ملفاً برمجياً من الاسم القديم.`);
