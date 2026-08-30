const SEO_MEDIA = {
  home: "/images/seo/taqi-home.jpg",
  services: "/images/seo/taqi-services.jpg",
  containers: "/images/seo/taqi-containers.jpg",
  pricing: "/images/seo/taqi-pricing.jpg",
  areas: "/images/seo/taqi-areas.jpg",
  blog: "/images/seo/taqi-blog.jpg",
  about: "/images/seo/taqi-about.jpg",
  contact: "/images/seo/taqi-contact.jpg",
  faq: "/images/seo/taqi-faq.jpg",
  partners: "/images/seo/taqi-partners.jpg",
  whyUs: "/images/seo/taqi-why-us.jpg",
  legal: "/images/seo/taqi-legal.jpg",
} as const

const PATH_MEDIA: Array<[string, string]> = [
  ["/why-us/leadership", SEO_MEDIA.whyUs],
  ["/why-us/what-we-do", SEO_MEDIA.services],
  ["/why-us/commitment", SEO_MEDIA.contact],
  ["/why-us/experience", SEO_MEDIA.about],
  ["/services", SEO_MEDIA.services],
  ["/containers", SEO_MEDIA.containers],
  ["/packages", SEO_MEDIA.containers],
  ["/cleaning-packages", SEO_MEDIA.containers],
  ["/pricing", SEO_MEDIA.pricing],
  ["/areas", SEO_MEDIA.areas],
  ["/blog", SEO_MEDIA.blog],
  ["/about", SEO_MEDIA.about],
  ["/contact", SEO_MEDIA.contact],
  ["/partners", SEO_MEDIA.partners],
  ["/faq", SEO_MEDIA.faq],
  ["/privacy", SEO_MEDIA.legal],
  ["/terms", SEO_MEDIA.legal],
  ["/chat", SEO_MEDIA.contact],
]

function hashPath(path: string): number {
  return Array.from(path).reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 7)
}

/** Pick a stable campaign image for a route when the record has no cover image. */
export function seoImageForPath(path: string): string {
  const normalized = path.split("?")[0].replace(/\/+$/, "") || "/"
  const decoded = (() => {
    try {
      return decodeURIComponent(normalized).toLowerCase()
    } catch {
      return normalized.toLowerCase()
    }
  })()
  const keywordMedia: Array<[string[], string]> = [
    [["سعر", "أسعار", "تكلفة", "pricing"], SEO_MEDIA.pricing],
    [["حي", "أحياء", "مناطق", "تغطية", "ضواحي", "areas"], SEO_MEDIA.areas],
    [["سؤال", "أسئلة", "faq"], SEO_MEDIA.faq],
    [["مطاعم", "مصانع", "مستودعات", "منشآت"], SEO_MEDIA.services],
    [["حاويات", "أنقاض", "مخلفات", "هدم", "بناء", "ترميم", "رفع", "نقل"], SEO_MEDIA.containers],
  ]
  const keywordMatch = keywordMedia.find(([keywords]) => keywords.some(keyword => decoded.includes(keyword)))
  if (keywordMatch) return keywordMatch[1]
  const direct = PATH_MEDIA.find(([prefix]) => normalized === prefix || normalized.startsWith(`${prefix}/`))
  if (direct) return direct[1]
  const fallbacks = Object.values(SEO_MEDIA)
  return fallbacks[hashPath(normalized) % fallbacks.length]
}

export function seoImageAlt(title: string): string {
  return `${title.replace(/\s*\|.*$/, "").trim()} — خدمات تأجير الحاويات بالرياض`
}

export { SEO_MEDIA }