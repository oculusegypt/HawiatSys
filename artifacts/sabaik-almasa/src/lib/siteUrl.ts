/**
 * The public origin is injected into static HTML from site_public_url and is
 * updated when settings load. Never use the browser origin for SEO: previews
 * and staging hosts must not become canonical production URLs.
 */
function validPublicOrigin(value: string | null | undefined): string {
  const raw = (value || "").trim()
  if (!raw) return ""
  try {
    const parsed = new URL(raw)
    if (!["http:", "https:"].includes(parsed.protocol)) return ""
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0|replit\.(dev|app)$/i.test(parsed.hostname)) return ""
    return parsed.origin
  } catch {
    return ""
  }
}

export function setSitePublicUrl(value: string | null | undefined): void {
  if (typeof document === "undefined") return
  let meta = document.querySelector("meta[name='site-public-url']") as HTMLMetaElement | null
  if (!meta) {
    meta = document.createElement("meta")
    meta.name = "site-public-url"
    document.head.appendChild(meta)
  }
  meta.content = validPublicOrigin(value)
}

export function getSiteUrl(): string {
  if (typeof document === "undefined") return ""
  return validPublicOrigin(
    document.querySelector("meta[name='site-public-url']")?.getAttribute("content"),
  )
}

export function siteUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  const origin = getSiteUrl()
  return `${origin}${normalized}`
}

/** Keep externally supplied internal URLs on the current public origin. */
export function sitePath(value: string | null | undefined): string {
  if (!value) return "/"
  try {
    const url = new URL(value)
    return `${url.pathname}${url.search}${url.hash}` || "/"
  } catch {
    // Relative values are already suitable for the current origin.
  }
  return value
}