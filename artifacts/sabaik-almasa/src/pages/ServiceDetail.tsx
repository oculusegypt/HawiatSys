import { useEffect, useMemo, useState } from "react"
import { Link, useRoute } from "wouter"
import {
  ChevronLeft,
  MessageCircle,
  Phone,
  Settings,
  ShieldCheck,
  Clock,
  Sparkles,
  Award,
  CheckCircle2,
  HelpCircle,
  MapPin,
  Flame,
  ArrowLeft,
  Zap,
  Box,
  Truck,
  FileText,
  Layers,
} from "lucide-react"
import { useGetServices } from "@workspace/api-client-react"
import type { Service } from "@workspace/api-client-react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { ServiceRequestForm } from "@/components/home/ServiceRequestForm"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { siteUrl } from "@/lib/siteUrl"
import { resolveContactNumbers, useSiteSettings } from "@/context/SiteSettingsContext"
import { RIYADH_AREA_GROUPS, AREAS, ARABIC_AREA_SLUGS } from "@/pages/NeighborhoodPage"
import { ServiceReviewsSection } from "@/components/reviews/ServiceReviewsSection"
import { normalizeSeoDescription } from "@/lib/seoText"
import { entityPath, entitySlug, legacyEntitySlug } from "@/lib/friendlySlug"
import { breadcrumbSchema, pageSchema, serviceSchema } from "@/lib/seoSchema"
import { useDocumentSchema } from "@/hooks/useDocumentSchema"

function normalizeSlug(value: string): string {
  return decodeURIComponent(value).trim().toLowerCase()
}

function parseImages(raw: string | undefined, fallback?: string | null): string[] {
  try {
    const images = JSON.parse(raw || "[]")
    if (Array.isArray(images)) return images.filter((image): image is string => typeof image === "string" && image.length > 0)
  } catch {}
  return fallback ? [fallback] : []
}

function findService(services: Service[], slug: string): Service | undefined {
  const normalized = normalizeSlug(slug)
  if (!normalized) return undefined
  return services.find((service) => {
    const sSlug = normalizeSlug(service.seoSlug || "")
    const sTitle = normalizeSlug(service.title || "")
    const sId = String(service.id)
    const sFriendly = entitySlug({ slug: service.seoSlug, title: service.title, id: service.id, fallback: "service" })
    const sLegacy = legacyEntitySlug({ slug: service.seoSlug, title: service.title, id: service.id, fallback: "service" })
    return sSlug === normalized || sFriendly === normalized || sLegacy === normalized || sTitle === normalized || sId === normalized || (normalized.length > 3 && (sSlug.includes(normalized) || normalized.includes(sSlug) || sTitle.includes(normalized) || normalized.includes(sTitle)))
  })
}

function isKeywordSpam(text: string): boolean {
  if (/ , /.test(text)) return true
  const commaCount = (text.match(/,/g) || []).length
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return wordCount > 0 && commaCount / wordCount > 0.25
}

function bodyDescription(service: Service): string {
  const raw = service.description?.trim() || ""
  if (!raw) return "خدمات تأجير الحاويات ونقل الأنقاض بالرياض — تواصل معنا لمزيد من التفاصيل."
  const segments = raw.split(/\.\s+/)
  const clean: string[] = []
  for (const seg of segments) {
    const trimmed = seg.replace(/\.$/, "").trim()
    if (!trimmed) continue
    if (isKeywordSpam(trimmed)) break
    clean.push(trimmed)
  }
  const result = clean.join(". ").trim()
  return result.length > 10 ? result : raw.split(/\.\s+/)[0] || raw
}

function metaDescription(service: Service): string {
  const seo = service.seoDescription?.trim()
  return normalizeSeoDescription(
    seo && !isKeywordSpam(seo) ? seo : bodyDescription(service),
    service.title,
  )
}

// ── بيانات تفصيلية إضافية وقيمة محلية وفنية لكل خدمة ─────────────────────────
const DEFAULT_CONTAINER_INTEL = {
  equipment: ["شاحنات وايت مان هيدروليكية حديثة", "حاويات حديدية مقواة مقاومة للصدمات", "أغطية وشباك حماية مطابقة للاشتراطات البيئية", "رافعات سحب وإنزال متطورة لتفادي الإضرار بالأرصفة"],
  processSteps: [
    { title: "استلام الطلب وتحديد المقاس", desc: "تحديد حجم الحاوية المناسب (12-30 ياردة) ونوع المخلفات بدقة." },
    { title: "التوصيل والتنزيل الميداني", desc: "وصول الشاحنة وتنزيل الحاوية في الموقع المعتمد بطريقة آمنة وسلسة." },
    { title: "فترة الاستخدام والتعبئة", desc: "مدة بقاء الحاوية حتى 10 أيام للرد مع إمكانية التمديد والتنسيق المرن." },
    { title: "السحب والتفريغ في المردم", desc: "تغطية الحاوية بشبك الحماية ونقلها إلى المرادم الرسمية التابعة لأمانة الرياض." }
  ],
  pricingFactors: [
    { factor: "حجم ومقاس الحاوية", detail: "تختلف التكلفة من الحاوية الصغيرة 12 ياردة (400 ريال) إلى الجامبو 30 ياردة (700 ريال)." },
    { factor: "نوع المخلفات", detail: "مخلفات الهدم الثقيلة والخرسانة تختلف عن مخلفات الترميم الخفيفة أو النفايات التجارية." },
    { factor: "الموقع في أحياء الرياض", detail: "تغطية شاملة لكافة أحياء الرياض مع سرعة استجابة فائقة." }
  ],
  faqs: [
    { q: "كم مدة بقاء الحاوية في الموقع؟", a: "مدة بقاء الحاوية القياسية هي 10 أيام للرد الواحد، ويمكن طلب السحب المبكر أو التمديد عند الحاجة." },
    { q: "هل يشمل السعر النقل والتفريغ في المردم الرسمي؟", a: "نعم، السعر شامل توصيل الحاوية، سحبها بعد الامتلاء، والتفريغ النظامي في المرادم المعتمدة من أمانة الرياض." },
    { q: "كيف يتم طلب تفريغ الحاوية أو سحبها؟", a: "يكفي إرسال رسالة واتساب أو الاتصال برقم العمليات لتوجيه السائق وسحب الحاوية خلال وقت قياسي." }
  ]
}

const SERVICE_INTEL: Record<string, {
  equipment: string[]
  processSteps: { title: string; desc: string }[]
  pricingFactors: { factor: string; detail: string }[]
  faqs: { q: string; a: string }[]
}> = {
  "taajir-hawiyat-anqad-alryad": {
    equipment: ["حاويات صلب مقوى 12 و 15 و 20 و 30 ياردة", "شاحنات سحب هيدروليكية ذات قدرة رفع عالية", "أغطية حماية مطابقة للاشتراطات البيئية والأمان"],
    processSteps: [
      { title: "تحديد المقاس المناسب", desc: "مساعدة العميل في اختيار حجم الحاوية الملائم لكمية أنقاض الهدم والترميم." },
      { title: "التوصيل والوضع الآمن", desc: "إنزال الحاوية أمام الموقع أو في الارتداد المسموح دون إعاقة حركة السير." },
      { title: "التعبئة والتحميل", desc: "تعبئة الأنقاض والخرسانة والبلوك حتى الحد المسموح للأمان." },
      { title: "السحب والنقل للمردم", desc: "سحب الحاوية والتفريغ في المقالب والمرادم الرسمية المعتمدة." }
    ],
    pricingFactors: [
      { factor: "مقاس الحاوية", detail: "12 ياردة (400 ريال) - 15 ياردة (450 ريال) - 20 ياردة (600 ريال) - 30 ياردة (700 ريال)." },
      { factor: "عدد الردود", detail: "خصومات خاصة للمشاريع التي تتطلب ردوداً متعددة وعقوداً دورية." }
    ],
    faqs: [
      { q: "ما هي المواد المسموح بوضعها في حاويات الأنقاض؟", a: "يسمح بوضع مخلفات الهدم، الخرسانة، البلوك، الرمل، الجبس، البلاط، والحديد." },
      { q: "كم سرعة التوصيل بعد تأكيد الطلب؟", a: "يتم توصيل الحاوية لموقعك في الرياض خلال ساعتين كحد أقصى للطلبات الفورية." }
    ]
  },
  "aqd-nazafa-baladi-alryad": {
    equipment: ["منصة إلكترونية معتمدة للربط مع بلدي", "حاويات نفايات ومكابس مطابقة للمواصفات", "أسطول جمع دوري مجدول"],
    processSteps: [
      { title: "استلام بيانات المنشأة", desc: "مراجعة رقم السجل التجاري ورخصة النشاط ومساحة المحل أو المبنى." },
      { title: "إصدار العقد الإلكتروني", desc: "توثيق العقد عبر النظام المعتمد وربطه فوراً برخصة بلدي." },
      { title: "توريد الحاوية المخصصة", desc: "توفير حاوية النفايات المناسبة وفق اشتراطات الأمانة للنشاط." },
      { title: "المتابعة والتفريغ الدوري", desc: "جدولة عمليات التفريغ الدورية وضمان نظافة الموقع بانتظام." }
    ],
    pricingFactors: [
      { factor: "نوع النشاط التجاري", detail: "تختلف الاشتراطات للمطاعم والمقاهي عن المكاتب والمستودعات والمحلات." },
      { factor: "سعة الحاوية المطلوبة", detail: "حاويات 6 أو 10 ياردة أو مكابس كهربائية 2 ياردة." }
    ],
    faqs: [
      { q: "هل العقد معتمد رسمياً لتجديد رخصة بلدي؟", a: "نعم، العقد موثق ومعتمد رسمياً ويظهر مباشرة على منصة بلدي لإتمام تجديد أو إصدار الرخصة." },
      { q: "كم يستغرق إصدار العقد الإلكتروني؟", a: "يتم إصدار العقد وتوثيقه خلال دقائق معدودة بعد استلام بيانات المنشأة." }
    ]
  },
  "radm-taswiyat-aradi-alryad": {
    equipment: ["شيولات وبوبكات متطورة", "مداحل دك تربة ثقيلة", "تريلات نقل دفان ورمل نظيف", "أجهزة ليزر لتحديد المناسيب"],
    processSteps: [
      { title: "المعاينة الهندسية", desc: "فحص مساحة الأرض ومستوى الانخفاض عن الشارع وتحديد كمية الدفان." },
      { title: "توريد مواد الدفان المعتمدة", desc: "نقل الرمل والدفان الصخري النظيف المطابق للمواصفات الإنشائية." },
      { title: "الفرد والتسوية بالليزر", desc: "فرد التربة على طبقات متساوية وضبط المنسوب بدقة عالية." },
      { title: "الرش والدك الميكانيكي", desc: "رش المياه والدك بالمداحل الثقيلة لتحقيق أعلى درجات التماسك." }
    ],
    pricingFactors: [
      { factor: "مساحة الأرض وعمق الردم", detail: "حجم الدفان بالمتر المكعب وعدد ردود التريلات." },
      { factor: "نوعية التربة المطلوبة", detail: "دفان صخري، رمل أحمر، أو صبيز حسب التقرير الجيوتقني." }
    ],
    faqs: [
      { q: "هل تقدمون تقرير اختبار كثافة الدك؟", a: "نعم، يتم التنسيق مع مختبرات فحص التربة المعتمدة عند طلب العميل." },
      { q: "كم تستغرق تسوية الأرض السكنية؟", a: "تستغرق الأرض السكنية المتوسطة من يوم إلى 3 أيام عمل حسب العمق والمساحة." }
    ]
  }
}

export default function ServiceDetail() {
  const [, params] = useRoute("/services/:slug")
  const slug = params?.slug ? decodeURIComponent(params.slug) : ""
  const { data: services, isLoading } = useGetServices()
  const [service, setService] = useState<Service | null>(null)
  const { phoneCall, phoneWhatsapp, phones, companyName, address, city, region, country, googleBusinessProfile } = useSiteSettings()
  const { call, whatsapp } = resolveContactNumbers(phoneCall, phoneWhatsapp, phones)

  useEffect(() => {
    if (!services) return
    setService(findService(services.filter((item) => item.isActive), slug) || null)
  }, [services, slug])

  const images = useMemo(
    () => service ? parseImages(service.images, service.imageUrl) : [],
    [service],
  )
  const resolvedCompany = companyName || ""
  const bodyText = service ? bodyDescription(service) : (companyName ? `تعرف على خدمات ${companyName} لتأجير الحاويات ونقل الأنقاض في الرياض.` : "تعرف على خدمات تأجير الحاويات ونقل الأنقاض في الرياض.")
  const metaText = service ? metaDescription(service) : (companyName ? `خدمات تأجير حاويات ونقل مخلفات احترافية في الرياض من ${companyName} بأسطول حديث 24/7.` : "خدمات تأجير حاويات ونقل مخلفات احترافية في الرياض بأسطول حديث 24/7.")
  const title = service ? (companyName ? `${service.seoTitle?.trim() || service.title} | ${companyName}` : (service.seoTitle?.trim() || service.title)) : (companyName ? `خدمات الحاويات بالرياض | ${companyName}` : "خدمات تأجير الحاويات بالرياض")
  const canonical = siteUrl(`/services/${entityPath({ slug: service?.seoSlug, title: service?.title, id: service?.id, fallback: "service" })}`)

  const activeIntel = (service?.seoSlug && SERVICE_INTEL[service.seoSlug]) || DEFAULT_CONTAINER_INTEL

  useDocumentSEO({
    title,
    description: metaText,
    keywords: service?.seoKeywords || `${service?.title || "حاويات"}, تأجير حاويات بالرياض, حاويات أنقاض الرياض, حاويات نفايات الرياض`,
    canonical,
    ogType: "website",
    ogImage: images[0] || "/images/hero-1.webp",
    indexable: Boolean(service) && (typeof window === "undefined" || window.location.pathname.startsWith("/services/")),
  })

  const serviceSchemaValue = service ? {
    "@graph": [
      pageSchema({
        id: "webpage",
        type: "WebPage",
        name: service.title,
        description: metaText,
        url: canonical,
        image: images[0] || "/images/seo/taqi-services.jpg",
        companyName: resolvedCompany || "المنشأة",
        about: service.title,
      }),
      serviceSchema({
        service: service.title,
        description: metaText,
        url: canonical,
        image: images[0] || "/images/seo/taqi-services.jpg",
        companyName: resolvedCompany || "المنشأة",
        phoneNumbers: [phoneCall, phoneWhatsapp, ...phones],
        address,
        city,
        region,
        country,
        googleBusinessProfile,
      }),
      {
        "@type": "FAQPage",
        "@id": `${canonical}#faq`,
        "mainEntity": activeIntel.faqs.map(faq => ({
          "@type": "Question",
          "name": faq.q,
          "acceptedAnswer": { "@type": "Answer", "text": faq.a },
        })),
      },
      breadcrumbSchema([
        { name: "الرئيسية", url: siteUrl("/") },
        { name: "الخدمات", url: siteUrl("/services") },
        { name: service.title, url: canonical },
      ]),
    ],
  } : null
  useDocumentSchema("service-detail-schema", serviceSchemaValue, Boolean(service))

  const waHref = whatsapp
    ? `https://wa.me/966${whatsapp.replace(/^0/, "")}?text=${encodeURIComponent(`مرحباً، أود الاستفسار عن خدمة ${service?.title || "الحاويات"}`)}`
    : ""

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900" dir="rtl">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-slate-800">الخدمة غير موجودة</h1>
            <p className="text-slate-500">لم يتم العثور على الخدمة المطلوبة أو تم تغيير الرابط.</p>
            <Link href="/" className="inline-block bg-primary text-white px-6 py-2.5 rounded-xl font-bold">
              العودة للرئيسية
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans" dir="rtl">
      <Navbar />

      {/* Hero Header */}
      <div className="pt-28 pb-16 bg-gradient-to-l from-slate-950 via-primary to-slate-900 text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center gap-2 text-white/70 text-sm mb-4">
            <Link href="/" className="hover:text-white transition-colors">الرئيسية</Link>
            <ChevronLeft size={14} />
             <Link href="/services" className="hover:text-white transition-colors" data-testid="link-service-detail-services">الخدمات</Link>
            <ChevronLeft size={14} />
            <span className="text-secondary font-semibold">{service.title}</span>
          </div>

          <div className="max-w-3xl">
            <span className="inline-block bg-secondary/20 text-secondary border border-secondary/30 px-3 py-1 rounded-full text-xs font-bold mb-3">
              خدمة معتمدة في كافة أحياء الرياض
            </span>
            <h1 className="text-3xl md:text-5xl font-black leading-tight text-white mb-4">
              {service.title}
            </h1>
            <div className="flex flex-wrap gap-4">
              {call && (
                <a
                  href={`tel:${call}`}
                  className="inline-flex items-center gap-2 bg-white text-slate-950 px-6 py-3 rounded-xl font-bold hover:bg-secondary hover:text-white transition shadow-lg text-sm"
                >
                  <Phone size={16} /> اتصل بالعمليات
                </a>
              )}
              {whatsapp && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg text-sm"
                >
                  <MessageCircle size={16} /> واتساب فوري
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* Main Column */}
            <div className="lg:col-span-2 space-y-10">

              {/* Service Images */}
              {images.length > 0 && (
                <div className="rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-white">
                  <img
                    src={images[0]}
                    alt={service.title}
                    width="1280"
                    height="720"
                    className="w-full h-80 md:h-96 object-cover"
                  />
                </div>
              )}

              {/* Content Description Card */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 border-b pb-4">
                  تفاصيل خدمة {service.title}
                </h2>
                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed text-base">
                  <p>{bodyText}</p>
                </div>

                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <ShieldCheck className="text-primary" size={24} />
                    <span className="text-xs font-bold text-slate-800">تصاريح رسمية من أمانة الرياض</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <Clock className="text-secondary" size={24} />
                    <span className="text-xs font-bold text-slate-800">توصيل وسحب خلال ساعتين 24/7</span>
                  </div>
                </div>
              </div>

              {/* Process Steps */}
              {activeIntel.processSteps && (
                <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    خطوات تنفيذ الخدمة
                  </h2>
                  <div className="space-y-4">
                    {activeIntel.processSteps.map((step, idx) => (
                      <div key={idx} className="flex gap-4 items-start p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm mb-1">{step.title}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment & Fleet */}
              {activeIntel.equipment && (
                <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                  <h2 className="text-xl font-bold text-slate-900">
                    المعدات والأسطول المستخدم
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeIntel.equipment.map((eq, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-700 p-2.5 rounded-xl bg-slate-50">
                        <CheckCircle2 size={16} className="text-secondary shrink-0" />
                        <span>{eq}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FAQs */}
              {activeIntel.faqs && (
                <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    الأسئلة الشائعة حول {service.title}
                  </h2>
                  <div className="space-y-4">
                    {activeIntel.faqs.map((faq, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <HelpCircle size={16} className="text-primary shrink-0" />
                          {faq.q}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed pr-6">
                          {faq.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews */}
              <ServiceReviewsSection serviceId={service.id} serviceTitle={service.title} />

            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* Quick Request Card */}
              <div className="bg-gradient-to-br from-primary to-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
                <h3 className="text-xl font-bold text-white">طلب الخدمة فوراً</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  تواصل معنا هاتفياً أو عبر واتساب لحجز الحاوية أو تحديد موعد المعاينة.
                </p>
                <div className="space-y-2 pt-2">
                  {call && (
                    <a
                      href={`tel:${call}`}
                      className="w-full py-3 bg-secondary hover:bg-secondary/90 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow"
                    >
                      <Phone size={14} /> اتصل الآن: {call}
                    </a>
                  )}
                  {whatsapp && (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow"
                    >
                      <MessageCircle size={14} /> تواصل عبر واتساب
                    </a>
                  )}
                </div>
              </div>

              {/* Other Services */}
              {services && services.length > 1 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-base font-bold text-slate-900 mb-2">خدمات وحاويات أخرى</h3>
                  <div className="space-y-2">
                    {services.filter(s => s.id !== service.id && s.isActive).map(s => (
                      <Link
                        key={s.id}
                        href={`/services/${entityPath({ slug: s.seoSlug, title: s.title, id: s.id, fallback: "service" })}`}
                        className="block p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition group"
                      >
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-primary transition-colors flex items-center justify-between">
                          <span>{s.title}</span>
                          <ChevronLeft size={14} className="text-slate-400 group-hover:text-primary" />
                        </h4>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Areas Served */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-base font-bold text-slate-900 mb-2">تغطية أحياء الرياض</h3>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {Object.entries(AREAS).slice(0, 12).map(([slug, area]) => {
                    const arSlug = ARABIC_AREA_SLUGS[slug] || slug
                    return (
                      <Link
                        key={slug}
                        href={`/areas/${arSlug}`}
                        className="bg-slate-100 hover:bg-primary hover:text-white text-slate-700 px-2.5 py-1 rounded-lg transition"
                      >
                        {area.name}
                      </Link>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Service Request Section */}
      <ServiceRequestForm />

      <Footer />
    </div>
  )
}