import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(process.cwd(), "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const dbPath = join(process.cwd(), "data", "sabaik.db");
const db = new Database(dbPath);

const reviewsByService = {
  37: [
    {
      name: "عبدالله الحربي",
      city: "الرياض - حي الملقا",
      rating: 5,
      comment: "طلبت حاوية لمخلفات ترميم البيت، وصلت في نفس اليوم وانحطت بالمكان اللي اتفقنا عليه بالضبط. التعامل واضح والسعر مثل الاتفاق.",
      date: "2026-08-04T09:20:00.000Z",
    },
    {
      name: "نورة العتيبي",
      city: "الرياض - حي النرجس",
      rating: 5,
      comment: "الحاوية كانت نظيفة ومناسبة لكمية المخلفات، والتنسيق مع السائق سريع ومحترم. تجربة مريحة وما احتجت أتابع أكثر من مرة.",
      date: "2026-08-08T12:10:00.000Z",
    },
    {
      name: "محمد بن سالم",
      city: "الرياض - حي العارض",
      rating: 4,
      comment: "اخترنا الحاوية الكبيرة لمشروع هدم، ووصلت بوقت ممتاز. الملاحظة الوحيدة إننا احتجنا نوضح موقع الوقوف أكثر، وبعدها تمت الأمور بسلاسة.",
      date: "2026-08-12T15:40:00.000Z",
    },
    {
      name: "سارة القحطاني",
      city: "الرياض - حي الياسمين",
      rating: 5,
      comment: "فريق المبيعات ساعدني أختار المقاس المناسب بدل ما أدفع على حجم أكبر. الحاوية انرفعت في الموعد والموقع تُرك مرتب.",
      date: "2026-08-16T10:05:00.000Z",
    },
    {
      name: "تركي الدوسري",
      city: "الرياض - حي الربيع",
      rating: 5,
      comment: "خدمة سريعة وملتزمين بالموعد. استأجرت حاوية للأنقاض أكثر من مرة في المشروع وكل رد كان منظم، أنصح فيهم للمقاولين وأصحاب الترميم.",
      date: "2026-08-20T08:35:00.000Z",
    },
  ],
  38: [
    {
      name: "فهد المطيري",
      city: "الرياض - حي الصحافة",
      rating: 5,
      comment: "احتجنا نقل أنقاض بعد إزالة مطبخ ودورات مياه، والعمال رفعوا المخلفات من داخل الموقع بسرعة وبدون فوضى. شغل مرتب من البداية للنهاية.",
      date: "2026-08-05T11:25:00.000Z",
    },
    {
      name: "ريم الشمري",
      city: "الرياض - حي قرطبة",
      rating: 5,
      comment: "التنسيق كان ممتاز، حضروا في الموعد وخلصوا تحميل الأنقاض بدون ما يضرون المدخل أو الرصيف. التواصل معهم واضح وسهل.",
      date: "2026-08-09T14:50:00.000Z",
    },
    {
      name: "خالد الزهراني",
      city: "الرياض - حي حطين",
      rating: 4,
      comment: "طلبنا رفع مخلفات هدم من فيلا، ووصلت المعدات مناسبة لكمية العمل. الإنجاز ممتاز، فقط احتجنا نمدد وقت التحميل قليلاً بسبب ضيق المدخل.",
      date: "2026-08-13T09:15:00.000Z",
    },
    {
      name: "أبو راكان",
      city: "الرياض - حي السويدي",
      rating: 5,
      comment: "ما قصروا معنا في رفع ونقل الردميات. السائق متعاون والفريق نظف مكان التجميع بعد التحميل، وهذا الشيء فرق معنا كثير.",
      date: "2026-08-17T16:30:00.000Z",
    },
    {
      name: "مشعل العبدالله",
      city: "الرياض - حي الرمال",
      rating: 5,
      comment: "نقل الأنقاض تم بنفس اليوم وبسرعة ممتازة. أعطيتهم الموقع بالواتساب ووصلوا بدون تأخير، والتسعير كان واضح من أول اتصال.",
      date: "2026-08-21T13:05:00.000Z",
    },
  ],
  42: [
    {
      name: "Al Manar Industrial Supplies",
      city: "Second Industrial City, Riyadh",
      rating: 5,
      comment: "We needed scheduled debris removal during a warehouse fit-out. The team kept every pickup on time, shared clear updates, and left the loading area ready for the next shift.",
      date: "2026-08-03T07:45:00.000Z",
    },
    {
      name: "شركة مدار للمقاولات",
      city: "الرياض - حي المونسية",
      rating: 5,
      comment: "اعتمدنا عليهم في مشروعين متزامنين، وكان التنسيق بين المواقع ممتاز. الردود والفواتير واضحة، والاستجابة لأي طلب سحب إضافي سريعة.",
      date: "2026-08-07T10:30:00.000Z",
    },
    {
      name: "Riyadh Food Manufacturing Co.",
      city: "Riyadh Industrial Area",
      rating: 4,
      comment: "Their service works well for a busy production site. Collections were reliable and the drivers followed our access and safety instructions. We would like more flexible weekend slots.",
      date: "2026-08-11T12:00:00.000Z",
    },
    {
      name: "مصنع الوفاء للبلاستيك",
      city: "المدينة الصناعية الثانية - الرياض",
      rating: 5,
      comment: "خدمة مناسبة للمصانع والورش، خصوصاً في المشاريع اللي فيها حركة يومية. تم تحديد جدول الرفع بوضوح والتزموا فيه مع سرعة في التواصل.",
      date: "2026-08-15T08:55:00.000Z",
    },
    {
      name: "North Gate Warehousing",
      city: "Al Sulay, Riyadh",
      rating: 5,
      comment: "Clean, professional coordination for our warehouse waste movements. The operations team understood our delivery windows and handled the recurring pickups without disruption.",
      date: "2026-08-22T11:40:00.000Z",
    },
  ],
};

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL REFERENCES services(id),
    customer_name TEXT NOT NULL,
    customer_city TEXT DEFAULT 'الرياض',
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    approved_at TEXT
  )
`);

const insert = db.prepare(`
  INSERT INTO reviews
    (service_id, customer_name, customer_city, rating, comment, status, created_at, approved_at)
  VALUES (?, ?, ?, ?, ?, 'approved', ?, ?)
`);
const exists = db.prepare(`
  SELECT id FROM reviews
  WHERE service_id = ? AND customer_name = ? AND comment = ?
  LIMIT 1
`);

const seed = db.transaction(() => {
  let inserted = 0;
  for (const [serviceId, reviews] of Object.entries(reviewsByService)) {
    for (const review of reviews) {
      if (exists.get(Number(serviceId), review.name, review.comment)) continue;
      insert.run(
        Number(serviceId),
        review.name,
        review.city,
        review.rating,
        review.comment,
        review.date,
        review.date,
      );
      inserted++;
    }
  }
  return inserted;
});

console.log(`✅ Added ${seed()} approved reviews without removing existing reviews`);
db.close();