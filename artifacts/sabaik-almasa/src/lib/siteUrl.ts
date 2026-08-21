/**
 * The public site can be deployed to more than one domain. Never bake a
 * business domain into page metadata or internal URLs.
 */
export function getSiteUrl(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin.replace(/\/+$/, "")
  }
  return ""
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
    const currentOrigin = getSiteUrl()
    if (currentOrigin && url.origin === currentOrigin) {
      return `${url.pathname}${url.search}${url.hash}` || "/"
    }
  } catch {
    // Relative values are already suitable for the current origin.
  }
  return value
}