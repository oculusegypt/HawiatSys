import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(import.meta.url);
const DB = require("better-sqlite3");
const db = new DB(join(ROOT, "data/sabaik.db"));

db.prepare("DELETE FROM testimonials").run();

const NOW = new Date().toISOString();

const TESTIMONIALS = [
  {
    client_name: "أحمد الشمري",
    company: "مالك فيلا بالرياض — حي الملقا",
    content: "خدمة ممتازة وسريعة، التزموا بالموعد وكانت خدمة تنظيف الفيلا بعمالة فنيّة محترفة وأجهزة بخار حديثة لغسيل المجالس وجلي الرخام. سنتعامل معهم مجدداً.",
    rating: 5,
    is_active: 1
  },
  {
    client_name: "عبدالله العتيبي",
    company: "شقة سكنية — حي الياسمين",
    content: "طلبت باقة تنظيف الشقة السكنية وجلي السيراميك، وكانت التجربة رائعة. الفريق محترف والأسعار معقولة جداً مقارنة بالمنافسين بالرياض.",
    rating: 5,
    is_active: 1
  },
  {
    client_name: "سارة القحطاني",
    company: "إدارة مجمع سكني — شمال الرياض",
    content: "نتعامل مع مؤسسة تقي جروب منذ سنتين لنظافة عقاراتنا ومقراتنا بالرياض. خدمة لا تقبل المقارنة ودقة عالية في المواعيد والتطهير بالبخار.",
    rating: 5,
    is_active: 1
  },
  {
    client_name: "خالد الدوسري",
    company: "مالك قصر — حي حطين",
    content: "تعاملت مع شركات تنظيف عديدة بالرياض ولكن مؤسسة تقي جروب الأفضل على الإطلاق. سرعة في الاستجابة وجودة في غسيل المكيفات وجلي الرخام بالألماس.",
    rating: 5,
    is_active: 1
  },
  {
    client_name: "فهد المالكي",
    company: "مجموعة المالكي العقارية",
    content: "نثق في مؤسسة تقي جروب لجميع مجمعاتنا السكنية والتجارية بالرياض. عمالة مدربة، أجهزة بخار وتعقيم حديثة، وخدمة 24 ساعة. شركاء موثوقون حقاً.",
    rating: 5,
    is_active: 1
  }
];

const stmt = db.prepare(`
  INSERT INTO testimonials (client_name, company, content, rating, is_active, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const t of TESTIMONIALS) {
  stmt.run(t.client_name, t.company, t.content, t.rating, t.is_active, NOW);
}

console.log("✅ Seeded 5 modern cleaning testimonials into sabaik.db!");
