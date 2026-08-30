import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { siteUrl } from "@/lib/siteUrl"
import { Link } from "wouter"
import { ChevronLeft, Phone, MessageCircle, MapPin, Clock } from "lucide-react"
import { ServiceRequestForm } from "@/components/home/ServiceRequestForm"
import { useSiteSettings } from "@/context/SiteSettingsContext"

export default function ContactPage() {
  const { companyName, phones, phoneCall, phoneWhatsapp } = useSiteSettings()
  const resolvedCompany = companyName || ""
  const secondaryWhatsapp = phones.find(phone => phone !== phoneWhatsapp && phone !== phoneCall)
    || phones.find(phone => phone !== phoneWhatsapp)
    || phoneCall
  const waHref = phoneWhatsapp
    ? `https://wa.me/966${phoneWhatsapp.replace(/^0/, "")}?text=${encodeURIComponent(companyName ? `مرحباً، أرغب في حجز حاوية من ${companyName}` : "مرحباً، أرغب في حجز حاوية")}`
    : ""
  const wa2Href = secondaryWhatsapp
    ? `https://wa.me/966${secondaryWhatsapp.replace(/^0/, "")}?text=${encodeURIComponent("مرحباً، أود الاستفسار عن خدمات الحاويات")}`
    : ""

  useDocumentSEO({
    title: companyName ? `تواصل معنا — ${companyName} لتأجير الحاويات | الرياض` : "تواصل معنا — تأجير الحاويات بالرياض",
    description: `تواصل لحجز وتأجير حاويات الأنقاض والنفايات وعقود النظافة الإلكترونية بالرياض. اتصل بنا على ${phoneWhatsapp || phoneCall} أو عبر واتساب.`,
    keywords: "تواصل تأجير الحاويات, رقم تأجير حاويات بالرياض, هاتف حاويات أنقاض بالرياض",
    canonical: siteUrl("/contact"),
  })

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      <Navbar />

      {/* Hero */}
      <div className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-3">
            <Link href="/" className="hover:text-white transition-colors">الرئيسية</Link>
            <ChevronLeft size={14} />
            <span className="text-white">تواصل معنا</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black">تواصل مع قسم العمليات والتأجير</h1>
          <p className="text-white/70 mt-2 text-lg">نحن هنا لخدمتك وتوصيل الحاوية لموقعك فوراً في أي وقت</p>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 md:px-6 py-12">

        {/* Contact cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {phoneCall && <a href={`tel:${phoneCall}`}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center gap-3 hover:shadow-md hover:-translate-y-1 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Phone size={26} />
            </div>
            <h3 className="font-bold text-lg text-gray-900">اتصال مباشر بالعمليات</h3>
            <p className="text-primary font-bold text-xl dir-ltr">{phoneCall}</p>
            <span className="text-xs text-gray-500">للحجز الفوري والتوصيل خلال ساعتين</span>
          </a>}

          {phoneWhatsapp && <a href={waHref} target="_blank" rel="noreferrer"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center gap-3 hover:shadow-md hover:-translate-y-1 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center">
              <MessageCircle size={26} />
            </div>
            <h3 className="font-bold text-lg text-gray-900">واتساب — حجز وتأجير الحاويات</h3>
            <p className="text-green-600 font-bold text-xl dir-ltr">{phoneWhatsapp}</p>
            <span className="text-xs text-gray-500">إرسال الموقع وتحديد المقاس</span>
          </a>}

          {secondaryWhatsapp && <a href={wa2Href} target="_blank" rel="noreferrer"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center gap-3 hover:shadow-md hover:-translate-y-1 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <MessageCircle size={26} />
            </div>
            <h3 className="font-bold text-lg text-gray-900">عقود النظافة ورخص بلدي</h3>
            <p className="text-blue-600 font-bold text-xl dir-ltr">{secondaryWhatsapp}</p>
            <span className="text-xs text-gray-500">توثيق العقود للمنشآت والمطاعم</span>
          </a>}
        </div>

        {/* Info row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <MapPin size={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">موقعنا والتغطية</h3>
              <p className="text-gray-600 text-sm leading-relaxed">الرياض، المملكة العربية السعودية<br/>أسطولنا يغطي جميع أحياء شمال، شرق، جنوب، وغرب الرياض</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Clock size={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">ساعات التوصيل والتشغيل</h3>
              <p className="text-gray-600 text-sm leading-relaxed">خدمة توصيل وسحب وتفريغ على مدار الساعة 24/7 طوال أيام الأسبوع</p>
            </div>
          </div>
        </div>

        {/* Service request form */}
        <div className="mb-4">
          <ServiceRequestForm />
        </div>

      </main>

      <Footer />
    </div>
  )
}
