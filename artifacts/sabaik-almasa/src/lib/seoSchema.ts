import { siteUrl } from "@/lib/siteUrl"

export type BreadcrumbItem = {
  name: string
  url: string
}

export type SchemaImage = {
  url: string
  name?: string
  caption?: string
}

export const HOME_FAQS = [
  {
    q: "ما المقاس المناسب لحاوية مخلفات البناء في الرياض؟",
    a: "يعتمد المقاس على كمية المخلفات ومساحة المشروع ونوع العمل. نساعدك في اختيار الحاوية المناسبة لأعمال الترميم أو البناء أو الهدم قبل التوصيل.",
  },
  {
    q: "كيف يتم تحديد سعر تأجير الحاوية بالرياض؟",
    a: "يتحدد العرض حسب حجم الحاوية ونوع المخلفات وموقع المشروع ومدة التأجير، مع توضيح تكلفة التوصيل والسحب أو التبديل قبل تأكيد الطلب.",
  },
  {
    q: "هل تشمل الخدمة توصيل الحاوية وسحبها؟",
    a: "نعم، ننسق موعد توصيل الحاوية إلى موقعك ثم سحبها أو تبديلها عند الامتلاء أو انتهاء مدة التأجير حسب احتياج المشروع.",
  },
  {
    q: "هل توفرون حاويات أنقاض ونفايات لجميع أحياء الرياض؟",
    a: "نخدم شمال وشرق وغرب وجنوب ووسط الرياض، ونؤكد التغطية والموعد بعد استلام العنوان ونوع المخلفات والمقاس المطلوب.",
  },
] as const

function absoluteUrl(value: string): string {
  if (!value) return ""
  return /^https?:\/\//i.test(value) ? value : siteUrl(value.startsWith("/") ? value : `/${value}`)
}

export function imageSchema(image: SchemaImage | string | undefined): Record<string, unknown> | undefined {
  const raw = typeof image === "string" ? { url: image } : image
  if (!raw?.url) return undefined
  const url = absoluteUrl(raw.url)
  return {
    "@type": "ImageObject",
    "url": url,
    ...(raw.name ? { name: raw.name } : {}),
    ...(raw.caption ? { caption: raw.caption } : {}),
  }
}

export function breadcrumbSchema(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": absoluteUrl(item.url),
    })),
  }
}

export function pageSchema({
  id,
  type = "WebPage",
  name,
  description,
  url,
  image,
  companyName,
  about,
}: {
  id: string
  type?: string
  name: string
  description: string
  url: string
  image?: SchemaImage | string
  companyName?: string
  about?: string
}): Record<string, unknown> {
  const imageValue = imageSchema(image)
  return {
    "@type": type,
    "@id": `${absoluteUrl(url)}#${id}`,
    "name": name,
    "description": description,
    "url": absoluteUrl(url),
    "inLanguage": "ar",
    ...(imageValue ? { image: imageValue } : {}),
    ...(companyName ? {
      "isPartOf": { "@type": "WebSite", "name": companyName, "url": absoluteUrl("/") },
      "publisher": { "@type": "Organization", "name": companyName, "url": absoluteUrl("/") },
    } : {}),
    ...(about ? { "about": { "@type": "Thing", "name": about } } : {}),
  }
}

export function localBusinessSchema({
  companyName,
  phoneNumbers = [],
  address,
  city,
  region,
  country,
}: {
  companyName: string
  phoneNumbers?: string[]
  address?: string
  city?: string
  region?: string
  country?: string
}): Record<string, unknown> {
  const phones = [...new Set(phoneNumbers.map((phone) => {
    const digits = phone.replace(/\D/g, "")
    if (digits.startsWith("00")) return `+${digits.slice(2)}`
    if (digits.startsWith("0")) return `+966${digits.slice(1)}`
    if (digits.startsWith("966")) return `+${digits}`
    return digits ? `+${digits}` : ""
  }).filter(Boolean))]
  const addressValue = {
    "@type": "PostalAddress",
    ...(address ? { streetAddress: address } : {}),
    ...(city ? { addressLocality: city } : {}),
    ...(region ? { addressRegion: region } : {}),
    ...(country ? { addressCountry: country } : {}),
  }
  return {
    "@type": "LocalBusiness",
    "@id": `${absoluteUrl("/")}#local-business`,
    "name": companyName,
    "url": absoluteUrl("/"),
    ...(phones.length ? { telephone: phones.length === 1 ? phones[0] : phones } : {}),
    ...(Object.keys(addressValue).length > 1 ? { address: addressValue } : {}),
  }
}

export function homepageSchema({
  companyName,
  description,
  logo,
  image,
  phoneNumbers = [],
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
  siteName,
}: {
  companyName: string
  description: string
  logo?: string
  image?: string
  phoneNumbers?: string[]
  address?: string
  city?: string
  region?: string
  country?: string
  postalCode?: string
  latitude?: string
  longitude?: string
  priceRange?: string
  paymentMethods?: string
  socialLinks?: unknown
  googleBusinessProfile?: string
  siteName?: string
}): Record<string, unknown> {
  const baseUrl = absoluteUrl("/")
  const searchName = siteName?.trim() || companyName
  const organizationId = `${baseUrl}#organization`
  const localBusinessId = `${baseUrl}#local-business`
  const websiteId = `${baseUrl}#website`
  const phoneValues = [...new Set(phoneNumbers.map((phone) => {
    const digits = String(phone || "").replace(/\D/g, "")
    if (digits.startsWith("00")) return `+${digits.slice(2)}`
    if (digits.startsWith("0")) return `+966${digits.slice(1)}`
    if (digits.startsWith("966")) return `+${digits}`
    return digits ? `+${digits}` : ""
  }).filter(Boolean))]
  const addressValue = {
    "@type": "PostalAddress",
    ...(address ? { streetAddress: address } : {}),
    ...(city ? { addressLocality: city } : {}),
    ...(region ? { addressRegion: region } : {}),
    ...(country ? { addressCountry: country } : {}),
    ...(postalCode ? { postalCode } : {}),
  }
  const sameAs = socialLinks && typeof socialLinks === "object"
    ? [...new Set(Object.values(socialLinks as Record<string, unknown>)
      .filter((value): value is string => typeof value === "string" && /^https?:\/\//i.test(value)))]
    : []
  const businessProfile = typeof googleBusinessProfile === "string" && /^https?:\/\/(?:www\.)?(?:google\.[^/]+|maps\.google\.com)\//i.test(googleBusinessProfile.trim())
    ? googleBusinessProfile.trim()
    : ""
  const identityLinks = businessProfile ? [...new Set([...sameAs, businessProfile])] : sameAs
  const contactPoint = phoneValues.length ? {
    "@type": "ContactPoint",
    telephone: phoneValues.length === 1 ? phoneValues[0] : phoneValues,
    contactType: "customer service",
    areaServed: country || "SA",
    availableLanguage: ["ar"],
  } : undefined
  const localBusiness = {
    "@type": "LocalBusiness",
    "@id": localBusinessId,
    name: searchName,
    ...(companyName && companyName !== searchName ? { alternateName: companyName } : {}),
    description,
    url: baseUrl,
    parentOrganization: { "@id": organizationId },
    ...(logo ? { logo: imageSchema(logo) } : {}),
    ...(image ? { image: imageSchema(image) } : {}),
    ...(phoneValues.length ? { telephone: phoneValues.length === 1 ? phoneValues[0] : phoneValues } : {}),
    ...(priceRange ? { priceRange } : {}),
    ...(paymentMethods ? { paymentAccepted: paymentMethods } : {}),
    ...(Object.keys(addressValue).length > 1 ? { address: addressValue } : {}),
    ...(latitude && longitude ? {
      geo: { "@type": "GeoCoordinates", latitude, longitude },
    } : {}),
    ...(city ? { areaServed: { "@type": "City", name: city } } : {}),
    ...(contactPoint ? { contactPoint } : {}),
     ...(identityLinks.length ? { sameAs: identityLinks } : {}),
     ...(businessProfile ? { hasMap: businessProfile } : {}),
  }
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: searchName,
        ...(companyName && companyName !== searchName ? { alternateName: companyName } : {}),
        url: baseUrl,
        ...(logo ? { logo: imageSchema(logo) } : {}),
        ...(description ? { description } : {}),
         ...(identityLinks.length ? { sameAs: identityLinks } : {}),
        ...(contactPoint ? { contactPoint } : {}),
      },
      localBusiness,
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: baseUrl,
        name: searchName,
        ...(companyName && companyName !== searchName ? { alternateName: companyName } : {}),
        inLanguage: "ar",
        publisher: { "@id": organizationId },
      },
      {
        "@type": "WebPage",
        "@id": `${baseUrl}#webpage`,
        url: baseUrl,
        name: searchName,
        description,
        isPartOf: { "@id": websiteId },
        about: { "@id": localBusinessId },
        publisher: { "@id": organizationId },
        inLanguage: "ar",
      },
      {
        "@type": "FAQPage",
        "@id": `${baseUrl}#FAQPage`,
        mainEntity: HOME_FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
    ],
  }
}

export function serviceSchema({
  service,
  description,
  url,
  image,
  companyName,
  phoneNumbers,
  address,
  city,
  region,
  country,
  googleBusinessProfile,
}: {
  service: string
  description: string
  url: string
  image?: SchemaImage | string
  companyName: string
  phoneNumbers?: string[]
  address?: string
  city?: string
  region?: string
  country?: string
  googleBusinessProfile?: string
}): Record<string, unknown> {
  const businessProfile = typeof googleBusinessProfile === "string" && /^https?:\/\/(?:www\.)?(?:google\.[^/]+|maps\.google\.com)\//i.test(googleBusinessProfile.trim())
    ? googleBusinessProfile.trim()
    : ""
  return {
    "@type": "Service",
    "@id": `${absoluteUrl(url)}#service`,
    "name": service,
    "description": description,
    "url": absoluteUrl(url),
    "image": imageSchema(image),
    "provider": {
      ...localBusinessSchema({ companyName, phoneNumbers, address, city, region, country }),
      ...(businessProfile ? { hasMap: businessProfile, sameAs: [businessProfile] } : {}),
    },
    "areaServed": { "@type": "City", "name": city || "الرياض" },
    "inLanguage": "ar",
  }
}

export function containerSchema({
  name,
  description,
  url,
  image,
  category,
  companyName,
  priceText,
  pricePerDay,
}: {
  name: string
  description: string
  url: string
  image?: SchemaImage | string
  category?: string
  companyName: string
  priceText?: string
  pricePerDay?: number
}): Record<string, unknown> {
  void priceText
  void pricePerDay
  return {
    // A container rental is a locally delivered service, not a shippable
    // ecommerce product. Do not emit an Offer unless verified shipping and
    // return policies exist in the business data.
    "@type": "Service",
    "@id": `${absoluteUrl(url)}#product`,
    "name": name,
    "description": description,
    "url": absoluteUrl(url),
    "image": imageSchema(image),
    "serviceType": category || "تأجير الحاويات ونقل المخلفات",
    "provider": {
      "@type": "LocalBusiness",
      "@id": `${absoluteUrl("/")}#local-business`,
      "name": companyName,
      "url": absoluteUrl("/"),
    },
    "areaServed": { "@type": "City", "name": "الرياض" },
    "inLanguage": "ar",
  }
}