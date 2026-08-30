import { existsSync, readFileSync } from "node:fs";

const indexPath = "build_php/index.html";
if (!existsSync(indexPath)) {
  console.error(`Missing Hostinger build output: ${indexPath}`);
  process.exit(1);
}

const html = readFileSync(indexPath, "utf8");
const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() || "NOT_FOUND";
const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
  .map((match) => match[1].replace(/<[^>]+>/g, "").trim());

const checks = [
  ["homepage H1 identifies container rental", h1.includes("تأجير حاويات الرياض")],
  ["restaurant waste-container copy", html.includes("حاويات نفايات للمطاعم")],
  ["facility waste-container copy", html.includes("حاويات مخلفات المنشآت")],
  ["construction and demolition waste copy", html.includes("نقل مخلفات البناء والهدم")],
  ["container-rental FAQ", html.includes("الأسئلة الشائعة حول تأجير حاويات الرياض")],
  ["publisher authority block", html.includes("هوية الجهة الناشرة ومراجع الخدمة")],
  ["homepage canonical", /<link\b[^>]*rel=["']canonical["'][^>]*>/i.test(html)],
  ["homepage description", /<meta\b[^>]*name=["']description["'][^>]*>/i.test(html)],
];

console.log("=== BUILD OUTPUT VERIFICATION ===");
console.log("HTML Size:", html.length, "bytes");
console.log("H1:", h1);
console.log("H2s (Count:", h2s.length, "):", h2s);
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}

const failures = checks.filter(([, passed]) => !passed);
if (failures.length) {
  console.error(`BUILD OUTPUT VERIFICATION: FAIL (${failures.length})`);
  process.exit(1);
}
console.log("BUILD OUTPUT VERIFICATION: PASS");
