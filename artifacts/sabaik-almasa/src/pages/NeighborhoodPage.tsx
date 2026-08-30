import { Link, useRoute } from "wouter"
import {
  ArrowLeft,
  Box,
  CheckCircle,
  ChevronLeft,
  Clock,
  HelpCircle,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Truck,
} from "lucide-react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { useServiceRequest } from "@/context/ServiceRequestContext"
import { normalizeCompanyText, useSiteSettings } from "@/context/SiteSettingsContext"
import { siteUrl } from "@/lib/siteUrl"
import { normalizeSeoDescription } from "@/lib/seoText"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { useDocumentSchema } from "@/hooks/useDocumentSchema"

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

type AreaDefinition = {
  key: string
  name: string
  region: string
  relatedAreas: string[]
}

const AREA_DEFINITIONS: AreaDefinition[] = [
  { key: "north-riyadh", name: "شمال الرياض", region: "شمال الرياض", relatedAreas: ["al-malqa", "al-yasmin", "al-narjis", "al-aarid", "hittin"] },
  { key: "al-malqa", name: "حي الملقا", region: "شمال الرياض", relatedAreas: ["al-yasmin", "hittin", "al-sahafa", "al-aqiq"] },
  { key: "al-yasmin", name: "حي الياسمين", region: "شمال الرياض", relatedAreas: ["al-malqa", "al-narjis", "al-aarid", "al-sahafa"] },
  { key: "al-narjis", name: "حي النرجس", region: "شمال الرياض", relatedAreas: ["al-yasmin", "al-aarid", "al-nafal", "al-falah"] },
  { key: "al-aarid", name: "حي العارض", region: "شمال الرياض", relatedAreas: ["al-narjis", "al-yasmin", "al-malqa", "north-riyadh"] },
  { key: "hittin", name: "حي حطين", region: "شمال الرياض", relatedAreas: ["al-malqa", "al-sahafa", "al-aqiq", "north-riyadh"] },
  { key: "al-sahafa", name: "حي الصحافة", region: "شمال الرياض", relatedAreas: ["al-malqa", "al-yasmin", "al-aqiq", "al-ghadeer"] },
  { key: "al-nafal", name: "حي النفل", region: "شمال الرياض", relatedAreas: ["al-wadi", "al-ghadeer", "al-yasmin"] },
  { key: "al-aqiq", name: "حي العقيق", region: "شمال الرياض", relatedAreas: ["hittin", "al-sahafa", "al-ghadeer", "al-malqa"] },
  { key: "al-rabi", name: "حي الربيع", region: "شمال الرياض", relatedAreas: ["al-sahafa", "al-yasmin", "al-ghadeer"] },
  { key: "al-ghadeer", name: "حي الغدير", region: "شمال الرياض", relatedAreas: ["al-nafal", "al-sahafa", "al-wadi"] },
  { key: "al-wadi", name: "حي الوادي", region: "شمال الرياض", relatedAreas: ["al-nafal", "al-falah", "al-nada"] },
  { key: "al-nada", name: "حي الندى", region: "شمال الرياض", relatedAreas: ["al-falah", "al-wadi", "north-riyadh"] },
  { key: "al-falah", name: "حي الفلاح", region: "شمال الرياض", relatedAreas: ["al-nada", "al-wadi", "al-narjis"] },
  { key: "east-riyadh", name: "شرق الرياض", region: "شرق الرياض", relatedAreas: ["al-rawdah", "al-yarmouk", "al-munsiyah", "al-qurtubah", "al-naseem"] },
  { key: "al-qadesiya", name: "حي القادسية", region: "شرق الرياض", relatedAreas: ["al-yarmouk", "al-munsiyah", "al-naseem"] },
  { key: "al-naseem", name: "حي النسيم", region: "شرق الرياض", relatedAreas: ["al-rawdah", "al-nahdah", "al-manar"] },
  { key: "al-rawdah", name: "حي الروضة", region: "شرق الرياض", relatedAreas: ["al-nahdah", "al-khaleej", "al-qurtubah"] },
  { key: "al-khaleej", name: "حي الخليج", region: "شرق الرياض", relatedAreas: ["al-rawdah", "al-yarmouk", "al-nahdah"] },
  { key: "al-nahdah", name: "حي النهضة", region: "شرق الرياض", relatedAreas: ["al-naseem", "al-rawdah", "al-khaleej"] },
  { key: "al-manar", name: "حي المنار", region: "شرق الرياض", relatedAreas: ["al-naseem", "al-rawdah", "east-riyadh"] },
  { key: "al-yarmouk", name: "حي اليرموك", region: "شرق الرياض", relatedAreas: ["al-munsiyah", "al-qadesiya", "al-khaleej"] },
  { key: "al-munsiyah", name: "حي المونسية", region: "شرق الرياض", relatedAreas: ["al-qurtubah", "al-yarmouk", "al-qadesiya"] },
  { key: "al-hamra", name: "حي الحمراء", region: "شرق الرياض", relatedAreas: ["al-qurtubah", "al-shuhada", "al-rawdah"] },
  { key: "al-qurtubah", name: "حي قرطبة", region: "شرق الرياض", relatedAreas: ["al-munsiyah", "al-yarmouk", "al-hamra"] },
  { key: "al-shuhada", name: "حي الشهداء", region: "شرق الرياض", relatedAreas: ["al-qurtubah", "al-hamra", "east-riyadh"] },
  { key: "west-riyadh", name: "غرب الرياض", region: "غرب الرياض", relatedAreas: ["dhahrat-laban", "al-suwaidi", "al-uraija", "al-badiyah"] },
  { key: "al-suwaidi", name: "حي السويدي", region: "غرب الرياض", relatedAreas: ["dhahrat-laban", "al-uraija", "al-badiyah"] },
  { key: "al-uraija", name: "حي العريجاء", region: "غرب الرياض", relatedAreas: ["al-suwaidi", "dhahrat-laban", "al-hazm"] },
  { key: "dhahrat-laban", name: "حي ظهرة لبن", region: "غرب الرياض", relatedAreas: ["al-uraija", "al-suwaidi", "al-hazm"] },
  { key: "al-hazm", name: "حي الحزم", region: "غرب الرياض", relatedAreas: ["dhahrat-laban", "al-awali", "al-uraija"] },
  { key: "al-badiyah", name: "حي البديعة", region: "غرب الرياض", relatedAreas: ["al-suwaidi", "shubra", "west-riyadh"] },
  { key: "shubra", name: "حي شبرا", region: "غرب الرياض", relatedAreas: ["al-badiyah", "al-suwaidi", "al-awali"] },
  { key: "al-awali", name: "حي عوالي الرياض", region: "غرب الرياض", relatedAreas: ["al-hazm", "shubra", "west-riyadh"] },
  { key: "south-riyadh", name: "جنوب الرياض", region: "جنوب الرياض", relatedAreas: ["al-shifa", "badr", "al-aziziyah", "al-dar-al-baida"] },
  { key: "badr", name: "حي بدر", region: "جنوب الرياض", relatedAreas: ["al-shifa", "al-dar-al-baida", "south-riyadh"] },
  { key: "al-hair", name: "حي الحائر", region: "جنوب الرياض", relatedAreas: ["al-shifa", "al-manakh", "south-riyadh"] },
  { key: "al-shifa", name: "حي الشفا", region: "جنوب الرياض", relatedAreas: ["badr", "al-aziziyah", "south-riyadh"] },
  { key: "al-aziziyah", name: "حي العزيزية", region: "جنوب الرياض", relatedAreas: ["al-shifa", "al-iskan", "south-riyadh"] },
  { key: "al-dar-al-baida", name: "حي الدار البيضاء", region: "جنوب الرياض", relatedAreas: ["al-aziziyah", "al-manakh", "south-riyadh"] },
  { key: "al-manakh", name: "حي المناخ", region: "جنوب الرياض", relatedAreas: ["al-dar-al-baida", "al-iskan", "al-hair"] },
  { key: "al-iskan", name: "حي الإسكان", region: "جنوب الرياض", relatedAreas: ["al-aziziyah", "al-manakh", "south-riyadh"] },
  { key: "central-riyadh", name: "وسط الرياض", region: "وسط الرياض", relatedAreas: ["al-olaya", "al-sulaimaniya", "al-malaz", "al-murabba"] },
  { key: "al-olaya", name: "حي العليا", region: "وسط الرياض", relatedAreas: ["al-sulaimaniya", "al-malaz", "al-murabba"] },
  { key: "al-sulaimaniya", name: "حي السليمانية", region: "وسط الرياض", relatedAreas: ["al-olaya", "al-malaz", "central-riyadh"] },
  { key: "al-malaz", name: "حي الملز", region: "وسط الرياض", relatedAreas: ["al-sulaimaniya", "al-murabba", "central-riyadh"] },
  { key: "al-murabba", name: "حي المربع", region: "وسط الرياض", relatedAreas: ["al-malaz", "al-batha", "al-olaya"] },
  { key: "al-batha", name: "حي البطحاء", region: "وسط الرياض", relatedAreas: ["al-murabba", "al-futah", "central-riyadh"] },
  { key: "al-wizarat", name: "حي الوزارات", region: "وسط الرياض", relatedAreas: ["al-olaya", "al-sulaimaniya", "central-riyadh"] },
  { key: "al-futah", name: "حي الفوطة", region: "وسط الرياض", relatedAreas: ["al-murabba", "al-batha", "central-riyadh"] },
]

const REGION_LANDMARKS: Record<string, string[]> = {
  "شمال الرياض": ["طريق الملك سلمان", "طريق أنس بن مالك", "طريق الملك فهد"],
  "شرق الرياض": ["طريق خريص", "طريق الدمام", "طريق الثمامة"],
  "غرب الرياض": ["الدائري الغربي", "طريق مكة المكرمة", "شارع حمزة بن عبد المطلب"],
  "جنوب الرياض": ["الدائري الجنوبي", "طريق ديراب", "طريق الحائر"],
  "وسط الرياض": ["طريق الملك فهد", "طريق مكة", "طريق الملك عبد العزيز"],
}

const REGION_ARRIVAL: Record<string, string> = {
  "شمال الرياض": "30 — 45 دقيقة",
  "شرق الرياض": "30 — 45 دقيقة",
  "غرب الرياض": "30 — 45 دقيقة",
  "جنوب الرياض": "35 — 50 دقيقة",
  "وسط الرياض": "25 — 35 دقيقة",
}

function createAreaData(definition: AreaDefinition): AreaData {
  const location = definition.name.includes("الرياض") ? definition.name : `${definition.name} بالرياض`
  const serviceKeywords = [
    `تأجير حاويات ${definition.name}`,
    `حاويات أنقاض ${location}`,
    `نقل مخلفات البناء ${location}`,
    `حاويات نفايات ${location}`,
  ]

  return {
    name: definition.name,
    region: definition.region,
    title: `تأجير حاويات ونقل مخلفات ${location} | المنشأة`,
    description: `نوفر في ${location} حاويات الأنقاض والنفايات ونقل مخلفات البناء، مع تنسيق التوصيل والسحب والتبديل حسب نوع المخلفات وموقع المشروع.`,
    h1: `تأجير حاويات ونقل مخلفات في ${location}`,
    keywords: serviceKeywords,
    relatedAreas: definition.relatedAreas,
    landmarks: REGION_LANDMARKS[definition.region] ?? ["الطرق الرئيسية في الرياض"],
    propertyProfile: `حلول مناسبة لمشاريع البناء والترميم والمنشآت التجارية والمجمعات السكنية في ${definition.name}.`,
    arrivalTime: REGION_ARRIVAL[definition.region] ?? "30 — 45 دقيقة",
    primaryServices: [
      {
        name: "حاويات الأنقاض ومخلفات البناء",
        link: "/containers/debris",
        desc: "حاويات بمقاسات مناسبة للهدم والترميم والإنشاءات مع توصيل وسحب منسق.",
      },
      {
        name: "حاويات النفايات والمكابس",
        link: "/containers/waste",
        desc: "حلول للمنشآت والمطاعم والمجمعات مع جداول تفريغ وتبديل حسب حجم التشغيل.",
      },
      {
        name: "نقل المخلفات وعقود المواقع",
        link: "/services",
        desc: "رفع ونقل منظم للمخلفات ومتابعة رقمية لطلبات المواقع والعقود.",
      },
    ],
    faqs: [
      {
        q: `هل تتوفر حاويات أنقاض في ${location}؟`,
        a: `نعم، ننسق توصيل حاويات الأنقاض لمشاريع البناء والترميم والهدم في ${location} حسب المقاس المطلوب.`,
      },
      {
        q: `كيف يتم تحديد سعر الحاوية في ${location}؟`,
        a: "يعتمد العرض على حجم الحاوية ونوع المخلفات وموقع التوصيل ومدة التأجير، ويؤكد قبل التنفيذ.",
      },
      {
        q: "هل تشمل الخدمة سحب الحاوية أو تبديلها؟",
        a: "نعم، يتم تنسيق السحب أو التبديل مع العميل وفق الموعد واحتياج المشروع.",
      },
    ],
  }
}

export const AREAS: Record<string, AreaData> = Object.fromEntries(
  AREA_DEFINITIONS.map((definition) => [definition.key, createAreaData(definition)]),
)

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
] as const

export const ARABIC_AREA_SLUGS: Record<string, string> = Object.fromEntries(
  AREA_DEFINITIONS.map(({ key, name }) => [key, name.replace(/^حي\s+/u, "حي-").replace(/\s+/g, "-")]),
)

export function resolveArea(rawSlug: string) {
  if (!rawSlug) return null

  let decoded = rawSlug.trim()
  try {
    decoded = decodeURIComponent(rawSlug).trim()
  } catch {
    return null
  }

  if (AREAS[decoded]) {
    return { key: decoded, area: AREAS[decoded], slug: ARABIC_AREA_SLUGS[decoded] || decoded }
  }

  const match = Object.entries(ARABIC_AREA_SLUGS).find(([, arabicSlug]) => (
    arabicSlug === decoded || arabicSlug.replace(/^حي-/, "") === decoded.replace(/^حي-/, "")
  ))
  if (!match) return null

  const [key] = match
  return { key, area: AREAS[key], slug: ARABIC_AREA_SLUGS[key] }
}

export default function NeighborhoodPage() {
  const [, latinParams] = useRoute("/areas/:slug")
  const [, arabicParams] = useRoute("/الأحياء/:slug")
  const rawSlug = latinParams?.slug ?? arabicParams?.slug ?? ""
  const resolved = resolveArea(rawSlug)
  const area = resolved?.area
  const activeSlug = resolved?.slug || rawSlug
  const { openModal } = useServiceRequest()
  const {
    companyName,
    phoneCall,
    phoneWhatsapp,
    logoUrl,
    priceRange,
    address,
    city,
    region,
    country,
  } = useSiteSettings()
  const currentCompany = companyName || "المنشأة"
  const areaTitle = area ? normalizeCompanyText(area.title) : ""
  const areaDescription = area
    ? normalizeSeoDescription(normalizeCompanyText(area.description), area.name)
    : ""
  const canonical = area ? siteUrl(`/areas/${encodeURIComponent(activeSlug)}`) : siteUrl("/areas")

  useDocumentSEO({
    title: areaTitle || "أحياء الرياض وخدمات تأجير الحاويات",
    description: areaDescription || "تعرف على خدمات تأجير الحاويات ونقل مخلفات البناء في أحياء الرياض.",
    keywords: area?.keywords.join("، "),
    canonical,
    ogImage: "/images/seo/taqi-areas.jpg",
    ogImageAlt: area ? `تأجير الحاويات ونقل المخلفات في ${area.name}` : "خدمات تأجير الحاويات في أحياء الرياض",
    indexable: Boolean(area),
  })

  useDocumentSchema("neighborhood-schema", area ? [
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": `${siteUrl("/") }#local-business`,
        name: `${currentCompany} — ${area.name}`,
        description: areaDescription,
        url: canonical,
        image: logoUrl || siteUrl("/images/logo.png"),
        priceRange: priceRange || "$$",
        ...(phoneCall ? { telephone: `+966${phoneCall.replace(/^0/, "")}` } : {}),
        address: {
          "@type": "PostalAddress",
          streetAddress: address || "الرياض",
          addressLocality: city || "الرياض",
          addressRegion: region || "منطقة الرياض",
          addressCountry: country || "SA",
        },
        areaServed: { "@type": "Place", name: `${area.name}، الرياض` },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: area.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: siteUrl("/") },
          { "@type": "ListItem", position: 2, name: "أحياء الرياض", item: siteUrl("/areas") },
          { "@type": "ListItem", position: 3, name: area.name, item: canonical },
        ],
      },
    ] : null, Boolean(area))

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

  const whatsappDigits = String(phoneWhatsapp || "").replace(/[^\d]/g, "")
  const wa = whatsappDigits
    ? `https://wa.me/966${whatsappDigits.replace(/^0/, "")}?text=${encodeURIComponent(`السلام عليكم، أرغب في طلب تأجير حاوية في ${area.name} بالرياض`)}`
    : ""
  const phoneHref = phoneCall ? `tel:${phoneCall}` : ""

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col" dir="rtl">
      <Navbar />

      <main className="flex-1">
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
                  <Clock size={13} /> وقت التوصيل: {area.arrivalTime}
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-black leading-tight text-white">{area.h1}</h1>
              <p className="text-lg md:text-xl text-slate-200 leading-relaxed max-w-3xl">{areaDescription}</p>

              <div className="flex gap-4 flex-wrap pt-4">
                <button
                  type="button"
                  onClick={() => openModal()}
                  className="inline-flex items-center gap-2 bg-secondary text-white px-7 py-3.5 rounded-xl font-black text-base md:text-lg hover:bg-white hover:text-primary transition shadow-lg"
                >
                  <Box size={18} /> اطلب الحاوية الآن
                </button>
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-3.5 rounded-xl font-bold text-base md:text-lg transition shadow-lg"
                  >
                    <MessageCircle size={20} /> واتساب فوري
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 md:px-6 py-12 space-y-12">
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-base">
                <ShieldCheck size={20} /> حلول مناسبة لموقعك
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">{area.propertyProfile}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-base">
                <MapPin size={20} /> المحاور والطرق المخدومة
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {area.landmarks.map((landmark) => (
                  <span key={landmark} className="bg-white text-slate-700 text-xs px-2.5 py-1 rounded-md border border-slate-200 font-medium">
                    {landmark}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-base">
                <Truck size={20} /> التوصيل والسحب
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                أسطول نقل وحاويات مجهز يصل إلى موقعك خلال <strong>{area.arrivalTime}</strong> مع تنسيق واضح للتوصيل والسحب.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">الخدمات الأكثر طلباً في {area.name}</h2>
              <p className="text-slate-600 text-sm md:text-base mt-1">حلول عملية للحاويات ونقل المخلفات بمواعيد مؤكدة وتنسيق واضح.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {area.primaryServices.map((service) => (
                <div key={service.name} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-primary/40 transition">
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 text-lg">{service.name}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{service.desc}</p>
                  </div>
                  <Link href={service.link} className="inline-flex items-center gap-1.5 text-primary font-bold text-sm hover:text-primary/80 transition">
                    تفاصيل الخدمة <ArrowLeft size={16} />
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">خيارات الحاويات في {area.name}</h2>
              <p className="text-slate-600 text-sm mt-1">نحدد العرض حسب المقاس ونوع المخلفات وموقع التوصيل ومدة التأجير.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">حاوية أنقاض لمشاريع البناء</h3>
                    <p className="text-slate-600 text-sm mt-1">للهدم والترميم ومخلفات التشطيب</p>
                  </div>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-bold">خيار عملي</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-600" /> مقاسات تناسب كمية مخلفات المشروع</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-600" /> توصيل إلى الموقع وسحب بعد الامتلاء</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-600" /> تأكيد الموعد قبل التنفيذ</li>
                </ul>
                <button type="button" onClick={() => openModal({ containerSize: `حاوية أنقاض ${area.name}` })} className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition shadow-sm">
                  اطلب عرض الحاوية
                </button>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">حاويات النفايات والمكابس</h3>
                    <p className="text-slate-600 text-sm mt-1">للمنشآت والمطاعم والمجمعات</p>
                  </div>
                  <span className="bg-amber-400/20 text-amber-800 px-3 py-1 rounded-lg text-xs font-bold">الأكثر طلباً</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-600" /> حاويات ومكابس حسب حجم التشغيل</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-600" /> جداول تفريغ أو تبديل منتظمة</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-600" /> متابعة من فريق العمليات</li>
                </ul>
                <button type="button" onClick={() => openModal({ containerSize: `حاوية نفايات أو مكبس ${area.name}` })} className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold hover:bg-amber-400 transition shadow-sm">
                  اطلب عرض الحاوية
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <HelpCircle className="text-primary" size={24} />
              <h2 className="text-2xl font-bold text-slate-900">الأسئلة الشائعة في {area.name}</h2>
            </div>
            <div className="space-y-4">
              {area.faqs.map((faq) => (
                <div key={faq.q} className="p-5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                  <h3 className="font-bold text-slate-950 text-base md:text-lg">{faq.q}</h3>
                  <p className="text-slate-700 text-sm md:text-base leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          {area.relatedAreas.length > 0 && (
            <section className="bg-slate-100/80 rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MapPin size={20} className="text-primary" /> أحياء ومناطق مجاورة في {area.region}
              </h2>
              <p className="text-slate-600 text-sm">استكشف خدمة تأجير الحاويات ونقل المخلفات في الأحياء القريبة.</p>
              <div className="flex flex-wrap gap-2.5 pt-2">
                {area.relatedAreas.map((relatedKey) => {
                  const relatedArea = AREAS[relatedKey]
                  if (!relatedArea) return null
                  const relatedSlug = ARABIC_AREA_SLUGS[relatedKey] || relatedKey
                  return (
                    <Link key={relatedKey} href={`/areas/${encodeURIComponent(relatedSlug)}`} className="px-4 py-2 bg-white border border-slate-200 hover:border-primary text-slate-800 hover:text-primary rounded-xl font-semibold text-sm transition shadow-sm">
                      {relatedArea.name}
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          <section className="bg-gradient-to-r from-primary to-slate-900 text-white rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-xl">
            <div className="max-w-2xl mx-auto space-y-3">
              <h2 className="text-3xl md:text-4xl font-black">اطلب حاوية أو نقل مخلفات الآن في {area.name}</h2>
              <p className="text-slate-200 text-base md:text-lg">مقاسات متعددة • توصيل وسحب منسق • تأكيد سريع للموعد</p>
            </div>
            <div className="flex gap-4 justify-center flex-wrap">
              {phoneCall && (
                <a href={phoneHref} className="inline-flex items-center gap-2 bg-white text-slate-950 px-8 py-4 rounded-xl font-black text-lg hover:bg-amber-400 transition shadow-lg">
                  <Phone size={20} /> {phoneCall}
                </a>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition shadow-lg">
                  <MessageCircle size={20} /> واتساب مباشر
                </a>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}