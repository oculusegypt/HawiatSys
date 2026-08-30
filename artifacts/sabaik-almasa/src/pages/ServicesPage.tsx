import { useMemo } from "react"
import { Link } from "wouter"
import { ArrowLeft, ChevronLeft, RefreshCw, Settings, Truck, Factory, Trash2, Leaf, Box, ShieldCheck, FileText, Wrench } from "lucide-react"
import { useGetServices } from "@workspace/api-client-react"
import type { Service } from "@workspace/api-client-react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { ServiceCard } from "@/components/home/services/ServiceCard"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { siteUrl } from "@/lib/siteUrl"

const iconMap: Record<string, typeof Settings> = {
  truck: Truck, Truck, factory: Factory, Factory, trash2: Trash2, Trash2,
  leaf: Leaf, Leaf, box: Box, Box, settings: Settings, Settings,
  ShieldCheck, FileText, Wrench,
}

function serviceImages(service: Service): string[] {
  if (typeof service.images === "string") {
    try {
      const parsed = JSON.parse(service.images)
      if (Array.isArray(parsed)) {
        const validImages = parsed.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
        if (validImages.length > 0) return validImages
      }
    } catch {
      // The API may contain a single legacy image URL.
      if (service.images.trim()) return [service.images.trim()]
    }
  }
  return service.imageUrl ? [service.imageUrl] : []
}

export default function ServicesPage() {
  const { companyName } = useSiteSettings()
  const { data, isLoading, isError, refetch } = useGetServices()
  const services = useMemo(
    () => (data ?? []).filter((service) => service.isActive !== false).sort((a, b) => a.order - b.order),
    [data],
  )
  const pageTitle = companyName ? `خدمات نقل المخلفات والحاويات بالرياض | ${companyName}` : "خدمات نقل المخلفات والحاويات بالرياض"
  const pageDescription = "استعرض خدمات {{company_name}} الفعلية في الرياض: تأجير الحاويات، نقل مخلفات البناء، عقود النظافة والخدمات الميدانية المرتبطة."

  useDocumentSEO({
    title: pageTitle,
    description: pageDescription,
    keywords: "خدمات نقل مخلفات البناء بالرياض, تأجير حاويات, عقود نظافة, خدمات ميدانية الرياض",
    canonical: siteUrl("/services"),
    ogImage: services[0] ? serviceImages(services[0])[0] : undefined,
  })

  return (
    <div className="field-page min-h-[100dvh] flex flex-col" dir="rtl">
      <Navbar />
      <header className="field-hero pt-32 pb-16 text-white">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6" aria-label="مسار الصفحة">
            <Link href="/" className="hover:text-white transition-colors" data-testid="link-services-home">الرئيسية</Link>
            <ChevronLeft size={14} />
            <span className="text-secondary font-bold">الخدمات</span>
          </nav>
          <div className="max-w-3xl">
            <p className="text-secondary font-extrabold text-sm mb-3">تشغيل ميداني واضح من أول اتصال</p>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-5">خدماتنا الفعلية في الرياض</h1>
            <p className="text-white/75 text-base md:text-lg leading-relaxed max-w-2xl">
              اختر الخدمة التي يحتاجها موقعك الآن، تعرّف على نطاقها، ثم أرسل طلبك مباشرة لفريق العمليات.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-6 py-12 md:py-16">
        <section aria-labelledby="services-list-heading">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-[#3aaea5] text-sm font-extrabold mb-2">الخدمات المتاحة الآن</p>
              <h2 id="services-list-heading" className="text-2xl md:text-3xl font-black text-[#12384b]">ما الذي يمكن لفريقنا تنفيذه؟</h2>
            </div>
            {!isLoading && services.length > 0 && <p className="text-sm text-[#406170]">{services.length} خدمات منشورة</p>}
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="جار تحميل الخدمات">
              {[1, 2, 3].map((item) => <div key={item} className="h-[28rem] rounded-3xl bg-white/70 border border-[#d8e9e9] animate-pulse" />)}
            </div>
          )}

          {isError && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center" role="alert" data-testid="status-services-error">
              <h2 className="text-lg font-black text-red-900 mb-2">تعذر تحميل الخدمات حالياً</h2>
              <p className="text-sm text-red-800 mb-5">حاول تحديث الصفحة أو تواصل مع فريق العمليات مباشرة.</p>
              <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-xl bg-[#12384b] text-white px-5 py-3 font-bold" data-testid="button-retry-services">
                <RefreshCw size={16} /> إعادة المحاولة
              </button>
            </div>
          )}

          {!isLoading && !isError && services.length === 0 && (
            <div className="rounded-3xl border border-[#d8e9e9] bg-white p-10 text-center" data-testid="status-services-empty">
              <Settings size={34} className="mx-auto mb-4 text-[#3aaea5]" />
              <h2 className="text-xl font-black text-[#12384b] mb-2">لا توجد خدمات منشورة حالياً</h2>
              <p className="text-[#406170] mb-5">يمكنك التواصل معنا لتحديد الحل المناسب لموقعك.</p>
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-[#12384b] text-white px-5 py-3 font-bold" data-testid="link-services-contact">
                تواصل مع العمليات <ArrowLeft size={16} />
              </Link>
            </div>
          )}

          {!isLoading && !isError && services.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-services">
              {services.map((service, index) => {
                const Icon = iconMap[service.icon] || Settings
                return (
                  <ServiceCard
                    key={service.id}
                    id={service.id}
                    title={service.title}
                    description={service.description}
                    icon={Icon}
                    seoSlug={service.seoSlug}
                    images={serviceImages(service)}
                    companyName={companyName}
                    index={index}
                  />
                )
              })}
            </div>
          )}
        </section>

        <section className="mt-16 rounded-3xl bg-[#12384b] text-white p-7 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-secondary font-bold text-sm mb-2">تحتاج قراراً سريعاً؟</p>
            <h2 className="text-2xl font-black mb-2">أرسل تفاصيل الموقع ودعنا نحدد الخطوة التالية</h2>
            <p className="text-white/65 text-sm">نراجع نوع المخلفات والمقاس والموقع قبل تأكيد التنفيذ.</p>
          </div>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-secondary text-[#12384b] px-5 py-3 rounded-xl font-black whitespace-nowrap hover:bg-white transition-colors" data-testid="link-services-request">
            طلب خدمة <ArrowLeft size={16} />
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  )
}