import { useEffect } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { getSiteUrl } from "@/lib/siteUrl"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import type { SocialLinks } from "@/context/SiteSettingsContext"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"

const SEO_DEFAULTS = {
  companyName: "تأجير الحاويات بالرياض",
  phone: "0555888767",
  address: "طريق الملك فهد، حي الصحافة",
  city: "الرياض",
  region: "منطقة الرياض",
  country: "SA",
  postalCode: "13321",
  priceRange: "$$",
  image: "/images/seo/cleanflow-home.jpg",
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
    return `+966${d}`
  }
  const sameAs: string[] = []
  try {
    if (socialLinks) {
      Object.values(socialLinks).forEach((link) => {
        if (typeof link === "string" && link.startsWith("http")) sameAs.push(link)
      })
    }
  } catch {}
  const schemaPhones = (phones && phones.length) ? phones : [SEO_DEFAULTS.phone]
  const whatsapp = schemaPhones[0] ? `https://wa.me/${toInternational(schemaPhones[0]).replace("+", "")}` : ""
  if (whatsapp) sameAs.push(whatsapp)
  const addressData = {
    "@type": "PostalAddress",
    streetAddress: address || SEO_DEFAULTS.address,
    addressLocality: city || SEO_DEFAULTS.city,
    addressRegion: region || SEO_DEFAULTS.region,
    addressCountry: country || SEO_DEFAULTS.country,
    postalCode: postalCode || SEO_DEFAULTS.postalCode,
  }
  const resolvedCompanyName = companyName || SEO_DEFAULTS.companyName
  const resolvedDesc = description || "تأجير حاويات الأنقاض والنفايات بالرياض: توصيل وسحب الحاويات ونقل مخلفات البناء والهدم."

  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["LocalBusiness", "WasteManagementService"],
        "@id": `${SITE_URL}/#business`,
        "name": resolvedCompanyName,
        "alternateName": companyName ? [companyName, `حاويات ${companyName}`, "تأجير حاويات بالرياض"] : ["تأجير حاويات بالرياض", "حاويات أنقاض الرياض"],
        "description": resolvedDesc,
        "url": `${SITE_URL}/`,
        "logo": {
          "@type": "ImageObject",
          "url": toAbsolute(logoUrl || "/images/logo.png"),
          "width": "512",
          "height": "512"
        },
        "image": {
          "@type": "ImageObject",
          "url": toAbsolute(SEO_DEFAULTS.image),
          "width": "1200",
          "height": "675"
        },
        "primaryImageOfPage": {
          "@type": "ImageObject",
          "url": toAbsolute(SEO_DEFAULTS.image),
          "width": "1200",
          "height": "675"
        },
        "telephone": schemaPhones.length === 1 ? toInternational(schemaPhones[0]) : schemaPhones.map(toInternational),
        "priceRange": priceRange || SEO_DEFAULTS.priceRange,
        "currenciesAccepted": "SAR",
        "paymentAccepted": paymentMethods || "Cash, Credit Card, Bank Transfer, Mada",
        "address": addressData,
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": latitude || "24.7937",
          "longitude": longitude || "46.6371"
        },
        "areaServed": [
          { "@type": "City", "name": "الرياض", "sameAs": "https://www.wikidata.org/wiki/Q3692" },
          { "@type": "Country", "name": "المملكة العربية السعودية" }
        ],
        "openingHours": "Mo-Su 00:00-23:59",
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": companyName ? `حاويات وخدمات ${companyName} بالرياض` : "حاويات وخدمات تأجير الحاويات بالرياض",
          "itemListElement": [
            {
              "@type": "Offer",
              "name": "حاوية أنقاض صغيرة (12 ياردة)",
              "price": "400",
              "priceCurrency": "SAR",
              "availability": "https://schema.org/InStock",
              "itemOffered": {
                "@type": "Service",
                "name": "تأجير حاوية أنقاض 12 ياردة",
                "description": "حاوية مثالية لمشاريع الترميم الصغيرة والتعديلات السكنية"
              }
            },
            {
              "@type": "Offer",
              "name": "حاوية أنقاض متوسطة (15 ياردة)",
              "price": "450",
              "priceCurrency": "SAR",
              "availability": "https://schema.org/InStock",
              "itemOffered": {
                "@type": "Service",
                "name": "تأجير حاوية أنقاض 15 ياردة",
                "description": "حاوية مناسبة لمشاريع الهدم الجزئي والتشطيبات الموسعة"
              }
            },
            {
              "@type": "Offer",
              "name": "حاوية أنقاض كبيرة (20 ياردة)",
              "price": "500",
              "priceCurrency": "SAR",
              "availability": "https://schema.org/InStock",
              "itemOffered": {
                "@type": "Service",
                "name": "تأجير حاوية أنقاض 20 ياردة",
                "description": "الحاوية الأكثر طلباً لمشاريع البناء والهدم والإنشاءات"
              }
            },
            {
              "@type": "Offer",
              "name": "حاوية أنقاض جامبو (30 ياردة)",
              "price": "700",
              "priceCurrency": "SAR",
              "availability": "https://schema.org/InStock",
              "itemOffered": {
                "@type": "Service",
                "name": "تأجير حاوية أنقاض 30 ياردة",
                "description": "حاوية للمشاريع الكبرى والمجمعات وعمليات الإزالة الشاملة"
              }
            }
          ]
        },
        "sameAs": sameAs
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        "url": `${SITE_URL}/`,
        "name": resolvedCompanyName,
        "inLanguage": "ar",
        "publisher": { "@id": `${SITE_URL}/#business` },
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${SITE_URL}/blog?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      }
    ]
  })
}

import { HeroSlider } from "@/components/home/HeroSlider"
import { StatsBar } from "@/components/home/StatsBar"
import { PackagesSection } from "@/components/home/PackagesSection"
import { ServicesSection } from "@/components/home/ServicesSection"
import { AboutSection } from "@/components/home/AboutSection"
import { HowItWorksSection } from "@/components/home/HowItWorksSection"
import { WhyChooseUs } from "@/components/home/WhyChooseUs"
import { ServiceAreasSection } from "@/components/home/ServiceAreasSection"
import { ValuesSection } from "@/components/home/ValuesSection"
import { Testimonials } from "@/components/home/Testimonials"
import { Partners } from "@/components/home/Partners"
import { BlogSection } from "@/components/home/BlogSection"
import { ServiceRequestForm } from "@/components/home/ServiceRequestForm"
import { AdsSection } from "@/components/home/AdsSection"
import { SeoPagesLinksSection } from "@/components/home/SeoPagesLinksSection"
import { CEOMessage } from "@/components/home/CEOMessage"

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
          <AdsSection position="after_hero" />
        </>
      )
    case "stats":
      return <StatsBar />
    case "packages":
    case "containers":
      return (
        <>
          <PackagesSection />
          <AdsSection position="after_packages" />
        </>
      )
    case "services":
      return <ServicesSection />
    case "about":
      return <AboutSection />
    case "ceo":
    case "ceo_message":
      return <CEOMessage />
    case "how_it_works":
      return <HowItWorksSection />
    case "why_choose_us":
      return <WhyChooseUs />
    case "areas":
      return <ServiceAreasSection />
    case "values":
      return <ValuesSection />
    case "testimonials":
      return <Testimonials />
    case "partners":
      return (
        <>
          <Partners />
        </>
      )
    case "blog":
      return (
        <>
          <BlogSection />
        </>
      )
    case "service_request":
      return <ServiceRequestForm />
    case "contact":
      if (!phoneCall && !phoneWhatsapp) return null
      const contactCopy = homepageContent.sections?.contact
      return (
        <>
          <AdsSection position="before_footer" />
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
    description,
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

  useDocumentSEO({
    title: companyName
      ? `${companyName} | تأجير حاويات الأنقاض والنفايات بالرياض`
      : "تأجير حاويات الأنقاض والنفايات بالرياض | توصيل وسحب فوري",
    description: description || "تأجير حاويات الأنقاض والنفايات والمكابس ونقل مخلفات البناء والهدم وعقود النظافة الإلكترونية في الرياض.",
    canonical: getSiteUrl() ? `${getSiteUrl()}/` : undefined,
    ogImage: "/images/seo/cleanflow-home.jpg",
    ogImageAlt: "تأجير حاويات الأنقاض والنفايات بالرياض مع التوصيل والسحب",
  })

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    document.title = companyName
      ? `${companyName} | تأجير حاويات الأنقاض والنفايات بالرياض`
      : "تأجير حاويات مخلفات الأنقاض والنفايات بالرياض | توصيل وسحب فوري 24/7"
    injectLocalBusinessSchema({
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
    })
    return () => { document.getElementById("local-business-schema")?.remove() }
  }, [
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
    publicUrl,
    isLoaded,
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
      </main>

      <Footer />
    </div>
  )
}
