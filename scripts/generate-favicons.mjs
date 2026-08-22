import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "artifacts", "sabaik-almasa", "public");

async function generate() {
  let sharp;
  try {
    const sharpModule = await import("sharp");
    sharp = sharpModule.default;
  } catch (e) {
    console.log("Sharp not available yet, waiting...");
    return;
  }

  const srcPng = join(PUBLIC_DIR, "favicon.webp");
  if (!existsSync(srcPng)) {
    console.error("favicon.webp not found in public!");
    return;
  }

  console.log("🎨 Generating Google-compliant Favicon suite (multiples of 48px)...");

  // Google Search required sizes: 48x48, 96x96, 144x144, 192x192, 512x512
  const sizes = [
    { name: "favicon-48x48.png", size: 48 },
    { name: "favicon-96x96.png", size: 96 },
    { name: "favicon-144x144.png", size: 144 },
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
    { name: "favicon-32x32.png", size: 32 },
    { name: "favicon-16x16.png", size: 16 }
  ];

  for (const item of sizes) {
    await sharp(srcPng)
      .resize(item.size, item.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(join(PUBLIC_DIR, item.name));
    console.log(`  ✅ Generated ${item.name} (${item.size}x${item.size})`);
  }

  // Create favicon.ico from 48x48
  const icoBuffer = await sharp(srcPng)
    .resize(48, 48, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  writeFileSync(join(PUBLIC_DIR, "favicon.ico"), icoBuffer);
  console.log("  ✅ Generated favicon.ico (Google Search root fallback)");

  console.log("🚀 Favicon suite generated successfully!");
}

generate().catch(console.error);
