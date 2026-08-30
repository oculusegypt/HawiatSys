import { ExternalLink, FileCheck2, MapPin, ShieldCheck, UserRound } from "lucide-react"
import { useSiteSettings } from "@/context/SiteSettingsContext"

interface AuthorityTrustSignalsProps {
  authorName?: string
  compact?: boolean
}

/**
 * Evidence-led trust block. It deliberately describes verifiable business
 * information and official reference links without inventing awards,
 * certificates, ratings, or government affiliation.
 */
export function AuthorityTrustSignals({
  authorName = "فريق المحتوى في المنشأة",
  compact = false,
}: AuthorityTrustSignalsProps) {
  const {
    companyName,
    address,
    city,
    region,
    phoneCall,
    googleBusinessProfile,
  } = useSiteSettings()
  const resolvedCompany = companyName || "المنشأة"
  const resolvedAddress = [address, city, region].filter(Boolean).join("، ")

  return (
    <section
      className={`${compact ? "py-8" : "my-10 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8"} text-right`}
      aria-labelledby="authority-trust-heading"
      data-testid="section-authority-trust"
    >
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-secondary">مصدر واضح ومعلومات قابلة للتحقق</p>
          <h2 id="authority-trust-heading" className="text-2xl font-black text-slate-900">لماذا يمكنك الاعتماد على هذه المعلومات؟</h2>
        </div>
        <p className="max-w-md text-xs leading-6 text-slate-500">
          نعرض هوية الجهة الناشرة وبيانات موقعها ومراجعها العامة بوضوح، لتتمكن من التحقق قبل طلب الخدمة.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <ShieldCheck className="mb-3 text-primary" size={24} />
          <h3 className="text-sm font-black text-slate-900">هوية الجهة الناشرة</h3>
          <p className="mt-2 text-xs leading-6 text-slate-600">{resolvedCompany} — خدمات تأجير الحاويات ونقل المخلفات في الرياض.</p>
          {phoneCall && <a href={`tel:${phoneCall}`} className="mt-2 block text-xs font-bold text-primary hover:underline">التواصل: {phoneCall}</a>}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <MapPin className="mb-3 text-secondary" size={24} />
          <h3 className="text-sm font-black text-slate-900">موقع العمل المعلن</h3>
          <p className="mt-2 text-xs leading-6 text-slate-600">{resolvedAddress || "الرياض، المملكة العربية السعودية"}</p>
          {googleBusinessProfile && (
            <a href={googleBusinessProfile} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              ملف Google Business Profile
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <UserRound className="mb-3 text-primary" size={24} />
          <h3 className="text-sm font-black text-slate-900">مسؤول المحتوى</h3>
          <p className="mt-2 text-xs leading-6 text-slate-600">{authorName}</p>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">محتوى خدمي يراجع معلومات المقاسات والطلب والتوصيل قبل النشر.</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <FileCheck2 className="mb-3 text-secondary" size={24} />
          <h3 className="text-sm font-black text-slate-900">مراجع عامة</h3>
          <p className="mt-2 text-xs leading-6 text-slate-600">للاطلاع على الاشتراطات والخدمات الحكومية ذات الصلة:</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <a href="https://balady.gov.sa/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary hover:underline">منصة بلدي ↗</a>
            <a href="https://www.alriyadh.gov.sa/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary hover:underline">أمانة الرياض ↗</a>
          </div>
        </div>
      </div>
    </section>
  )
}