import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "artifacts", "sabaik-almasa", "public");

async function generate() {
  const source = join(PUBLIC_DIR, "favicon.svg");
  if (!existsSync(source)) {
    console.error("favicon.svg not found in public!");
    return;
  }

  console.log("Generating Google-compliant square favicon assets...");

  const sizes = [
    { name: "favicon.png", size: 192 },
    { name: "favicon-512x512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
    { name: "favicon-32x32.png", size: 32 },
    { name: "favicon-16x16.png", size: 16 },
  ];

  for (const item of sizes) {
    const target = join(PUBLIC_DIR, item.name);
    const temporary = `${target}.tmp.png`;
    execFileSync("magick", [
      source,
      "-background",
      "none",
      "-resize",
      `${item.size}x${item.size}`,
      "-gravity",
      "center",
      "-extent",
      `${item.size}x${item.size}`,
      temporary,
    ], { stdio: "inherit" });
    execFileSync("mv", [temporary, target]);
    console.log(`  ✅ Generated ${item.name} (${item.size}x${item.size})`);
  }

  const icoTarget = join(PUBLIC_DIR, "favicon.ico");
  const icoTemporary = `${icoTarget}.tmp.ico`;
  execFileSync("magick", [
    join(PUBLIC_DIR, "favicon.png"),
    "-define",
    "icon:auto-resize=16,24,32,48,64,96,128,256",
    icoTemporary,
  ], { stdio: "inherit" });
  execFileSync("mv", [icoTemporary, icoTarget]);
  console.log("  ✅ Generated favicon.ico (multi-resolution ICO)");

  const notificationTarget = join(PUBLIC_DIR, "notification-icon.png");
  execFileSync("cp", [join(PUBLIC_DIR, "favicon.png"), notificationTarget]);
  console.log("  ✅ Generated square notification-icon.png");
}

generate().catch(console.error);
