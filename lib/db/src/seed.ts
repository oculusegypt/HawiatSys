/**
 * Seed the SQLite database with initial data for the configured company.
 * Run with: pnpm --filter @workspace/db run seed
 */
import { db } from "./index";
import {
  heroSlidesTable,
  servicesTable,
  containersTable,
  companyValuesTable,
  testimonialsTable,
  partnersTable,
  notificationsTable,
  adminsTable,
} from "./schema";
import { serviceRequestsTable } from "./schema/serviceRequests.js";
import { conversationsTable, messagesTable } from "./schema/conversations.js";
import * as crypto from "crypto";

const SITE_NAME = process.env.SITE_NAME?.trim() || "الشركة";
const PASSWORD_SALT = "cleanflow-password-salt";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + PASSWORD_SALT).digest("hex");
}

function seedAll() {
  // --- Wipe existing data (in dependency order) ---
  db.delete(notificationsTable).run();
  db.delete(messagesTable).run();
  db.delete(conversationsTable).run();
  db.delete(serviceRequestsTable).run();
  db.delete(partnersTable).run();
  db.delete(testimonialsTable).run();
  db.delete(companyValuesTable).run();
  db.delete(containersTable).run();
  db.delete(servicesTable).run();
  db.delete(heroSlidesTable).run();
  db.delete(adminsTable).run();

  // --- Admin User ---
  db.insert(adminsTable).values({
    username: "admin",
    passwordHash: hashPassword("taqi2024"),
    name: "مدير النظام",
  }).run();

  // --- Hero Slides (تأجير الحاويات ونقل المخلفات بالرياض) ---
  const now = new Date().toISOString();
  const slides = [
    {
      title: `${SITE_NAME} لتأجير الحاويات ونقل المخلفات بالرياض`,
      subtitle: "حاويات أنقاض ونفايات بأحجام مختلفة مع توصيل وسحب منسق للمشاريع والمنشآت في الرياض",
      imageUrl: "/images/Taqi-hero1.webp",
      ctaText: "اطلب خدمتك الآن",
      order: 0,
      isActive: true,
      createdAt: now,
    },
    {
      title: "حاويات مخلفات البناء بالرياض",
      subtitle: "توصيل الحاوية المناسبة لموقعك واستبدالها أو سحبها عند الامتلاء دون تعطيل سير العمل",
      imageUrl: "/images/Taqi-hero2.webp",
      ctaText: "اطلب الحاوية",
      order: 1,
      isActive: true,
      createdAt: now,
    },
    {
      title: "نقل الأنقاض والمخلفات بالرياض",
      subtitle: "رفع مخلفات الترميم والهدم من الموقع ونقلها بطريقة منظمة مع متابعة حالة الطلب",
      imageUrl: "/images/Taqi-hero3.webp",
      ctaText: "تواصل معنا",
      order: 2,
      isActive: true,
      createdAt: now,
    },
    {
      title: "حلول إدارة المخلفات للمشاريع والمنشآت",
      subtitle: "توريد منتظم وعقود مرنة للمقاولين والمطورين والمطاعم والمستودعات في جميع أحياء الرياض",
      imageUrl: "/images/Taqi-hero4.webp",
      ctaText: "استكشف حلولنا",
      order: 3,
      isActive: true,
      createdAt: now,
    },
  ];
  db.insert(heroSlidesTable).values(slides).run();

  // --- Services (الحاويات ونقل المخلفات بالرياض) ---
  const services = [
    {
      title: "تأجير حاويات مخلفات البناء بالرياض",
      description: "حاويات متعددة الأحجام لمخلفات الهدم والترميم مع توصيل وسحب منسق حسب احتياج الموقع.",
      icon: "Box",
      imageUrl: "/images/container-debris-small.webp",
      order: 0,
      isActive: true,
    },
    {
      title: "نقل الأنقاض ومخلفات الترميم",
      description: "رفع ونقل الأنقاض والمخلفات من مواقع البناء والترميم مع تنسيق الموعد ومتابعة التنفيذ.",
      icon: "Truck",
      imageUrl: "/images/container-debris-jumbo.webp",
      order: 1,
      isActive: true,
    },
    {
      title: "حاويات للمقاولين والشركات",
      description: "توريد منتظم وعقود أسبوعية أو شهرية للمشاريع والمجمعات والمستودعات والمنشآت التجارية.",
      icon: "Building",
      imageUrl: "/images/container-debris-large.webp",
      order: 2,
      isActive: true,
    },
    {
      title: "حاويات النفايات للمنشآت",
      description: "حاويات مناسبة للمطاعم والمصانع والمستودعات مع خدمة تبديل وسحب حسب جدول المنشأة.",
      icon: "Layers",
      imageUrl: "/images/container-waste-small.webp",
      order: 3,
      isActive: true,
    },
    {
      title: "رفع المخلفات من المواقع",
      description: "تنسيق رفع الحاوية الممتلئة ونقل محتوياتها من موقع العميل مع تقليل التعطيل على فريق العمل.",
      icon: "Shield",
      imageUrl: "/images/container-waste-medium.webp",
      order: 4,
      isActive: true,
    },
    {
      title: "حلول إدارة النفايات",
      description: "حلول عملية لإدارة الحاويات والنفايات في المواقع السكنية والتجارية والصناعية داخل الرياض.",
      icon: "Zap",
      imageUrl: "/images/container-compactor-electric.webp",
      order: 5,
      isActive: true,
    },
    {
      title: "إصدار شهادة سلامة للمنشآت",
      description: "تجهيز ملف المنشأة والمعاينة الفنية وإعداد متطلبات شهادة السلامة وفق حالة الموقع والاشتراطات المعمول بها، مع متابعة الملاحظات حتى اكتمال الملف.",
      icon: "ShieldCheck",
      imageUrl: "/images/service-facilities.jpg",
      order: 6,
      isActive: true,
      seoEnabled: true,
      seoTitle: "شهادة سلامة للمنشآت بالرياض | تجهيز ملف السلامة",
      seoDescription: "خدمة تجهيز شهادة سلامة للمنشآت بالرياض مع معاينة الموقع وتجميع بيانات أنظمة الوقاية ومتابعة الملاحظات الفنية.",
      seoKeywords: "شهادة سلامة بالرياض, استخراج شهادة سلامة, شهادة سلامة منشأة, دفاع مدني",
      seoSlug: "shahadat-salama-riyadh",
    },
    {
      title: "تركيب أدوات الوقاية والحماية من الحريق",
      description: "توريد وتركيب وتجهيز أدوات وأنظمة الوقاية والحماية من الحريق حسب طبيعة المنشأة، مع اختبار مبدئي وتسليم تقرير فني بالأعمال المنفذة.",
      icon: "Flame",
      imageUrl: "/images/service-facilities.jpg",
      order: 7,
      isActive: true,
      seoEnabled: true,
      seoTitle: "تركيب أدوات الوقاية والحماية من الحريق بالرياض",
      seoDescription: "تركيب وتجهيز طفايات الحريق والإنذار والإضاءة ومخارج الطوارئ في الرياض بعد معاينة المنشأة وتحديد الاحتياج.",
      seoKeywords: "تركيب أدوات الحماية من الحريق بالرياض, أنظمة إنذار الحريق, طفايات حريق",
      seoSlug: "tarkeeb-anthimat-wiqaya-hareeq-riyadh",
    },
    {
      title: "إعداد تقرير فني فوري",
      description: "معاينة ميدانية عاجلة وإعداد تقرير فني أولي عن حالة الموقع وأنظمة السلامة والملاحظات التي تحتاج إلى معالجة، حسب نطاق الطلب.",
      icon: "ClipboardCheck",
      imageUrl: "/images/service-facilities.jpg",
      order: 8,
      isActive: true,
      seoEnabled: true,
      seoTitle: "تقرير فني فوري بالرياض | معاينة عاجلة للمنشآت",
      seoDescription: "طلب تقرير فني فوري بالرياض لمعاينة المنشأة وتوثيق حالة أنظمة السلامة والملاحظات المطلوبة بشكل منظم.",
      seoKeywords: "تقرير فني فوري بالرياض, معاينة سلامة منشأة, تقرير دفاع مدني",
      seoSlug: "taqreer-fanni-fawri-riyadh",
    },
    {
      title: "إعداد تقرير فني غير فوري",
      description: "إعداد تقرير فني مجدول بعد دراسة بيانات المنشأة ومخططاتها ونطاق الملاحظات المطلوبة، مع تنسيق موعد المعاينة وتسليم التقرير.",
      icon: "FileText",
      imageUrl: "/images/service-facilities.jpg",
      order: 9,
      isActive: true,
      seoEnabled: true,
      seoTitle: "تقرير فني غير فوري بالرياض | تقرير سلامة مجدول",
      seoDescription: "تقرير فني غير فوري للمنشآت بالرياض بعد مراجعة البيانات والمخططات وتحديد موعد المعاينة والتسليم.",
      seoKeywords: "تقرير فني بالرياض, تقرير سلامة منشأة, تقرير فني دفاع مدني",
      seoSlug: "taqreer-fanni-ghayr-fawri-riyadh",
    },
    {
      title: "عقد صيانة أنظمة السلامة مع تفعيل دفاع مدني",
      description: "عقود صيانة دورية لأنظمة الوقاية والحماية من الحريق مع متابعة الزيارات والتقارير وطلب تفعيل خدمة دفاع مدني حسب أهلية المنشأة والإجراءات الرسمية.",
      icon: "Wrench",
      imageUrl: "/images/service-facilities.jpg",
      order: 10,
      isActive: true,
      seoEnabled: true,
      seoTitle: "عقد صيانة أنظمة السلامة بالرياض | تفعيل دفاع مدني",
      seoDescription: "عقد صيانة لأنظمة السلامة والحماية من الحريق بالرياض مع زيارات دورية وتقارير ومتابعة تفعيل دفاع مدني حسب حالة المنشأة.",
      seoKeywords: "عقد صيانة دفاع مدني بالرياض, صيانة أنظمة الحريق, تفعيل دفاع مدني",
      seoSlug: "aqd-siyana-difaa-madani-riyadh",
    },
  ];
  db.insert(servicesTable).values(services).run();

  // --- Containers / Packages (حاويات المخلفات بالرياض) ---
  const containers = [
    {
      name: "حاوية مخلفات صغيرة",
      size: "6 ياردة",
      capacity: "مناسبة للترميمات والمواقع الصغيرة",
      description: "حاوية عملية لمخلفات الترميم والهدم الخفيف مع توصيل وسحب حسب الموعد.",
      features: ["توصيل للموقع", "سحب عند الامتلاء", "مناسبة للممرات الضيقة", "تنسيق موعد واضح"],
      pricePerDay: 0,
      imageUrl: "/images/container-debris-small.webp",
      order: 0,
      isActive: true,
    },
    {
      name: "حاوية مخلفات متوسطة",
      size: "12 ياردة",
      capacity: "مناسبة لمواقع البناء والترميم المتوسطة",
      description: "حاوية متوسطة للمخلفات الإنشائية مع إمكانية التبديل والاستمرار في العمل.",
      features: ["سعة مناسبة للمشاريع المتوسطة", "توصيل وسحب منسق", "تبديل عند الامتلاء", "عرض سعر حسب المدة"],
      pricePerDay: 0,
      imageUrl: "/images/container-debris-medium.webp",
      order: 1,
      isActive: true,
    },
    {
      name: "حاوية مخلفات كبيرة",
      size: "20 ياردة",
      capacity: "مناسبة للمشاريع ومواقع الهدم الكبيرة",
      description: "حاوية كبيرة لمخلفات الهدم والبناء مع خطة توريد واستبدال للمشاريع الممتدة.",
      features: ["سعة كبيرة للمخلفات", "خطة توريد منتظمة", "استبدال حسب الحاجة", "تنسيق مع مسؤول الموقع"],
      pricePerDay: 0,
      imageUrl: "/images/container-debris-large.webp",
      order: 2,
      isActive: true,
    },
    {
      name: "حاوية نفايات للمنشآت",
      size: "حاوية نفايات",
      capacity: "للمطاعم والمصانع والمستودعات",
      description: "حاوية للنفايات العامة مع خدمة تبديل وسحب وفق جدول المنشأة.",
      features: ["جدول سحب مرن", "مناسبة للمنشآت", "تبديل دوري", "تنسيق مباشر مع الموقع"],
      pricePerDay: 0,
      imageUrl: "/images/container-waste-medium.webp",
      order: 3,
      isActive: true,
    },
    {
      name: "باقة شهادة السلامة وتجهيز ملف المنشأة",
      category: "fire_safety",
      size: "منشآت تجارية وسكنية",
      capacity: "معاينة + تجهيز بيانات السلامة + متابعة الملاحظات",
      description: "باقة عملية لتجهيز ملف السلامة للمنشأة، تبدأ بجمع بيانات الموقع وأنظمة الوقاية وتنتهي بملف مرتب قابل للمراجعة والمتابعة.",
      features: ["جمع بيانات المنشأة", "معاينة مبدئية", "حصر أنظمة الوقاية", "تنظيم الملاحظات والمتابعة"],
      suitableFor: "المحلات والمكاتب والمطاعم والعمائر والمنشآت بالرياض",
      priceText: "طلب عرض سعر بعد المعاينة",
      pricePerDay: 0,
      imageUrl: "/images/service-facilities.jpg",
      order: 4,
      isActive: true,
    },
    {
      name: "باقة تركيب وتجهيز أنظمة الحماية من الحريق",
      category: "fire_safety",
      size: "طفايات + إنذار + مخارج طوارئ",
      capacity: "تحديد الاحتياج والتركيب والاختبار المبدئي",
      description: "تجهيز وتركيب أدوات الوقاية والحماية من الحريق حسب نشاط ومساحة المنشأة، مع حصر الأعمال وتقرير التسليم.",
      features: ["حصر الاحتياج بالموقع", "تركيب الأدوات والأنظمة", "اختبار مبدئي", "تقرير بالأعمال المنفذة"],
      suitableFor: "المنشآت الجديدة والمواقع التي تحتاج استكمال أنظمة السلامة",
      priceText: "عرض فني حسب الموقع",
      pricePerDay: 0,
      imageUrl: "/images/service-facilities.jpg",
      order: 5,
      isActive: true,
    },
    {
      name: "باقة التقرير الفني الفوري",
      category: "fire_safety",
      size: "معاينة عاجلة",
      capacity: "تحديد موعد قريب + رصد الملاحظات الفنية",
      description: "طلب معاينة عاجلة لإعداد تقرير فني منظم يوضح حالة المنشأة ونطاق الأعمال المقترحة دون اعتباره اعتماداً حكومياً.",
      features: ["موعد معاينة قريب", "رصد حالة الأنظمة", "تحديد الملاحظات", "تقرير فني منظم"],
      suitableFor: "المنشآت التي تحتاج تقريراً سريعاً قبل إجراء أو موعد",
      priceText: "طلب عرض سعر فوري",
      pricePerDay: 0,
      imageUrl: "/images/service-facilities.jpg",
      order: 6,
      isActive: true,
    },
    {
      name: "باقة التقرير الفني غير الفوري",
      category: "fire_safety",
      size: "تقرير مجدول",
      capacity: "مراجعة البيانات + معاينة + تسليم تقرير",
      description: "تقرير فني مجدول للمنشآت التي تحتاج دراسة هادئة للمخططات والبيانات ونطاق الملاحظات قبل التسليم.",
      features: ["مراجعة بيانات المنشأة", "معاينة مجدولة", "دراسة نطاق التقرير", "تسليم منظم"],
      suitableFor: "الشركات والمجمعات والمشاريع التي لديها موعد مخطط",
      priceText: "عرض سعر حسب نطاق التقرير",
      pricePerDay: 0,
      imageUrl: "/images/service-facilities.jpg",
      order: 7,
      isActive: true,
    },
    {
      name: "باقة عقد صيانة السلامة وتفعيل دفاع مدني",
      category: "fire_safety",
      size: "شهري / ربع سنوي / سنوي",
      capacity: "زيارات دورية + تقارير + بلاغات طوارئ",
      description: "خطة صيانة دورية لأنظمة السلامة مع متابعة التقارير وطلب تفعيل دفاع مدني وفق أهلية المنشأة والإجراءات الرسمية.",
      features: ["زيارات دورية", "تقارير صيانة", "استجابة للأعطال", "متابعة طلب التفعيل"],
      suitableFor: "المكاتب والمطاعم والمجمعات والمدارس والمنشآت التجارية",
      priceText: "عرض عقد بعد المعاينة",
      pricePerDay: 0,
      imageUrl: "/images/service-facilities.jpg",
      order: 8,
      isActive: true,
    },
  ];
  db.insert(containersTable).values(containers.map((container, index) => ({
    ...container,
    seoEnabled: true,
    seoTitle: container.name,
    seoDescription: container.description,
    seoKeywords: container.name,
    seoSlug: `package-${index + 1}`,
  }))).run();

  // --- Company Values ---
  const values = [
    {
      title: "الثقة والأمان",
      description: "نعمل وفق أعلى معايير المصداقية والالتزام لضمان راحة عملائنا في جميع مراحل الخدمة.",
      icon: "Shield",
      order: 0,
    },
    {
      title: "السرعة والدقة",
      description: "نؤمن بأن الوقت عنصر أساسي في نجاح المشاريع، لذلك نحرص على سرعة التنفيذ ودقة الأداء.",
      icon: "Zap",
      order: 1,
    },
    {
      title: "الجودة العالية",
      description: "نستخدم أفضل المعدات والحاويات لضمان تقديم خدمة احترافية تلبي أعلى التوقعات.",
      icon: "Star",
      order: 2,
    },
    {
      title: "الاستدامة البيئية",
      description: "نسهم في المحافظة على البيئة والحد من آثار التلوث من خلال حلول متطورة وصديقة للبيئة.",
      icon: "Leaf",
      order: 3,
    },
    {
      title: "خدمة ما بعد التعاقد",
      description: "علاقتنا مع العميل لا تنتهي بانتهاء الخدمة، بل تمتد لتوفير الدعم والمتابعة المستمرة.",
      icon: "Heart",
      order: 4,
    },
  ];
  db.insert(companyValuesTable).values(values).run();

  // --- Testimonials ---
  const testimonials = [
    {
      clientName: "المهندس أحمد الشمري",
      company: "شركة الشمري للمقاولات",
      content: "خدمة ممتازة وسريعة، التزموا بالموعد المحدد وكانت الحاويات نظيفة وجاهزة. سنتعامل معهم مجدداً في مشاريعنا القادمة.",
      rating: 5,
      avatarUrl: null,
      isActive: true,
      createdAt: now,
    },
    {
      clientName: "عبدالله العتيبي",
      company: "مشروع تجاري شخصي",
      content: "استأجرت حاوية لمشروع ترميم منزلي، وكانت التجربة رائعة. الفريق محترف والأسعار معقولة جداً مقارنة بالمنافسين.",
      rating: 5,
      avatarUrl: null,
      isActive: true,
      createdAt: now,
    },
    {
      clientName: "م. سارة القحطاني",
      company: "مكتب هندسي",
      content: `نتعامل مع ${SITE_NAME} منذ سنتين لجميع مشاريعنا الهندسية. خدمة لا تقبل المقارنة ودائماً في الموعد المحدد.`,
      rating: 5,
      avatarUrl: null,
      isActive: true,
      createdAt: now,
    },
    {
      clientName: "خالد الدوسري",
      company: "مقاولات الدوسري",
      content: `تعاملت مع شركات عديدة لكن ${SITE_NAME} الأفضل على الإطلاق. سرعة في الاستجابة وجودة في الخدمة ومرونة في التعامل.`,
      rating: 5,
      avatarUrl: null,
      isActive: true,
      createdAt: now,
    },
    {
      clientName: "فهد المالكي",
      company: "مجموعة المالكي العقارية",
      content: `نثق في ${SITE_NAME} لجميع مشاريعنا العقارية. حاويات متنوعة وأسطول حديث وخدمة 24 ساعة. شركاء موثوقون حقاً.`,
      rating: 5,
      avatarUrl: null,
      isActive: true,
      createdAt: now,
    },
  ];
  db.insert(testimonialsTable).values(testimonials).run();

  // --- Partners (شركاء النجاح) ---
  const partners = [
    {
      name: "شريك النجاح 1",
      logoUrl: "/images/partner-1.jpg",
      websiteUrl: null,
      order: 0,
      isActive: true,
    },
    {
      name: "شريك النجاح 2",
      logoUrl: "/images/partner-2.jpg",
      websiteUrl: null,
      order: 1,
      isActive: true,
    },
    {
      name: "شريك النجاح 3",
      logoUrl: "/images/partner-3.jpg",
      websiteUrl: null,
      order: 2,
      isActive: true,
    },
    {
      name: "شريك النجاح 4",
      logoUrl: "/images/partner-4.jpg",
      websiteUrl: null,
      order: 3,
      isActive: true,
    },
    {
      name: "شريك النجاح 5",
      logoUrl: "/images/partner-5.jpg",
      websiteUrl: null,
      order: 4,
      isActive: true,
    },
    {
      name: "شريك النجاح 6",
      logoUrl: "/images/partner-6.jpg",
      websiteUrl: null,
      order: 5,
      isActive: true,
    },
  ];
  db.insert(partnersTable).values(partners).run();

  // --- Service Requests ---
  const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

  const serviceRequests = [
    { clientName: "أحمد محمد العتيبي", phone: "0501234567", email: "ahmed@example.com", serviceType: "تأجير حاوية", containerSize: "10 أمتار", location: "الرياض - حي النزهة", duration: "أسبوع", notes: "أحتاج الحاوية لنقل أنقاض تجديد منزل", appointmentType: "immediate", scheduledAt: null, status: "completed", adminNotes: "تم التوصيل في الموعد المحدد", createdAt: daysAgo(14), updatedAt: daysAgo(12) },
    { clientName: "سارة عبدالله الزهراني", phone: "0557891234", email: "sara@example.com", serviceType: "نقل أنقاض", containerSize: "20 أمتار", location: "الرياض - حي العليا", duration: "يومان", notes: "موقع بناء جديد، يحتاج إخلاء سريع", appointmentType: "scheduled", scheduledAt: daysAgo(-2), status: "pending", adminNotes: null, createdAt: daysAgo(1), updatedAt: daysAgo(1) },
    { clientName: "فهد سالم الدوسري", phone: "0512345678", email: null, serviceType: "تأجير حاوية", containerSize: "5 أمتار", location: "الرياض - حي الملز", duration: "3 أيام", notes: null, appointmentType: "immediate", scheduledAt: null, status: "in_progress", adminNotes: "الحاوية في الموقع", createdAt: daysAgo(3), updatedAt: daysAgo(1) },
    { clientName: "نورة خالد القحطاني", phone: "0566789012", email: "noura@example.com", serviceType: "نقل أنقاض", containerSize: "15 أمتار", location: "الرياض - حي الروضة", duration: "أسبوعان", notes: "هدم مبنى قديم", appointmentType: "scheduled", scheduledAt: daysAgo(-5), status: "pending", adminNotes: null, createdAt: daysAgo(2), updatedAt: daysAgo(2) },
    { clientName: "عمر يوسف الشمري", phone: "0523456789", email: "omar@example.com", serviceType: "تأجير حاوية", containerSize: "10 أمتار", location: "الرياض - حي الورود", duration: "أسبوع", notes: "تجديد مكتبي", appointmentType: "immediate", scheduledAt: null, status: "cancelled", adminNotes: "العميل ألغى الطلب", createdAt: daysAgo(7), updatedAt: daysAgo(6) },
    { clientName: "محمد علي الغامدي", phone: "0534567890", email: null, serviceType: "نقل أنقاض", containerSize: "20 أمتار", location: "الرياض - حي السليمانية", duration: "شهر", notes: "مشروع تجاري كبير", appointmentType: "scheduled", scheduledAt: daysAgo(-7), status: "in_progress", adminNotes: "يسير بشكل جيد", createdAt: daysAgo(5), updatedAt: daysAgo(2) },
    { clientName: "هند عبدالرحمن العسيري", phone: "0545678901", email: "hind@example.com", serviceType: "تأجير حاوية", containerSize: "5 أمتار", location: "الرياض - حي الياسمين", duration: "يوم", notes: "[طلب عرض سعر] أرغب في معرفة السعر قبل التأكيد", appointmentType: "immediate", scheduledAt: null, status: "pending", adminNotes: null, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
    { clientName: "طارق إبراهيم المطيري", phone: "0556789012", email: "tarek@example.com", serviceType: "نقل أنقاض", containerSize: "10 أمتار", location: "الرياض - حي بدر", duration: "3 أيام", notes: "إزالة مخلفات بناء قديم", appointmentType: "immediate", scheduledAt: null, status: "completed", adminNotes: "تم بنجاح", createdAt: daysAgo(20), updatedAt: daysAgo(18) },
    { clientName: "ريم سعد الحربي", phone: "0567890123", email: null, serviceType: "تأجير حاوية", containerSize: "20 أمتار", location: "الرياض - حي الربوة", duration: "أسبوعان", notes: "ترميم فيلا", appointmentType: "scheduled", scheduledAt: daysAgo(-3), status: "pending", adminNotes: null, createdAt: daysAgo(1), updatedAt: daysAgo(1) },
    { clientName: "عبدالعزيز نواف الرشيدي", phone: "0578901234", email: "aziz@example.com", serviceType: "تأجير حاوية", containerSize: "15 أمتار", location: "الرياض - حي الشفاء", duration: "شهر", notes: "مصنع صغير يحتاج إلى حاوية دائمة", appointmentType: "immediate", scheduledAt: null, status: "completed", adminNotes: "عميل منتظم - تم تجديد العقد", createdAt: daysAgo(30), updatedAt: daysAgo(28) },
  ];
  const insertedRequests = serviceRequests.map((r) =>
    db.insert(serviceRequestsTable).values(r as any).returning().get()
  );

  // --- Conversations & Messages ---
  type ConvRow = { clientName: string; phone: string; email: string | null; subject: string; status: string; lastMessage: string; unreadCount: number; createdAt: string; updatedAt: string };
  const conversations: ConvRow[] = [
    { clientName: "أحمد محمد العتيبي", phone: "0501234567", email: "ahmed@example.com", subject: "استفسار عن أسعار الحاويات", status: "closed", lastMessage: "شكراً جزيلاً على سرعة الرد", unreadCount: 0, createdAt: daysAgo(10), updatedAt: daysAgo(9) },
    { clientName: "سارة عبدالله الزهراني", phone: "0557891234", email: "sara@example.com", subject: "استفسار عن موعد التوصيل", status: "open", lastMessage: "متى يمكن إرسال الحاوية؟", unreadCount: 2, createdAt: daysAgo(2), updatedAt: daysAgo(0) },
    { clientName: "محمد علي الغامدي", phone: "0534567890", email: null, subject: "شكوى تأخير في الخدمة", status: "open", lastMessage: "الحاوية لم تصل في الموعد المحدد", unreadCount: 1, createdAt: daysAgo(3), updatedAt: daysAgo(1) },
    { clientName: "نورة خالد القحطاني", phone: "0566789012", email: "noura@example.com", subject: "طلب عرض أسعار لمشروع كبير", status: "open", lastMessage: "هل يوجد خصم للكميات الكبيرة؟", unreadCount: 3, createdAt: daysAgo(1), updatedAt: daysAgo(0) },
    { clientName: "طارق إبراهيم المطيري", phone: "0556789012", email: "tarek@example.com", subject: "شكراً على الخدمة الممتازة", status: "closed", lastMessage: "سأتواصل معكم في مشاريعي القادمة", unreadCount: 0, createdAt: daysAgo(18), updatedAt: daysAgo(17) },
  ];

  type MsgRow = { conversationId: number; content: string; senderType: string; isRead: string; createdAt: string };
  const convMessages: Record<string, MsgRow[]> = {
    "أحمد محمد العتيبي": [
      { conversationId: 0, content: "السلام عليكم، أريد الاستفسار عن أسعار الحاويات", senderType: "client", isRead: "true", createdAt: daysAgo(10) },
      { conversationId: 0, content: "وعليكم السلام، أهلاً بك. ما حجم الحاوية الذي تحتاجه؟", senderType: "admin", isRead: "true", createdAt: daysAgo(10) },
      { conversationId: 0, content: "أحتاج حاوية 10 متر لأسبوع واحد", senderType: "client", isRead: "true", createdAt: daysAgo(10) },
      { conversationId: 0, content: "سعر حاوية 10 متر لأسبوع هو 800 ريال شاملاً التوصيل والرفع", senderType: "admin", isRead: "true", createdAt: daysAgo(9) },
      { conversationId: 0, content: "شكراً جزيلاً على سرعة الرد", senderType: "client", isRead: "true", createdAt: daysAgo(9) },
    ],
    "سارة عبدالله الزهراني": [
      { conversationId: 0, content: "أحتاج الحاوية للموقع في حي العليا خلال يومين", senderType: "client", isRead: "true", createdAt: daysAgo(2) },
      { conversationId: 0, content: "تم استلام طلبكم، سنقوم بالتواصل معكم لتحديد الموعد", senderType: "admin", isRead: "true", createdAt: daysAgo(2) },
      { conversationId: 0, content: "متى يمكن إرسال الحاوية؟", senderType: "client", isRead: "false", createdAt: daysAgo(0) },
      { conversationId: 0, content: "هل هناك تحديث على موعد التوصيل؟", senderType: "client", isRead: "false", createdAt: daysAgo(0) },
    ],
    "محمد علي الغامدي": [
      { conversationId: 0, content: "الحاوية لم تصل في الموعد المحدد وهذا تأخير غير مقبول", senderType: "client", isRead: "true", createdAt: daysAgo(3) },
      { conversationId: 0, content: "نعتذر عن التأخير، سنتواصل مع فريق التوصيل فوراً", senderType: "admin", isRead: "true", createdAt: daysAgo(3) },
      { conversationId: 0, content: "الحاوية لم تصل في الموعد المحدد", senderType: "client", isRead: "false", createdAt: daysAgo(1) },
    ],
    "نورة خالد القحطاني": [
      { conversationId: 0, content: "مرحباً، عندي مشروع هدم كبير يحتاج إلى عدة حاويات", senderType: "client", isRead: "true", createdAt: daysAgo(1) },
      { conversationId: 0, content: "أهلاً وسهلاً، يسعدنا خدمتكم. كم عدد الحاويات المطلوبة؟", senderType: "admin", isRead: "true", createdAt: daysAgo(1) },
      { conversationId: 0, content: "حوالي 5 حاويات بحجم 20 متر لمدة شهر", senderType: "client", isRead: "false", createdAt: daysAgo(0) },
      { conversationId: 0, content: "هل يوجد خصم للكميات الكبيرة؟", senderType: "client", isRead: "false", createdAt: daysAgo(0) },
      { conversationId: 0, content: "وما هي مواعيد توفر الحاويات؟", senderType: "client", isRead: "false", createdAt: daysAgo(0) },
    ],
    "طارق إبراهيم المطيري": [
      { conversationId: 0, content: "أريد الشكر على الخدمة الممتازة والتوصيل في الوقت المحدد", senderType: "client", isRead: "true", createdAt: daysAgo(18) },
      { conversationId: 0, content: "شكراً لكلماتكم الطيبة، سعداء بخدمتكم دائماً", senderType: "admin", isRead: "true", createdAt: daysAgo(17) },
      { conversationId: 0, content: "سأتواصل معكم في مشاريعي القادمة", senderType: "client", isRead: "true", createdAt: daysAgo(17) },
    ],
  };

  for (const conv of conversations) {
    const inserted = db.insert(conversationsTable).values(conv as any).returning().get();
    const msgs = convMessages[conv.clientName] ?? [];
    for (const m of msgs) {
      db.insert(messagesTable).values({ ...m, conversationId: inserted.id } as any).run();
    }
  }

  // --- Notifications ---
  const notifications = [
    { title: "طلب خدمة جديد", message: "هند عبدالرحمن العسيري طلبت عرض سعر لحاوية 5 متر", type: "service_request", isRead: false, refId: insertedRequests.find(r => r.clientName === "هند عبدالرحمن العسيري")?.id ?? null, refType: "service_request", createdAt: daysAgo(0) },
    { title: "طلب خدمة جديد", message: "ريم سعد الحربي طلبت تأجير حاوية 20 متر في حي الربوة", type: "service_request", isRead: false, refId: insertedRequests.find(r => r.clientName === "ريم سعد الحربي")?.id ?? null, refType: "service_request", createdAt: daysAgo(1) },
    { title: "رسالة جديدة", message: "نورة خالد القحطاني أرسلت 3 رسائل جديدة", type: "message", isRead: false, refId: null, refType: "conversation", createdAt: daysAgo(0) },
    { title: "رسالة جديدة", message: "سارة عبدالله الزهراني تسأل عن موعد التوصيل", type: "message", isRead: false, refId: null, refType: "conversation", createdAt: daysAgo(0) },
    { title: "تم إتمام الطلب", message: "تم إتمام طلب خدمة عبدالعزيز نواف الرشيدي بنجاح", type: "service_request", isRead: true, refId: insertedRequests.find(r => r.clientName === "عبدالعزيز نواف الرشيدي")?.id ?? null, refType: "service_request", createdAt: daysAgo(28) },
    { title: "مرحباً بك في لوحة الإدارة", message: "تم تجهيز النظام بالبيانات الأولية. يمكنك الآن إدارة جميع أقسام الموقع.", type: "system", isRead: true, createdAt: now },
  ];
  for (const n of notifications) db.insert(notificationsTable).values(n as any).run();

  console.log("✅ Database seeded successfully!");
  console.log("  - Hero slides:", slides.length);
  console.log("  - Services:", services.length);
  console.log("  - Containers:", containers.length);
  console.log("  - Company values:", values.length);
  console.log("  - Testimonials:", testimonials.length);
  console.log("  - Partners:", partners.length);
  console.log("  - Service requests:", serviceRequests.length);
  console.log("  - Conversations:", conversations.length);
  console.log("  - Notifications:", notifications.length);
}

seedAll();
