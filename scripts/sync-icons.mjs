import { copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const pubDir = join(ROOT, "artifacts/sabaik-almasa/public");
const logoSrc = join(pubDir, "logo.webp");

if (existsSync(logoSrc)) {
  copyFileSync(logoSrc, join(pubDir, "images/logo.webp"));
  copyFileSync(logoSrc, join(pubDir, "uploads/1786576602625-1e9aa3b17cae.webp"));
  console.log("✅ logo.webp copied to images/logo.webp and uploads/1786576602625-1e9aa3b17cae.webp");
}
