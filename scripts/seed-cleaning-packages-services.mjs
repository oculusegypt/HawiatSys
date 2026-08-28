import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(import.meta.url);
const DB = require("better-sqlite3");
const db = new DB(join(ROOT, "data/sabaik.db"));

const SERVICES = [
  {
    id: 1,
    title: "تنظيف الشقق السكنية",
    description: "تنظيف وتطهير شامل للغرف، المطابخ، الحمامات، والشبابيك بأحدث المواد والعمالة الفنية المدربة بالرياض.",
    icon: "Building2",
    order: 1,
    is_active: 1,
    seo_enabled: 1,
    seo_title: "تنظيف شقق بالرياض | شركة مؤسسة تقي جروب",
    seo_description: "أفضل شركة تنظيف شقق بالرياض. تنظيف وتعقيم شامل للشقق السكنية بـ 350 ريال فقط مع التطهير والتلميع.",
    seo_keywords: "تنظيف شقق بالرياض, شركة تنظيف شقق الرياض, أسعار تنظيف الشقق بالرياض",
    seo_slug: "tanzeef-shaqaq-alryad"
  },
  {
    id: 2,
    title: "تنظيف الفلل والقصور",
    description: "تنظيف شامل للأدوار، الأجنحة، الدرج، الأحواش، والواجهات الزجاجية للفلل والقصور بالرياض.",
    icon: "Home",
    order: 2,
    is_active: 1,
    seo_enabled: 1,
    seo_title: "تنظيف فلل وقصور بالرياض | مؤسسة تقي جروب",
    seo_description: "شركة تنظيف فلل وقصور بالرياض. تنظيف عميق لجميع الأدوار والأحواش والدرج بجودة عالية وضمان تسليم كامل.",
    seo_keywords: "تنظيف فلل بالرياض, شركة تنظيف قصور بالرياض, تنظيف فلل جديدة بالرياض",
    seo_slug: "tanzeef-filal-alryad"
  },
  {
    id: 3,
    title: "غسيل المجالس والكنب بالبخار",
    description: "تنظيف وتطهير بالبخار الحراري 140° للمجالس والكنب والسجاد بالرياض لإزالة أصعب البقع والتجفيف الفوري.",
    icon: "Sparkles",
    order: 3,
    is_active: 1,
    seo_enabled: 1,
    seo_title: "غسيل مجالس وكنب بالبخار بالرياض | تجفيف في 30 دقيقة",
    seo_description: "أفضل شركة غسيل مجالس وكنب بالبخار بالرياض. إزالة البقع والروائح والتعقيم الحراري بدون نقل الأثاث.",
    seo_keywords: "غسيل مجالس بالبخار بالرياض, تنظيف كنب بالبخار بالرياض, تنظيف سجاد بالرياض",
    seo_slug: "gaseel-majalis-bukhar-alryad"
  },
  {
    id: 4,
    title: "تنظيف وغسيل المكيفات",
    description: "غسيل وتنظيف مكيفات السبلت والمخفي والمركزية بالضغط العالي بدون فك مع فحص الفريون.",
    icon: "Wind",
    order: 4,
    is_active: 1,
    seo_enabled: 1,
    seo_title: "تنظيف وغسيل مكيفات بالرياض | غسيل سبلت بـ 80 ريال",
    seo_description: "شركة غسيل وتنظيف مكيفات بالرياض. تنظيف سبلت ومخفي بالضغط العالي وفحص غاز الفريون بضمان الجودة.",
    seo_keywords: "تنظيف مكيفات بالرياض, غسيل مكيفات سبلت الرياض, غسيل مكيفات بدون فك",
    seo_slug: "tanzeef-mokeyafat-alryad"
  },
  {
    id: 5,
    title: "مكافحة وإبادة الحشرات",
    description: "رش وإبادة الصراصير، البق، النمل الأبيض، والقوارض بالجل الألماني والمبيدات المعتمدة بضمان سنة.",
    icon: "Bug",
    order: 5,
    is_active: 1,
    seo_enabled: 1,
    seo_title: "شركة مكافحة حشرات بالرياض | رش مبيدات بضمان سنة",
    seo_description: "إبادة شاملة للصراصير والنمل والبق والقوارض بالرياض. استخدام جل ألماني ومبيدات آمنة بضمان كتابي رسمي.",
    seo_keywords: "شركة مكافحة حشرات بالرياض, رش مبيدات بالرياض, إبادة الصراصير والبق",
    seo_slug: "mokafahat-hasharat-alryad"
  },
  {
    id: 6,
    title: "تنظيف وتطهير خزانات المياه",
    description: "غسيل الخزانات الأرضية والعلوية وإزالة الفطريات والتطهير بالكلور المعتمد وسد الترويبة.",
    icon: "Droplets",
    order: 6,
    is_active: 1,
    seo_enabled: 1,
    seo_title: "تنظيف وتطهير خزانات المياه بالرياض | تعقيم بالكلور",
    seo_description: "شركة تنظيف خزانات مياه بالرياض. غسيل وتطهير الخزانات الخرسانية والعلوي مع تعقيم الكلور المعتمد.",
    seo_keywords: "تنظيف خزانات بالرياض, تطهير خزانات المياه الرياض, غسيل خزان أرضي",
    seo_slug: "tanzeef-khazanat-alryad"
  },
  {
    id: 7,
    title: "تنظيف وتعقيم المسابح",
    description: "تفريغ وشفط الرواسب، غسيل جدران المسبح، التصفية بالكلور الصدمي، وصيانة الفلاتر بالرياض.",
    icon: "Waves",
    order: 7,
    is_active: 1,
    seo_enabled: 1,
    seo_title: "تنظيف وتعقيم مسابح بالرياض | صيانة فلاتر وكلور صدمي",
    seo_description: "شركة تنظيف وتطهير مسابح بالرياض. غسيل أرضيات وجدران المسابح ومكافحة الطحالب وضبط التوازن الكيميائي.",
    seo_keywords: "تنظيف مسابح بالرياض, تطهير مسابح الرياض, صيانة فلاتر مسابح",
    seo_slug: "tanzeef-masabeh-alryad"
  },
  {
    id: 8,
    title: "جلي وتلميع الرخام والبلاط",
    description: "جلي الأرضيات بالألماس وتلميعها بالكريستال الإيطالي وتعبئة الفواصل بمادة الجولي بالرياض.",
    icon: "Gem",
    order: 8,
    is_active: 1,
    seo_enabled: 1,
    seo_title: "جلي وتلميع رخام بالرياض | إعادة البريق الزجاجي",
    seo_description: "افضل شركة جلي وتلميع رخام وبلاط بالرياض. جلي بالألماس وتلميع بالكريستال الإيطالي لإعادة البريق للأرضيات.",
    seo_keywords: "جلي رخام بالرياض, تلميع رخام بالرياض, جلي بلاط بالرياض",
    seo_slug: "jaly-rakham-alryad"
  },
  {
    id: 9,
    title: "تنظيف واجهات المباني والشركات",
    description: "غسيل الواجهات الزجاجية والكلادينج وعقود نظافة دورية للمكاتب والمؤسسات التجارية بالرياض.",
    icon: "Briefcase",
    order: 9,
    is_active: 1,
    seo_enabled: 1,
    seo_title: "تنظيف واجهات زجاجية ومكاتب بالرياض | عقود شركات",
    seo_description: "شركة تنظيف واجهات زجاج وكلادينج بالرياض. عمالة مدربة وعقود دورية لنظافة المكاتب والشركات.",
    seo_keywords: "تنظيف واجهات زجاج بالرياض, تنظيف كلادينج الرياض, عقود نظافة شركات",
    seo_slug: "tanzeef-wajahat-alryad"
  },
  {
    id: 10,
    title: "تنظيف بعد البناء والتشطيب",
    description: "إزالة بقايا الإسمنت، والدهانات، والترويبة وتلميع كامل للأرضيات والشبابيك لتسليم العقار جاهزاً للسكن.",
    icon: "HardHat",
    order: 10,
    is_active: 1,
    seo_enabled: 1,
    seo_title: "تنظيف بعد التشطيب والبناء بالرياض | إزالة الإسمنت والدهان",
    seo_description: "شركة تنظيف بعد البناء والتشطيب بالرياض. إزالة الآثار الإنشائية والإسمنت وتلميع المبنى للتسليم السكني.",
    seo_keywords: "تنظيف بعد التشطيب بالرياض, شركة تنظيف بعد البناء الرياض, إزالة الإسمنت من البلاط",
    seo_slug: "tanzeef-bad-altashteeb-alryad"
  },
  {
    id: 11,
    title: "إصدار شهادة سلامة للمنشآت",
    description: "تجهيز ملف المنشأة والمعاينة الفنية وإعداد متطلبات شهادة السلامة وفق حالة الموقع والاشتراطات المعمول بها، مع متابعة الملاحظات حتى اكتمال الملف.",
    icon: "ShieldCheck",
    order: 11,
    is_active: 1,
    seo_enabled: 1,
    seo_title: "شهادة سلامة للمنشآت بالرياض | تجهيز ملف السلامة",
    seo_description: "خدمة تجهيز شهادة سلامة للمنشآت بالرياض مع معاينة الموقع وتجميع بيانات أنظمة الوقاية ومتابعة الملاحظات الفنية.",
    seo_keywords: "شهادة سلامة بالرياض, استخراج شهادة سلامة, شهادة سلامة منشأة, دفاع مدني",
    seo_slug: "shahadat-salama-riyadh"
  },
  {
    id: 12,
    title: "تركيب أدوات الوقاية والحماية من الحريق",
    description: "توريد وتركيب وتجهيز أدوات وأنظمة الوقاية والحماية من الحريق حسب طبيعة المنشأة، مع اختبار مبدئي وتسليم تقرير فني بالأعمال المنفذة.",
    icon: "Flame",
    order: 12,
    is_active: 1,
    seo_enabled: 1,
    seo_title: "تركيب أدوات الوقاية والحماية من الحريق بالرياض",
    seo_description: "تركيب وتجهيز طفايات الحريق والإنذار والإضاءة ومخارج الطوارئ في الرياض بعد معاينة المنشأة وتحديد الاحتياج.",
    seo_keywords: "تركيب أدوات الحماية من الحريق بالرياض, أنظمة إنذار الحريق, طفايات حريق",
    seo_slug: "tarkeeb-anthimat-wiqaya-hareeq-riyadh"
  },
  {
    id: 13,
    title: "إعداد تقرير فني فوري",
    description: "معاينة ميدانية عاجلة وإعداد تقرير فني أولي عن حالة الموقع وأنظمة السلامة والملاحظات التي تحتاج إلى معالجة، حسب نطاق الطلب.",
    icon: "ClipboardCheck",
    order: 13,
    is_active: 1,
    seo_enabled: 1,
    seo_title: "تقرير فني فوري بالرياض | معاينة عاجلة للمنشآت",
    seo_description: "طلب تقرير فني فوري بالرياض لمعاينة المنشأة وتوثيق حالة أنظمة السلامة والملاحظات المطلوبة بشكل منظم.",
    seo_keywords: "تقرير فني فوري بالرياض, معاينة سلامة منشأة, تقرير دفاع مدني",
    seo_slug: "taqreer-fanni-fawri-riyadh"
  },
  {
    id: 14,
    title: "إعداد تقرير فني غير فوري",
    description: "إعداد تقرير فني مجدول بعد دراسة بيانات المنشأة ومخططاتها ونطاق الملاحظات المطلوبة، مع تنسيق موعد المعاينة وتسليم التقرير.",
    icon: "FileText",
    order: 14,
    is_active: 1,
    seo_enabled: 1,
    seo_title: "تقرير فني غير فوري بالرياض | تقرير سلامة مجدول",
    seo_description: "تقرير فني غير فوري للمنشآت بالرياض بعد مراجعة البيانات والمخططات وتحديد موعد المعاينة والتسليم.",
    seo_keywords: "تقرير فني بالرياض, تقرير سلامة منشأة, تقرير فني دفاع مدني",
    seo_slug: "taqreer-fanni-ghayr-fawri-riyadh"
  },
  {
    id: 15,
    title: "عقد صيانة أنظمة السلامة مع تفعيل دفاع مدني",
    description: "عقود صيانة دورية لأنظمة الوقاية والحماية من الحريق مع متابعة الزيارات والتقارير وطلب تفعيل خدمة دفاع مدني حسب أهلية المنشأة والإجراءات الرسمية.",
    icon: "Wrench",
    order: 15,
    is_active: 1,
    seo_enabled: 1,
    seo_title: "عقد صيانة أنظمة السلامة بالرياض | تفعيل دفاع مدني",
    seo_description: "عقد صيانة لأنظمة السلامة والحماية من الحريق بالرياض مع زيارات دورية وتقارير ومتابعة تفعيل دفاع مدني حسب حالة المنشأة.",
    seo_keywords: "عقد صيانة دفاع مدني بالرياض, صيانة أنظمة الحريق, تفعيل دفاع مدني",
    seo_slug: "aqd-siyana-difaa-madani-riyadh"
  }
];

const PACKAGES = [
  {
    name: "باقة تنظيف الشقق السكنية",
    category: "apartments",
    image_url: "/images/packages/package-01.png",
    size: "شقة حتى 200 م²",
    capacity: "شقة كاملة (غرف، صالون، مطبخ، حمامات)",
    description: "تنظيف وتطهير كامل للشقق السكنية بالرياض يشمل الأبواب والشبابيك والأرضيات والمطابخ بأحدث المواد.",
    suitable_for: "الشقق السكنية والمنازل بالرياض",
    price_text: "350 ريال / للشقة",
    price_per_day: 350,
    rental_period: "يومي / فوري",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 1
  },
  {
    name: "باقة تنظيف الفلل الشاملة",
    category: "villas",
    image_url: "/images/packages/package-02.png",
    size: "فيلا كاملة",
    capacity: "جميع الأدوار والأحواش والدرج",
    description: "تنظيف عميق وشامل لجميع أدوار الفيلا، الأجنحة، المطابخ، الحمامات، الأحواش والدرابزين مع التطهير.",
    suitable_for: "الفلل والبيوت السكنية بالرياض",
    price_text: "750 ريال / للفيلا",
    price_per_day: 750,
    rental_period: "يومي / فوري",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 2
  },
  {
    name: "باقة غسيل وتنظيف المكيفات",
    category: "ac",
    image_url: "/images/packages/package-08.png",
    size: "سبلت / مخفي / شباك",
    capacity: "غسيل بالضغط العالي + فحص الفريون",
    description: "غسيل فلاتر ووحدات المكيفات بدون فك مع كيس الحماية وفحص غاز الفريون والتطهير ضد العفن.",
    suitable_for: "شقق، فلل، ومكاتب بالرياض",
    price_text: "80 ريال / للمكيف",
    price_per_day: 80,
    rental_period: "فوري",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 3
  },
  {
    name: "باقة مكافحة الحشرات والرش",
    category: "pest",
    image_url: "/images/packages/package-09.png",
    size: "رش مبيدات + جل ألماني",
    capacity: "إبادة الصراصير والبق والرمة بضمان سنة",
    description: "رش وتطهير المباني ضد جميع الحشرات والقوارض باستخدام جل ألماني ومبيدات آمنة مع ضمان كتابي.",
    suitable_for: "شقق، فلل، ومطاعم بالرياض",
    price_text: "200 ريال / للعقار",
    price_per_day: 200,
    rental_period: "فوري / دوري",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 4
  },
  {
    name: "باقة تنظيف بعد التشطيب والبناء",
    category: "postcon",
    image_url: "/images/packages/package-04.png",
    size: "عقار جديد / مبنى",
    capacity: "إزالة الإسمنت والدهان والترويبة",
    description: "تنظيف مواقع البناء والتشطيب وإزالة دهانات الجدران والشبابيك وتلميع البلاط وتسليم المبنى للسكن.",
    suitable_for: "المباني والفلل الجديدة بالرياض",
    price_text: "900 ريال / للعقار",
    price_per_day: 900,
    rental_period: "فوري",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 5
  },
  {
    name: "باقة غسيل المجالس بالبخار",
    category: "majlis",
    image_url: "/images/packages/package-05.png",
    size: "طقم مجلس + سجاد",
    capacity: "بخار حراري 140° وتجفيف في 30 دقيقة",
    description: "غسيل وتطهير المجالس والكنب والسجاد بالبخار الحراري الحراري مع تعقيم البقع والتعطير الفريد.",
    suitable_for: "المجالس والصالونات بالرياض",
    price_text: "250 ريال / للمجلس",
    price_per_day: 250,
    rental_period: "فوري",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 6
  },
  {
    name: "باقة جلي وتلميع الرخام",
    category: "marble",
    image_url: "/images/packages/package-06.png",
    size: "رخام / بلاط",
    capacity: "أقراص ألماس + كريستال إيطالي",
    description: "جلي الأرضيات بالألماس وإزالة الدرجات بين البلاط وتلميعها بالكريستال الإيطالي الزجاجي.",
    suitable_for: "أرضيات الفلل والقصور بالرياض",
    price_text: "15 ريال / م²",
    price_per_day: 15,
    rental_period: "فوري",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 7
  },
  {
    name: "باقة تنظيف وتطهير الخزانات",
    category: "tanks",
    image_url: "/images/packages/package-07.png",
    size: "خزان أرضي / علوي",
    capacity: "تطهير بالكلور وإزالة الرواسب",
    description: "شفط الرواسب والرمال، غسيل الجدران بالضغط، والتطهير بالكلور البكتيري المعتمد وسد الترويبة.",
    suitable_for: "خزانات المنازل والشركات بالرياض",
    price_text: "200 ريال / للخزان",
    price_per_day: 200,
    rental_period: "فوري / دوري",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 8
  },
  {
    name: "باقة تنظيف القصور والمجمعات",
    category: "palaces",
    image_url: "/images/packages/package-03.png",
    size: "قصور ومجمعات فاخرة",
    capacity: "أجنحة ملكية، هول، مسابح، حدائق",
    description: "خدمة تنظيف مخصصة للقصور الفاخرة والمجمعات بمعدات متخصصة وطاقم عمل متكامل.",
    suitable_for: "القصور والمجمعات السكنية بالرياض",
    price_text: "طلب عرض سعر مجاني",
    price_per_day: 0,
    rental_period: "حسب المعاينة",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 9
  },
  {
    name: "باقة تنظيف قبل وبعد النقل والترميم",
    category: "move_clean",
    image_url: "/images/packages/package-04.png",
    size: "منازل وفلل قبل أو بعد الانتقال",
    capacity: "تعقيم المطابخ والحمامات وتلميع الأرضيات",
    description: "تنظيف شامل وتطهير كامل للعقار قبل الانتقال إليه أو بعد مغادرته، مع تجهيز المكان للسكن.",
    suitable_for: "المنازل والشقق والفلل بالرياض",
    price_text: "طلب عرض سعر مجاني",
    price_per_day: 0,
    rental_period: "حسب المعاينة",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 10
  },
  {
    name: "باقة تنظيف واجهات المباني والمكاتب",
    category: "facades",
    image_url: "/images/service-facades.jpg",
    size: "شركات ومكاتب ومبانٍ تجارية",
    capacity: "واجهات زجاج وكلادينج ورخام",
    description: "تنظيف وغسيل الواجهات الزجاجية والكلادينج والمقرات الإدارية بعقود دورية ومرنة.",
    suitable_for: "المكاتب والشركات والمباني بالرياض",
    price_text: "طلب عرض سعر مجاني",
    price_per_day: 0,
    rental_period: "حسب المعاينة",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 11
  },
  {
    name: "باقة تنظيف وتطهير المساجد والمدارس",
    category: "facilities",
    image_url: "/images/packages/package-10.png",
    size: "مساجد ومدارس وقاعات",
    capacity: "تعقيم حراري وغسيل السجاد والمرافق",
    description: "تنظيف وتعقيم شامل للمساجد والمدارس والمنشآت التعليمية مع غسيل الموكيت وتطهير المرافق.",
    suitable_for: "المساجد والمدارس والمنشآت بالرياض",
    price_text: "طلب عرض سعر مجاني",
    price_per_day: 0,
    rental_period: "حسب المعاينة",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 12
  },
  {
    name: "باقة شهادة السلامة وتجهيز ملف المنشأة",
    category: "fire_safety",
    image_url: "/images/service-facilities.jpg",
    size: "منشآت تجارية وسكنية",
    capacity: "معاينة + تجهيز بيانات السلامة + متابعة الملاحظات",
    description: "باقة عملية لتجهيز ملف السلامة للمنشأة، تبدأ بجمع بيانات الموقع وأنظمة الوقاية وتنتهي بملف مرتب قابل للمراجعة والمتابعة.",
    suitable_for: "المحلات والمكاتب والمطاعم والعمائر والمنشآت بالرياض",
    price_text: "طلب عرض سعر بعد المعاينة",
    price_per_day: 0,
    rental_period: "حسب موعد المعاينة",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 13
  },
  {
    name: "باقة تركيب وتجهيز أنظمة الحماية من الحريق",
    category: "fire_safety",
    image_url: "/images/service-facilities.jpg",
    size: "طفايات + إنذار + مخارج طوارئ",
    capacity: "تحديد الاحتياج والتركيب والاختبار المبدئي",
    description: "تجهيز وتركيب أدوات الوقاية والحماية من الحريق حسب نشاط ومساحة المنشأة، مع حصر الأعمال وتقرير التسليم.",
    suitable_for: "المنشآت الجديدة والمواقع التي تحتاج استكمال أنظمة السلامة",
    price_text: "عرض فني حسب الموقع",
    price_per_day: 0,
    rental_period: "يُحدد بعد الرفع",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 14
  },
  {
    name: "باقة التقرير الفني الفوري",
    category: "fire_safety",
    image_url: "/images/service-facilities.jpg",
    size: "معاينة عاجلة",
    capacity: "تحديد موعد قريب + رصد الملاحظات الفنية",
    description: "طلب معاينة عاجلة لإعداد تقرير فني منظم يوضح حالة المنشأة ونطاق الأعمال المقترحة دون اعتباره اعتماداً حكومياً.",
    suitable_for: "المنشآت التي تحتاج تقريراً سريعاً قبل إجراء أو موعد",
    price_text: "طلب عرض سعر فوري",
    price_per_day: 0,
    rental_period: "حسب توفر الفريق",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 15
  },
  {
    name: "باقة التقرير الفني غير الفوري",
    category: "fire_safety",
    image_url: "/images/service-facilities.jpg",
    size: "تقرير مجدول",
    capacity: "مراجعة البيانات + معاينة + تسليم تقرير",
    description: "تقرير فني مجدول للمنشآت التي تحتاج دراسة هادئة للمخططات والبيانات ونطاق الملاحظات قبل التسليم.",
    suitable_for: "الشركات والمجمعات والمشاريع التي لديها موعد مخطط",
    price_text: "عرض سعر حسب نطاق التقرير",
    price_per_day: 0,
    rental_period: "موعد مجدول",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 16
  },
  {
    name: "باقة عقد صيانة السلامة وتفعيل دفاع مدني",
    category: "fire_safety",
    image_url: "/images/service-facilities.jpg",
    size: "شهري / ربع سنوي / سنوي",
    capacity: "زيارات دورية + تقارير + بلاغات طوارئ",
    description: "خطة صيانة دورية لأنظمة السلامة مع متابعة التقارير وطلب تفعيل دفاع مدني وفق أهلية المنشأة والإجراءات الرسمية.",
    suitable_for: "المكاتب والمطاعم والمجمعات والمدارس والمنشآت التجارية",
    price_text: "عرض عقد بعد المعاينة",
    price_per_day: 0,
    rental_period: "عقد حسب الاحتياج",
    contact_phone1: "0536312121",
    contact_phone2: "0536312121",
    is_active: 1,
    order: 17
  }
];

// Seed services
const serviceInsert = db.prepare(`
  INSERT INTO services (
    id, title, description, icon, "order", is_active,
    seo_enabled, seo_title, seo_description, seo_keywords, seo_slug
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?
  ) ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    description = excluded.description,
    icon = excluded.icon,
    "order" = excluded."order",
    is_active = excluded.is_active,
    seo_enabled = excluded.seo_enabled,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    seo_keywords = excluded.seo_keywords,
    seo_slug = excluded.seo_slug
`);

for (const s of SERVICES) {
  serviceInsert.run(
    s.id, s.title, s.description, s.icon, s.order, s.is_active,
    s.seo_enabled, s.seo_title, s.seo_description, s.seo_keywords, s.seo_slug
  );
}

// Seed packages (containers table)
db.prepare("DELETE FROM containers").run();

const packageInsert = db.prepare(`
  INSERT INTO containers (
    name, category, size, capacity, description, suitable_for,
    price_text, price_per_day, rental_period, image_url, contact_phone1, contact_phone2,
    is_active, "order", seo_enabled, seo_title, seo_description, seo_keywords, seo_slug
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?
  )
`);

for (const p of PACKAGES) {
  packageInsert.run(
    p.name, p.category, p.size, p.capacity, p.description, p.suitable_for,
    p.price_text, p.price_per_day, p.rental_period, p.image_url, "", "",
    p.is_active, p.order, 1, p.name, p.description, p.name, `package-${p.order}`
  );
}

console.log("✅ Seeded 15 modern services & 17 packages with their original images into sabaik.db!");
