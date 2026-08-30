import { useEffect, useRef, useState, type ComponentType } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { getSiteUrl } from "@/lib/siteUrl"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { useDocumentSchema } from "@/hooks/useDocumentSchema"
import { homepageSchema } from "@/lib/seoSchema"

const SEO_DEFAULTS = {
  image: "/images/seo/taqi-home.jpg",
} as const

import { HeroSlider } from "@/components/home/HeroSlider"

type HomeSectionLoader = () => Promise<{ default: ComponentType<any> }>

const loadStatsBar: HomeSectionLoader = () =>
  import("@/components/home/StatsBar").then(({ StatsBar }) => ({ default: StatsBar }))
const loadPackagesSection: HomeSectionLoader = () =>
  import("@/components/home/PackagesSection").then(({ PackagesSection }) => ({ default: PackagesSection }))
const loadServicesSection: HomeSectionLoader = () =>
  import("@/components/home/ServicesSection").then(({ ServicesSection }) => ({ default: ServicesSection }))
const loadAboutSection: HomeSectionLoader = () =>
  import("@/components/home/AboutSection").then(({ AboutSection }) => ({ default: AboutSection }))
const loadHowItWorksSection: HomeSectionLoader = () =>
  import("@/components/home/HowItWorksSection").then(({ HowItWorksSection }) => ({ default: HowItWorksSection }))
const loadWhyChooseUs: HomeSectionLoader = () =>
  import("@/components/home/WhyChooseUs").then(({ WhyChooseUs }) => ({ default: WhyChooseUs }))
const loadServiceAreasSection: HomeSectionLoader = () =>
  import("@/components/home/ServiceAreasSection").then(({ ServiceAreasSection }) => ({ default: ServiceAreasSection }))
const loadValuesSection: HomeSectionLoader = () =>
  import("@/components/home/ValuesSection").then(({ ValuesSection }) => ({ default: ValuesSection }))
const loadTestimonials: HomeSectionLoader = () =>
  import("@/components/home/Testimonials").then(({ Testimonials }) => ({ default: Testimonials }))
const loadPartners: HomeSectionLoader = () =>
  import("@/components/home/Partners").then(({ Partners }) => ({ default: Partners }))
const loadBlogSection: HomeSectionLoader = () =>
  import("@/components/home/BlogSection").then(({ BlogSection }) => ({ default: BlogSection }))
const loadServiceRequestForm: HomeSectionLoader = () =>
  import("@/components/home/ServiceRequestForm").then(({ ServiceRequestForm }) => ({ default: ServiceRequestForm }))
const loadAdsSection: HomeSectionLoader = () =>
  import("@/components/home/AdsSection").then(({ AdsSection }) => ({ default: AdsSection }))
const loadSeoPagesLinksSection: HomeSectionLoader = () =>
  import("@/components/home/SeoPagesLinksSection").then(({ SeoPagesLinksSection }) => ({ default: SeoPagesLinksSection }))
const loadCeoMessage: HomeSectionLoader = () =>
  import("@/components/home/CEOMessage").then(({ CEOMessage }) => ({ default: CEOMessage }))
const loadHomeFaqSection: HomeSectionLoader = () =>
  import("@/components/home/HomeFaqSection").then(({ HomeFaqSection }) => ({ default: HomeFaqSection }))

function DeferredHomeSection({
  load,
  props,
  minHeight = "min-h-[24rem]",
}: {
  load: HomeSectionLoader
  props?: Record<string, unknown>
  minHeight?: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [LoadedSection, setLoadedSection] = useState<ComponentType<any> | null>(null)

  useEffect(() => {
    if (shouldLoad) return
    const host = hostRef.current
    if (!host) return
    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: "700px 0px" },
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [shouldLoad])

  useEffect(() => {
    if (!shouldLoad || LoadedSection) return
    let active = true
    load()
      .then(({ default: Component }) => {
        if (active) setLoadedSection(() => Component)
      })
      .catch((error) => {
        console.error("Failed to load homepage section", error)
      })
    return () => {
      active = false
    }
  }, [LoadedSection, load, shouldLoad])

  return (
    <div ref={hostRef} className={LoadedSection ? "" : minHeight} aria-busy={shouldLoad && !LoadedSection}>
      {LoadedSection ? <LoadedSection {...props} /> : null}
    </div>
  )
}

function SectionBlock({
  id,
  phoneCall,
  phoneWhatsapp,
  homepageContent,
}: {
  id: string
  phoneCall: string
  phoneWhatsapp: string
  homepageContent: any
}) {
  const waNumber = phoneWhatsapp.replace(/^0/, "966")
  const callHref = `tel:${phoneCall}`
  const waHref   = `https://wa.me/${waNumber}`

  switch (id) {
    case "hero":
      return (
        <>
          <HeroSlider />
          <DeferredHomeSection load={loadAdsSection} props={{ position: "after_hero" }} minHeight="min-h-0" />
        </>
      )
    case "stats":
      return <DeferredHomeSection load={loadStatsBar} />
    case "packages":
    case "containers":
      return (
        <>
          <DeferredHomeSection load={loadPackagesSection} />
          <DeferredHomeSection load={loadAdsSection} props={{ position: "after_packages" }} minHeight="min-h-0" />
        </>
      )
    case "services":
      return <DeferredHomeSection load={loadServicesSection} />
    case "about":
      return <DeferredHomeSection load={loadAboutSection} />
    case "ceo":
    case "ceo_message":
      return <DeferredHomeSection load={loadCeoMessage} />
    case "how_it_works":
      return <DeferredHomeSection load={loadHowItWorksSection} />
    case "why_choose_us":
      return <DeferredHomeSection load={loadWhyChooseUs} />
    case "areas":
      return <DeferredHomeSection load={loadServiceAreasSection} />
    case "values":
      return <DeferredHomeSection load={loadValuesSection} />
    case "testimonials":
      return <DeferredHomeSection load={loadTestimonials} />
    case "partners":
      return <DeferredHomeSection load={loadPartners} />
    case "blog":
      return <DeferredHomeSection load={loadBlogSection} />
    case "service_request":
      return <DeferredHomeSection load={loadServiceRequestForm} />
    case "contact":
      if (!phoneCall && !phoneWhatsapp) return null
      const contactCopy = homepageContent.sections?.contact
      return (
        <>
          <DeferredHomeSection load={loadAdsSection} props={{ position: "before_footer" }} minHeight="min-h-0" />
          <section id="contact" className="py-12 bg-white border-t">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-primary/5 p-8 rounded-2xl border border-primary/10">
                <div>
                  {contactCopy?.title && <h3 className="text-2xl font-bold text-primary mb-2">{contactCopy.title}</h3>}
                  {contactCopy?.description && <p className="text-gray-600">{contactCopy.description}</p>}
                </div>
                <div className="flex gap-4 flex-wrap">
                  {phoneWhatsapp && contactCopy?.whatsappText && (
                    <a href={waHref} target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-md">
                      {contactCopy.whatsappText}
                    </a>
                  )}
                  {phoneCall && contactCopy?.callText && (
                    <a href={callHref}
                      className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-primary px-6 py-3 rounded-lg font-bold transition-colors shadow-sm">
                      {contactCopy.callText}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      )
    default:
      return null
  }
}

function HomeSearchContent() {
  return (
    <section
      aria-labelledby="home-search-content-heading"
      className="border-t border-slate-200 bg-slate-50 py-14 text-right"
    >
      <div className="container mx-auto max-w-5xl px-4 md:px-6">
        <h2 id="home-search-content-heading" className="mb-4 text-2xl font-black text-primary md:text-3xl">
          تأجير حاويات الرياض لمخلفات البناء والهدم
        </h2>
        <p className="max-w-4xl text-base leading-8 text-slate-700">
          نوفّر خدمة تأجير حاويات الرياض للمنازل والمقاولين والمطاعم والمنشآت، مع حاويات
          لمخلفات البناء والهدم وحاويات نفايات للمواقع التجارية. نساعدك على اختيار المقاس
          المناسب، ثم ننسّق التوصيل والسحب في الموعد المتفق عليه داخل أحياء الرياض.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-lg font-extrabold text-primary">حاويات مخلفات البناء والهدم</h3>
            <p className="text-sm leading-7 text-slate-600">
              مقاسات مناسبة للترميم والهدم ونقل الأنقاض، مع متابعة طلب الحاوية من التوصيل حتى السحب.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-lg font-extrabold text-primary">حاويات المطاعم والمنشآت</h3>
            <p className="text-sm leading-7 text-slate-600">
              حلول عملية للنفايات اليومية للمطاعم والمقاهي والمستودعات، مع جدولة التبديل والسحب.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-lg font-extrabold text-primary">طريقة طلب الحاوية في الرياض</h3>
            <p className="text-sm leading-7 text-slate-600">
              أرسل نوع المخلفات والمقاس والعنوان والمدة المطلوبة، وسنقترح الحاوية المناسبة ونوضح العرض قبل التنفيذ.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const siteSettings = useSiteSettings()
  const {
    companyName,
    logoUrl,
    phones,
    phoneCall,
    phoneWhatsapp,
    homepageContent,
    address,
    city,
    region,
    country,
    postalCode,
    latitude,
    longitude,
    priceRange,
    paymentMethods,
    socialLinks,
    googleBusinessProfile,
    publicUrl,
    sectionsOrder,
    hiddenSections,
    isLoaded,
  } = siteSettings

  const homeTitle = "تأجير حاويات الرياض | طلب الحاويات ومخلفات البناء والهدم"
  const homeDescription = "تأجير حاويات الرياض وطلب الحاويات في الرياض لمخلفات البناء والهدم والمطاعم والمنشآت، مع حاويات نفايات وأنقاض بمقاسات متعددة وتوصيل وسحب سريع من {{company_name}}."

  useDocumentSEO({
    title: homeTitle,
    description: homeDescription,
    canonical: getSiteUrl() ? `${getSiteUrl()}/` : undefined,
    ogImage: "/images/seo/taqi-home.jpg",
    ogImageAlt: "تأجير حاويات الأنقاض والنفايات بالرياض مع التوصيل والسحب",
  })
  const homeSchema = homepageSchema({
    companyName: companyName || "المنشأة",
    siteName: "تأجير حاويات الرياض",
    description: homeDescription,
    logo: logoUrl || "/images/logo.png",
    image: SEO_DEFAULTS.image,
    phoneNumbers: [phoneCall, phoneWhatsapp, ...phones],
    address,
    city,
    region,
    country,
    postalCode,
    latitude,
    longitude,
    priceRange,
    paymentMethods,
    socialLinks,
    googleBusinessProfile,
  })
  useDocumentSchema("home-schema", homeSchema, isLoaded)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    document.title = homeTitle
  }, [isLoaded, homeTitle])

  return (
    <div className="min-h-screen bg-background font-sans" dir="rtl">
      <Navbar />

      <main className="home-main text-center">
        {(sectionsOrder.length ? sectionsOrder : ["hero", "stats", "packages", "services", "about", "ceo", "how_it_works", "why_choose_us", "areas", "values", "testimonials", "partners", "blog", "service_request", "contact"])
          .filter(id => !hiddenSections.includes(id))
          .map(id => (
            <SectionBlock
              key={id}
              id={id}
              phoneCall={phoneCall}
              phoneWhatsapp={phoneWhatsapp}
              homepageContent={homepageContent}
            />
          ))}
        <HomeSearchContent />
        <DeferredHomeSection load={loadHomeFaqSection} />
        <DeferredHomeSection load={loadSeoPagesLinksSection} />
      </main>

      <Footer />
    </div>
  )
}
