const SEO_MEDIA = {
  home: "/images/seo/cleanflow-home.jpg",
  services: "/images/seo/cleanflow-services.jpg",
  containers: "/images/seo/cleanflow-containers.jpg",
  pricing: "/images/seo/cleanflow-pricing.jpg",
  areas: "/images/seo/cleanflow-areas.jpg",
  blog: "/images/seo/cleanflow-blog.jpg",
  about: "/images/seo/cleanflow-about.jpg",
  contact: "/images/seo/cleanflow-contact.jpg",
  faq: "/images/seo/cleanflow-faq.jpg",
  partners: "/images/seo/cleanflow-partners.jpg",
  whyUs: "/images/seo/cleanflow-why-us.jpg",
  legal: "/images/seo/cleanflow-legal.jpg",
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
  const direct = PATH_MEDIA.find(([prefix]) => normalized === prefix || normalized.startsWith(`${prefix}/`))
  if (direct) return direct[1]
  const fallbacks = Object.values(SEO_MEDIA)
  return fallbacks[hashPath(normalized) % fallbacks.length]
}

export function seoImageAlt(title: string): string {
  return `${title.replace(/\s*\|.*$/, "").trim()} — مؤسسة تقي جروب لتأجير الحاويات بالرياض`
}

export { SEO_MEDIA }