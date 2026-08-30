import { useEffect } from "react"
import { replaceLegacyCompanyName, useSiteSettings } from "@/context/SiteSettingsContext"
import { sitePath, siteUrl } from "@/lib/siteUrl"
import { seoImageAlt, seoImageForPath } from "@/lib/seoMedia"
import { normalizeSeoDescription } from "@/lib/seoText"
import { mergeGoldenSeoKeywords } from "@/lib/seoKeywords"

interface SEOOptions {
  title: string
  description?: string
  keywords?: string
  canonical?: string
  ogImage?: string
  ogImageAlt?: string
  ogType?: string
  indexable?: boolean
}

function setMeta(attr: string, value: string, attrName = "name") {
  if (!value) return
  let el = document.querySelector(`meta[${attrName}="${attr}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute(attrName, attr)
    document.head.appendChild(el)
  }
  el.content = value
}

function setCanonical(href: string) {
  let el = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null
  if (!el) { el = document.createElement("link"); el.rel = "canonical"; document.head.appendChild(el) }
  el.href = href
}

function setAlternate(hreflang: string, href: string) {
  let el = document.querySelector(`link[rel='alternate'][hreflang='${hreflang}']`) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement("link")
    el.rel = "alternate"
    el.hreflang = hreflang
    document.head.appendChild(el)
  }
  el.href = href
}

export function useDocumentSEO({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  ogImageAlt,
  ogType = "website",
  indexable = true,
}: SEOOptions) {
  const { companyName, isLoaded } = useSiteSettings()

  useEffect(() => {
    // Keep the static, neutral title from index.html until the configured
    // company name is available. This prevents a visible default-name flash.
    if (!isLoaded) return

    const replaceCompanyName = (value?: string) =>
      value ? replaceLegacyCompanyName(value, companyName) : value
    const resolvedTitle = replaceCompanyName(title) || title
    const resolvedDescription = normalizeSeoDescription(
      replaceCompanyName(description),
      resolvedTitle.replace(/\s*\|.*$/, "").trim(),
    )
    const resolvedKeywords = mergeGoldenSeoKeywords(replaceCompanyName(keywords))
    const resolvedOgImageAlt = replaceCompanyName(ogImageAlt)
    const resolvedOgImage = ogImage || seoImageForPath(canonical || window.location.pathname)
    const absoluteOgImage = /^https?:\/\//i.test(resolvedOgImage)
      ? resolvedOgImage
      : siteUrl(sitePath(resolvedOgImage))
    const prevTitle = document.title
    const prevDesc  = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? ""
    const prevCanon = document.querySelector("link[rel='canonical']")?.getAttribute("href") ?? ""
    const prevRobots = document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? ""

    document.title = resolvedTitle

    // Primary
    if (resolvedDescription) setMeta("description", resolvedDescription)
    if (resolvedKeywords)    setMeta("keywords",     resolvedKeywords)
    setMeta("robots", indexable ? "index, follow" : "noindex, follow")

    // Open Graph
    setMeta("og:title",       resolvedTitle, "property")
    setMeta("og:type",        ogType,      "property")
    setMeta("og:locale",      "ar_SA",     "property")
    setMeta("og:site_name",   companyName || "المنشأة", "property")
    if (resolvedDescription) setMeta("og:description", resolvedDescription, "property")
    if (canonical)   setMeta("og:url",          canonical,  "property")
    setMeta("og:image",             absoluteOgImage, "property")
    setMeta("og:image:secure_url",  absoluteOgImage, "property")
    setMeta("og:image:type",        "image/jpeg", "property")
    setMeta("og:image:width",       "1200", "property")
    setMeta("og:image:height",      "675", "property")
    setMeta("og:image:alt",         resolvedOgImageAlt || seoImageAlt(resolvedTitle), "property")

    // Twitter / X
    setMeta("twitter:card",        "summary_large_image")
    setMeta("twitter:title",       resolvedTitle)
    if (resolvedDescription) setMeta("twitter:description", resolvedDescription)
    if (canonical)   setMeta("twitter:url",         canonical)
    setMeta("twitter:image",       absoluteOgImage)
    setMeta("twitter:image:alt",   resolvedOgImageAlt || seoImageAlt(resolvedTitle))

    // Canonical link
    if (canonical) {
      setCanonical(canonical)
      setAlternate("ar", canonical)
      setAlternate("x-default", canonical)
    }

    return () => {
      document.title = prevTitle
      if (prevDesc)  setMeta("description", prevDesc)
      if (prevCanon) setCanonical(prevCanon)
      if (prevRobots) setMeta("robots", prevRobots)
    }
  }, [title, description, keywords, canonical, ogImage, ogImageAlt, ogType, indexable, companyName, isLoaded])
}
