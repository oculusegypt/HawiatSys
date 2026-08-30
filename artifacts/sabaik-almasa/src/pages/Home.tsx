import { useEffect, useRef, useState, type ComponentType } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { getSiteUrl } from "@/lib/siteUrl"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import type { SocialLinks } from "@/context/SiteSettingsContext"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"

const SEO_DEFAULTS = {
  image: "/images/seo/taqi-home.jpg",
} as const

function injectLocalBusinessSchema({
  companyName,
  description,
  logoUrl,
  phones,
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
}: {
  companyName: string
  description: string
  logoUrl: string
  phones: string[]
  address: string
  city: string
  region: string
  country: string
  postalCode: string
  latitude: string
  longitude: string
  priceRange: string
  paymentMethods: string
  socialLinks: SocialLinks
}) {
  if (typeof document === "undefined") return
  let script = document.getElementById("local-business-schema") as HTMLScriptElement | null
  if (!script) {
    script = document.createElement("script")
    script.id = "local-business-schema"
    script.type = "application/ld+json"
    document.head.appendChild(script)
  }
  const SITE_URL = getSiteUrl().replace(/\/$/, "")
  const toAbsolute = (url?: string) => {
    if (!url) return `${SITE_URL}/images/logo.png`
    if (url.startsWith("http://") || url.startsWith("https://")) return url
    return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`
  }
  const toInternational = (p: string) => {
    const d = p.replace(/\D/g, "")
    if (d.startsWith("00")) return `+${d.slice(2)}`
    if (d.startsWith("0")) return `+966${d.slice(1)}`
    if (d.startsWith("966")) return `+${d}`
    return d ? `+${d}` : ""
  }
  const sameAs: string[] = []
  try {
    if (socialLinks) {
      Object.values(socialLinks).forEach((link) => {
        if (typeof link === "string" && link.startsWith("http")) sameAs.push(link)
      })
    }
  } catch {}
  const schemaPhones = phones?.filter((phone) => phone.trim().length > 0) ?? []
  const addressData = {
    "@type": "PostalAddress",
    ...(address ? { streetAddress: address } : {}),
    ...(city ? { addressLocality: city } : {}),
    ...(region ? { addressRegion: region } : {}),
    ...(country ? { addressCountry: country } : {}),
    ...(postalCode ? { postalCode } : {}),
  }
  const resolvedCompanyName = companyName || "مؤسسة تقي جروب"
  const resolvedDesc = description || "تأجير حاويات الأنقاض والنفايات ونقل مخلفات البناء والهدم داخل الرياض."
  const schemaPhoneValues = schemaPhones.map(toInternational).filter(Boolean)
  const contactPoint = schemaPhoneValues.length > 0 ? {
    "@type": "ContactPoint",
    "telephone": schemaPhoneValues.length === 1 ? schemaPhoneValues[0] : schemaPhoneValues,
    "contactType": "customer service",
    "areaServed": "SA",
    "availableLanguage": ["ar"],
  } : undefined
  const localBusiness = {
    "@type": ["LocalBusiness", "WasteManagementService"],
    "@id": `${SITE_URL}/#local-business`,
    "name": resolvedCompanyName,
    "description": resolvedDesc,
    "url": `${SITE_URL}/`,
    "parentOrganization": { "@id": `${SITE_URL}/#organization` },
    "logo": {
      "@type": "ImageObject",
      "url": toAbsolute(logoUrl || "/images/logo.png"),
    },
    "image": {
      "@type": "ImageObject",
      "url": toAbsolute(SEO_DEFAULTS.image),
    },
    ...(schemaPhoneValues.length ? { "telephone": schemaPhoneValues.length === 1 ? schemaPhoneValues[0] : schemaPhoneValues } : {}),
    ...(priceRange ? { "priceRange": priceRange } : {}),
    ...(paymentMethods ? { "paymentAccepted": paymentMethods } : {}),
    ...(Object.keys(addressData).length > 1 ? { "address": addressData } : {}),
    ...(latitude && longitude ? {
      "geo": { "@type": "GeoCoordinates", "latitude": latitude, "longitude": longitude },
    } : {}),
    ...(city ? { "areaServed": { "@type": "City", "name": city } } : {}),
    ...(contactPoint ? { "contactPoint": contactPoint } : {}),
    ...(sameAs.length ? { "sameAs": [...new Set(sameAs)] } : {}),
  }

  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        "name": resolvedCompanyName,
        "url": `${SITE_URL}/`,
        "logo": { "@type": "ImageObject", "url": toAbsolute(logoUrl || "/images/logo.png") },
        ...(description ? { "description": description } : {}),
        ...(sameAs.length ? { "sameAs": [...new Set(sameAs)] } : {}),
      },
      localBusiness,
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        "url": `${SITE_URL}/`,
        "name": resolvedCompanyName,
        "inLanguage": "ar",
        "publisher": { "@id": `${SITE_URL}/#organization` },
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${SITE_URL}/blog?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/#webpage`,
        "url": `${SITE_URL}/`,
        "name": resolvedCompanyName,
        "description": resolvedDesc,
        "isPartOf": { "@id": `${SITE_URL}/#website` },
        "about": { "@id": `${SITE_URL}/#local-business` },
        "publisher": { "@id": `${SITE_URL}/#organization` },
        "inLanguage": "ar",
      },
    ]
  })
}

import { HeroSlider } from "@/components/home/HeroSlider"
import { HomeSeoIntro } from "@/components/home/HomeSeoIntro"

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
          <HomeSeoIntro />
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
    publicUrl,
    sectionsOrder,
    hiddenSections,
    isLoaded,
  } = siteSettings

  const homeTitle = companyName
    ? `تأجير الحاويات بالرياض ونقل مخلفات البناء | ${companyName}`
    : "تأجير الحاويات بالرياض ونقل مخلفات البناء"
  const homeDescription = "تأجير الحاويات بالرياض ونقل مخلفات البناء والهدم للمطاعم والمنشآت. اختر حاوية نفايات أو أنقاض، وحدد المقاس والموعد واطلب عرضاً واضحاً من تقي جروب."

  useDocumentSEO({
    title: homeTitle,
    description: homeDescription,
    canonical: getSiteUrl() ? `${getSiteUrl()}/` : undefined,
    ogImage: "/images/seo/taqi-home.jpg",
    ogImageAlt: "تأجير حاويات الأنقاض والنفايات بالرياض مع التوصيل والسحب",
  })

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    document.title = homeTitle
    injectLocalBusinessSchema({
      companyName,
      description: homeDescription,
      logoUrl,
      phones,
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
    })
    return () => { document.getElementById("local-business-schema")?.remove() }
  }, [
    companyName,
    logoUrl,
    phones,
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
    publicUrl,
    isLoaded,
    homeDescription,
    homeTitle,
  ])

  return (
    <div className="min-h-screen bg-background font-sans" dir="rtl">
      <Navbar />

      <main>
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
        <DeferredHomeSection load={loadHomeFaqSection} />
        <DeferredHomeSection load={loadSeoPagesLinksSection} />
      </main>

      <Footer />
    </div>
  )
}
