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
}): Record<string, unknown> {
  return {
    "@type": "Service",
    "@id": `${absoluteUrl(url)}#service`,
    "name": service,
    "description": description,
    "url": absoluteUrl(url),
    "image": imageSchema(image),
    "provider": localBusinessSchema({ companyName, phoneNumbers, address, city, region, country }),
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
  const parsedTextPrice = String(priceText || "").match(/\d+(?:\.\d+)?/)?.[0]
  const numericPrice = typeof pricePerDay === "number" && pricePerDay > 0
    ? pricePerDay
    : Number(parsedTextPrice || 0)
  const hasPrice = numericPrice > 0
  return {
    "@type": "Product",
    "@id": `${absoluteUrl(url)}#product`,
    "name": name,
    "description": description,
    "url": absoluteUrl(url),
    "image": imageSchema(image),
    "category": category || "تأجير الحاويات ونقل المخلفات",
    "brand": { "@type": "Brand", "name": companyName },
    ...(hasPrice ? {
      "offers": {
        "@type": "Offer",
        "priceCurrency": "SAR",
        "price": String(numericPrice),
        "availability": "https://schema.org/InStock",
        ...(priceText ? { "description": priceText } : {}),
      },
    } : {}),
    "inLanguage": "ar",
  }
}