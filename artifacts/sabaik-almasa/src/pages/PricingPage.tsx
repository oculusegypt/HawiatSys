import { useMemo } from "react"
import { Link } from "wouter"
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronLeft, Clock3, MapPin, MessageCircle, Phone, RefreshCw, Ruler, Scale, Truck } from "lucide-react"
import { useGetContainers } from "@workspace/api-client-react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { useServiceRequest } from "@/context/ServiceRequestContext"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { useDocumentSchema } from "@/hooks/useDocumentSchema"
import { getContainerImage, ARABIC_CATEGORY_NAMES } from "@/components/home/packages/PackageCard"
import { siteUrl } from "@/lib/siteUrl"
import { entityPath } from "@/lib/friendlySlug"

const FACTORS = [
  { icon: Ruler, title: "المقاس والسعة", desc: "نطابق حجم الحاوية مع كمية المخلفات ومساحة الوقوف في موقعك." },
  { icon: Scale, title: "نوع المخلفات", desc: "الأنقاض والخرسانة والنفايات التجارية تحتاج حلولاً وجدولة مختلفة." },
  { icon: Clock3, title: "مدة الإيجار", desc: "تظهر مدة البقاء المتاحة لكل حاوية كما سجلها فريق العمليات." },
  { icon: MapPin, title: "موقع التنفيذ", desc: "يتحدد السعر النهائي بعد مراجعة الحي وسهولة الوصول وموعد التوصيل." },
]

const FAQS = [
  { q: "هل السعر يشمل التوصيل والسحب؟", a: "توضح ملاحظة كل خيار ما يتضمنه العرض، ويؤكد فريق العمليات التفاصيل النهائية قبل التنفيذ." },
  { q: "كيف أختار المقاس المناسب؟", a: "أرسل نوع المخلفات وصورة أو وصفاً للموقع، وسيرشح لك الفريق المقاس الأقرب لحجم العمل ومساحة الوقوف." },
  { q: "هل يمكن تحديد موعد مسبق؟", a: "نعم، يمكن تنسيق التوصيل والسحب حسب الموعد المتاح في منطقتك بعد تأكيد الطلب." },
]

function parseFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []
    } catch {
      return []
    }
  }
  return []
}

function parseCategory(category?: string): string {
  return ARABIC_CATEGORY_NAMES[category || ""] || category || "حلول ميدانية"
}

export default function PricingPage() {
  const { companyName, phoneCall, phoneWhatsapp } = useSiteSettings()
  const { openModal } = useServiceRequest()
  const { data, isLoading, isError, refetch } = useGetContainers()
  const containers = useMemo(
    () => (data ?? []).filter((container) => container.isActive).sort((a, b) => a.order - b.order),
    [data],
  )
  const title = companyName ? `أسعار الحاويات بالرياض | ${companyName}` : "أسعار الحاويات بالرياض"
  const description = "تعرف على المقاسات والأسعار والملاحظات المسجلة فعلياً لحاويات {{company_name}}، ثم اطلب الحاوية المناسبة لموقعك في الرياض."
  const whatsappHref = phoneWhatsapp
    ? `https://wa.me/966${phoneWhatsapp.replace(/^0/, "")}?text=${encodeURIComponent("أريد الاستفسار عن مقاسات وأسعار الحاويات")}`
    : ""
  const pricingNotice = containers.some((container) => Boolean(container.priceText || container.priceNote))
    ? "تعرض هذه الصفحة المقاسات والملاحظات المنشورة حالياً من فريق العمليات. السعر النهائي يتأكد حسب الموقع ونوع المخلفات وموعد التنفيذ."
    : "السعر النهائي يحدد بعد مراجعة الموقع ونوع المخلفات وموعد التنفيذ مع فريق العمليات."

  useDocumentSEO({
    title,
    description,
    keywords: "أسعار الحاويات بالرياض, مقاسات حاويات الأنقاض, تأجير حاويات النفايات",
    canonical: siteUrl("/pricing"),
    ogImage: "/images/seo/taqi-pricing.jpg",
    ogImageAlt: "أسعار ومقاسات حاويات الأنقاض والنفايات بالرياض",
  })

  useDocumentSchema("pricing-containers-schema", {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "مقاسات وأسعار الحاويات",
      url: siteUrl("/pricing"),
      description,
      itemListElement: containers.map((container, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: container.name,
        description: [container.description, container.priceNote].filter(Boolean).join(" "),
        item: { "@type": "Service", name: `تأجير ${container.name}` },
      })),
    }, Boolean(containers.length || description))

  return (
    <div className="field-page min-h-[100dvh] flex flex-col" dir="rtl">
      <Navbar />
      <header className="field-hero pt-32 pb-16 text-white">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6" aria-label="مسار الصفحة">
            <Link href="/" className="hover:text-white" data-testid="link-pricing-home">الرئيسية</Link>
            <ChevronLeft size={14} />
            <span className="text-secondary font-bold">الأسعار والمقاسات</span>
          </nav>
          <p className="text-secondary font-extrabold text-sm mb-3">بيانات الأسطول قبل أي وعود</p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-5">أسعار ومقاسات الحاويات بالرياض</h1>
          <p className="text-white/75 text-base md:text-lg leading-relaxed max-w-2xl">{description}</p>
          <div className="flex flex-wrap gap-3 mt-7">
            <button type="button" onClick={() => openModal()} className="inline-flex items-center gap-2 rounded-xl bg-secondary text-[#12384b] px-5 py-3 font-black hover:bg-white transition-colors" data-testid="button-pricing-request">
              اطلب مقاسك <ArrowLeft size={16} />
            </button>
            {phoneCall && (
              <a href={`tel:${phoneCall}`} className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3 font-bold hover:bg-white/10 transition-colors" data-testid="link-pricing-phone">
                <Phone size={16} /> {phoneCall}
              </a>
            )}
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-bold hover:bg-emerald-600 transition-colors" data-testid="link-pricing-whatsapp">
                <MessageCircle size={16} /> واتساب
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-6 py-12 md:py-16">
        <section aria-labelledby="pricing-list-heading">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-[#3aaea5] text-sm font-extrabold mb-2">المتاح فعلياً</p>
              <h2 id="pricing-list-heading" className="text-2xl md:text-3xl font-black text-[#12384b]">اختر من مقاسات أسطولنا</h2>
            </div>
            {!isLoading && !isError && <span className="text-sm text-[#406170]" data-testid="text-pricing-count">{containers.length} خيارات منشورة</span>}
          </div>

          <div className="rounded-2xl bg-[#fff7e8] border border-[#ead39f] p-4 mb-8 flex items-start gap-3" data-testid="notice-pricing-location">
            <AlertCircle size={18} className="text-[#b37a16] shrink-0 mt-0.5" />
            <p className="text-sm text-[#765517] leading-relaxed">{pricingNotice}</p>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="جار تحميل الأسعار">
              {[1, 2, 3].map((item) => <div key={item} className="h-[30rem] rounded-3xl bg-white border border-[#d8e9e9] animate-pulse" />)}
            </div>
          )}

          {isError && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-9 text-center" role="alert" data-testid="status-pricing-error">
              <h2 className="font-black text-red-900 mb-2">تعذر تحميل بيانات الأسعار</h2>
              <p className="text-sm text-red-800 mb-5">البيانات الحقيقية لم تصل الآن. أعد المحاولة أو اتصل بفريق العمليات.</p>
              <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-xl bg-[#12384b] text-white px-5 py-3 font-bold" data-testid="button-retry-pricing">
                <RefreshCw size={16} /> إعادة المحاولة
              </button>
            </div>
          )}

          {!isLoading && !isError && containers.length === 0 && (
            <div className="rounded-3xl border border-[#d8e9e9] bg-white p-10 text-center" data-testid="status-pricing-empty">
              <Truck size={36} className="mx-auto mb-4 text-[#3aaea5]" />
              <h2 className="text-xl font-black text-[#12384b] mb-2">لا توجد مقاسات منشورة حالياً</h2>
              <p className="text-[#406170] mb-5">تواصل معنا وسنراجع احتياج موقعك معك مباشرة.</p>
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-[#12384b] text-white px-5 py-3 font-bold" data-testid="link-pricing-contact">تواصل مع العمليات <ArrowLeft size={16} /></Link>
            </div>
          )}

          {!isLoading && !isError && containers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-pricing-containers">
              {containers.map((container) => {
                const features = parseFeatures(container.features)
                const href = `/containers/${entityPath({ slug: container.seoSlug, title: container.name, id: container.id, fallback: "container" })}`
                return (
                  <article key={container.id} className="inventory-card rounded-3xl overflow-hidden flex flex-col" data-testid={`card-pricing-container-${container.id}`}>
                    <Link href={href} className="inventory-media block relative bg-slate-100" data-testid={`link-pricing-image-${container.id}`}>
                      <img src={getContainerImage(container)} alt={`${container.name}${container.size ? ` — ${container.size}` : ""} لتأجير الحاويات بالرياض`} width="960" height="640" loading="lazy" className="w-full h-full object-cover" />
                      <span className="absolute top-4 right-4 rounded-lg bg-[#12384b]/90 text-white px-3 py-1.5 text-xs font-bold">{parseCategory(container.category)}</span>
                    </Link>
                    <div className="p-6 flex-1 flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-black text-[#12384b]"><Link href={href} data-testid={`link-pricing-title-${container.id}`}>{container.name}</Link></h3>
                          {(container.size || container.capacity) && <p className="text-sm text-[#406170] mt-1">{[container.size, container.capacity].filter(Boolean).join(" — ")}</p>}
                        </div>
                        {container.priceText && <span className="shrink-0 rounded-lg bg-[#fff1cc] text-[#765517] px-2.5 py-1 text-xs font-black" data-testid={`text-container-price-${container.id}`}>{container.priceText}</span>}
                      </div>
                      {container.description && <p className="text-sm text-[#406170] leading-relaxed line-clamp-3" data-testid={`text-container-description-${container.id}`}>{container.description}</p>}
                      {features.length > 0 && <ul className="space-y-2">{features.slice(0, 4).map((feature, index) => <li key={index} className="flex gap-2 text-xs text-slate-700"><CheckCircle2 size={14} className="text-[#3aaea5] shrink-0" />{feature}</li>)}</ul>}
                      {container.suitableFor && <p className="text-xs bg-[#f2f8f8] rounded-xl px-3 py-2 text-[#406170]"><strong className="text-[#12384b]">مناسب لـ:</strong> {container.suitableFor}</p>}
                      <div className="mt-auto pt-4 border-t border-[#d8e9e9]">
                        {container.priceNote && <p className="text-xs text-[#765517] mb-3">{container.priceNote}</p>}
                        {container.rentalPeriod && <p className="text-xs text-[#406170] mb-4 flex items-center gap-2"><Clock3 size={14} className="text-[#3aaea5]" />{container.rentalPeriod}</p>}
                        <button type="button" onClick={() => openModal({ serviceType: container.name, containerName: container.name, containerSize: [container.name, container.size].filter(Boolean).join(" — ") })} className="w-full rounded-xl bg-[#12384b] text-white py-3 font-black text-sm hover:bg-[#3aaea5] transition-colors" data-testid={`button-price-request-${container.id}`}>
                          اطلب هذه الحاوية
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="mt-16" aria-labelledby="pricing-factors-heading">
          <div className="mb-7">
            <p className="text-[#3aaea5] text-sm font-extrabold mb-2">كيف يتحدد العرض؟</p>
            <h2 id="pricing-factors-heading" className="text-2xl md:text-3xl font-black text-[#12384b]">تفاصيل صغيرة تصنع سعراً دقيقاً</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FACTORS.map(({ icon: Icon, title: factorTitle, desc }) => (
              <div key={factorTitle} className="bg-white border border-[#d8e9e9] rounded-2xl p-5" data-testid={`card-pricing-factor-${factorTitle}`}>
                <Icon size={22} className="text-[#3aaea5] mb-4" />
                <h3 className="font-black text-[#12384b] mb-2">{factorTitle}</h3>
                <p className="text-sm text-[#406170] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16" aria-labelledby="pricing-faq-heading">
          <div className="mb-7">
            <p className="text-[#3aaea5] text-sm font-extrabold mb-2">قبل الطلب</p>
            <h2 id="pricing-faq-heading" className="text-2xl md:text-3xl font-black text-[#12384b]">أسئلة متكررة عن الأسعار</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FAQS.map((faq, index) => (
              <article key={faq.q} className="bg-white border border-[#d8e9e9] rounded-2xl p-5" data-testid={`card-pricing-faq-${index}`}>
                <h3 className="font-black text-[#12384b] mb-2">{faq.q}</h3>
                <p className="text-sm text-[#406170] leading-relaxed">{faq.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl bg-[#12384b] text-white p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-secondary font-bold text-sm mb-2">لا تخمّن المقاس</p>
            <h2 className="text-2xl font-black mb-2">فريق العمليات يرشح لك الخيار الأنسب</h2>
            <p className="text-white/65 text-sm">أرسل الموقع ونوع المخلفات، وسنؤكد السعر والموعد قبل التنفيذ.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => openModal()} className="inline-flex items-center gap-2 rounded-xl bg-secondary text-[#12384b] px-5 py-3 font-black hover:bg-white transition-colors whitespace-nowrap" data-testid="button-pricing-final-request">
              ابدأ الطلب <ArrowLeft size={16} />
            </button>
            {phoneCall && <a href={`tel:${phoneCall}`} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 font-bold hover:bg-white/10" data-testid="link-pricing-final-phone"><Phone size={16} /> اتصال</a>}
            {whatsappHref && <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-bold hover:bg-emerald-600" data-testid="link-pricing-final-whatsapp"><MessageCircle size={16} /> واتساب</a>}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}