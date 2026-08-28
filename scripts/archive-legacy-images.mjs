#!/usr/bin/env node
/**
 * Collect the old project images into a separate preservation archive.
 *
 * This archive is deliberately independent from cleanflow-services-hostinger.zip.
 * It scans the project without touching source files, preserves the complete
 * "صور حسام" folder, and records every source path in a manifest.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUTPUT_ZIP = join(ROOT, "cleanflow-legacy-images-archive.zip");
const MANIFEST_PATH = join(ROOT, "legacy-images-archive-manifest.json");
const STAGING_DIR = join(ROOT, ".legacy-images-archive-staging");

const IMAGE_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg", ".ico",
  ".bmp", ".tif", ".tiff",
]);

const listedNames = [
  "1784880738437-4f946616f9a9.webp",
  "1784880757820-804463c77f13.webp",
  "1784882025820-49ef14f7bcd4.jpg",
  "1784882033731-85f21c7eda4f.jpeg",
  "1784887232848-88a8998bb09c.webp",
  "1784887243470-6flac3a6fef6.jpeg",
  "1785255325266-4cc5c495fd6c.webp",
  "1785255348822-1765d023ab6b.jpeg",
  "1785255370019-1e0ecd0713bb.jpg",
  "1785255383693-202a8c3ca609.webp",
  "1785257611922-fc9bf51eac24.webp",
  "1785354077655-5e88594b40d9.png",
  "1785354097174-a0cca97c9f9e.webp",
  "1785354132506-ea72050b634a.webp",
  "1785354146906-ce9aa9e1c391.jpeg",
  "1785354183144-d7bf9cbadf55.webp",
  "1785354189577-a14df34802cf.webp",
  "1785354200379-71f2dc852bef.jpg",
  "1785354314084-e9d133e457b0.png",
  "1785354327071-7df0d634363d.jpg",
  "1785354339551-5be8106e52d7.jpeg",
  "1785354343959-b28bddab35d2.jpeg",
  "1785354462050-46de33cb28d2.png",
  "1785354476427-472433a3487c.webp",
  "1786046507655-3963740b2785.webp",
  "1786048541217-6f6bb80fac50.webp",
  "1786575435928-f3bc01c96a5a.webp",
  "1786576602625-1e9aa3b17cae.webp",
  "1786580706278-a17684d9aa89.webp",
  "1786590530851-baf2cf1d98f4.webp",
  "1786590827707-becaf3702c0b.webp",
  "1786590833367-23f06943c4d8.webp",
  "1786590919358-48b4454a24fl.webp",
  "1786590941352-fb358374525f.webp",
  "1786852381998-7b9fc2691361.webp",
  "1786852410628-3417524d6e46.webp",
  "1786852441444-7bdcaa7c2133.webp",
  "1786852469840-8c9465939c93.webp",
  "1786852497754-e23a365fc223.webp",
  "1786852526916-f43fb6a35802.webp",
  "Banner-Big.webp",
  "Banner-Small.webp",
  "ceo.webp",
  "container-1.webp",
  "container-2.webp",
  "container-3.webp",
  "container-4.jpeg",
  "container-compactor-electric.webp",
  "container-debris-jumbo.webp",
  "container-debris-large.webp",
  "container-debris-medium.webp",
  "container-debris-small.webp",
];

const listedBasenames = new Set(listedNames.map((name) => name.toLowerCase()));
const listedNumericPrefixes = [...listedBasenames]
  .filter((name) => /^\d+-/.test(name))
  .map((name) => name.slice(0, name.indexOf("-")));
const listedStems = new Set(
  [...listedBasenames].map((name) => name.slice(0, name.lastIndexOf("."))),
);

const isImage = (file) => IMAGE_EXTENSIONS.has(file.slice(file.lastIndexOf(".")).toLowerCase());
const isHossamPath = (file) => file.split("/").includes("صور حسام");
const isExcludedPath = (file) => [
  "/node_modules/",
  "/.git/",
  "/.local/",
  "/build_php/",
  "/artifacts/sabaik-almasa/dist/",
  "/cleanflow-legacy-images-archive.zip",
  "/.legacy-images-archive-staging/",
].some((part) => file.includes(part));

const matchesListedName = (file) => {
  const fileName = basename(file).toLowerCase();
  if (listedBasenames.has(fileName)) return true;
  const stem = fileName.slice(0, fileName.lastIndexOf("."));
  if (listedStems.has(stem)) return true;
  return listedNumericPrefixes.some((prefix) => stem.startsWith(`${prefix}-`));
};

function walk(directory, found = []) {
  if (!existsSync(directory)) return found;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (isExcludedPath(file)) continue;
    if (entry.isDirectory()) walk(file, found);
    else if (isImage(entry.name)) found.push(file);
  }
  return found;
}

function hashFile(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function uniqueTarget(directory, fileName, hash, targetHashes) {
  const baseTarget = join(STAGING_DIR, directory, fileName);
  const existingHash = targetHashes.get(baseTarget);
  if (!existingHash || existingHash === hash) return baseTarget;
  const extension = fileName.slice(fileName.lastIndexOf("."));
  const stem = fileName.slice(0, fileName.lastIndexOf("."));
  let index = 2;
  while (true) {
    const candidate = join(STAGING_DIR, directory, `${stem}__${index}${extension}`);
    const candidateHash = targetHashes.get(candidate);
    if (!candidateHash || candidateHash === hash) return candidate;
    index += 1;
  }
}

rmSync(STAGING_DIR, { recursive: true, force: true });
mkdirSync(STAGING_DIR, { recursive: true });
rmSync(OUTPUT_ZIP, { force: true });

const candidates = walk(ROOT).filter((file) => isHossamPath(file) || matchesListedName(file));
const records = [];
const targetHashes = new Map();
const byHashAndName = new Map();

for (const source of candidates.sort()) {
  const sourceRelative = relative(ROOT, source).replaceAll("\\", "/");
  const sourceName = basename(source);
  const hash = hashFile(source);
  const dedupeKey = `${hash}:${sourceName.toLowerCase()}`;
  const existing = byHashAndName.get(dedupeKey);
  if (existing) {
    existing.sources.push(sourceRelative);
    continue;
  }

  const hossam = isHossamPath(source);
  const hossamIndex = sourceRelative.split("/").indexOf("صور حسام");
  const hossamRelative = hossam
    ? sourceRelative.split("/").slice(hossamIndex + 1).join("/")
    : "";
  const targetDirectory = hossam ? "صور حسام" : "uploads";
  const targetName = hossamRelative || sourceName;
  const target = uniqueTarget(targetDirectory, targetName, hash, targetHashes);
  const targetRelative = relative(STAGING_DIR, target).replaceAll("\\", "/");
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  targetHashes.set(target, hash);
  const record = {
    target: targetRelative,
    sources: [sourceRelative],
    basename: sourceName,
    bytes: statSync(source).size,
    sha256: hash,
    reason: hossam ? "folder: صور حسام" : "listed legacy image",
  };
  records.push(record);
  byHashAndName.set(dedupeKey, record);
}

const manifest = {
  archiveType: "legacy-project-images",
  createdAt: new Date().toISOString(),
  sourceRoot: ".",
  listedNames,
  numericPrefixes: listedNumericPrefixes,
  scannedImageFileCount: walk(ROOT).length,
  matchedSourceReferenceCount: records.reduce((sum, record) => sum + record.sources.length, 0),
  uniqueArchivedFileCount: records.length,
  totalBytes: records.reduce((sum, record) => sum + record.bytes, 0),
  productionExclusionBasenames: [...new Set(records.map((record) => record.basename.toLowerCase()))].sort(),
  productionExclusionNumericPrefixes: listedNumericPrefixes,
  files: records,
};
writeFileSync(join(STAGING_DIR, "MANIFEST.json"), JSON.stringify(manifest, null, 2), "utf8");
writeFileSync(
  join(STAGING_DIR, "README.txt"),
  [
    "أرشيف صور المشاريع القديمة — CleanFlow Services",
    "",
    "هذه النسخة منفصلة عن حزمة الإنتاج cleanflow-services-hostinger.zip.",
    "تم جمع الصور المذكورة في الطلب، وكل محتويات مجلد صور حسام، من كامل المشروع.",
    "لا تُرفع محتويات هذا الأرشيف إلى public_html.",
    "تفاصيل المصادر والأحجام والبصمات موجودة في MANIFEST.json.",
  ].join("\n"),
  "utf8",
);

execFileSync("zip", ["-rq", OUTPUT_ZIP, "."], { cwd: STAGING_DIR, stdio: "inherit" });
rmSync(STAGING_DIR, { recursive: true, force: true });
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");

console.log(`✅ تم إنشاء أرشيف الصور القديمة: ${OUTPUT_ZIP.replace(`${ROOT}/`, "")}`);
console.log(`✅ ملفات فريدة: ${records.length} — مراجع مصدر: ${manifest.matchedSourceReferenceCount}`);
console.log(`✅ الحجم غير المضغوط: ${manifest.totalBytes} بايت`);