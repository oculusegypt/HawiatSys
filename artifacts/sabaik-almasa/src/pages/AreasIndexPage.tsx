import { Link } from "wouter"
import { MapPin, ArrowLeft, Phone, MessageCircle, Box } from "lucide-react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { AREAS, RIYADH_AREA_GROUPS, ARABIC_AREA_SLUGS } from "@/pages/NeighborhoodPage"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { useDocumentSchema } from "@/hooks/useDocumentSchema"
import { siteUrl } from "@/lib/siteUrl"
import { normalizeSeoDescription } from "@/lib/seoText"

export default function AreasIndexPage() {
  const { companyName, phoneCall, phoneWhatsapp, isLoaded } = useSiteSettings()
  const description = normalizeSeoDescription(companyName
    ? `تعرف على مناطق وأحياء خدمة ${companyName} لتأجير حاويات الأنقاض والنفايات ونقل المخلفات في شمال وجنوب وشرق وغرب الرياض.`
    : "تعرف على مناطق وأحياء خدمة تأجير حاويات الأنقاض والنفايات ونقل المخلفات في شمال وجنوب وشرق وغرب الرياض.",
    "مناطق وأحياء خدمة تأجير الحاويات في الرياض",
  )

  useDocumentSEO({
    title: companyName ? `مناطق خدمة وتأجير الحاويات في الرياض | ${companyName}` : "مناطق خدمة وتأجير الحاويات في الرياض",
    description,
    keywords: "مناطق تأجير الحاويات بالرياض, أحياء الرياض, توصيل حاويات الأنقاض",
    canonical: siteUrl("/areas"),
    ogImage: "/images/seo/taqi-areas.jpg",
    ogImageAlt: "مناطق خدمة تأجير الحاويات في جميع أحياء الرياض",
  })

  useDocumentSchema("areas-index-schema", {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "مناطق خدمة وتأجير الحاويات في الرياض",
      "description": description,
      "url": siteUrl("/areas"),
      "inLanguage": "ar",
      "about": { "@type": "Service", "name": "خدمات تأجير الحاويات ونقل الأنقاض بالرياض" },
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": Object.entries(AREAS).map(([slug, area], index) => {
          const arSlug = ARABIC_AREA_SLUGS[slug] || slug
          return {
            "@type": "ListItem",
            "position": index + 1,
            "name": area.name,
            "url": siteUrl(`/areas/${arSlug}`),
          }
        }),
      },
    }, isLoaded)

  return (
    <div className="min-h-screen bg-background font-sans" dir="rtl">
      <Navbar />
      <main>
        <section className="pt-28 pb-16 bg-gradient-to-br from-primary to-primary/80 text-white">
          <div className="container mx-auto px-4 md:px-6">
            <nav aria-label="breadcrumb" className="text-sm text-white/60 mb-6">
              <Link href="/"><span className="hover:text-white">الرئيسية</span></Link>
              <span className="mx-2">/</span>
              <span className="text-white">مناطق الخدمة</span>
            </nav>
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 text-secondary font-bold mb-4">
                <MapPin size={18} /> تغطية كاملة لكافة أحياء مدينة الرياض
              </span>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
                خدمات تأجير الحاويات ونقل الأنقاض في جميع أحياء الرياض
              </h1>
              <p className="text-lg text-gray-200 leading-relaxed">
                نوفر حاويات الأنقاض والنفايات والمكابس بمختلف المقاسات مع التوصيل الفوري خلال ساعتين وعقود النظافة البلدية المعتمدة.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6 max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {RIYADH_AREA_GROUPS.map(group => (
                <div key={group.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-primary mb-5">{group.title}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.slugs.map(slug => {
                      const area = AREAS[slug]
                      if (!area) return null
                      const arabicSlug = ARABIC_AREA_SLUGS[slug] || slug
                      return (
                        <Link key={slug} href={`/areas/${encodeURIComponent(arabicSlug)}`}>
                          <span className="group flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 text-gray-800 hover:bg-primary hover:text-white transition-colors cursor-pointer">
                            <span>
                              <span className="block font-bold">{area.name}</span>
                              <span className="block text-xs opacity-70">تأجير حاويات وتوصيل فوري</span>
                            </span>
                            <ArrowLeft size={16} className="shrink-0 transition-transform group-hover:-translate-x-1" />
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4">لم تجد حيّك في القائمة؟</h2>
            <p className="text-gray-600 mb-7">تواصل معنا لتأكيد التوصيل السريع إلى موقعك داخل الرياض وتحديد المقاس الأنسب.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              {phoneCall && <a href={`tel:${phoneCall}`} className="inline-flex items-center gap-2 bg-primary text-white px-7 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">
                <Phone size={18} /> {phoneCall}
              </a>
              }
              {phoneWhatsapp && <a href={`https://wa.me/966${phoneWhatsapp.replace(/^0/, "")}?text=${encodeURIComponent("أريد الاستفسار عن تأجير الحاويات بالرياض")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-green-500 text-white px-7 py-3 rounded-xl font-bold hover:bg-green-600 transition-colors">
                <MessageCircle size={18} /> واتساب فوري
              </a>
              }
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}