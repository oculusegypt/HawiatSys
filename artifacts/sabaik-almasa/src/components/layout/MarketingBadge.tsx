import { useEffect, useState } from "react"
import { ArrowLeft, X } from "lucide-react"
import { useSiteSettings } from "@/context/SiteSettingsContext"

const DISMISS_KEY = "hawiyat_marketing_badge_dismissed"
const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "")

export function MarketingBadge() {
  const { logoUrl, companyName } = useSiteSettings()
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`${BASE}/api/settings`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const isEnabled = data.platform_promo_enabled !== "false"
        setEnabled(isEnabled)
        if (!isEnabled) return
        setMounted(true)
        const entranceTimer = setTimeout(() => setVisible(true), 300)
        return () => clearTimeout(entranceTimer)
      })
      .catch(() => {
        if (!cancelled) {
          setMounted(true)
          setTimeout(() => setVisible(true), 300)
        }
      })
    return () => { cancelled = true }
  }, [])

  function dismiss() {
    setVisible(false)
    setTimeout(() => {
      setMounted(false)
      try { sessionStorage.setItem(DISMISS_KEY, "1") } catch {}
    }, 350)
  }

  if (!enabled || !mounted) return null

  const resolvedLogo = logoUrl || `${BASE}/images/logo.png`
  const resolvedName = companyName || "منظومة إدارة الحاويات"

  return (
    <div
      dir="rtl"
      className={`
        fixed bottom-[88px] left-4 z-50 max-w-[250px] transition-all duration-350 ease-out select-none
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"}
      `}
      style={{ filter: "drop-shadow(0 8px 24px rgba(15, 23, 42, .3))" }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[#123b56] via-[#0f2d43] to-[#0b1e31] text-white">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#d7a936]/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-cyan-400/10 blur-2xl" />

        <button
          onClick={dismiss}
          aria-label="إغلاق"
          className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X size={12} />
        </button>

        <div className="relative space-y-3 px-4 pb-4 pt-3">
          <div className="pl-5 flex justify-center">
            <img
              src={resolvedLogo}
              alt={resolvedName}
              className="h-14 w-auto object-contain drop-shadow-md"
            />
          </div>

          <div className="pl-5">
            <h2 className="text-sm font-bold leading-6">منظومة تأجير الحاويات المتكاملة</h2>
            <p className="mt-1 text-[10px] leading-relaxed text-white/65">
              حلول رقمية وإدارة أسطول ذكية لنقل الأنقاض والمخلفات بالرياض.
            </p>
          </div>

          <a
            href="/containers"
            aria-label="استعراض الحاويات"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d7a936] px-3 py-2 text-xs font-bold text-[#102c42] shadow-lg shadow-black/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#ebc45f]"
          >
            استعراض الحاويات المتاحة
            <ArrowLeft size={14} />
          </a>
        </div>

        <div className="h-px w-full bg-gradient-to-l from-transparent via-[#f1cb72]/50 to-transparent" />
      </div>
    </div>
  )
}
