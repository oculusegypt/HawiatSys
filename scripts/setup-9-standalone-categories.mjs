import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(import.meta.url);
const DB = require("better-sqlite3");
const db = new DB(join(ROOT, "data/sabaik.db"));

console.log("🔄 Seeding 9 Standalone Cleaning Categories & Packages into sabaik.db...");

// 1. Clear old containers table & re-seed 9 standalone packages
db.prepare("DELETE FROM containers").run();

const STANDALONE_PACKAGES = [
  {
    id: 1,
    name: "باقة تنظيف الشقق السكنية",
    category: "apartments",
    size: "شقة حتى 200 م²",
    capacity: "غرف، صالون، مطبخ، حمامات",
    description: "تنظيف شامل وعميق وتطهير كامل لكافة أرجاء الشقة بما يشمل النوافذ، الأبواب، الأرضيات، المطابخ، والحمامات.",
    suitable_for: "الشقق والمنازل بالرياض",
    price_text: "350 ريال / للشقة",
    price_note: "يشمل التطهير وتلميع السيراميك والنوافذ",
    image_url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=800",
    features: JSON.stringify(["غسيل وتلميع الأرضيات والسيراميك", "تطهير وتعقيم الحمامات والمطابخ", "تنظيف مجارير وإطارات النوافذ الألمنيوم", "إزالة البقع والأتربة والتلميع الكامل"]),
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    order: 1,
    is_active: 1
  },
  {
    id: 2,
    name: "باقة تنظيف الفلل السكنية",
    category: "villas",
    size: "فيلا كاملة (جميع الأدوار)",
    capacity: "أدوار، أحواش، ملحقات، درج",
    description: "تنظيف عميق وشامل لجميع أدوار الفيلا، الأجنحة، الصالونات، الأحواش الخارجية، الدرج، والأسوار.",
    suitable_for: "الفلل والبيوت بالرياض",
    price_text: "750 ريال / للفيلا",
    price_note: "يشمل شطف الأحواش وجلي الدرج والواجهات",
    image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
    features: JSON.stringify(["تنظيف وشطف أدوار الفيلا والملحقات", "جلي وتلميع درج الرخام والأرضيات", "تنظيف وغسيل الأحواش والأسوار بالضغط", "تطهير وتعقيم كامل للحمامات والمطابخ"]),
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    order: 2,
    is_active: 1
  },
  {
    id: 3,
    name: "باقة تنظيف القصور والمجمعات",
    category: "palaces",
    size: "قصر أو مجمع سكني",
    capacity: "أجنحة ملكية، هول، مسابح، حدائق",
    description: "خدمة تنظيف ملكية مخصصة للقصور الفاخرة والمجمعات بمعدات ثقيلة وطاقم عمل متكامل للنتائج المثالية.",
    suitable_for: "القصور والمجمعات السكنية بالرياض",
    price_text: "1500 ريال / للقصر",
    price_note: "تغطية كاملة مع عمالة فنية متخصصة وشاملة",
    image_url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800",
    features: JSON.stringify(["تنظيف عميق للأجنحة الملكية والدهاليز", "تلميع النجف، الثريات، والزجاج المرتفع", "شطف وتطهير المسابح والحدائق والملاحق", "تلميع الرخام الإيطالي والأرضيات الفاخرة"]),
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    order: 3,
    is_active: 1
  },
  {
    id: 4,
    name: "باقة غسيل المجالس بالبخار",
    category: "majlis",
    size: "طقم مجلس + كنب + سجاد",
    capacity: "بخار حراري 140° وتجفيف فوري",
    description: "غسيل وتطهير المجالس، الكنب، والسجاد بالبخار الحراري 140° لإزالة المستعصي من البقع وتجفيف خلال 30 دقيقة.",
    suitable_for: "المجالس والصالونات والسجاد بالرياض",
    price_text: "250 ريال / للمجلس",
    price_note: "إزالة أصعب البقع والروائح مع التعطير",
    image_url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800",
    features: JSON.stringify(["غسيل بالبخار الحراري 140 درجة", "إزالة بقع القهوة والزيوت والأتربة", "شفط وتجفيف فوري في 30 دقيقة فقط", "تعطير وتطهير ضد الجراثيم والبكتيريا"]),
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    order: 4,
    is_active: 1
  },
  {
    id: 5,
    name: "باقة جلي وتلميع الرخام",
    category: "marble",
    size: "رخام / بلاط / سيراميك",
    capacity: "أقراص ألماس + كريستال إيطالي",
    description: "جلي تسوية الفواصل بالألماس وتلميع الرخام بالكريستال الإيطالي لإعادة البريق الزجاجي الناصع للأرضيات.",
    suitable_for: "أرضيات الفلل والمنازل والشركات بالرياض",
    price_text: "15 ريال / م²",
    price_note: "إعادة البريق الزجاجي وتسكير الترويبة",
    image_url: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&q=80&w=800",
    features: JSON.stringify(["جلي الفواصل وإزالة الارتفاعات بالألماس", "تنعيم الرخام بـ 5 درجات إيطالية متدرجة", "تلميع الكريستال الزجاجي الحامي للأرضية", "تعبئة الفواصل بمادة الجولي الإيطالية"]),
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    order: 5,
    is_active: 1
  },
  {
    id: 6,
    name: "باقة تنظيف وتطهير الخزانات",
    category: "tanks",
    size: "خزان أرضي / علوي",
    capacity: "تطهير بالكلور وإزالة الرواسب",
    description: "شفط الرمال والترسبات، غسيل الجدران بالضغط، وتطهير الخزانات بالكلور المعتمد وسد تشققات الترويبة.",
    suitable_for: "خزانات المنازل والمباني بالرياض",
    price_text: "200 ريال / للخزان",
    price_note: "تعقيم صحي معتمد وضمان نقاء المياه",
    image_url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800",
    features: JSON.stringify(["شفط المياه السفلية والرمال المترسبة", "جلي وفرك جدران وأرضية الخزان", "تطهير وتعقيم بالكلور البكتيري المعتمد", "سد فواصل الترويبة لمنع التسرّب"]),
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    order: 6,
    is_active: 1
  },
  {
    id: 7,
    name: "باقة غسيل وتنظيف المكيفات",
    category: "ac",
    size: "سبلت / شباك / مخفي",
    capacity: "ضغط عالي + فحص الفريون",
    description: "غسيل فلاتر ووحدات المكيفات بالضغط العالي بدون فك مع كيس الحماية الشفاف وفحص غاز الفريون.",
    suitable_for: "المكيفات بالشقق والفلل والمكاتب بالرياض",
    price_text: "80 ريال / للمكيف",
    price_note: "استعادة التبريد القوي وتطهير الفلاتر",
    image_url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=800",
    features: JSON.stringify(["غسيل بالضغط العالي بكيس حماية شفاف", "تنظيف وتطهير مجاري وأحواض التكثيف", "رش معقم ومزيل العفن والروائح الكريهة", "فحص غاز الفريون وتأكيد التبريد"]),
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    order: 7,
    is_active: 1
  },
  {
    id: 8,
    name: "باقة مكافحة الحشرات والرش",
    category: "pest",
    size: "شقة / فيلا / منشأة",
    capacity: "جل ألماني + ضمان سنة كاملة",
    description: "رش وإبادة الصراصير، بق الفراش، النمل الأبيض، والقوارض بمبيدات ألمانية آمنة وبدون رائحة مع ضمان سنة.",
    suitable_for: "المنازل والشركات والمطاعم بالرياض",
    price_text: "200 ريال / للعقار",
    price_note: "ضمان كتابي لمدة 12 شهراً ورش مجاني",
    image_url: "https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&q=80&w=800",
    features: JSON.stringify(["إبادة الصراصير والنمل بجل ألماني آمن", "رش مبيدات بق الفراش بدون مغادرة المنزل", "مكافحة النمل الأبيض وقوارض المستودعات", "ضمان رسمي سنة مع رش إعادة مجاني"]),
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    order: 8,
    is_active: 1
  },
  {
    id: 9,
    name: "باقة تنظيف بعد التشطيب والبناء",
    category: "postcon",
    size: "عقار جديد / مبنى تشطيب",
    capacity: "إزالة الإسمنت والدهان والترويبة",
    description: "تنظيف موقع البناء والتشطيب، إزالة الإسمنت والدهانات والترويبة عن البلاط والشبابيك وتسليم المبنى للسكن.",
    suitable_for: "المباني والفلل والمحلات الجديدة بالرياض",
    price_text: "900 ريال / للعقار",
    price_note: "إزالة بقايا الإسمنت والدهان والتلميع الشامل",
    image_url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=800",
    features: JSON.stringify(["إزالة بقايا الإسمنت والدهانات عن السيراميك", "تنظيف وغسيل مجارير وإطارات الألومنيوم", "جلي وتلميع أرضيات العقار الجديد بالكامل", "تسليم العقار ناصع النظافة وجاهزاً للسكن"]),
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    order: 9,
    is_active: 1
  }
];

const insertPkg = db.prepare(`
  INSERT INTO containers (
    id, name, category, size, capacity, description, suitable_for,
    price_text, price_note, image_url, features, contact_phone1, contact_phone2,
    "order", is_active
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?
  )
`);

for (const p of STANDALONE_PACKAGES) {
  insertPkg.run(
    p.id, p.name, p.category, p.size, p.capacity, p.description, p.suitable_for,
    p.price_text, p.price_note, p.image_url, p.features, p.contact_phone1, p.contact_phone2,
    p.order, p.is_active
  );
}

console.log("✅ 9 Standalone Cleaning Packages successfully seeded into sabaik.db!");
db.close();
