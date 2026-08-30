import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import { applyThemePreset } from "@/lib/themePresets"

export function getSafeMapEmbedUrl(
  raw: string,
  options: { latitude?: string; longitude?: string; address?: string; companyName?: string } = {},
): string {
  const source = raw.trim()
  const srcMatch = source.match(/<iframe[^>]+src\s*=\s*["']([^"']+)["']/i)
  const candidate = (srcMatch?.[1] ?? source).replaceAll("&amp;", "&").trim()
  let parsed: URL | null = null
  try {
    parsed = candidate ? new URL(candidate) : null
  } catch {
    parsed = null
  }

  const latitude = Number(options.latitude)
  const longitude = Number(options.longitude)
  const hasCoordinates =
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
  const destination = hasCoordinates
    ? `${latitude},${longitude}`
    : [options.address, options.companyName, "الرياض"].filter(Boolean).join("، ")

  if (!parsed) {
    return destination
      ? `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&hl=ar&z=14&output=embed`
      : ""
  }

  const host = parsed.hostname.toLowerCase()
  const isGoogleMapsHost = host === "google.com" || host.endsWith(".google.com") || host === "maps.google.com"
  const isEmbedPath = parsed.pathname.toLowerCase().startsWith("/maps/embed")
  const isEmbedQuery = parsed.pathname.toLowerCase() === "/maps" && parsed.searchParams.get("output") === "embed"
  return isGoogleMapsHost && (isEmbedPath || isEmbedQuery) ? parsed.toString() : (
    destination
      ? `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&hl=ar&z=14&output=embed`
      : ""
  )
}

export function getSafeGoogleBusinessProfileUrl(raw: string): string {
  const value = raw.trim()
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    const isGoogleHost = host === "google.com" || host.endsWith(".google.com")
    return isGoogleHost && /^\/maps(?:\/|$)/i.test(url.pathname) ? url.toString() : ""
  } catch {
    return ""
  }
}

const API_BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "")

export interface HomepageContent {
  description?: string
  about?: {
    eyebrow?: string
    title?: string
    highlight?: string
    description?: string
    visionTitle?: string
    visionDescription?: string
    missionTitle?: string
    missionDescription?: string
    points?: string[]
    imageUrl?: string
    statValue?: string
    statLabel?: string
  }
  why?: {
    titlePrefix?: string
    titleHighlight?: string
    description?: string
    points?: string[]
    imageUrl?: string
    badgeValue?: string
    badgeTitle?: string
    badgeDescription?: string
  }
  how?: {
    eyebrow?: string
    title?: string
    description?: string
    steps?: Array<{
      number?: string
      title?: string
      subtitle?: string
      description?: string
    }>
    ctaText?: string
    footnote?: string
  }
  areas?: {
    eyebrow?: string
    title?: string
    highlight?: string
    description?: string
    items?: Array<{ slug: string; name: string; description: string }>
    missingText?: string
    phonePrefix?: string
    phoneSuffix?: string
  }
  sections?: {
    services?: { eyebrow?: string; title?: string; highlight?: string; description?: string; detailsLabel?: string }
    packages?: { title?: string; highlight?: string; description?: string }
    values?: { title?: string; description?: string }
    testimonials?: { title?: string; description?: string }
    blog?: { eyebrow?: string; title?: string; description?: string; allArticles?: string }
    contact?: { title?: string; description?: string; whatsappText?: string; callText?: string }
  }
}

export interface StatItem {
  label: string
  value: number
  suffix: string
}

export interface SocialLinks {
  facebook: string
  x: string
  instagram: string
  tiktok: string
  snapchat: string
  youtube: string
  linkedin: string
}

interface SiteSettings {
  logoUrl: string
  companyName: string
  description: string
  phones: string[]
  phoneCall: string
  phoneWhatsapp: string
  address: string
  city: string
  region: string
  country: string
  postalCode: string
  latitude: string
  longitude: string
  priceRange: string
  paymentMethods: string
  publicUrl: string
  socialLinks: SocialLinks
  googleBusinessProfile: string
  analyticsGoogleTagId: string
  facebookPixelId: string
  supportStatus: string
  supportHours: string
  email: string
  mapEmbed: string
  footerDescription: string
  homepageContent: HomepageContent
  statsItems: StatItem[]
  orderTrackingEnabled: boolean
  themePreset: string
  heroCompanyVisible: boolean
  heroCtaVisible: boolean
  heroCompanyPosition: string
  heroContentPosition: string
  heroCtaPosition: string
  sectionsOrder: string[]
  hiddenSections: string[]
  isLoaded: boolean
  isError: boolean
  reload: () => void
}

export function resolveContactNumbers(
  phoneCall: string,
  phoneWhatsapp: string,
  phones: string[],
): { call: string; whatsapp: string } {
  const additional = phones.filter((phone) => phone.trim().length > 0)
  const call = phoneCall.trim() || additional[0] || ""
  const whatsapp = phoneWhatsapp.trim() || additional.find((phone) => phone !== call) || additional[0] || ""
  return { call, whatsapp }
}

const DEFAULTS: SiteSettings = {
  logoUrl: "",
  companyName: "",
  description: "",
  phones: [],
  phoneCall: "",
  phoneWhatsapp: "",
  address: "",
  city: "",
  region: "",
  country: "",
  postalCode: "",
  latitude: "",
  longitude: "",
  priceRange: "",
  paymentMethods: "",
  publicUrl: "",
  socialLinks: { facebook: "", x: "", instagram: "", tiktok: "", snapchat: "", youtube: "", linkedin: "" },
  googleBusinessProfile: "",
  analyticsGoogleTagId: "",
  facebookPixelId: "",
  supportStatus: "",
  supportHours: "",
  email: "",
  mapEmbed: "",
  footerDescription: "",
  homepageContent: {},
  statsItems: [],
  orderTrackingEnabled: false,
  themePreset: "industrial_amber",
  heroCompanyVisible: true,
  heroCtaVisible: true,
  heroCompanyPosition: "center-center",
  heroContentPosition: "center-center",
  heroCtaPosition: "center-center",
  sectionsOrder: [],
  hiddenSections: [],
  isLoaded: false,
  isError: false,
  reload: () => {},
}

const SiteSettingsContext = createContext<SiteSettings>(DEFAULTS)

export function normalizeCompanyText(value: string): string {
  return value
}

export function formatSaudiPhone(value: string): string {
  const digits = value
    .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "")
    .replace(/^966/, "0")
  return /^05\d{8}$/.test(digits)
    ? `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`
    : value
}

export function replaceLegacyCompanyName(value: string | undefined, companyName: string): string | undefined {
  if (!value) return value
  const resolved = companyName.trim() || "المنشأة"
  return normalizeCompanyText(value)
    .replace(/\{\{company_name\}\}/g, resolved)
    .replace(/(?:مؤسسة|شركة)?\s*تقي\s*جروب/gi, resolved)
}

function replaceCompanyNameDeep(value: unknown, companyName: string): unknown {
  if (typeof value === "string") return replaceLegacyCompanyName(value, companyName) || ""
  if (Array.isArray(value)) return value.map(item => replaceCompanyNameDeep(item, companyName))
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceCompanyNameDeep(item, companyName)]),
    )
  }
  return value
}

function parseHomepageContent(raw: unknown): HomepageContent {
  if (typeof raw !== "string" || !raw.trim()) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as HomepageContent : {}
  } catch {
    return {}
  }
}

function parseStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  if (typeof raw !== "string" || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : []
  } catch {
    return []
  }
}

function parseStatsItems(raw: unknown): StatItem[] {
  if (typeof raw !== "string" || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item): StatItem[] => {
      if (!item || typeof item !== "object") return []
      const candidate = item as { label?: unknown; value?: unknown; suffix?: unknown }
      const value = typeof candidate.value === "number"
        ? candidate.value
        : typeof candidate.value === "string" && candidate.value.trim()
          ? Number(candidate.value)
          : NaN
      if (
        typeof candidate.label !== "string" ||
        typeof candidate.suffix !== "string" ||
        !Number.isFinite(value)
      ) return []
      return [{ label: candidate.label, value, suffix: candidate.suffix }]
    })
  } catch {
    return []
  }
}

function parseBooleanSetting(raw: unknown, fallback: boolean): boolean {
  if (raw === undefined || raw === null || raw === "") return fallback
  return raw === true || raw === "true" || raw === 1 || raw === "1"
}

function parseHeroPosition(raw: unknown, fallback: string): string {
  const value = typeof raw === "string" ? raw : ""
  return /^(top|center|bottom)-(left|center|right)$/.test(value) ? value : fallback
}

type FetchedSiteSettings = Omit<SiteSettings, "reload">

async function fetchSettings(): Promise<FetchedSiteSettings> {
  // Public settings are safe to reuse during a page session. Avoid forcing a
  // network revalidation on every first paint, which is expensive on mobile.
  const response = await fetch(`${API_BASE}/api/settings`, {
    cache: "default",
    headers: { Accept: "application/json" },
  })
  if (!response.ok) throw new Error(`Settings request failed with ${response.status}`)
  const data = await response.json()
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Settings response was invalid")
  }
  let phones: string[] = []
  try {
    const p = JSON.parse(data.company_phones || "[]")
    if (Array.isArray(p)) phones = p.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  } catch {}

  const trackingValue = data.order_tracking_enabled
  const orderTrackingEnabled = trackingValue === undefined || trackingValue === null || trackingValue === ""
    ? true
    : trackingValue === true || trackingValue === "true" || trackingValue === 1 || trackingValue === "1"

  const compName = typeof data.company_name === "string" && data.company_name.trim() ? data.company_name.trim() : ""
  const rawHomepageContent = parseHomepageContent(data.homepage_content)
  return {
    logoUrl: typeof data.company_logo === "string" ? data.company_logo.trim() : "",
    companyName: compName,
    description: typeof data.site_desc === "string" ? data.site_desc.trim() : "",
    phones,
    phoneCall: typeof data.company_phone_call === "string" ? data.company_phone_call.trim() : "",
    phoneWhatsapp: typeof data.company_phone_whatsapp === "string" ? data.company_phone_whatsapp.trim() : "",
    address: typeof data.company_address === "string" ? data.company_address.trim() : "",
    city: typeof data.company_city === "string" ? data.company_city.trim() : "",
    region: typeof data.company_region === "string" ? data.company_region.trim() : "",
    country: typeof data.company_country === "string" ? data.company_country.trim() : "",
    postalCode: typeof data.company_postal_code === "string" ? data.company_postal_code.trim() : "",
    latitude: typeof data.company_latitude === "string" ? data.company_latitude.trim() : "",
    longitude: typeof data.company_longitude === "string" ? data.company_longitude.trim() : "",
    priceRange: typeof data.company_price_range === "string" ? data.company_price_range.trim() : "",
    paymentMethods: typeof data.company_payment_methods === "string" ? data.company_payment_methods.trim() : "",
    publicUrl: typeof data.site_public_url === "string" ? data.site_public_url.trim() : "",
    socialLinks: {
      facebook: typeof data.social_facebook === "string" ? data.social_facebook.trim() : "",
      x: typeof data.social_x === "string" ? data.social_x.trim() : "",
      instagram: typeof data.social_instagram === "string" ? data.social_instagram.trim() : "",
      tiktok: typeof data.social_tiktok === "string" ? data.social_tiktok.trim() : "",
      snapchat: typeof data.social_snapchat === "string" ? data.social_snapchat.trim() : "",
      youtube: typeof data.social_youtube === "string" ? data.social_youtube.trim() : "",
      linkedin: typeof data.social_linkedin === "string" ? data.social_linkedin.trim() : "",
    },
    googleBusinessProfile: typeof data.company_google_business_profile === "string"
      ? data.company_google_business_profile.trim()
      : "",
    analyticsGoogleTagId: typeof data.analytics_google_tag_id === "string" ? data.analytics_google_tag_id.trim() : "",
    facebookPixelId: typeof data.facebook_pixel_id === "string" ? data.facebook_pixel_id.trim() : "",
    supportStatus: typeof data.support_status === "string" ? data.support_status.trim() : "",
    supportHours: typeof data.support_hours === "string" && data.support_hours.trim()
      ? data.support_hours.trim()
      : "",
    email: typeof data.company_email === "string" ? data.company_email.trim() : "",
    mapEmbed: data.company_map_embed || "",
    footerDescription: typeof data.company_footer_description === "string"
      ? data.company_footer_description
      : "",
    homepageContent: replaceCompanyNameDeep(rawHomepageContent, compName) as HomepageContent,
    statsItems: parseStatsItems(data.stats_items),
    orderTrackingEnabled,
    themePreset: (() => {
      const p = typeof data.theme_preset === "string" && data.theme_preset.trim() ? data.theme_preset.trim() : "industrial_amber"
      applyThemePreset(p)
      return p
    })(),
    heroCompanyVisible: parseBooleanSetting(data.hero_company_visible, true),
    heroCtaVisible: parseBooleanSetting(data.hero_cta_visible, true),
    heroCompanyPosition: parseHeroPosition(data.hero_company_position, "center-center"),
    // Older installations used hero_company_position for the complete hero
    // content block. Keep that value as the migration fallback.
    heroContentPosition: parseHeroPosition(
      data.hero_content_position ?? data.hero_company_position,
      "center-center",
    ),
    heroCtaPosition: parseHeroPosition(data.hero_cta_position, "center-center"),
    sectionsOrder: parseStringArray(data.sections_order),
    hiddenSections: parseStringArray(data.sections_hidden),
    isLoaded: true,
    isError: false,
  }
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS)
  const requestSequence = useRef(0)

  const reload = useCallback(() => {
    const sequence = ++requestSequence.current
    fetchSettings()
      .then(next => {
        if (sequence === requestSequence.current) setSettings({ ...next, reload })
      })
      .catch(() => {
        if (sequence === requestSequence.current) {
          setSettings(current => ({ ...current, isLoaded: true, isError: true }))
        }
      })
  }, [])

  // Initial fetch
  useEffect(() => {
    reload()
  }, [reload])

  // Refetch when the admin saves settings (custom event fired by SiteSettings page)
  useEffect(() => {
    window.addEventListener("siteSettingsChanged", reload)
    return () => window.removeEventListener("siteSettingsChanged", reload)
  }, [reload])

  // Refetch when the user switches back to this tab
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") reload() }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [reload])

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext)
}
