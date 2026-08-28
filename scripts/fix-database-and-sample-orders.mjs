import Database from "better-sqlite3";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const db = new Database(join(ROOT, "data/sabaik.db"));

const homepageContent = {
  about: {
    eyebrow: "من نحن",
    title: "شريكك الرائد في",
    highlight: "تأجير الحاويات وإدارة المخلفات",
    description: "مؤسسة تقي جروب خيارك الأمثل في عالم تأجير الحاويات ونقل الأنقاض ومخلفات البناء والهدم والنفايات في مدينة الرياض. نقدم خدماتنا بأسطول حديث ومعايير سلامة بيئية صارمة وسرعة استجابة فائقة.",
    visionTitle: "رؤيتنا",
    visionDescription: "أن نكون المنصة والمؤسسة الأولى المعتمدة في المملكة في تقديم الحلول اللوجستية وتأجير الحاويات وإدارة المخلفات.",
    missionTitle: "رسالتنا",
    missionDescription: "توفير حلول فورية وموثوقة لإزالة ونقل الأنقاض والمخلفات بأعلى كفاءة وأفضل الأسعار لخدمة المقاولين والمطورين والأفراد.",
    points: [
      "أسطول شاحنات وحاويات بمقاسات متنوعة من 6 إلى 30 ياردة",
      "توصيل وسحب سريع خلال 2 إلى 4 ساعات على مدار الساعة",
      "عقود نظافة معتمدة وموثقة لتجديد الرخص التجارية",
      "تغطية شاملة لكافة أحياء ومناطق الرياض وضواحيها",
    ],
    imageUrl: "/images/container-1.webp",
    statValue: "8+",
    statLabel: "سنوات خبرة في تأجير الحاويات ونقل الأنقاض",
  },
  why: {
    titlePrefix: "لماذا تختار",
    titleHighlight: "تقي جروب لتأجير الحاويات بالرياض؟",
    description: "نلتزم بأعلى معايير السرعة والموثوقية والسلامة البيئية، مع توفير حاويات مناسبة لجميع أنواع المشاريع الإنشائية والتجارية.",
    points: [
      "سرعة الاستجابة والتوصيل الفوري 24/7",
      "تنوع مقاسات الحاويات (6، 10، 12، 15، 20، 30 ياردة)",
      "مكابس نفايات كهربائية وهيدروليكية للمنشآت",
      "عقود سنوية ودورية معتمدة من أمانة الرياض",
      "أسعار واضحة وتنافسية بدون أي رسوم خفية",
      "تفريغ قانوني وآمن في المرادم المعتمدة",
      "فريق دعم فني وسائقون محترفون على دراية بأحياء الرياض",
      "خصومات خاصة للمقاولين والمشاريع الكبرى",
    ],
    imageUrl: "/images/Banner-Big.webp",
    badgeValue: "✓",
    badgeTitle: "شريك معتمد وموثوق",
    badgeDescription: "خدمة 24 ساعة بالرياض",
  },
  how: {
    eyebrow: "طريقة العمل",
    title: "اطلب حاويتك في 4 خطوات بسيطة",
    description: "عملية حجز سريعة وسلسة تبدأ بطلبك وتنتهي بتسليم وسحب الحاوية في موعدك المحدد.",
    steps: [
      { number: "01", title: "اختر الحاوية", subtitle: "الحجم والنوع المناسب", description: "استعرض الحاويات المتاحة (أنقاض أو نفايات) واختر المقاس المناسب لمشروعك." },
      { number: "02", title: "حدد الموقع والتفاصيل", subtitle: "بيانات التوصيل", description: "أدخل موقع مشروعك في الرياض ونوع المخلفات والفترة المطلوبة." },
      { number: "03", title: "التوصيل والتفريغ", subtitle: "وصول فوري للموقع", description: "تصلك الحاوية في الوقت المحدد عبر سائقين محترفين وشاحنات مجهزة." },
      { number: "04", title: "السحب أو الاستبدال", subtitle: "إتمام الخدمة", description: "عند امتلاء الحاوية نقوم بسحبها فوراً أو استبدالها لمواصلة العمل دون انقطاع." },
    ],
    ctaText: "اطلب حاويتك الآن",
    footnote: "نصلك في جميع أحياء الرياض وضواحيها خلال وقت قياسي.",
  },
  areas: {
    eyebrow: "نطاق التغطية",
    title: "خدمات تأجير الحاويات في",
    highlight: "جميع أحياء الرياض",
    description: "أسطولنا الميداني يغطي كافة مناطق وأحياء الرياض وضواحيها مع سرعة وصول فائقة.",
    items: [
      { slug: "north-riyadh", name: "شمال الرياض", description: "الملقا، النرجس، الياسمين، الصحافة، حطين، العارض، القيروان." },
      { slug: "east-riyadh", name: "شرق الرياض", description: "الروضة، النسيم، المونسية، الرمال، القادسية، قرطبة، اليرموك." },
      { slug: "west-riyadh", name: "غرب الرياض", description: "لبن، طويق، ظهرة لبن، السويدي، العريجاء، البديعة." },
      { slug: "south-riyadh", name: "جنوب الرياض", description: "الشفا، بدر، العزيزية، الدار البيضاء، المصانع، نمار." },
      { slug: "central-riyadh", name: "وسط الرياض", description: "الملز، البطحاء، المربع، العليا، السليمانية، الديرة." },
      { slug: "al-diriyah", name: "الدرعية والضواحي", description: "الدرعية، العمارية، صلبوخ، والمناطق المجاورة." }
    ],
    missingText: "هل موقعك خارج هذه القوائم؟",
    phonePrefix: "اتصل بنا مباشرة على",
    phoneSuffix: "لتأكيد التوصيل لموقعك فوراً.",
  },
  sections: {
    services: {
      eyebrow: "خدماتنا المتميزة",
      title: "خدمات متكاملة في",
      highlight: "إدارة الحاويات ونقل الأنقاض",
      description: "حلول متطورة لنقل مخلفات البناء والهدم، ردم وتسوية الأراضي، وتأجير الحاويات للمنشآت.",
      detailsLabel: "تفاصيل الخدمة",
    },
    packages: {
      title: "حاويات",
      highlight: "حاويات تقي جروب المتاحة",
      description: "اختر الحجم والفئة المناسبة لاحتياجات مشروعك (أنقاض، نفايات، عقود نظافة ومكابس).",
    },
    values: {
      title: "قيمنا وركائزنا",
      description: "مبادئنا الثابتة في الالتزام بالمواعيد والجودة والامتثال لمعايير السلامة والبيئة.",
    },
    testimonials: {
      title: "آراء وتقييمات العملاء",
      description: "ثقة كبرى شركات المقاولات وأصحاب المشاريع والمنشآت في خدماتنا.",
    },
    blog: {
      eyebrow: "المدونة المعرفية",
      title: "دليل ومقالات تأجير الحاويات",
      description: "إرشادات عملية ونصائح لاختيار الحجم الأمثل وأحدث أسعار الحاويات في الرياض.",
      allArticles: "استعراض جميع المقالات",
    },
    contact: {
      title: "هل لديك استفسار حول تأجير الحاويات أو الأسعار؟",
      description: "فريق عمليات مؤسسة تقي جروب جاهز للرد الفوري وتأكيد الحجز وتوصيل الحاوية لموقعك.",
      whatsappText: "تواصل عبر واتساب",
      callText: "اتصال مباشر",
    },
  },
};

const upsertSetting = db.prepare(`
  INSERT INTO site_settings (key, value, updated_at)
  VALUES (?, ?, datetime('now'))
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
`);

db.transaction(() => {
  upsertSetting.run("homepage_content", JSON.stringify(homepageContent));
  upsertSetting.run("sections_hidden", "[]");
  upsertSetting.run("sections_order", JSON.stringify([
    "hero",
    "packages",
    "services",
    "stats",
    "about",
    "ceo",
    "how_it_works",
    "why_choose_us",
    "areas",
    "values",
    "testimonials",
    "partners",
    "blog",
    "service_request",
    "contact"
  ]));

  // Clear old cleaning requests and insert new container requests
  db.exec("DELETE FROM service_requests");

  const insertReq = db.prepare(`
    INSERT INTO service_requests (
      id, client_name, phone, email, service_type, container_size,
      location, notes, appointment_type, scheduled_at, status,
      acquisition_source, created_at, updated_at
    ) VALUES (
      @id, @clientName, @phone, @email, @serviceType, @containerSize,
      @location, @notes, @appointmentType, @scheduledAt, @status,
      @acquisitionSource, datetime('now', @createdOffset), datetime('now')
    )
  `);

  const sampleRequests = [
    {
      id: 85,
      clientName: "سلطان فهد القحطاني",
      phone: "0501234567",
      email: "sultan.qa@gmail.com",
      serviceType: "حاويات الأنقاض",
      containerSize: "حاوية أنقاض كبيرة (20 ياردة)",
      location: "حي الملقا، طريق أنس بن مالك، شمال الرياض",
      notes: "مشروع بناء فيلا سكنية، نحتاج الحاوية لمدة 10 أيام",
      appointmentType: "immediate",
      scheduledAt: null,
      status: "new",
      acquisitionSource: "Google Search",
      createdOffset: "-1 day",
    },
    {
      id: 86,
      clientName: "د. خالد عبد الرحمن المطيري",
      phone: "0559876543",
      email: "dr.khaled@outlook.com",
      serviceType: "حاويات الأنقاض",
      containerSize: "حاوية أنقاض صغيرة (12 ياردة)",
      location: "حي الياسمين، شمال الرياض",
      notes: "أعمال ترميم وتعديل شقة سكنية",
      appointmentType: "scheduled",
      scheduledAt: "2026-08-19T09:00:00Z",
      status: "in_progress",
      acquisitionSource: "WhatsApp",
      createdOffset: "-2 days",
    },
    {
      id: 87,
      clientName: "شركة ريادة الأعمال للمقاولات",
      phone: "0543219876",
      email: "contact@reyada-tech.sa",
      serviceType: "حاويات الأنقاض",
      containerSize: "حاوية أنقاض جامبو (30 ياردة)",
      location: "حي النرجس، تقاطع طريق الملك سلمان، الرياض",
      notes: "مشروع هدم مجمع تجاري وإزالة خرسانات مسلحة",
      appointmentType: "immediate",
      scheduledAt: null,
      status: "new",
      acquisitionSource: "Direct Call",
      createdOffset: "-3 hours",
    },
    {
      id: 88,
      clientName: "أحمد بن عبد الله السبيعي",
      phone: "0567891234",
      email: "ahmed.subaie@hotmail.com",
      serviceType: "عقود النظافة",
      containerSize: "عقد نظافة إلكتروني بلدي",
      location: "حي اليرموك، طريق الإمام عبد الله، شرق الرياض",
      notes: "طلب إصدار عقد نظافة معتمد لتجديد رخصة مطعم",
      appointmentType: "immediate",
      scheduledAt: null,
      status: "completed",
      acquisitionSource: "Google Search",
      createdOffset: "-3 days",
    },
    {
      id: 89,
      clientName: "سارة محمد الدوسري",
      phone: "0531122334",
      email: "sara.aldosari@gmail.com",
      serviceType: "حاويات النفايات",
      containerSize: "حاوية نفايات تجارية (10 ياردة)",
      location: "حي حطين، الرياض",
      notes: "حاوية دورية لمجمع تجاري",
      appointmentType: "scheduled",
      scheduledAt: "2026-08-20T14:00:00Z",
      status: "cancelled",
      acquisitionSource: "Referral",
      createdOffset: "-4 days",
    },
    {
      id: 90,
      clientName: "فهد عبد العزيز الشمري",
      phone: "0598877665",
      email: "fahad.shammari@yahoo.com",
      serviceType: "مكابس النفايات",
      containerSize: "مكبس نفايات كهربائي هيدروليكي (2 ياردة)",
      location: "طريق الملك فهد، حي الصحافة، الرياض",
      notes: "عقد توريد وصيانة مكبس نفايات لمركز تجاري",
      appointmentType: "scheduled",
      scheduledAt: "2026-08-21T10:00:00Z",
      status: "in_progress",
      acquisitionSource: "Google Search",
      createdOffset: "-5 days",
    },
  ];

  for (const req of sampleRequests) {
    insertReq.run(req);
  }

  console.log("✓ Updated site settings and 6 container rental sample requests.");
})();

db.close();
