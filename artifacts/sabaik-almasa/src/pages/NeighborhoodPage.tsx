import { useEffect } from "react"
import { Link, useRoute } from "wouter"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import {
  Phone,
  MessageCircle,
  CheckCircle,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronLeft,
  Sparkles,
  Home,
  Building2,
  HelpCircle,
  ArrowLeft,
  Zap,
  Box,
} from "lucide-react"
import { useServiceRequest } from "@/context/ServiceRequestContext"
import { getSiteUrl } from "@/lib/siteUrl"
import { normalizeCompanyText, useSiteSettings } from "@/context/SiteSettingsContext"

export interface AreaData {
  name: string
  region: string
  title: string
  description: string
  h1: string
  keywords: string[]
  relatedAreas: string[]
  landmarks: string[]
  propertyProfile: string
  primaryServices: { name: string; link: string; desc: string }[]
  faqs: { q: string; a: string }[]
  arrivalTime: string
}

export const AREAS: Record<string, AreaData> = {
  "north-riyadh": {
    name: "شمال الرياض",
    region: "شمال الرياض",
    title: "شركة تنظيف شمال الرياض | تنظيف منازل وفلل وقصور بعد التشطيب",
    description: "خدمات تنظيف الفلل والقصور والشقق بشمال الرياض. تغطية سريعة لحي الملقا، النرجس، الياسمين، حطين، والعارض بأحدث ماكينات الجلي والبخار الحراري.",
    h1: "شركة تنظيف منازل وفلل بشمال الرياض",
    keywords: ["شركة تنظيف شمال الرياض", "تنظيف فلل شمال الرياض", "تنظيف شقق شمال الرياض", "جلي رخام شمال الرياض"],
    relatedAreas: ["al-malqa", "al-yasmin", "al-narjis", "al-aarid", "hittin"],
    landmarks: ["طريق الملك سلمان", "طريق أنس بن مالك", "طريق الملك فهد", "مركز الملك عبد الله المالي KAFD"],
    propertyProfile: "فلل مودرن فاخرة، قصور سكنية، مجمعات سكنية مغلقة، ومقرات شركات حديثة.",
    arrivalTime: "30 — 45 دقيقة",
    primaryServices: [
      { name: "تنظيف فلل وقصور بالرياض", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%81%D9%84%D9%84-%D9%88%D9%82%D8%B5%D9%88%D8%B1-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "تنظيف شامل وعميق للأدوار والمسابح والواجهات." },
      { name: "تنظيف بعد البناء والتشطيب", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%A8%D8%B9%D8%AF-%D8%A7%D9%84%D8%A8%D9%86%D8%A7%D8%A1-%D9%88%D8%A7%D9%84%D8%AA%D8%B4%D8%B7%D9%8A%D8%A8-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "إزالة بقايا الدهان والإسمنت والجبس وتسليم المفتاح." },
      { name: "جلي وتلميع الرخام بالألماس", link: "/services/%D8%AC%D9%84%D9%8A-%D9%88%D8%AA%D9%84%D9%85%D9%8A%D8%B9-%D8%B1%D8%AE%D8%A7%D9%85-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "إعادة البريق الزجاجي للأرضيات والمداخل بالكريستال الإيطالي." },
    ],
    faqs: [
      { q: "هل تغطون جميع أحياء شمال الرياض في نفس اليوم؟", a: "نعم، تتمركز فرقنا الميدانية بالقرب من طريق الملك سلمان وأنس بن مالك للوصول إلى أي حي في شمال الرياض خلال 30 إلى 45 دقيقة." },
      { q: "ما هي أكثر الخدمات طلباً في شمال الرياض؟", a: "تنظيف الفلل والقصور بعد التشطيب، جلي وتلميع الرخام، وتنظيف وغسيل المكيفات السبلت والمخفية." },
    ],
  },
  "al-malqa": {
    name: "حي الملقا",
    region: "شمال الرياض",
    title: "شركة تنظيف حي الملقا بالرياض | تنظيف فلل وجلي رخام",
    description: "خدمات تنظيف الفلل المودرن والقصور وجلي الرخام بالألماس بحي الملقا شمال الرياض. تغطية سريعة عبر طريق أنس بن مالك والملك سلمان مع معاينة مجانية.",
    h1: "شركة تنظيف منازل وفلل بحي الملقا شمال الرياض",
    keywords: ["شركة تنظيف الملقا", "تنظيف فلل حي الملقا", "جلي رخام الملقا", "تنظيف بعد البناء الملقا"],
    relatedAreas: ["al-yasmin", "hittin", "al-sahafa", "al-aqiq"],
    landmarks: ["طريق أنس بن مالك", "طريق الملك سلمان", "شارع وادي حنيفة"],
    propertyProfile: "فلل مودرن حديثة، قصور عائلية، وشقق تمليك فاخرة.",
    arrivalTime: "30 دقيقة",
    primaryServices: [
      { name: "تنظيف الفلل والقصور", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%81%D9%84%D9%84-%D9%88%D9%82%D8%B5%D9%88%D8%B1-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "غسيل الواجهات الزجاجية والمسابح والأحواش." },
      { name: "جلي وتلميع الرخام", link: "/services/%D8%AC%D9%84%D9%8A-%D9%88%D8%AA%D9%84%D9%85%D9%8A%D8%B9-%D8%B1%D8%AE%D8%A7%D9%85-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "جلي بالألماس ومعالجة الفواصل بمادة الجولي." },
      { name: "غسيل المجالس بالبخار", link: "/services/%D8%BA%D8%B3%D9%8A%D9%84-%D9%85%D8%AC%D8%A7%D9%84%D8%B3-%D8%A8%D8%A7%D9%84%D8%A8%D8%AE%D8%A7%D8%B1-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "تعقيم فوري للأثاث والمفروشات بالبخار 140°." },
    ],
    faqs: [
      { q: "كيف يتم حجز خدمة تنظيف في حي الملقا؟", a: "تواصل معنا مباشرة عبر الواتساب أو الهاتف لتحديد الموعد ونطاق العمل وتصلك الفرقة الميدانية في الموعد المحدد." },
      { q: "هل توفرون ضماناً على جلي الرخام في فلل الملقا؟", a: "نعم، نقدم ضماناً كاملاً على جودة الجلي واللمعة الكريستالية بدون إحداث أي غبار بفضل تقنية الجلي المائي الإيطالية." },
    ],
  },
  "al-yasmin": {
    name: "حي الياسمين",
    region: "شمال الرياض",
    title: "شركة تنظيف حي الياسمين بالرياض | تنظيف فلل وشقق عائلية",
    description: "خدمات تنظيف الفلل والشقق السكنية الدورية وغسيل الكنب والمكيفات بحي الياسمين شمال الرياض. نصلك عبر طريق الملك عبد العزيز وأنس بن مالك.",
    h1: "شركة تنظيف منازل وفلل بحي الياسمين شمال الرياض",
    keywords: ["شركة تنظيف الياسمين", "تنظيف فلل حي الياسمين", "غسيل كنب الياسمين", "تنظيف مكيفات الياسمين"],
    relatedAreas: ["al-malqa", "al-narjis", "al-aarid", "al-sahafa"],
    landmarks: ["طريق الملك عبد العزيز", "طريق أنس بن مالك", "طريق الثمامة"],
    propertyProfile: "فلل سكنية عائلية، شقق مودرن، ومجمعات سكنية حديثة.",
    arrivalTime: "30 دقيقة",
    primaryServices: [
      { name: "تنظيف الفلل والمنازل", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%81%D9%84%D9%84-%D9%88%D9%82%D8%B5%D9%88%D8%B1-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "تنظيف شامل للأدوار والمطابخ والحمامات." },
      { name: "غسيل مكيفات سبليت", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%88%D8%BA%D8%B3%D9%8A%D9%84-%D9%85%D9%83%D9%8A%D9%81%D8%A7%D8%AA-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "غسيل بجراب الحماية المائي بضغط 150 بار." },
      { name: "تنظيف الخزانات وتعقيمها", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%88%D8%AA%D8%B7%D9%87%D9%8A%D8%B1-%D8%AE%D8%B2%D8%A7%D9%86%D8%A7%D8%AA-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "تطهير بالكلور المعتمد وسحب الرواسب." },
    ],
    faqs: [
      { q: "كم يستغرق تنظيف الشقة السكنية في حي الياسمين؟", a: "يستغرق تنظيف الشقة المكونة من 3 إلى 5 غرف من 3 إلى 4 ساعات بفريق مدرب ينجز العمل بأعلى دقة." },
    ],
  },
  "al-narjis": {
    name: "حي النرجس",
    region: "شمال الرياض",
    title: "شركة تنظيف حي النرجس بالرياض | تنظيف بعد التشطيب والبناء",
    description: "متخصصون في تنظيف الفلل والشقق الجديدة بعد البناء والتشطيب وإزالة بقع الدهانات والأسمنت بحي النرجس شمال الرياض على امتداد طريق عثمان بن عفان.",
    h1: "شركة تنظيف فلل ومنازل بعد التشطيب بحي النرجس",
    keywords: ["شركة تنظيف النرجس", "تنظيف بعد التشطيب النرجس", "تنظيف فلل حي النرجس"],
    relatedAreas: ["al-yasmin", "al-aarid", "al-nafal", "al-falah"],
    landmarks: ["طريق عثمان بن عفان", "طريق أبي بكر الصديق", "طريق الملك سلمان"],
    propertyProfile: "مشاريع سكنية حديثة، فلل جديدة قيد السكن، ومجمعات شقق تمليك.",
    arrivalTime: "35 دقيقة",
    primaryServices: [
      { name: "تنظيف بعد البناء والتشطيب", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%A8%D8%B9%D8%AF-%D8%A7%D9%84%D8%A8%D9%86%D8%A7%D8%A1-%D9%88%D8%A7%D9%84%D8%AA%D8%B4%D8%B7%D9%8A%D8%A8-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "إزالة بقايا البوية والترويبة والجبس." },
      { name: "جلي وتلميع السيراميك والرخام", link: "/services/%D8%AC%D9%84%D9%8A-%D9%88%D8%AA%D9%84%D9%85%D9%8A%D8%B9-%D8%B1%D8%AE%D8%A7%D9%85-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "تسوية الأرضيات وإزالة الخدوش وبقع الدهان." },
      { name: "مكافحة الحشرات والوقاية", link: "/services/%D9%85%D9%83%D8%A7%D9%81%D8%AD%D8%A9-%D8%AD%D8%B4%D8%B1%D8%A7%D8%AA-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "رش وقائي للمنازل والفلل الجديدة قبل السكن بضمان سنة." },
    ],
    faqs: [
      { q: "هل تزيلون بقع الدهان والأسمنت من النوافذ والأرضيات في حي النرجس؟", a: "نعم، نستخدم كاشطات ومواد كيميائية مخصصة تذيب بقع الأسمنت والدهان تماماً دون أي خدش للزجاج أو البورسلين." },
    ],
  },
  "hittin": {
    name: "حي حطين",
    region: "شمال الرياض",
    title: "شركة تنظيف حي حطين بالرياض | تنظيف قصور وفلل فاخرة",
    description: "خدمات تنظيف القصور والفلل الفاخرة، جلي الرخام النادر، وتطهير المسابح والواجهات بحي حطين شمال الرياض بجوار بوليفارد الرياض والدرعية.",
    h1: "شركة تنظيف قصور وفلل فاخرة بحي حطين شمال الرياض",
    keywords: ["شركة تنظيف حطين", "تنظيف فلل حي حطين", "تنظيف قصور حطين", "جلي رخام حطين"],
    relatedAreas: ["al-malqa", "al-sahafa", "al-aqiq", "north-riyadh"],
    landmarks: ["بوليفارد رياض سيتي", "طريق الأمير تركي الأول", "طريق الملك خالد"],
    propertyProfile: "قصور ضخمة، فلل معمارية فاخرة، وواجهات زجاجية واسعة.",
    arrivalTime: "30 دقيقة",
    primaryServices: [
      { name: "تنظيف القصور والفلل الفاخرة", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%81%D9%84%D9%84-%D9%88%D9%82%D8%B5%D9%88%D8%B1-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "عناية خاصة بالرخام النادر والثريات والمسابح." },
      { name: "جلي الرخام بالكريستال", link: "/services/%D8%AC%D9%84%D9%8A-%D9%88%D8%AA%D9%84%D9%85%D9%8A%D8%B9-%D8%B1%D8%AE%D8%A7%D9%85-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "تلميع وحماية الرخام الإيطالي بمادة النانو سيلر." },
      { name: "غسيل المجالس والكنب الفاخر", link: "/services/%D8%BA%D8%B3%D9%8A%D9%84-%D9%85%D8%AC%D8%A7%D9%84%D8%B3-%D8%A8%D8%A7%D9%84%D8%A8%D8%AE%D8%A7%D8%B1-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "غسيل بالبخار الجاف المخصص للأقمشة الحساسة." },
    ],
    faqs: [
      { q: "هل لديكم خبرة في التعامل مع الرخام الطبيعي والأثاث الثمين في فلل حطين؟", a: "نعم، فريقنا مدرب على أعلى المعايير الفندقية للتعامل مع الرخام الإيطالي والواجهات والأثاث الكلاسيكي والمودرن بأمان وضمان كامل." },
    ],
  },
  "al-aarid": {
    name: "حي العارض",
    region: "شمال الرياض",
    title: "شركة تنظيف حي العارض بالرياض | تنظيف فلل ومنازل جديدة",
    description: "باقات متكاملة لتنظيف الفلل السكنية الجديدة وتسليم المفتاح وغسيل الخزانات والمكيفات بحي العارض شمال الرياض على طريق الملك فهد وأبي بكر الصديق.",
    h1: "شركة تنظيف فلل ومنازل جديدة بحي العارض شمال الرياض",
    keywords: ["شركة تنظيف العارض", "تنظيف فلل حي العارض", "تنظيف بعد البناء العارض"],
    relatedAreas: ["al-narjis", "al-yasmin", "al-malqa", "north-riyadh"],
    landmarks: ["طريق الملك فهد", "طريق أبي بكر الصديق", "طريق الأمير فيصل بن بندر"],
    propertyProfile: "فلل سكنية حديثة التشييد ومجمعات سكنية جديدة.",
    arrivalTime: "35 دقيقة",
    primaryServices: [
      { name: "تنظيف بعد التشطيب", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%A8%D8%B9%D8%AF-%D8%A7%D9%84%D8%A8%D9%86%D8%A7%D8%A1-%D9%88%D8%A7%D9%84%D8%AA%D8%B4%D8%B7%D9%8A%D8%A8-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "تسليم فوري للمبنى جاهزاً للسكن وفرش الأثاث." },
      { name: "تنظيف وتعقيم الخزانات", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%88%D8%AA%D8%B7%D9%87%D9%8A%D8%B1-%D8%AE%D8%B2%D8%A7%D9%86%D8%A7%D8%AA-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "غسيل الخزان الأرضي والعلوي وإزالة الرواسب الإنشائية." },
    ],
    faqs: [
      { q: "هل تقدمون باقة متكاملة للفلل الجديدة بحي العارض؟", a: "نعم، نوفر باقة شاملة تشمل التنظيف بعد التشطيب، جلي وتلميع الأرضيات، غسيل الخزان، وتعقيم دورات المياه والمطابخ." },
    ],
  },
  "al-sahafa": {
    name: "حي الصحافة",
    region: "شمال الرياض",
    title: "شركة تنظيف حي الصحافة بالرياض | تنظيف شقق ومكاتب",
    description: "خدمات تنظيف الشقق والمقرات الإدارية والمنازل وغسيل المجالس بالبخار بحي الصحافة شمال الرياض بالقرب من طريق الملك فهد وطريق العليا.",
    h1: "شركة تنظيف شقق ومنازل بحي الصحافة شمال الرياض",
    keywords: ["شركة تنظيف الصحافة", "تنظيف شقق حي الصحافة", "تنظيف مكاتب الصحافة"],
    relatedAreas: ["al-malqa", "al-yasmin", "al-aqiq", "al-ghadeer"],
    landmarks: ["طريق الملك فهد", "طريق العليا", "طريق أنس بن مالك"],
    propertyProfile: "مقرات إدارية، مكاتب شركات، شقق سكنية، وفلل عائلية.",
    arrivalTime: "25 دقيقة",
    primaryServices: [
      { name: "تنظيف المكاتب والشركات", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%88%D8%A7%D8%AC%D9%87%D8%A7%D8%AA-%D9%85%D8%A8%D8%A7%D9%86%D9%8A-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "عقود دورية ونظافة واجهات زجاجية وموكيت." },
      { name: "تنظيف الشقق السكنية", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%B4%D9%82%D9%82-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "تنظيف عميق وتعقيم دوري للمنازل." },
    ],
    faqs: [
      { q: "هل توفرون عقود نظافة دورية للمكاتب في حي الصحافة؟", a: "نعم، نقدم عقود نظافة أسبوعية وشهرية وسنوية للمكاتب والشركات مع توفير الفواتير الضريبية المعتمدة." },
    ],
  },
  "al-aqiq": {
    name: "حي العقيق",
    region: "شمال الرياض",
    title: "شركة تنظيف حي العقيق بالرياض | تنظيف شقق وأبراج",
    description: "خدمات تنظيف الشقق السكنية والفلل والواجهات الزجاجية بحي العقيق شمال الرياض بالقرب من مركز الملك عبد الله المالي (KAFD).",
    h1: "شركة تنظيف شقق ومنازل بحي العقيق شمال الرياض",
    keywords: ["شركة تنظيف العقيق", "تنظيف شقق حي العقيق", "تنظيف منازل العقيق"],
    relatedAreas: ["hittin", "al-sahafa", "al-ghadeer", "al-malqa"],
    landmarks: ["مركز الملك عبد الله المالي KAFD", "الطريق الدائري الشمالي", "طريق الخير"],
    propertyProfile: "أبراج سكنية، شقق فندقية، وفلل راقية.",
    arrivalTime: "25 دقيقة",
    primaryServices: [
      { name: "تنظيف الشقق والأبراج", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%B4%D9%82%D9%82-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "نظافة الواجهات والشرفات والأرضيات." },
      { name: "غسيل المكيفات بالضغط", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%88%D8%BA%D8%B3%D9%8A%D9%84-%D9%85%D9%83%D9%8A%D9%81%D8%A7%D8%AA-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "غسيل فوري لمكيفات السبلت والكونسيلد." },
    ],
    faqs: [
      { q: "هل تخدمون الشقق في الأبراج السكنية المرتفعة بالعقيق؟", a: "نعم، فرقنا مجهزة للعمل في الأبراج السكنية والمجمعات مع الالتزام بكافة معايير السلامة والأمان." },
    ],
  },
  "east-riyadh": {
    name: "شرق الرياض",
    region: "شرق الرياض",
    title: "شركة تنظيف شرق الرياض | غسيل مجالس ومنازل وخزانات",
    description: "خدمات تنظيف المنازل والشقق وغسيل المجالس والموكيت بالبخار الحراري بشرق الرياض. نخدم حي الروضة، النسيم، قرطبة، اليرموك، والمونسية.",
    h1: "شركة تنظيف منازل وفلل بشرق الرياض",
    keywords: ["شركة تنظيف شرق الرياض", "غسيل مجالس شرق الرياض", "تنظيف شقق شرق الرياض"],
    relatedAreas: ["al-rawdah", "al-yarmouk", "al-munsiyah", "al-qurtubah", "al-naseem"],
    landmarks: ["طريق خريص", "طريق الدمام", "شارع خالد بن الوليد", "محطة قطار سار"],
    propertyProfile: "فلل عائلية كبيرة، شقق سكنية واسعة، ومجالس واستراحات.",
    arrivalTime: "30 — 40 دقيقة",
    primaryServices: [
      { name: "غسيل المجالس والكنب بالبخار", link: "/services/%D8%BA%D8%B3%D9%8A%D9%84-%D9%85%D8%AC%D8%A7%D9%84%D8%B3-%D8%A8%D8%A7%D9%84%D8%A8%D8%AE%D8%A7%D8%B1-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "إزالة البقع المستعصية والتعقيم الحراري والتجفيف في 30 دقيقة." },
      { name: "تنظيف الشقق والفلل", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%B4%D9%82%D9%82-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "تنظيف متكامل للمنازل والعناية بالسيراميك والحمامات." },
      { name: "تنظيف الخزانات ومكافحة الحشرات", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%88%D8%AA%D8%B7%D9%87%D9%8A%D8%B1-%D8%AE%D8%B2%D8%A7%D9%86%D8%A7%D8%AA-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "تطهير مياه الخزانات ورش المبيدات المعتمدة بضمان." },
    ],
    faqs: [
      { q: "هل تغطون استراحات ومجالس شرق الرياض؟", a: "نعم، نقدم خدمات غسيل المجالس الكبيرة والمفروشات بالبخار في المنازل والاستراحات بشرق الرياض بأسعار خاصة." },
    ],
  },
  "al-rawdah": {
    name: "حي الروضة",
    region: "شرق الرياض",
    title: "شركة تنظيف حي الروضة بالرياض | تنظيف منازل ومجالس بالبخار",
    description: "خدمات تنظيف المنازل الكبيرة وغسيل المجالس والكنب والسجاد بالبخار الحار وإزالة البقع بحي الروضة شرق الرياض بالقرب من طريق خريص وشارع خالد بن الوليد.",
    h1: "شركة تنظيف منازل وفلل بحي الروضة شرق الرياض",
    keywords: ["شركة تنظيف الروضة", "غسيل مجالس الروضة", "تنظيف فلل الروضة"],
    relatedAreas: ["al-nahdah", "al-khaleej", "al-qurtubah"],
    landmarks: ["طريق خريص", "شارع خالد بن الوليد", "طريق الإمام الشافعي"],
    propertyProfile: "فلل سكنية تقليدية وعائلية كبيرة ومنازل مفروشة.",
    arrivalTime: "30 دقيقة",
    primaryServices: [
      { name: "غسيل مجالس وكنب بالبخار", link: "/services/%D8%BA%D8%B3%D9%8A%D9%84-%D9%85%D8%AC%D8%A7%D9%84%D8%B3-%D8%A8%D8%A7%D9%84%D8%A8%D8%AE%D8%A7%D8%B1-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "تعقيم الأقمشة وإزالة البقع بدون نقل الأثاث." },
      { name: "تنظيف وتطهير خزانات المياه", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%88%D8%AA%D8%B7%D9%87%D9%8A%D8%B1-%D8%AE%D8%B2%D8%A7%D9%86%D8%A7%D8%AA-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "غسيل الخزانات الخرسانية والأرضية بالتعقيم المصرح." },
    ],
    faqs: [
      { q: "هل تنظفون خزانات المياه الأرضية القديمة في الروضة؟", a: "نعم، نقوم بسحب الرواسب وفرك الجدران وإزالة الطحالب وإعادة تعقيم الخزان بالكلور المعتمد." },
    ],
  },
  "al-qurtubah": {
    name: "حي قرطبة",
    region: "شرق الرياض",
    title: "شركة تنظيف حي قرطبة بالرياض | تنظيف مجمعات وفلل",
    description: "تنظيف الفلل والمجمعات السكنية وشقق التمليك الحديثة بحي قرطبة شرق الرياض بالقرب من طريق الثمامة ومحطة قطار سار.",
    h1: "شركة تنظيف منازل وشقق بحي قرطبة شرق الرياض",
    keywords: ["شركة تنظيف قرطبة", "تنظيف شقق قرطبة", "تنظيف فلل قرطبة"],
    relatedAreas: ["al-munsiyah", "al-yarmouk", "al-hamra"],
    landmarks: ["محطة قطار سار", "طريق الثمامة", "طريق الدمام"],
    propertyProfile: "مجمعات سكنية حديثة (Compounds)، شقق تمليك، وفلل دوبلكس.",
    arrivalTime: "30 دقيقة",
    primaryServices: [
      { name: "تنظيف الشقق والمجمعات", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%B4%D9%82%D9%82-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "تنظيف شامل وعقود صيانة دورية." },
      { name: "تنظيف وغسيل المكيفات", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%88%D8%BA%D8%B3%D9%8A%D9%84-%D9%85%D9%83%D9%8A%D9%81%D8%A7%D8%AA-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "غسيل احترافي يرفع كفاءة التبريد ويخفض استهلاك الكهرباء." },
    ],
    faqs: [
      { q: "هل توفرون عروضاً خاصة لمجمعات وشقق حي قرطبة؟", a: "نعم، نقدم باقات مخفضة عند طلب تنظيف أكثر من شقة أو حجز باقة التنظيف الدوري." },
    ],
  },
  "west-riyadh": {
    name: "غرب الرياض",
    region: "غرب الرياض",
    title: "شركة تنظيف غرب الرياض | تنظيف فلل ومنازل ومكيفات",
    description: "خدمات تنظيف المنازل والفلل وغسيل المكيفات والمجالس بغرب الرياض. نخدم حي ظهرة لبن، السويدي، العريجاء، والبديعة باستجابة فورية.",
    h1: "شركة تنظيف منازل وفلل بغرب الرياض",
    keywords: ["شركة تنظيف غرب الرياض", "تنظيف فلل غرب الرياض", "تنظيف منازل غرب الرياض"],
    relatedAreas: ["dhahrat-laban", "al-suwaidi", "al-uraija", "al-badiyah"],
    landmarks: ["الدائري الغربي", "طريق مكة المكرمة", "شارع حمزة بن عبد المطلب"],
    propertyProfile: "فلل سكنية على المرتفعات، شقق عائلية، واستراحات سكنية.",
    arrivalTime: "30 — 40 دقيقة",
    primaryServices: [
      { name: "تنظيف فلل ومنازل", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%81%D9%84%D9%84-%D9%88%D9%82%D8%B5%D9%88%D8%B1-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "غسيل الأحواش والأسطح والأدوار السكنية بالكامل." },
      { name: "تنظيف الخزانات ومكافحة الآفات", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%88%D8%AA%D8%B7%D9%87%D9%8A%D8%B1-%D8%AE%D8%B2%D8%A7%D9%86%D8%A7%D8%AA-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "حلول شاملة لنظافة المياه وحماية المنازل من الحشرات." },
    ],
    faqs: [
      { q: "هل تخدمون حي ظهرة لبن والعريجاء في عطلة نهاية الأسبوع؟", a: "نعم، نعمل على مدار 7 أيام في الأسبوع لتلبية جميع طلبات التنظيف في غرب الرياض." },
    ],
  },
  "dhahrat-laban": {
    name: "حي ظهرة لبن",
    region: "غرب الرياض",
    title: "شركة تنظيف حي ظهرة لبن بالرياض | تنظيف فلل وشقق",
    description: "خدمات تنظيف الفلل والشقق وغسيل الخزانات ومكافحة الحشرات بحي ظهرة لبن غرب الرياض على امتداد مخرج 33 وشارع الطائف وشارع الشفا.",
    h1: "شركة تنظيف منازل وفلل بحي ظهرة لبن غرب الرياض",
    keywords: ["شركة تنظيف ظهرة لبن", "تنظيف فلل ظهرة لبن", "تنظيف خزانات لبن"],
    relatedAreas: ["al-uraija", "al-suwaidi", "al-hazm"],
    landmarks: ["مخرج 33", "شارع الطائف", "شارع عسير"],
    propertyProfile: "فلل دوبلكس، عمائر شقق سكنية، واستراحات عائلية.",
    arrivalTime: "30 دقيقة",
    primaryServices: [
      { name: "تنظيف الفلل والشقق", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%81%D9%84%D9%84-%D9%88%D9%82%D8%B5%D9%88%D8%B1-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "غسيل السيراميك والمطابخ والشبابيك." },
      { name: "غسيل الخزانات الأرضية", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%88%D8%AA%D8%B7%D9%87%D9%8A%D8%B1-%D8%AE%D8%B2%D8%A7%D9%86%D8%A7%D8%AA-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "إزالة الأتربة الناتجة عن العواصف والغبار وتطهير المياه." },
    ],
    faqs: [
      { q: "كيف يتم التعامل مع غبار وأتربة المنازل في ظهرة لبن؟", a: "نستخدم مكانس شفط صناعية بقوة 3000 واط تسحب أدق جزيئات الغبار من فتحات الألمنيوم والشبابيك والأسقف." },
    ],
  },
  "central-riyadh": {
    name: "وسط الرياض",
    region: "وسط الرياض",
    title: "شركة تنظيف وسط الرياض | تنظيف مكاتب ومباني وشقق",
    description: "خدمات تنظيف المباني والشركات والمكاتب والشقق السكنية بوسط الرياض. نخدم حي العليا، السليمانية، الملز، والمربع بعقود دورية وضمان معتمد.",
    h1: "شركة تنظيف مباني ومنازل بوسط الرياض",
    keywords: ["شركة تنظيف وسط الرياض", "تنظيف مكاتب وسط الرياض", "تنظيف شقق العليا"],
    relatedAreas: ["al-olaya", "al-sulaimaniya", "al-malaz", "al-murabba"],
    landmarks: ["طريق الملك فهد", "شارع التحلية (الأمير محمد بن عبد العزيز)", "طريق مكة", "برج المملكة والفيصلية"],
    propertyProfile: "أبراج تجارية، مقرات شركات، شقق فندقية، ومبانٍ إدارية.",
    arrivalTime: "25 دقيقة",
    primaryServices: [
      { name: "تنظيف الشركات والمكاتب", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%88%D8%A7%D8%AC%D9%87%D8%A7%D8%AA-%D9%85%D8%A8%D8%A7%D9%86%D9%8A-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "عقود تنظيف دورية معتمدة وغسيل الواجهات الزجاجية." },
      { name: "جلي وتلميع المداخل والرخام", link: "/services/%D8%AC%D9%84%D9%8A-%D9%88%D8%AA%D9%84%D9%85%D9%8A%D8%B9-%D8%B1%D8%AE%D8%A7%D9%85-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "إعادة اللمعة لأرضيات الاستقبال ومقرات الأعمال." },
    ],
    faqs: [
      { q: "هل يمكن تنفيذ أعمال التنظيف في المكاتب خارج ساعات العمل الرسمية؟", a: "نعم، نوفر فرق عمل ليلية وفي عطلات نهاية الأسبوع لتنظيف المقرات الإدارية دون التأثير على سير العمل." },
    ],
  },
  "al-olaya": {
    name: "حي العليا",
    region: "وسط الرياض",
    title: "شركة تنظيف حي العليا بالرياض | تنظيف مكاتب وشقق وأبراج",
    description: "خدمات تنظيف المقرات الإدارية والشركات والمكاتب والشقق الفندقية بحي العليا وسط الرياض بالقرب من برج المملكة والفيصلية بعقود دورية معتمدة.",
    h1: "شركة تنظيف مكاتب ومنازل بحي العليا وسط الرياض",
    keywords: ["شركة تنظيف العليا", "تنظيف مكاتب العليا", "تنظيف شركات العليا"],
    relatedAreas: ["al-sulaimaniya", "al-malaz", "al-murabba"],
    landmarks: ["برج المملكة", "برج الفيصلية", "طريق الملك فهد", "طريق العروبة"],
    propertyProfile: "أبراج إدارية، مقرات شركات متعددة الجنسيات، وشقق فاخرة.",
    arrivalTime: "25 دقيقة",
    primaryServices: [
      { name: "تنظيف المكاتب والشركات", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%88%D8%A7%D8%AC%D9%87%D8%A7%D8%AA-%D9%85%D8%A8%D8%A7%D9%86%D9%8A-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "نظافة يومية وأسبوعية وشهرية معتمدة." },
      { name: "غسيل الموكيت والسجاد المكتبي", link: "/services/%D8%BA%D8%B3%D9%8A%D9%84-%D9%85%D8%AC%D8%A7%D9%84%D8%B3-%D8%A8%D8%A7%D9%84%D8%A8%D8%AE%D8%A7%D8%B1-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "إزالة بقع القهوة والحبر بالبخار الساخن مع التجفيف السريع." },
    ],
    faqs: [
      { q: "هل تقدمون فواتير ضريبية لشركات حي العليا؟", a: "نعم، نقدم فواتير إلكترونية معتمدة مطابقة لمتطلبات هيئة الزكاة والضريبة والجمارك (ZATCA)." },
    ],
  },
  "south-riyadh": {
    name: "جنوب الرياض",
    region: "جنوب الرياض",
    title: "شركة تنظيف جنوب الرياض | تنظيف منازل وخزانات وحشرات",
    description: "خدمات تنظيف المنازل والفلل وغسيل الخزانات الأرضية والعلوية ومكافحة الحشرات بجنوب الرياض. نخدم حي الشفا، بدر، العزيزية، والدار البيضاء.",
    h1: "شركة تنظيف منازل وفلل بجنوب الرياض",
    keywords: ["شركة تنظيف جنوب الرياض", "تنظيف خزانات جنوب الرياض", "تنظيف شقق جنوب الرياض"],
    relatedAreas: ["al-shifa", "badr", "al-aziziyah", "al-dar-al-baida"],
    landmarks: ["طريق الدائري الجنوبي", "طريق ديراب", "طريق الحائر"],
    propertyProfile: "منازل شعبية وفلل عائلية وعمائر سكنية وأحواش واسعة.",
    arrivalTime: "35 دقيقة",
    primaryServices: [
      { name: "تنظيف المنازل والخزانات", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%88%D8%AA%D8%B7%D9%87%D9%8A%D8%B1-%D8%AE%D8%B2%D8%A7%D9%86%D8%A7%D8%AA-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "غسيل شامل للخزانات وتعقيم المياه من الرواسب." },
      { name: "مكافحة الآفات ورش المبيدات", link: "/services/%D9%85%D9%83%D8%A7%D9%81%D8%AD%D8%A9-%D8%AD%D8%B4%D8%B1%D8%A7%D8%AA-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "إبادة تامة للصراصير والنمل الأبيض وبق الفراش مع الضمان." },
    ],
    faqs: [
      { q: "هل توفرون ضماناً على رش الحشرات بجنوب الرياض؟", a: "نعم، نقدم ضماناً كتابياً يمتد من 6 أشهر إلى سنة كاملة مع زيارات مجانية في حال ظهور أي آفة." },
    ],
  }
}

// إنشاء مولد تلقائي للأحياء المتبقية لضمان تغطية الـ 45+ حياً بقيم واضحة
function makeAreaFallback(name: string, region: string, relatedAreas: string[] = []): AreaData {
  const location = name.includes("الرياض") ? name : `${name} بالرياض`
  return {
    name,
    region,
    title: `شركة تنظيف ${location} | تنظيف منازل وفلل وضمان شامل`,
    description: `خدمات تنظيف المنازل والفلل والشقق والمكاتب في ${location}. تنظيف عميق وبعد التشطيب وغسيل مجالس بالبخار وجلي الرخام بعمالة مدربة ومعدات إيطالية.`,
    h1: `شركة تنظيف منازل وفلل ومكاتب في ${location}`,
    keywords: [`شركة تنظيف ${name}`, `تنظيف منازل ${location}`, `تنظيف فلل ${location}`, `تنظيف شقق ${location}`],
    relatedAreas,
    landmarks: [`الشوارع والمحاور الرئيسية في ${name}`],
    propertyProfile: "فلل سكنية، شقق عائلية، ومنازل مأهولة.",
    arrivalTime: "30 — 45 دقيقة",
    primaryServices: [
      { name: "تنظيف الفلل والمنازل", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%81%D9%84%D9%84-%D9%88%D9%82%D8%B5%D9%88%D8%B1-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "تنظيف عميق وشامل للأدوار والمطابخ والواجهات." },
      { name: "غسيل المجالس بالبخار", link: "/services/%D8%BA%D8%B3%D9%8A%D9%84-%D9%85%D8%AC%D8%A7%D9%84%D8%B3-%D8%A8%D8%A7%D9%84%D8%A8%D8%AE%D8%A7%D8%B1-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "تعقيم فوري وإزالة البقع بأحدث أجهزة البخار الحار." },
      { name: "تنظيف الخزانات والمكيفات", link: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%88%D8%AA%D8%B7%D9%87%D9%8A%D8%B1-%D8%AE%D8%B2%D8%A7%D9%86%D8%A7%D8%AA-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", desc: "غسيل وتطهير الخزانات بالكلور وغسيل المكيفات بجراب الحماية." },
    ],
    faqs: [
      { q: `كم يستغرق وصول فريق التنظيف إلى ${name}؟`, a: `تصل فرقنا الميدانية المجهزة إلى ${name} خلال 30 إلى 45 دقيقة من تأكيد الحجز.` },
      { q: `هل مواد التنظيف المستخدمة في ${name} آمنة؟`, a: `نعم، جميع المواد مصرحة ومطابقة للاشتراطات الصحية وآمنة تماماً على الأطفال وكبار السن.` },
    ],
  }
}

// إضافة باقي الأحياء
const ALL_NEIGHBORHOOD_KEYS = [
  { k: "al-nafal", n: "حي النفل", r: "شمال الرياض", rel: ["al-wadi", "al-ghadeer", "al-yasmin"] },
  { k: "al-rabi", n: "حي الربيع", r: "شمال الرياض", rel: ["al-sahafa", "al-yasmin", "al-ghadeer"] },
  { k: "al-ghadeer", n: "حي الغدير", r: "شمال الرياض", rel: ["al-nafal", "al-sahafa", "al-wadi"] },
  { k: "al-wadi", n: "حي الوادي", r: "شمال الرياض", rel: ["al-nafal", "al-falah", "al-nada"] },
  { k: "al-nada", n: "حي الندى", r: "شمال الرياض", rel: ["al-falah", "al-wadi", "north-riyadh"] },
  { k: "al-falah", n: "حي الفلاح", r: "شمال الرياض", rel: ["al-nada", "al-wadi", "al-narjis"] },
  { k: "al-munsiyah", n: "حي المونسية", r: "شرق الرياض", rel: ["al-qurtubah", "al-yarmouk", "al-qadesiya"] },
  { k: "al-yarmouk", n: "حي اليرموك", r: "شرق الرياض", rel: ["al-munsiyah", "al-qadesiya", "al-khaleej"] },
  { k: "al-qadesiya", n: "حي القادسية", r: "شرق الرياض", rel: ["al-yarmouk", "al-munsiyah", "al-naseem"] },
  { k: "al-naseem", n: "حي النسيم", r: "شرق الرياض", rel: ["al-rawdah", "al-nahdah", "al-manar"] },
  { k: "al-khaleej", n: "حي الخليج", r: "شرق الرياض", rel: ["al-rawdah", "al-yarmouk", "al-nahdah"] },
  { k: "al-nahdah", n: "حي النهضة", r: "شرق الرياض", rel: ["al-naseem", "al-rawdah", "al-khaleej"] },
  { k: "al-manar", n: "حي المنار", r: "شرق الرياض", rel: ["al-naseem", "al-rawdah", "east-riyadh"] },
  { k: "al-hamra", n: "حي الحمراء", r: "شرق الرياض", rel: ["al-qurtubah", "al-shuhada", "al-rawdah"] },
  { k: "al-shuhada", n: "حي الشهداء", r: "شرق الرياض", rel: ["al-qurtubah", "al-hamra", "east-riyadh"] },
  { k: "al-suwaidi", n: "حي السويدي", r: "غرب الرياض", rel: ["dhahrat-laban", "al-uraija", "al-badiyah"] },
  { k: "al-uraija", n: "حي العريجاء", r: "غرب الرياض", rel: ["al-suwaidi", "dhahrat-laban", "al-hazm"] },
  { k: "al-hazm", n: "حي الحزم", r: "غرب الرياض", rel: ["dhahrat-laban", "al-awali", "al-uraija"] },
  { k: "al-badiyah", n: "حي البديعة", r: "غرب الرياض", rel: ["al-suwaidi", "shubra", "west-riyadh"] },
  { k: "shubra", n: "حي شبرا", r: "غرب الرياض", rel: ["al-badiyah", "al-suwaidi", "al-awali"] },
  { k: "al-awali", n: "حي عوالي الرياض", r: "غرب الرياض", rel: ["al-hazm", "shubra", "west-riyadh"] },
  { k: "badr", n: "حي بدر", r: "جنوب الرياض", rel: ["al-shifa", "al-dar-al-baida", "south-riyadh"] },
  { k: "al-hair", n: "حي الحائر", r: "جنوب الرياض", rel: ["al-shifa", "al-manakh", "south-riyadh"] },
  { k: "al-shifa", n: "حي الشفاء", r: "جنوب الرياض", rel: ["badr", "al-aziziyah", "south-riyadh"] },
  { k: "al-aziziyah", n: "حي العزيزية", r: "جنوب الرياض", rel: ["al-shifa", "al-iskan", "south-riyadh"] },
  { k: "al-dar-al-baida", n: "حي الدار البيضاء", r: "جنوب الرياض", rel: ["al-aziziyah", "al-manakh", "south-riyadh"] },
  { k: "al-manakh", n: "حي المناخ", r: "جنوب الرياض", rel: ["al-dar-al-baida", "al-iskan", "al-hair"] },
  { k: "al-iskan", n: "حي الإسكان", r: "جنوب الرياض", rel: ["al-aziziyah", "al-manakh", "south-riyadh"] },
  { k: "al-sulaimaniya", n: "حي السليمانية", r: "وسط الرياض", rel: ["al-olaya", "al-malaz", "central-riyadh"] },
  { k: "al-malaz", n: "حي الملز", r: "وسط الرياض", rel: ["al-sulaimaniya", "al-murabba", "central-riyadh"] },
  { k: "al-murabba", n: "حي المربع", r: "وسط الرياض", rel: ["al-malaz", "al-batha", "al-olaya"] },
  { k: "al-batha", n: "حي البطحاء", r: "وسط الرياض", rel: ["al-murabba", "al-futah", "central-riyadh"] },
  { k: "al-wizarat", n: "حي الوزارات", r: "وسط الرياض", rel: ["al-olaya", "al-sulaimaniya", "central-riyadh"] },
  { k: "al-futah", n: "حي الفوطة", r: "وسط الرياض", rel: ["al-murabba", "al-batha", "central-riyadh"] },
]

for (const item of ALL_NEIGHBORHOOD_KEYS) {
  if (!AREAS[item.k]) {
    AREAS[item.k] = makeAreaFallback(item.n, item.r, item.rel)
  }
}

export const RIYADH_AREA_GROUPS = [
  {
    title: "شمال الرياض",
    slugs: ["north-riyadh", "al-malqa", "al-yasmin", "al-narjis", "al-aarid", "hittin", "al-sahafa", "al-nafal", "al-aqiq", "al-rabi", "al-ghadeer", "al-wadi", "al-nada", "al-falah"],
  },
  {
    title: "شرق الرياض",
    slugs: ["east-riyadh", "al-qadesiya", "al-naseem", "al-rawdah", "al-khaleej", "al-nahdah", "al-manar", "al-yarmouk", "al-munsiyah", "al-hamra", "al-qurtubah", "al-shuhada"],
  },
  {
    title: "غرب الرياض",
    slugs: ["west-riyadh", "al-suwaidi", "al-uraija", "dhahrat-laban", "al-hazm", "al-badiyah", "shubra", "al-awali"],
  },
  {
    title: "جنوب الرياض",
    slugs: ["south-riyadh", "badr", "al-hair", "al-shifa", "al-aziziyah", "al-dar-al-baida", "al-manakh", "al-iskan"],
  },
  {
    title: "وسط الرياض",
    slugs: ["central-riyadh", "al-olaya", "al-sulaimaniya", "al-malaz", "al-murabba", "al-batha", "al-wizarat", "al-futah"],
  },
]

export const ARABIC_AREA_SLUGS: Record<string, string> = {
  "north-riyadh": "شمال-الرياض",
  "south-riyadh": "جنوب-الرياض",
  "east-riyadh": "شرق-الرياض",
  "west-riyadh": "غرب-الرياض",
  "central-riyadh": "وسط-الرياض",
  "al-malqa": "حي-الملقا",
  "al-yasmin": "حي-الياسمين",
  "al-narjis": "حي-النرجس",
  "al-aarid": "حي-العارض",
  "hittin": "حي-حطين",
  "al-sahafa": "حي-الصحافة",
  "al-nafal": "حي-النفل",
  "al-aqiq": "حي-العقيق",
  "al-rabi": "حي-الربيع",
  "al-ghadeer": "حي-الغدير",
  "al-wadi": "حي-الوادي",
  "al-nada": "حي-الندى",
  "al-falah": "حي-الفلاح",
  "al-qadesiya": "حي-القادسية",
  "al-naseem": "حي-النسيم",
  "al-rawdah": "حي-الروضة",
  "al-khaleej": "حي-الخليج",
  "al-nahdah": "حي-النهضة",
  "al-manar": "حي-المنار",
  "al-yarmouk": "حي-اليرموك",
  "al-munsiyah": "حي-المونسية",
  "al-hamra": "حي-الحمراء",
  "al-qurtubah": "حي-قرطبة",
  "al-shuhada": "حي-الشهداء",
  "al-suwaidi": "حي-السويدي",
  "al-uraija": "حي-العريجاء",
  "dhahrat-laban": "حي-ظهرة-لبن",
  "al-hazm": "حي-الحزم",
  "al-badiyah": "حي-البديعة",
  "shubra": "حي-شبرا",
  "al-awali": "حي-العوالي",
  "badr": "حي-بدر",
  "al-hair": "حي-الحائر",
  "al-shifa": "حي-الشفا",
  "al-aziziyah": "حي-العزيزية",
  "al-dar-al-baida": "حي-الدار-البيضاء",
  "al-manakh": "حي-المناخ",
  "al-iskan": "حي-الإسكان",
  "al-olaya": "حي-العليا",
  "al-sulaimaniya": "حي-السليمانية",
  "al-malaz": "حي-الملز",
  "al-murabba": "حي-المربع",
  "al-batha": "حي-البطحاء",
  "al-wizarat": "حي-الوزارات",
  "al-futah": "حي-الفوطة",
}

export function resolveArea(rawSlug: string) {
  if (!rawSlug) return null
  const decoded = decodeURIComponent(rawSlug).trim()
  if (AREAS[decoded]) {
    return { key: decoded, area: AREAS[decoded], slug: ARABIC_AREA_SLUGS[decoded] || decoded }
  }
  for (const [enKey, arSlug] of Object.entries(ARABIC_AREA_SLUGS)) {
    if (arSlug === decoded || arSlug.replace(/^حي-/, "") === decoded.replace(/^حي-/, "")) {
      return { key: enKey, area: AREAS[enKey], slug: arSlug }
    }
  }
  return null
}

export default function NeighborhoodPage() {
  const [, params] = useRoute("/areas/:slug")
  const rawSlug = params?.slug ?? ""
  const resolved = resolveArea(rawSlug)
  const area = resolved?.area
  const activeSlug = resolved?.slug || rawSlug
  const { openModal } = useServiceRequest()
  const { companyName, phoneCall, phoneWhatsapp, logoUrl, priceRange, address, city, region, country } = useSiteSettings()
  const currentCompany = companyName || ""

  const areaTitle = area ? normalizeCompanyText(area.title) : ""
  const areaDescription = area ? normalizeCompanyText(area.description) : ""

  useEffect(() => {
    if (!area) return
    const SITE_URL = getSiteUrl()
    document.title = areaTitle
    const metaDesc = document.querySelector("meta[name='description']")
    if (metaDesc) metaDesc.setAttribute("content", areaDescription)
    const canonical = document.querySelector("link[rel='canonical']")
    if (canonical) canonical.setAttribute("href", `${SITE_URL}/areas/${encodeURIComponent(activeSlug)}`)

    const id = "neighborhood-schema"
    document.getElementById(id)?.remove()
    const script = document.createElement("script")
    script.id = id
    script.type = "application/ld+json"
    script.textContent = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": `${SITE_URL}/#business`,
        "name": `${currentCompany} — فرع ${area.name}`,
        "description": areaDescription,
        "url": `${SITE_URL}/areas/${encodeURIComponent(activeSlug)}`,
        "image": logoUrl || `${SITE_URL}/images/hero-1.webp`,
        "priceRange": priceRange || "$$",
        "telephone": `+966${(phoneCall || "0554498403").replace(/^0/, "")}`,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": address || "طريق الملك فهد",
          "addressLocality": city || "الرياض",
          "addressRegion": region || "منطقة الرياض",
          "addressCountry": country || "SA",
        },
        "areaServed": { "@type": "Place", "name": `${area.name}، الرياض` },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": area.faqs.map(faq => ({
          "@type": "Question",
          "name": faq.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.a
          }
        }))
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": `${SITE_URL}/` },
          { "@type": "ListItem", "position": 2, "name": "أحياء الرياض", "item": `${SITE_URL}/areas` },
          { "@type": "ListItem", "position": 3, "name": area.name, "item": `${SITE_URL}/areas/${encodeURIComponent(activeSlug)}` },
        ],
      },
    ])
    document.head.appendChild(script)
    return () => { document.getElementById(id)?.remove() }
  }, [activeSlug, area, areaTitle, areaDescription, currentCompany, phoneCall, logoUrl, priceRange, address, city, region, country])

  if (!area) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">الحي أو المنطقة غير موجودة</h1>
          <Link href="/areas" className="text-primary font-bold hover:underline">الرجوع إلى دليل أحياء الرياض</Link>
        </main>
        <Footer />
      </div>
    )
  }

  const cleanPhone = (phoneWhatsapp || "0554498403").replace(/[^\d]/g, "")
  const wa = `https://wa.me/966${cleanPhone.replace(/^0/, "")}?text=${encodeURIComponent(`السلام عليكم، أرغب في طلب تأجير حاوية في ${area.name} بالرياض`)}`
  const phoneHref = `tel:${phoneCall || "0554498403"}`

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col" dir="rtl">
      <Navbar />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="pt-28 pb-16 bg-gradient-to-l from-slate-950 via-primary to-slate-900 text-white">
          <div className="container mx-auto px-4 md:px-6">
            <nav aria-label="breadcrumb" className="text-sm text-white/70 mb-6 flex items-center gap-2">
              <Link href="/" className="hover:text-white transition">الرئيسية</Link>
              <ChevronLeft size={14} />
              <Link href="/areas" className="hover:text-white transition">أحياء الرياض</Link>
              <ChevronLeft size={14} />
              <span className="text-secondary font-semibold">{area.name}</span>
            </nav>

            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-secondary/20 text-secondary border border-secondary/30 px-3.5 py-1 rounded-full text-xs font-bold">
                  <MapPin size={13} /> نطاق تغطية {area.region}
                </span>
                <span className="inline-flex items-center gap-1 bg-white/10 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  <Clock size={13} /> وقت الاستجابة والتوصيل: {area.arrivalTime}
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-black leading-tight text-white">
                {area.h1}
              </h1>

              <p className="text-lg md:text-xl text-slate-200 leading-relaxed max-w-3xl">
                {areaDescription}
              </p>

              <div className="flex gap-4 flex-wrap pt-4">
                <button
                  onClick={() => openModal()}
                  className="inline-flex items-center gap-2 bg-secondary text-white px-7 py-3.5 rounded-xl font-black text-base md:text-lg hover:bg-white hover:text-primary transition shadow-lg"
                >
                  <Box size={18} /> اطلب الحاوية الآن
                </button>
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-3.5 rounded-xl font-bold text-base md:text-lg transition shadow-lg"
                >
                  <MessageCircle size={20} /> واتساب فوري
                </a>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 md:px-6 py-12 space-y-12">
          {/* Local Information Gain Box */}
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-base">
                <Home size={20} />
                طبيعة عقارات {area.name}
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">{area.propertyProfile}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-base">
                <MapPin size={20} />
                المحاور والطرق المخدومة
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {area.landmarks.map((l, idx) => (
                  <span key={idx} className="bg-white text-slate-700 text-xs px-2.5 py-1 rounded-md border border-slate-200 font-medium">
                    {l}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-base">
                <Zap size={20} />
                زمن الوصول وفريق العمل
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                فرق عمل متنقلة مجهزة بمكائن الجلي والبخار تصل إلى موقعك في {area.name} خلال <strong>{area.arrivalTime}</strong> مع ضمان كامل على التنفيذ.
              </p>
            </div>
          </section>

          {/* Primary Services in this Neighborhood */}
          <section className="space-y-6">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">
                الخدمات الأكثر طلباً في {area.name}
              </h2>
              <p className="text-slate-600 text-sm md:text-base mt-1">
                خدمات تنظيف متخصصة تنفذ بأعلى معايير الجودة وبأجهزة متطورة.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {area.primaryServices.map((svc, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-primary/40 transition">
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 text-lg">{svc.name}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{svc.desc}</p>
                  </div>
                  <Link
                    href={svc.link}
                    className="inline-flex items-center gap-1.5 text-primary font-bold text-sm hover:text-primary/80 transition"
                  >
                    تفاصيل الخدمة والأسعار <ArrowLeft size={16} />
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* Transparent Local Pricing Section */}
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">باقات وأسعار التنظيف في {area.name}</h2>
              <p className="text-slate-600 text-sm mt-1">أسعار تقديرية واضحة وشاملة لكافة المواد والمعدات والعمالة.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">باقة تنظيف الشقق السكنية</h3>
                    <p className="text-slate-600 text-sm mt-1">شقق مفروشة، جديدة، أو بعد الترميم في {area.name}</p>
                  </div>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-bold">باقة مميزة</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-600" /> غسيل وتعقيم الأرضيات والمطابخ</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-600" /> تنظيف الشبابيك ومجاري الغبار</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-600" /> تعقيم وتطهير دورات المياه بالكامل</li>
                </ul>
                <button
                  onClick={() => openModal({ containerSize: `تنظيف شقق ${area.name}` })}
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition shadow-sm"
                >
                  طلب عرض سعر مجاني
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">باقة تنظيف الفلل والقصور</h3>
                    <p className="text-slate-600 text-sm mt-1">فلل سكنية، ملاحق، وأحواش في {area.name}</p>
                  </div>
                  <span className="bg-amber-400/20 text-amber-800 px-3 py-1 rounded-lg text-xs font-bold">الأكثر طلباً</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-600" /> تنظيف كامل للأدوار والدرج والأحواش</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-600" /> جلي وتلميع رخام المداخل والصالات</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-600" /> غسيل الواجهات الزجاجية والأسوار</li>
                </ul>
                <button
                  onClick={() => openModal({ containerSize: `تنظيف فلل ${area.name}` })}
                  className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold hover:bg-amber-400 transition shadow-sm"
                >
                  طلب عرض سعر مجاني
                </button>
              </div>
            </div>
          </section>

          {/* Localized FAQ Section */}
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <HelpCircle className="text-primary" size={24} />
              <h2 className="text-2xl font-bold text-slate-900">الأسئلة الشائعة حول خدمات التنظيف في {area.name}</h2>
            </div>

            <div className="space-y-4">
              {area.faqs.map((faq, idx) => (
                <div key={idx} className="p-5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                  <h3 className="font-bold text-slate-950 text-base md:text-lg">❓ {faq.q}</h3>
                  <p className="text-slate-700 text-sm md:text-base leading-relaxed pr-6">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Adjacent Neighborhoods Linking Grid */}
          {area.relatedAreas.length > 0 && (
            <section className="bg-slate-100/80 rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MapPin size={20} className="text-primary" />
                أحياء ومناطق مجاورة نخدمها في {area.region}
              </h2>
              <p className="text-slate-600 text-sm">استكشف خدمات التنظيف في الأحياء القريبة من {area.name}:</p>
              <div className="flex flex-wrap gap-2.5 pt-2">
                {area.relatedAreas.map((r) => {
                  const rel = AREAS[r]
                  if (!rel) return null
                  const relArabicSlug = ARABIC_AREA_SLUGS[r] || r
                  return (
                    <Link
                      key={r}
                      href={`/areas/${encodeURIComponent(relArabicSlug)}`}
                      className="px-4 py-2 bg-white border border-slate-200 hover:border-primary text-slate-800 hover:text-primary rounded-xl font-semibold text-sm transition shadow-sm"
                    >
                      {rel.name}
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Bottom Conversion Section */}
          <section className="bg-gradient-to-r from-primary to-slate-900 text-white rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-xl">
            <div className="max-w-2xl mx-auto space-y-3">
              <h2 className="text-3xl md:text-4xl font-black">
                احجز خدمة تنظيف منزلك أو فيلتك الآن في {area.name}
              </h2>
              <p className="text-slate-200 text-base md:text-lg">
                معاينة مجانية • وصول سريع خلال {area.arrivalTime} • ضمان شامل 100%
              </p>
            </div>

            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href={phoneHref}
                className="inline-flex items-center gap-2 bg-white text-slate-950 px-8 py-4 rounded-xl font-black text-lg hover:bg-amber-400 transition shadow-lg"
              >
                <Phone size={20} /> {phoneCall || "0554498403"}
              </a>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition shadow-lg"
              >
                <MessageCircle size={20} /> واتساب مباشر
              </a>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
