import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Lock, LockOpen, Headphones, Bot, CheckCircle, AlertCircle, Clock,
  Building2, Phone, MessageCircle, Plus, Trash2, PhoneCall, BarChart2,
  Image as ImageIcon, Star, Users, Pencil, Eye, EyeOff, X, Check, GripVertical,
  ExternalLink, SlidersHorizontal, RotateCcw, LayoutGrid, Upload, RefreshCw, Megaphone,
  Palette, Sparkles, Server, CheckCircle2, Circle, Loader2,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { THEME_PRESETS, applyThemePreset, type ThemePreset } from "@/lib/themePresets"
import { getSafeMapEmbedUrl } from "@/context/SiteSettingsContext"
import { motion } from "framer-motion"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  useGetSlides, useCreateSlide, useUpdateSlide, useDeleteSlide,
  useGetTestimonials, useCreateTestimonial, useUpdateTestimonial, useDeleteTestimonial,
  useGetPartners, useCreatePartner, useUpdatePartner, useDeletePartner,
} from "@workspace/api-client-react"
import type { HeroSlide, Testimonial, Partner } from "@workspace/api-client-react"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
const formatNumberForSettings = (value: number) => new Intl.NumberFormat("ar-SA").format(value)

// ── Types ──────────────────────────────────────────────────────────────────────
interface StatItem { label: string; value: number; suffix: string }

interface SiteSettings {
  requests_locked: string
  requests_locked_message: string
  order_tracking_enabled: string
  support_status: string
  support_hours: string
  theme_preset: string
  company_name: string
  company_logo: string
  company_phones: string
  company_phone_call: string
  company_phone_whatsapp: string
  company_email: string
  company_address: string
  company_city: string
  company_region: string
  company_country: string
  company_postal_code: string
  company_latitude: string
  company_longitude: string
  company_price_range: string
  company_payment_methods: string
  company_map_embed: string
  company_footer_description: string
  site_public_url: string
  social_facebook: string
  social_x: string
  social_instagram: string
  social_tiktok: string
  social_snapchat: string
  social_youtube: string
  social_linkedin: string
  company_google_business_profile: string
  analytics_google_tag_id: string
  facebook_pixel_id: string
  stats_items: string
  platform_promo_enabled: string
}

const DEFAULT_STATS: StatItem[] = [
  { label: "سنوات خبرة",  value: 6,   suffix: "+" },
  { label: "مشروع منجز",  value: 500, suffix: "+" },
  { label: "خدمة مستمرة", value: 24,  suffix: "/7" },
  { label: "رضا العملاء", value: 100, suffix: "%" },
]

const DEFAULTS: SiteSettings = {
  requests_locked: "false",
  requests_locked_message: "عذراً، الطلبات مغلقة مؤقتاً. سيتم استئناف الخدمة قريباً.",
  order_tracking_enabled: "true",
  support_status: "unavailable",
  support_hours: "السبت — الجمعة 7ص–10م",
  theme_preset: "industrial_amber",
  company_name: "",
  company_logo: "",
  company_phones: JSON.stringify([]),
  company_phone_call: "",
  company_phone_whatsapp: "",
  company_email: "",
  company_address: "",
  company_city: "",
  company_region: "",
  company_country: "",
  company_postal_code: "",
  company_latitude: "",
  company_longitude: "",
  company_price_range: "",
  company_payment_methods: "",
  company_map_embed: "",
  company_footer_description: "",
  site_public_url: "",
  social_facebook: "",
  social_x: "",
  social_instagram: "",
  social_tiktok: "",
  social_snapchat: "",
  social_youtube: "",
  social_linkedin: "",
  company_google_business_profile: "",
  analytics_google_tag_id: "",
  facebook_pixel_id: "",
  stats_items: JSON.stringify(DEFAULT_STATS),
  platform_promo_enabled: "true",
}

function normalizeGoogleMapEmbed(value: string): { url: string; error: string } {
  const input = value.trim()
  if (!input) return { url: "", error: "" }

  // Accept either the URL copied from Google Maps or a complete iframe tag.
  const srcMatch = input.match(/<iframe[^>]+src\s*=\s*["']([^"']+)["']/i)
  const candidate = (srcMatch?.[1] ?? input)
    .replaceAll("&amp;", "&")
    .replaceAll("&#x26;", "&")
    .trim()

  try {
    const url = new URL(candidate)
    const host = url.hostname.toLowerCase()
    const isGoogleMapsHost = host === "google.com" || host.endsWith(".google.com") || host === "maps.google.com"
    const isEmbedPath = url.pathname.toLowerCase().startsWith("/maps/embed")
    const isEmbedQuery = url.pathname.toLowerCase() === "/maps" && url.searchParams.get("output") === "embed"
    if (!isGoogleMapsHost || (!isEmbedPath && !isEmbedQuery)) {
      return { url: "", error: "الصق رابط Embed من خيار «تضمين خريطة» في Google Maps، وليس رابط المشاركة العادي." }
    }
    return { url: url.toString(), error: "" }
  } catch {
    return { url: "", error: "رابط الخريطة غير صالح. يجب أن يكون رابط Google Maps بصيغة Embed." }
  }
}

const SUPPORT_OPTIONS = [
  { value: "available",   label: "متاح",     description: "الدعم المباشر متاح — سيتم تعطيل البوت الذكي", icon: CheckCircle, color: "green" },
  { value: "busy",        label: "مشغول",    description: "الدعم مشغول — البوت يعمل مع إشعار بانتظار الدعم", icon: Clock,        color: "amber" },
  { value: "unavailable", label: "غير متاح", description: "الدعم غير متاح — البوت يعمل بشكل كامل",          icon: AlertCircle,  color: "red"   },
]

// ── Slide form ─────────────────────────────────────────────────────────────────
type SlideForm = { title: string; subtitle: string; imageUrl: string; ctaText: string; order: number; isActive: boolean }
const emptySlide = (): SlideForm => ({ title: "", subtitle: "", imageUrl: "", ctaText: "اطلب خدمتك الآن", order: 0, isActive: true })

const HERO_POSITIONS = [
  { value: "top-right", label: "أعلى يمين" },
  { value: "top-center", label: "أعلى وسط" },
  { value: "top-left", label: "أعلى يسار" },
  { value: "center-right", label: "وسط يمين" },
  { value: "center-center", label: "وسط" },
  { value: "center-left", label: "وسط يسار" },
  { value: "bottom-right", label: "أسفل يمين" },
  { value: "bottom-center", label: "أسفل وسط" },
  { value: "bottom-left", label: "أسفل يسار" },
] as const

// ── Testimonial form ───────────────────────────────────────────────────────────
type TestimonialForm = { clientName: string; company: string; content: string; rating: number; avatarUrl: string; isActive: boolean }
const emptyTestimonial = (): TestimonialForm => ({ clientName: "", company: "", content: "", rating: 5, avatarUrl: "", isActive: true })

// ── Partner form ───────────────────────────────────────────────────────────────
type PartnerForm = { name: string; logoUrl: string; websiteUrl: string; order: number; isActive: boolean }
const emptyPartner = (): PartnerForm => ({ name: "", logoUrl: "", websiteUrl: "", order: 0, isActive: true })

// ── Star rating widget ─────────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange?.(n)}
          className={`${onChange ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}>
          <Star size={18} className={n <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
        </button>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Tab 1: General Settings ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function GeneralTab() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS)
  const [phones, setPhones] = useState<string[]>([])
  const [newPhone, setNewPhone] = useState("")
  const [statsItems, setStatsItems] = useState<StatItem[]>(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmLock, setConfirmLock] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : ""
  const [currentRole, setCurrentRole] = useState(
    typeof window !== "undefined" ? localStorage.getItem("admin_role") ?? "" : "",
  )
  const isAdmin = currentRole === "admin"
  const mapValidation = normalizeGoogleMapEmbed(settings.company_map_embed)
  const mapPreviewUrl = getSafeMapEmbedUrl(settings.company_map_embed, {
    latitude: settings.company_latitude,
    longitude: settings.company_longitude,
    address: [settings.company_address, settings.company_city, settings.company_region].filter(Boolean).join("، "),
    companyName: settings.company_name,
  })

  useEffect(() => {
    // Do not trust a stale localStorage role on Hostinger. Resolve the
    // permission from the current token before enabling the admin-only toggle.
    if (token) {
      fetch(`${API_BASE}/api/auth/me`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data?.role) return
          setCurrentRole(data.role)
          localStorage.setItem("admin_role", data.role)
        })
        .catch(() => {})
    }

    fetch(`${API_BASE}/api/settings?ts=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        setSettings(s => ({
          ...s,
          ...data,
          ...(data.order_tracking_enabled !== undefined
            ? { order_tracking_enabled: String(data.order_tracking_enabled) }
            : {}),
        }))
        try { const p = JSON.parse(data.company_phones || "[]"); if (Array.isArray(p)) setPhones(p) } catch {}
        try { const s = JSON.parse(data.stats_items || "[]"); if (Array.isArray(s) && s.length > 0) setStatsItems(s) } catch {}
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [])

  async function save(updates: Partial<SiteSettings>) {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/settings`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(updates) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "فشل")
      setSettings(s => ({
        ...s,
        ...data,
        ...(updates.order_tracking_enabled !== undefined
          ? { order_tracking_enabled: String(data.order_tracking_enabled ?? updates.order_tracking_enabled) }
          : {}),
        ...(updates.platform_promo_enabled !== undefined
          ? { platform_promo_enabled: updates.platform_promo_enabled }
          : {}),
      }))
      toast({ title: "تم الحفظ بنجاح" })
      // أخبر SiteSettingsContext بإعادة جلب الإعدادات فوراً في كل مكان
      window.dispatchEvent(new Event("siteSettingsChanged"))
    } catch { toast({ variant: "destructive", title: "فشل في الحفظ" }) }
    finally { setSaving(false) }
  }

  function toggleLock() {
    if (settings.requests_locked !== "true") {
      setConfirmLock(true)
      return
    }
    save({ requests_locked: "false" })
  }
  function toggleOrderTracking() {
    save({ order_tracking_enabled: settings.order_tracking_enabled === "true" ? "false" : "true" })
  }
  function addPhone() {
    const p = newPhone.trim(); if (!p) return
    if (phones.includes(p)) { toast({ variant: "destructive", title: "الرقم موجود بالفعل" }); return }
    const next = [...phones, p]; setPhones(next); setNewPhone("")
    save({ company_phones: JSON.stringify(next), ...(phones.length === 0 ? { company_phone_call: p, company_phone_whatsapp: p } : {}) })
  }
  function removePhone(ph: string) {
    const next = phones.filter(p => p !== ph); setPhones(next)
    const u: Partial<SiteSettings> = { company_phones: JSON.stringify(next) }
    if (settings.company_phone_call === ph)     u.company_phone_call     = next[0] ?? ""
    if (settings.company_phone_whatsapp === ph) u.company_phone_whatsapp = next[0] ?? ""
    save(u)
  }
  function updateStat(i: number, field: keyof StatItem, raw: string) {
    setStatsItems(prev => prev.map((s, j) => j === i ? { ...s, [field]: field === "value" ? Number(raw) || 0 : raw } : s))
  }

  async function uploadLogo(file: File) {
    setLogoUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch(`${API_BASE}/api/admin/uploads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "فشل الرفع")
      const url = data.url as string
      setSettings(s => ({ ...s, company_logo: url }))
      // حفظ فوري
      await save({ company_logo: url })
    } catch {
      toast({ variant: "destructive", title: "فشل رفع الشعار" })
    } finally {
      setLogoUploading(false)
    }
  }

  if (loading) return <div className="text-center p-12 text-gray-400">جاري التحميل...</div>
  const isLocked = settings.requests_locked === "true"
  const supportStatus = settings.support_status || "unavailable"
  const promoEnabled = settings.platform_promo_enabled !== "false"
  const filledSocials = [settings.social_facebook, settings.social_x, settings.social_instagram, settings.social_tiktok, settings.social_snapchat, settings.social_youtube, settings.social_linkedin].filter(Boolean).length
  const publicUrl = settings.site_public_url || "سيُكتشف تلقائيًا من النطاق الحالي"

  return (
    <div className="space-y-6 max-w-5xl" dir="rtl">
      <section className="grid gap-3 sm:grid-cols-3" aria-label="ملخص الإعدادات">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isLocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
            {isLocked ? <Lock size={18} /> : <CheckCircle size={18} />}
          </div>
          <div className="min-w-0"><p className="text-xs font-bold text-slate-500">استقبال الطلبات</p><p className="truncate text-sm font-extrabold text-slate-800">{isLocked ? "متوقف مؤقتًا" : "يعمل الآن"}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><ExternalLink size={18} /></div>
          <div className="min-w-0"><p className="text-xs font-bold text-slate-500">الرابط العام</p><p className="truncate text-sm font-extrabold text-slate-800" dir={settings.site_public_url ? "ltr" : "rtl"}>{publicUrl}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><MessageCircle size={18} /></div>
          <div className="min-w-0"><p className="text-xs font-bold text-slate-500">حضور التواصل</p><p className="truncate text-sm font-extrabold text-slate-800">{formatNumberForSettings(filledSocials)} حساب اجتماعي</p></div>
        </div>
      </section>
      {/* Priority controls hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[#071a33] px-5 py-6 text-white shadow-xl sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-secondary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-secondary">
                <SlidersHorizontal size={14} />
                التحكم السريع
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl">حالة الموقع الآن</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
                تحكم في استقبال الطلبات وتوفر فريق الدعم من مكان واحد، وستظهر التغييرات مباشرة للعملاء.
              </p>
            </div>
            <div className={`flex items-center gap-2 self-start rounded-full border px-3 py-2 text-xs font-bold sm:self-auto ${
              isLocked ? "border-red-300/30 bg-red-400/15 text-red-100" : "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
            }`}>
              <span className={`h-2 w-2 rounded-full ${isLocked ? "bg-red-300" : "bg-emerald-300"}`} />
              {isLocked ? "الطلبات مغلقة" : "الطلبات مفتوحة"}
            </div>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`rounded-xl p-2.5 ${isLocked ? "bg-red-400/20 text-red-200" : "bg-emerald-400/20 text-emerald-200"}`}>
                    {isLocked ? <Lock size={20} /> : <LockOpen size={20} />}
                  </div>
                  <div>
                    <p className="font-bold">قفل الطلبات</p>
                    <p className="mt-1 text-xs leading-5 text-white/55">
                      {isLocked ? "لن يستطيع العملاء إرسال طلبات جديدة" : "العملاء يستطيعون إرسال الطلبات الآن"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleLock}
                  disabled={saving}
                  aria-label={isLocked ? "فتح الطلبات" : "قفل الطلبات"}
                  className={`relative h-8 w-16 shrink-0 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-secondary/60 ${isLocked ? "bg-red-500" : "bg-emerald-500"}`}
                >
                  <motion.div layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md ${isLocked ? "right-1" : "right-9"}`} />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-white/50">
                <span className={`h-1.5 w-1.5 rounded-full ${isLocked ? "bg-red-300" : "bg-emerald-300"}`} />
                {isLocked ? "الحالة مغلقة مؤقتًا" : "الخدمة تستقبل الطلبات"}
              </div>
              {confirmLock && (
                <div className="mt-4 rounded-xl border border-red-200/20 bg-red-500/10 p-3">
                  <p className="text-xs font-bold text-red-100">هل تريد إيقاف استقبال الطلبات الآن؟</p>
                  <p className="mt-1 text-[11px] leading-5 text-white/55">لن يتمكن العملاء من إرسال طلبات جديدة حتى تعيد فتح الخدمة.</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => { setConfirmLock(false); save({ requests_locked: "true" }) }} disabled={saving} className="h-8 bg-red-500 text-xs text-white hover:bg-red-600">تأكيد الإيقاف</Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmLock(false)} disabled={saving} className="h-8 border-white/20 bg-transparent text-xs text-white hover:bg-white/10">إلغاء</Button>
                  </div>
                </div>
              )}
              <div className="mt-4 flex items-start justify-between gap-4 border-t border-white/10 pt-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-blue-400/20 p-2.5 text-blue-200"><Eye size={20} /></div>
                  <div>
                    <p className="font-bold">زر تتبع الطلب</p>
                    <p className="mt-1 text-xs leading-5 text-white/55">
                      {settings.order_tracking_enabled === "true"
                        ? "يظهر زر التتبع في الصفحة الرئيسية وملخصات الطلبات."
                        : "مخفي بالكامل من الصفحة الرئيسية والمساعد وملخصات الطلبات."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleOrderTracking}
                  disabled={saving}
                  role="switch"
                  aria-checked={settings.order_tracking_enabled === "true"}
                  aria-label="إظهار زر تتبع الطلب"
                  className={`relative h-8 w-16 shrink-0 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-secondary/60 ${settings.order_tracking_enabled === "true" ? "bg-blue-500" : "bg-white/20"}`}
                >
                  <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${settings.order_tracking_enabled === "true" ? "right-1" : "right-9"}`} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-secondary/20 p-2.5 text-secondary"><Headphones size={20} /></div>
                <div>
                  <p className="font-bold">حالة الدعم المباشر</p>
                  <p className="mt-1 text-xs text-white/55">اختر الحالة التي يراها فريقك والعملاء</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SUPPORT_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  const isSelected = supportStatus === opt.value
                  const activeMap: Record<string, string> = {
                    green: "border-emerald-300/70 bg-emerald-400/20 text-emerald-100",
                    amber: "border-amber-300/70 bg-amber-400/20 text-amber-100",
                    red: "border-red-300/70 bg-red-400/20 text-red-100",
                  }
                  return (
                    <button
                      key={opt.value}
                      onClick={() => save({ support_status: opt.value })}
                      disabled={saving}
                      className={`flex min-h-[78px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center text-xs transition-all ${
                        isSelected ? activeMap[opt.color] : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/30 hover:bg-white/10"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="font-bold">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                <label className="mb-2 block text-sm font-bold text-white">أوقات دوام الدعم المباشر</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={settings.support_hours}
                    onChange={e => setSettings(s => ({ ...s, support_hours: e.target.value }))}
                    placeholder="السبت — الجمعة 7ص–10م"
                    dir="rtl"
                    className="border-white/15 bg-white/[0.08] text-white placeholder:text-white/35"
                  />
                  <Button
                    onClick={() => save({ support_hours: settings.support_hours })}
                    disabled={saving}
                    size="sm"
                    className="shrink-0 bg-secondary text-white hover:bg-secondary/90"
                  >
                    حفظ أوقات الدوام
                  </Button>
                </div>
                <p className="mt-2 text-xs text-white/50">يظهر هذا النص للعملاء داخل محادثة الدعم المباشر.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-[#e0b84f]/25 bg-[#e0b84f]/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-[#e0b84f]/20 p-2.5 text-[#f2d47b]"><Megaphone size={20} /></div>
              <div>
              <p className="font-bold">شارة المنصة التسويقية</p>
                <p className="mt-1 max-w-xl text-xs leading-5 text-white/60">
                  تحكم في ظهور الشارة التعريفية بالمنصة في الموقع العام. هذا الخيار متاح لمديري النظام فقط.
                </p>
                <p className="mt-2 text-xs font-bold text-[#f2d47b]">{isAdmin ? (promoEnabled ? "تظهر للزوار حالياً" : "مخفية عن الزوار حالياً") : "التحكم متاح لمدير النظام فقط"}</p>
              </div>
            </div>
            <button
              onClick={() => save({ platform_promo_enabled: promoEnabled ? "false" : "true" })}
              disabled={saving || !isAdmin}
              aria-label={promoEnabled ? "إخفاء شارة المنصة" : "إظهار شارة المنصة"}
              data-testid="toggle-platform-promotion"
              className={`relative h-8 w-16 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#e0b84f]/60 ${promoEnabled ? "bg-[#d7a936]" : "bg-white/20"}`}
            >
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${promoEnabled ? "right-1" : "right-9"}`} />
            </button>
          </div>
        </div>
      </section>

      {/* 🎨 Theme Color Presets Card */}
      <Card className="border-2 border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Palette size={20} className="text-secondary" />
              ألوان وهوية الموقع (ثيم الحاويات والخدمات)
            </CardTitle>
            <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
              تغيير فوري وتلقائي
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            اختر لوحة الألوان المناسبة لطبيعة نشاطك وهوية منشأتك. تم تصميم كل لوحة بعناية لتلائم قطاع المقاولات، الحاويات، وإدارة المخلفات.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
            {THEME_PRESETS.map((preset) => {
              const isSelected = (settings.theme_preset || "industrial_amber") === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSettings((s) => ({ ...s, theme_preset: preset.id }))
                    applyThemePreset(preset.id)
                    save({ theme_preset: preset.id })
                  }}
                  className={`flex flex-col text-right p-4 rounded-2xl border-2 transition-all duration-300 relative group transform hover:-translate-y-0.5 ${
                    isSelected
                      ? "border-secondary bg-amber-50/20 shadow-md ring-2 ring-secondary/30"
                      : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow"
                  }`}
                >
                  {/* Selected Badge */}
                  {isSelected && (
                    <span className="absolute top-3.5 left-3.5 bg-secondary text-slate-950 p-1 rounded-full text-xs font-black shadow">
                      <Check size={13} className="stroke-[3]" />
                    </span>
                  )}

                  {/* Swatches */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-7 h-7 rounded-full shadow-inner border border-black/10"
                      style={{ backgroundColor: preset.primaryHex }}
                      title={`اللون الأساسي: ${preset.primaryHex}`}
                    />
                    <div
                      className="w-7 h-7 rounded-full shadow-inner border border-black/10"
                      style={{ backgroundColor: preset.secondaryHex }}
                      title={`اللون المميز: ${preset.secondaryHex}`}
                    />
                    <div
                      className="w-7 h-7 rounded-full shadow-inner border border-black/10"
                      style={{ backgroundColor: preset.accentHex }}
                      title={`اللون البيئي: ${preset.accentHex}`}
                    />
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-primary mb-1">
                    {preset.name}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {preset.desc}
                  </p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg"><Building2 size={20} className="text-primary" />بيانات المنشأة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
           <p className="text-sm text-gray-500">هذه البيانات هي المصدر الوحيد لهوية الموقع وبيانات Schema ووسائل التواصل العامة.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">اسم المنشأة</label>
               <Input value={settings.company_name} onChange={e => setSettings(s => ({ ...s, company_name: e.target.value }))} placeholder="اكتب اسم المنشأة كما يظهر للعملاء" className="bg-gray-50" dir="rtl" />
            </div>
             <div className="space-y-1.5">
               <label className="text-sm font-bold text-gray-700">الرابط العام للموقع</label>
               <Input value={settings.site_public_url} onChange={e => setSettings(s => ({ ...s, site_public_url: e.target.value }))} placeholder="اتركه فارغًا لاستخدام الدومين الحالي تلقائيًا" className="bg-gray-50 font-mono text-sm" dir="ltr" />
               <p className="text-xs text-gray-400">يُستخدم للـ Canonical وOpen Graph عند بناء نسخة Hostinger.</p>
             </div>

            {/* ── Logo uploader ─────────────────────────────────────── */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">شعار المنشأة</label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                {/* معاينة الشعار الحالي */}
                <div className="w-16 h-16 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {settings.company_logo
                    ? <img src={settings.company_logo} alt="شعار المنشأة" className="w-full h-full object-contain p-1" onError={e => { e.currentTarget.style.display = "none" }} />
                    : <ImageIcon size={24} className="text-gray-300" />
                  }
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  {/* زر رفع الصورة */}
                  <label className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-sm font-medium
                    ${logoUploading ? "border-gray-200 text-gray-400 cursor-not-allowed" : "border-primary/40 text-primary hover:bg-primary/5 hover:border-primary"}`}>
                    {logoUploading
                      ? <><RefreshCw size={15} className="animate-spin" />جاري الرفع...</>
                      : <><Upload size={15} />رفع صورة الشعار</>
                    }
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={logoUploading}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = "" }}
                    />
                  </label>
                  {/* حقل الرابط اليدوي */}
                  <Input
                    value={settings.company_logo}
                    onChange={e => setSettings(s => ({ ...s, company_logo: e.target.value }))}
                    placeholder="/api/uploads/... أو رابط الشعار"
                    className="bg-white text-xs font-mono h-7 px-2"
                    dir="ltr"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">PNG أو SVG أو JPG — يظهر في الهيدر والفوتر والبراند</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">أرقام الهاتف</label>
            <div className="space-y-2">
              {phones.map(ph => (
                <div key={ph} className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-gray-50">
                  <Phone size={15} className="text-gray-400 shrink-0" />
                  <span className="flex-1 font-mono text-sm text-gray-700" dir="ltr">{ph}</span>
                  <button onClick={() => setSettings(s => ({ ...s, company_phone_call: ph }))} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${settings.company_phone_call === ph ? "bg-primary text-white border-primary" : "bg-white text-gray-500 border-gray-200 hover:border-primary hover:text-primary"}`}>
                    <PhoneCall size={11} />اتصال
                  </button>
                  <button onClick={() => setSettings(s => ({ ...s, company_phone_whatsapp: ph }))} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${settings.company_phone_whatsapp === ph ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-500 border-gray-200 hover:border-green-500 hover:text-green-600"}`}>
                    <MessageCircle size={11} />واتساب
                  </button>
                  <button onClick={() => removePhone(ph)} disabled={saving} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && addPhone()} placeholder="05XXXXXXXX" className="bg-gray-50 font-mono" dir="ltr" />
              <Button onClick={addPhone} disabled={saving || !newPhone.trim()} size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary hover:text-white shrink-0">
                <Plus size={16} className="ml-1" />إضافة
              </Button>
            </div>
          </div>
          {phones.length > 0 && (
            <div className="flex flex-wrap gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 text-sm">
              <div className="flex items-center gap-2 text-primary font-medium"><PhoneCall size={14} />زر الاتصال: <span className="font-mono">{settings.company_phone_call || "—"}</span></div>
              <div className="w-px bg-blue-200 self-stretch hidden sm:block" />
              <div className="flex items-center gap-2 text-green-700 font-medium"><MessageCircle size={14} />زر واتساب: <span className="font-mono">{settings.company_phone_whatsapp || "—"}</span></div>
            </div>
          )}

           <div className="space-y-3 rounded-2xl border border-primary/10 bg-primary/[0.03] p-4">
             <div>
               <label className="text-sm font-bold text-gray-700">بيانات العنوان والموقع</label>
               <p className="mt-1 text-xs text-gray-400">تظهر في صفحة التواصل وبيانات المنشأة المنظمة، وتُقرأ من الإعدادات دون قيم بديلة.</p>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <Input value={settings.company_address} onChange={e => setSettings(s => ({ ...s, company_address: e.target.value }))} placeholder="العنوان" className="bg-white" dir="rtl" />
               <Input value={settings.company_city} onChange={e => setSettings(s => ({ ...s, company_city: e.target.value }))} placeholder="المدينة" className="bg-white" dir="rtl" />
               <Input value={settings.company_region} onChange={e => setSettings(s => ({ ...s, company_region: e.target.value }))} placeholder="المنطقة" className="bg-white" dir="rtl" />
               <Input value={settings.company_country} onChange={e => setSettings(s => ({ ...s, company_country: e.target.value }))} placeholder="رمز الدولة مثل SA" className="bg-white" dir="ltr" />
               <Input value={settings.company_postal_code} onChange={e => setSettings(s => ({ ...s, company_postal_code: e.target.value }))} placeholder="الرمز البريدي (اختياري)" className="bg-white" dir="ltr" />
               <Input value={settings.company_email} onChange={e => setSettings(s => ({ ...s, company_email: e.target.value }))} placeholder="البريد الإلكتروني" className="bg-white" dir="ltr" type="email" />
               <Input value={settings.company_latitude} onChange={e => setSettings(s => ({ ...s, company_latitude: e.target.value }))} placeholder="خط العرض (اختياري)" className="bg-white font-mono" dir="ltr" />
               <Input value={settings.company_longitude} onChange={e => setSettings(s => ({ ...s, company_longitude: e.target.value }))} placeholder="خط الطول (اختياري)" className="bg-white font-mono" dir="ltr" />
               <Input value={settings.company_price_range} onChange={e => setSettings(s => ({ ...s, company_price_range: e.target.value }))} placeholder="نطاق الأسعار مثل $$" className="bg-white" dir="ltr" />
               <Input value={settings.company_payment_methods} onChange={e => setSettings(s => ({ ...s, company_payment_methods: e.target.value }))} placeholder="طرق الدفع مفصولة بفواصل" className="bg-white" dir="rtl" />
             </div>
           </div>
          {/* Footer description */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">نص وصف الفوتر</label>
            <textarea
              value={settings.company_footer_description}
              onChange={e => setSettings(s => ({ ...s, company_footer_description: e.target.value }))}
              placeholder="نص يظهر أسفل الشعار في الفوتر..."
              rows={3}
              dir="rtl"
              className="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none bg-gray-50"
            />
            <p className="text-xs text-gray-400">يظهر هذا النص أسفل الشعار في أسفل الصفحة</p>
          </div>

           <div className="space-y-3 rounded-2xl border border-secondary/20 bg-secondary/[0.04] p-4">
             <div>
               <label className="text-sm font-bold text-gray-700">حسابات التواصل الاجتماعي</label>
               <p className="mt-1 text-xs text-gray-400">أدخل رابط الحساب الكامل. ستظهر الحسابات المعبأة في الفوتر وSchema فقط.</p>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {([
                  ["social_facebook", "فيسبوك", "https://www.facebook.com/اسم-الحساب"],
                  ["social_x", "X", "https://x.com/اسم-الحساب"],
                  ["social_instagram", "إنستجرام", "https://www.instagram.com/اسم-الحساب"],
                  ["social_tiktok", "تيك توك", "https://www.tiktok.com/@اسم-الحساب"],
                  ["social_snapchat", "سناب شات", "https://www.snapchat.com/add/اسم-الحساب"],
                  ["social_youtube", "يوتيوب", "https://www.youtube.com/@اسم-القناة"],
                  ["social_linkedin", "LinkedIn", "https://www.linkedin.com/company/اسم-المنشأة"],
               ] as const).map(([key, label, placeholder]) => (
                 <div key={key} className="space-y-1">
                   <label className="text-xs font-bold text-gray-600">{label}</label>
                   <Input value={settings[key]} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} placeholder={placeholder} className="bg-white font-mono text-xs" dir="ltr" />
                 </div>
               ))}
             </div>
           </div>

            <div className="space-y-3 rounded-2xl border border-blue-200/70 bg-blue-50/40 p-4">
              <div>
                <label className="text-sm font-bold text-gray-700">القياس التسويقي والتحليلات</label>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  اختياري. لا يتم تحميل أي كود خارجي إلا بعد إدخال معرف حقيقي محفوظ من الحساب الرسمي، لتجنب التتبع المكرر أو الوهمي.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Google Analytics 4 / Google tag</label>
                  <Input
                    value={settings.analytics_google_tag_id}
                    onChange={e => setSettings(s => ({ ...s, analytics_google_tag_id: e.target.value }))}
                    placeholder="G-XXXXXXXXXX"
                    className="bg-white font-mono text-xs"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Facebook Pixel ID</label>
                  <Input
                    value={settings.facebook_pixel_id}
                    onChange={e => setSettings(s => ({ ...s, facebook_pixel_id: e.target.value }))}
                    placeholder="أدخل الرقم فقط"
                    className="bg-white font-mono text-xs"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Google Business Profile</label>
                <Input
                  value={settings.company_google_business_profile}
                  onChange={e => setSettings(s => ({ ...s, company_google_business_profile: e.target.value }))}
                  placeholder="https://maps.google.com/..."
                  className="bg-white font-mono text-xs"
                  dir="ltr"
                />
                <p className="text-xs text-gray-400">رابط الملف العام من Google Maps، ويُعرض كرابط خارجي مستقل عن خريطة التضمين.</p>
              </div>
            </div>

          {/* Google Maps embed */}
           <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">رابط خريطة جوجل (src أو كود iframe كامل)</label>
            <textarea
              value={settings.company_map_embed}
              onChange={e => setSettings(s => ({ ...s, company_map_embed: e.target.value }))}
              placeholder={'https://www.google.com/maps/embed?pb=... أو الصق كود <iframe> كاملاً'}
              rows={3}
              dir="ltr"
              className="w-full border border-input rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none bg-gray-50"
            />
             <p className="text-xs text-gray-400">اذهب إلى Google Maps ← مشاركة ← تضمين خريطة ← انسخ الرابط أو كود iframe بالكامل. لا تستخدم رابط المشاركة العادي.</p>
             {mapValidation.error && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">{mapValidation.error}</p>}
             {mapPreviewUrl && (
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <iframe
                   src={mapPreviewUrl}
                  width="100%" height="200" style={{ border: 0, display: "block" }}
                  allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin"
                  title="معاينة الخريطة"
                />
              </div>
            )}
          </div>

           <Button onClick={() => {
             if (settings.company_map_embed.trim() && !mapValidation.url) {
               toast({ variant: "destructive", title: "لا يمكن حفظ الخريطة", description: mapValidation.error })
               return
             }
             save({
             company_name: settings.company_name,
             company_logo: settings.company_logo,
             company_phones: JSON.stringify(phones),
             company_phone_call: settings.company_phone_call,
             company_phone_whatsapp: settings.company_phone_whatsapp,
             company_email: settings.company_email,
             company_address: settings.company_address,
             company_city: settings.company_city,
             company_region: settings.company_region,
             company_country: settings.company_country,
             company_postal_code: settings.company_postal_code,
             company_latitude: settings.company_latitude,
             company_longitude: settings.company_longitude,
             company_price_range: settings.company_price_range,
             company_payment_methods: settings.company_payment_methods,
              company_map_embed: mapValidation.url,
             company_footer_description: settings.company_footer_description,
             site_public_url: settings.site_public_url,
             social_facebook: settings.social_facebook,
             social_x: settings.social_x,
             social_instagram: settings.social_instagram,
             social_tiktok: settings.social_tiktok,
             social_snapchat: settings.social_snapchat,
             social_youtube: settings.social_youtube,
              social_linkedin: settings.social_linkedin,
              company_google_business_profile: settings.company_google_business_profile,
              analytics_google_tag_id: settings.analytics_google_tag_id,
              facebook_pixel_id: settings.facebook_pixel_id,
             support_hours: settings.support_hours,
            })
           }} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">
            {saving ? "جاري الحفظ..." : "حفظ بيانات المنشأة"}
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><BarChart2 size={20} className="text-primary" />إحصائيات الموقع</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">الأرقام التي تظهر في شريط الإحصائيات أسفل الصور الرئيسية.</p>
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 px-1">
              <span className="col-span-4 text-xs font-bold text-gray-500">التسمية</span>
              <span className="col-span-4 text-xs font-bold text-gray-500">الرقم</span>
              <span className="col-span-4 text-xs font-bold text-gray-500">اللاحقة</span>
            </div>
            {statsItems.map((stat, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="col-span-4"><Input value={stat.label} onChange={e => updateStat(i, "label", e.target.value)} className="bg-white text-sm h-9" dir="rtl" /></div>
                <div className="col-span-4"><Input type="number" value={stat.value} onChange={e => updateStat(i, "value", e.target.value)} className="bg-white text-sm h-9 font-mono" dir="ltr" /></div>
                <div className="col-span-4"><Input value={stat.suffix} onChange={e => updateStat(i, "suffix", e.target.value)} className="bg-white text-sm h-9 font-mono" dir="ltr" placeholder="+  /  %  /7" /></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
            {statsItems.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-extrabold text-primary">{s.value}<span className="text-secondary text-lg">{s.suffix}</span></div>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <Button onClick={() => save({ stats_items: JSON.stringify(statsItems) })} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">
            {saving ? "جاري الحفظ..." : "حفظ الإحصائيات"}
          </Button>
        </CardContent>
      </Card>

      {/* Lock message */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg"><Lock size={20} className="text-primary" />رسالة قفل الطلبات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">هذه الرسالة تظهر للعملاء عندما تكون الطلبات مغلقة.</p>
          <Textarea value={settings.requests_locked_message} onChange={e => setSettings(s => ({ ...s, requests_locked_message: e.target.value }))} className="min-h-[80px] resize-none bg-gray-50 text-sm" dir="rtl" />
          <Button onClick={() => save({ requests_locked_message: settings.requests_locked_message })} disabled={saving} size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary hover:text-white">حفظ الرسالة</Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Tab 2: Slides ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function SlidesTab() {
  const { toast } = useToast()
  const { data: slides = [], refetch } = useGetSlides()
  const { mutate: createSlide, isPending: creating } = useCreateSlide()
  const { mutate: updateSlide, isPending: updating } = useUpdateSlide()
  const { mutate: deleteSlide } = useDeleteSlide()
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [form, setForm] = useState<SlideForm>(emptySlide())
  const [heroSettings, setHeroSettings] = useState({
    hero_company_visible: true,
    hero_cta_visible: true,
    hero_company_position: "center-center",
    hero_content_position: "center-center",
    hero_cta_position: "center-center",
  })
  const [heroSettingsLoading, setHeroSettingsLoading] = useState(true)
  const [heroSettingsSaving, setHeroSettingsSaving] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/settings?ts=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        setHeroSettings({
          hero_company_visible: data.hero_company_visible !== "false",
          hero_cta_visible: data.hero_cta_visible !== "false",
          hero_company_position: HERO_POSITIONS.some(p => p.value === data.hero_company_position) ? data.hero_company_position : "center-center",
          hero_content_position: HERO_POSITIONS.some(p => p.value === (data.hero_content_position ?? data.hero_company_position))
            ? (data.hero_content_position ?? data.hero_company_position)
            : "center-center",
          hero_cta_position: HERO_POSITIONS.some(p => p.value === data.hero_cta_position) ? data.hero_cta_position : "center-center",
        })
      })
      .catch(() => {})
      .finally(() => setHeroSettingsLoading(false))
  }, [])

  async function saveHeroSettings(next: typeof heroSettings) {
    setHeroSettings(next)
    setHeroSettingsSaving(true)
    try {
      const token = localStorage.getItem("admin_token") ?? ""
      const response = await fetch(`${API_BASE}/api/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          hero_company_visible: String(next.hero_company_visible),
          hero_cta_visible: String(next.hero_cta_visible),
          hero_company_position: next.hero_company_position,
          hero_content_position: next.hero_content_position,
          hero_cta_position: next.hero_cta_position,
        }),
      })
      if (!response.ok) throw new Error()
      window.dispatchEvent(new Event("siteSettingsChanged"))
      toast({ title: "تم حفظ إعدادات الهيرو" })
    } catch {
      toast({ title: "تعذر حفظ إعدادات الهيرو", variant: "destructive" })
    } finally {
      setHeroSettingsSaving(false)
    }
  }

  const openNew = () => { setForm({ ...emptySlide(), order: slides.length }); setEditing("new") }
  const openEdit = (s: HeroSlide) => { setForm({ title: s.title, subtitle: s.subtitle, imageUrl: s.imageUrl, ctaText: s.ctaText ?? "", order: s.order, isActive: s.isActive }); setEditing(s.id) }
  const handleSave = () => {
    if (editing === "new") createSlide({ data: form }, { onSuccess: () => { refetch(); setEditing(null) } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else if (typeof editing === "number") updateSlide({ id: editing, data: form as any }, { onSuccess: () => { refetch(); setEditing(null) } })
  }
  const handleDelete = (id: number) => { if (confirm("هل أنت متأكد من حذف هذه الشريحة؟")) deleteSlide({ id }, { onSuccess: () => refetch() }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toggleActive = (s: HeroSlide) => updateSlide({ id: s.id, data: { isActive: !s.isActive } as any }, { onSuccess: () => refetch() })

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-gray-800">ظهور اسم المنشأة والزر</CardTitle>
          <p className="text-sm font-normal text-gray-500">
            تحكم في إظهار كل عنصر وتحديد موضعه من 9 مواضع داخل صورة الهيرو.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {heroSettingsLoading ? (
            <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <p className="font-semibold text-gray-800">اسم المنشأة</p>
                    <p className="mt-1 text-xs text-gray-500">الاسم الظاهر أعلى محتوى الهيرو</p>
                  </div>
                  <Switch
                    checked={heroSettings.hero_company_visible}
                    disabled={heroSettingsSaving}
                    onCheckedChange={checked => saveHeroSettings({ ...heroSettings, hero_company_visible: checked })}
                    aria-label="إظهار اسم المنشأة في الهيرو"
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <p className="font-semibold text-gray-800">زر طلب الخدمة</p>
                    <p className="mt-1 text-xs text-gray-500">الزر الموجود داخل كل شريحة</p>
                  </div>
                  <Switch
                    checked={heroSettings.hero_cta_visible}
                    disabled={heroSettingsSaving}
                    onCheckedChange={checked => saveHeroSettings({ ...heroSettings, hero_cta_visible: checked })}
                    aria-label="إظهار زر طلب الخدمة في الهيرو"
                  />
                </div>
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
                <HeroPositionPicker
                  title="موضع اسم المنشأة"
                  value={heroSettings.hero_company_position}
                  disabled={heroSettingsSaving || !heroSettings.hero_company_visible}
                  onChange={value => saveHeroSettings({ ...heroSettings, hero_company_position: value })}
                />
                <HeroPositionPicker
                  title="موضع العنوان والنص"
                  value={heroSettings.hero_content_position}
                  disabled={heroSettingsSaving}
                  onChange={value => saveHeroSettings({ ...heroSettings, hero_content_position: value })}
                />
                <HeroPositionPicker
                  title="موضع زر طلب الخدمة"
                  value={heroSettings.hero_cta_position}
                  disabled={heroSettingsSaving || !heroSettings.hero_cta_visible}
                  onChange={value => saveHeroSettings({ ...heroSettings, hero_cta_position: value })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <div><h3 className="text-xl font-bold text-gray-800">شرائح الهيرو</h3><p className="text-sm text-gray-500 mt-0.5">صور الشريط الرئيسي في أعلى الصفحة</p></div>
        <Button onClick={openNew} className="gap-2"><Plus size={16} />إضافة شريحة</Button>
      </div>
      {editing !== null && (
        <Card className="border-primary/30 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <h4 className="font-bold text-lg text-gray-800">{editing === "new" ? "إضافة شريحة جديدة" : "تعديل الشريحة"}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">العنوان *</label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="عنوان الشريحة" dir="rtl" /></div>
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">نص الزر</label><Input value={form.ctaText} onChange={e => setForm({ ...form, ctaText: e.target.value })} placeholder="اطلب خدمتك الآن" dir="rtl" /></div>
            </div>
            <div><label className="text-sm font-medium text-gray-700 mb-1 block">النص التوضيحي</label><Input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="وصف مختصر" dir="rtl" /></div>
            <div><label className="text-sm font-medium text-gray-700 mb-1 block">رابط الصورة *</label><Input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." dir="ltr" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">الترتيب</label><Input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} /></div>
              <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" /><span className="text-sm font-medium text-gray-700">نشط</span></label></div>
            </div>
            {form.imageUrl && <div className="rounded-xl overflow-hidden h-32 bg-gray-100"><img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" /></div>}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={creating || updating} className="gap-2"><Check size={16} />{creating || updating ? "جاري الحفظ..." : "حفظ"}</Button>
              <Button variant="outline" onClick={() => setEditing(null)} className="gap-2"><X size={16} />إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4">
        {slides.map(slide => (
          <Card key={slide.id} className="overflow-hidden">
            <div className="flex items-stretch">
              <div className="w-48 shrink-0 bg-gray-100 relative overflow-hidden">
                {slide.imageUrl ? <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={32} /></div>}
              </div>
              <CardContent className="flex-1 p-5 flex items-center gap-4">
                <GripVertical size={20} className="text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-gray-900 truncate">{slide.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${slide.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{slide.isActive ? "نشط" : "مخفي"}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{slide.subtitle}</p>
                  {slide.ctaText && <span className="mt-1 inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">زر: {slide.ctaText}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(slide)} className="text-gray-400 hover:text-gray-700">{slide.isActive ? <Eye size={16} /> : <EyeOff size={16} />}</Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(slide)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"><Pencil size={16} /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(slide.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></Button>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
        {slides.length === 0 && (
          <Card><CardContent className="py-16 flex flex-col items-center gap-3 text-gray-400"><ImageIcon size={48} strokeWidth={1} /><p className="text-lg font-medium">لا توجد شرائح بعد</p><Button onClick={openNew} variant="outline" className="gap-2 mt-2"><Plus size={16} />أضف أول شريحة</Button></CardContent></Card>
        )}
      </div>
    </div>
  )
}

function HeroPositionPicker({
  title,
  value,
  disabled,
  onChange,
}: {
  title: string
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className={`rounded-xl border border-gray-200 p-4 transition-opacity ${disabled ? "opacity-50" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-gray-800">{title}</p>
        <span className="text-xs text-primary">{HERO_POSITIONS.find(position => position.value === value)?.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={title}>
        {HERO_POSITIONS.map(position => (
          <button
            key={position.value}
            type="button"
            disabled={disabled}
            role="radio"
            aria-checked={value === position.value}
            onClick={() => onChange(position.value)}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border text-xs transition-all ${
              value === position.value
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-gray-200 bg-gray-50 text-gray-500 hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${value === position.value ? "bg-primary" : "bg-gray-300"}`} />
            <span>{position.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Tab 3: Testimonials ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function TestimonialsTab() {
  const { data: testimonials = [], refetch } = useGetTestimonials()
  const { mutate: createTestimonial, isPending: creating } = useCreateTestimonial()
  const { mutate: updateTestimonial, isPending: updating } = useUpdateTestimonial()
  const { mutate: deleteTestimonial } = useDeleteTestimonial()
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [form, setForm] = useState<TestimonialForm>(emptyTestimonial())

  const openNew = () => { setForm(emptyTestimonial()); setEditing("new") }
  const openEdit = (t: Testimonial) => { setForm({ clientName: t.clientName, company: t.company, content: t.content, rating: t.rating, avatarUrl: t.avatarUrl ?? "", isActive: t.isActive }); setEditing(t.id) }
  const handleSave = () => {
    const data = { ...form, avatarUrl: form.avatarUrl || undefined }
    if (editing === "new") createTestimonial({ data }, { onSuccess: () => { refetch(); setEditing(null) } })
    else if (typeof editing === "number") updateTestimonial({ id: editing, data }, { onSuccess: () => { refetch(); setEditing(null) } })
  }
  const handleDelete = (id: number) => { if (confirm("هل أنت متأكد من حذف هذه الشهادة؟")) deleteTestimonial({ id }, { onSuccess: () => refetch() }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toggleActive = (t: Testimonial) => updateTestimonial({ id: t.id, data: { isActive: !t.isActive } as any }, { onSuccess: () => refetch() })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h3 className="text-xl font-bold text-gray-800">شهادات العملاء</h3><p className="text-sm text-gray-500 mt-0.5">آراء ومراجعات العملاء الظاهرة في الصفحة الرئيسية</p></div>
        <Button onClick={openNew} className="gap-2"><Plus size={16} />إضافة شهادة</Button>
      </div>
      {editing !== null && (
        <Card className="border-primary/30 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <h4 className="font-bold text-lg text-gray-800">{editing === "new" ? "إضافة شهادة جديدة" : "تعديل الشهادة"}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">اسم العميل *</label><Input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="اسم العميل" dir="rtl" /></div>
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">الشركة / الجهة</label><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="اسم الشركة" dir="rtl" /></div>
            </div>
            <div><label className="text-sm font-medium text-gray-700 mb-1 block">نص الشهادة *</label><textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="نص الشهادة..." rows={4} dir="rtl" className="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-gray-700 mb-2 block">التقييم</label><StarRating value={form.rating} onChange={v => setForm({ ...form, rating: v })} /></div>
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">رابط الصورة الشخصية</label><Input value={form.avatarUrl} onChange={e => setForm({ ...form, avatarUrl: e.target.value })} placeholder="https://..." dir="ltr" /></div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" /><span className="text-sm font-medium text-gray-700">نشط (ظاهر في الموقع)</span></label>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={creating || updating} className="gap-2"><Check size={16} />{creating || updating ? "جاري الحفظ..." : "حفظ"}</Button>
              <Button variant="outline" onClick={() => setEditing(null)} className="gap-2"><X size={16} />إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4">
        {testimonials.map(t => (
          <Card key={t.id}>
            <CardContent className="p-5 flex gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-lg">
                {t.avatarUrl ? <img src={t.avatarUrl} alt={t.clientName} className="w-12 h-12 rounded-full object-cover" /> : t.clientName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-gray-900">{t.clientName}</span>
                  <span className="text-sm text-gray-400">{t.company}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{t.isActive ? "نشط" : "مخفي"}</span>
                </div>
                <div className="flex mb-2">{[1,2,3,4,5].map(n => <Star key={n} size={14} className={n <= t.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />)}</div>
                <p className="text-sm text-gray-600 leading-relaxed">{t.content}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => toggleActive(t)} className="text-gray-400 hover:text-gray-700">{t.isActive ? <EyeOff size={16} /> : <Eye size={16} />}</Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(t)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"><Pencil size={16} /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {testimonials.length === 0 && (
          <Card><CardContent className="py-16 flex flex-col items-center gap-3 text-gray-400"><Star size={48} strokeWidth={1} /><p className="text-lg font-medium">لا توجد شهادات بعد</p><Button onClick={openNew} variant="outline" className="gap-2 mt-2"><Plus size={16} />أضف شهادة</Button></CardContent></Card>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Tab 4: Partners ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function PartnersTab() {
  const { data: partners = [], refetch } = useGetPartners()
  const { mutate: createPartner, isPending: creating } = useCreatePartner()
  const { mutate: updatePartner, isPending: updating } = useUpdatePartner()
  const { mutate: deletePartner } = useDeletePartner()
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [form, setForm] = useState<PartnerForm>(emptyPartner())

  const openNew = () => { setForm({ ...emptyPartner(), order: partners.length }); setEditing("new") }
  const openEdit = (p: Partner) => { setForm({ name: p.name, logoUrl: p.logoUrl, websiteUrl: p.websiteUrl ?? "", order: p.order, isActive: p.isActive }); setEditing(p.id) }
  const handleSave = () => {
    const data = { ...form, websiteUrl: form.websiteUrl || undefined }
    if (editing === "new") createPartner({ data }, { onSuccess: () => { refetch(); setEditing(null) } })
    else if (typeof editing === "number") updatePartner({ id: editing, data }, { onSuccess: () => { refetch(); setEditing(null) } })
  }
  const handleDelete = (id: number) => { if (confirm("هل أنت متأكد من حذف هذا الشريك؟")) deletePartner({ id }, { onSuccess: () => refetch() }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toggleActive = (p: Partner) => updatePartner({ id: p.id, data: { isActive: !p.isActive } as any }, { onSuccess: () => refetch() })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h3 className="text-xl font-bold text-gray-800">الشركاء</h3><p className="text-sm text-gray-500 mt-0.5">شعارات الشركاء الظاهرة في الصفحة الرئيسية</p></div>
        <Button onClick={openNew} className="gap-2"><Plus size={16} />إضافة شريك</Button>
      </div>
      {editing !== null && (
        <Card className="border-primary/30 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <h4 className="font-bold text-lg text-gray-800">{editing === "new" ? "إضافة شريك جديد" : "تعديل الشريك"}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">اسم الشريك *</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسم الشركة الشريكة" dir="rtl" /></div>
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">الترتيب</label><Input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div><label className="text-sm font-medium text-gray-700 mb-1 block">رابط الشعار *</label><Input value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://..." dir="ltr" /></div>
            <div><label className="text-sm font-medium text-gray-700 mb-1 block">رابط الموقع</label><Input value={form.websiteUrl} onChange={e => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://..." dir="ltr" /></div>
            {form.logoUrl && <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><img src={form.logoUrl} alt="preview" className="h-12 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} /><span className="text-sm text-gray-500">معاينة الشعار</span></div>}
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" /><span className="text-sm font-medium text-gray-700">نشط (ظاهر في الموقع)</span></label>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={creating || updating} className="gap-2"><Check size={16} />{creating || updating ? "جاري الحفظ..." : "حفظ"}</Button>
              <Button variant="outline" onClick={() => setEditing(null)} className="gap-2"><X size={16} />إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {partners.map(p => (
          <Card key={p.id} className={`overflow-hidden ${!p.isActive ? "opacity-60" : ""}`}>
            <div className="h-24 flex items-center justify-center bg-gray-50 p-4"><img src={p.logoUrl} alt={p.name} className="max-h-16 max-w-full object-contain" onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/120x60?text=" + encodeURIComponent(p.name) }} /></div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 text-sm truncate">{p.name}</h4>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{p.isActive ? "نشط" : "مخفي"}</span>
              </div>
              {p.websiteUrl && <a href={p.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline mb-2"><ExternalLink size={10} />الموقع</a>}
              <div className="flex gap-1 border-t border-gray-100 pt-2">
                <Button variant="ghost" size="icon" onClick={() => toggleActive(p)} className="h-7 w-7 text-gray-400">{p.isActive ? <EyeOff size={13} /> : <Eye size={13} />}</Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-7 w-7 text-blue-500 hover:bg-blue-50"><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-7 w-7 text-red-400 hover:bg-red-50"><Trash2 size={13} /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {partners.length === 0 && (
          <div className="col-span-4"><Card><CardContent className="py-16 flex flex-col items-center gap-3 text-gray-400"><Users size={48} strokeWidth={1} /><p className="text-lg font-medium">لا يوجد شركاء بعد</p><Button onClick={openNew} variant="outline" className="gap-2 mt-2"><Plus size={16} />أضف شريكاً</Button></CardContent></Card></div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Sections Order Tab ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const SECTION_DEFS = [
  { id: "hero",            label: "شريط الصور الرئيسي",  description: "الصور المتحركة في أعلى الصفحة" },
  { id: "stats",           label: "الإحصائيات",           description: "أرقام الإنجازات والخبرة" },
  { id: "about",           label: "من نحن",               description: "نبذة تعريفية عن الشركة" },
  { id: "ceo",             label: "رئيس مجلس الإدارة",    description: "كلمة رئيس مجلس الإدارة وصورته" },
  { id: "services",        label: "خدماتنا",              description: "قائمة الخدمات المقدمة" },
  { id: "packages",        label: "حاويات الأنقاض والنفايات", description: "حاويات الأنقاض والنفايات والمكابس المتاحة" },
  { id: "how_it_works",    label: "كيف نعمل",             description: "خطوات العمل والتنفيذ" },
  { id: "values",          label: "قيمنا",                description: "القيم والمبادئ التوجيهية" },
  { id: "why_choose_us",   label: "لماذا تختارنا",        description: "مزايا الشركة والمميزات" },
  { id: "areas",           label: "مناطق الخدمة",         description: "الأحياء والمناطق التي تغطيها الخدمة" },
  { id: "testimonials",    label: "آراء العملاء",         description: "تقييمات وشهادات العملاء" },
  { id: "partners",        label: "شركاؤنا",              description: "شعارات وروابط الشركاء" },
  { id: "blog",            label: "المدونة",              description: "أحدث المقالات المنشورة" },
  { id: "service_request", label: "طلب خدمة",             description: "نموذج طلب الخدمة" },
  { id: "contact",         label: "تواصل معنا",           description: "شريط معلومات التواصل" },
]

const DEFAULT_SECTIONS_ORDER = SECTION_DEFS.map(s => s.id)

function SortableSectionItem({
  id, label, description, hidden, onToggle,
}: { id: string; label: string; description: string; hidden: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border bg-white p-3 transition-all
        ${isDragging ? "shadow-2xl border-primary/50 scale-[1.02] z-50" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"}
        ${hidden ? "opacity-50" : ""}
      `}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none p-1 rounded"
        title="اسحب لتغيير الترتيب"
      >
        <GripVertical size={20} />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${hidden ? "text-gray-400 line-through" : "text-gray-800"}`}>
          {label}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{description}</p>
      </div>

      {/* Visibility toggle */}
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors shrink-0
          ${hidden
            ? "border-gray-200 text-gray-400 bg-gray-50 hover:bg-gray-100"
            : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
          }`}
      >
        {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
        <span className="hidden sm:inline">{hidden ? "مخفي" : "ظاهر"}</span>
      </button>
    </div>
  )
}

function SectionsTab() {
  const { toast } = useToast()
  const [order,   setOrder]   = useState<string[]>(DEFAULT_SECTIONS_ORDER)
  const [hidden,  setHidden]  = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then(r => r.json())
      .then(data => {
        try {
          if (data.sections_order) {
            const parsed: string[] = JSON.parse(data.sections_order)
            const merged = [...parsed, ...DEFAULT_SECTIONS_ORDER.filter(id => !parsed.includes(id))]
            setOrder(merged)
          }
          if (data.sections_hidden) {
            setHidden(JSON.parse(data.sections_hidden) as string[])
          }
        } catch {}
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setOrder(prev => {
        const oldIndex = prev.indexOf(active.id as string)
        const newIndex = prev.indexOf(over.id as string)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  function toggleHidden(id: string) {
    setHidden(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function resetOrder() {
    setOrder(DEFAULT_SECTIONS_ORDER)
    setHidden([])
  }

  async function save() {
    setSaving(true)
    const token = localStorage.getItem("admin_token") ?? ""
    try {
      const r = await fetch(`${API_BASE}/api/admin/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sections_order:  JSON.stringify(order),
          sections_hidden: JSON.stringify(hidden),
        }),
      })
      if (!r.ok) throw new Error()
      toast({ title: "تم الحفظ ✓", description: "تم حفظ ترتيب الأقسام بنجاح" })
    } catch {
      toast({ title: "خطأ", description: "فشل حفظ الترتيب", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const visibleCount = order.length - hidden.length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-gray-800">ترتيب أقسام الصفحة الرئيسية</h3>
          <p className="text-sm text-gray-500 mt-1">
            اسحب الأقسام لإعادة ترتيبها — انقر على الزر لإخفاء أو إظهار أي قسم
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={resetOrder} className="gap-1.5 text-gray-600 h-9">
            <RotateCcw size={14} /> إعادة تعيين
          </Button>
          <Button onClick={save} disabled={saving} size="sm" className="gap-1.5 h-9">
            {saving
              ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
              : <Check size={14} />}
            حفظ الترتيب
          </Button>
        </div>
      </div>

      {/* Stats pills */}
      <div className="flex gap-2 flex-wrap text-sm">
        <span className="px-3 py-1 rounded-full bg-primary/8 text-primary border border-primary/15 font-medium">
          {visibleCount} قسم ظاهر
        </span>
        {hidden.length > 0 && (
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200 font-medium">
            {hidden.length} مخفي
          </span>
        )}
      </div>

      {/* Sortable list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {order.map(id => {
              const def = SECTION_DEFS.find(s => s.id === id)
              if (!def) return null
              return (
                <SortableSectionItem
                  key={id}
                  id={id}
                  label={def.label}
                  description={def.description}
                  hidden={hidden.includes(id)}
                  onToggle={() => toggleHidden(id)}
                />
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Hint */}
      <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
        الأقسام المخفية لن تظهر للزوار. التغييرات تنعكس فوراً بعد الحفظ.
      </p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ── AI Settings Tab ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const AI_PROVIDERS = [
  {
    id: "gemini", name: "Gemini", brand: "Google", emoji: "🔵",
    fields: [
      { key: "ai_gemini_key", label: "مفتاح API", isSecret: true, placeholder: "AIzaSy..." },
    ],
  },
  {
    id: "qwen", name: "Qwen (MaaS)", brand: "Alibaba Cloud", emoji: "🟠",
    fields: [
      { key: "ai_qwen_key",   label: "مفتاح API", isSecret: true,  placeholder: "sk-..." },
      { key: "ai_qwen_host",  label: "API Host",   isSecret: false, placeholder: "ws-xxx.ap-southeast-1.maas.aliyuncs.com" },
      { key: "ai_qwen_model", label: "النموذج",    isSecret: false, placeholder: "qwen3-max" },
    ],
  },
  {
    id: "zhipu", name: "GLM-4 (Zhipu)", brand: "智谱 AI", emoji: "🟣",
    fields: [
      { key: "ai_zhipu_key", label: "مفتاح API", isSecret: true, placeholder: "xxxxxxxx.xxxxxxxxxx" },
    ],
  },
]

const AI_KEYS = AI_PROVIDERS.flatMap(p => p.fields.map(f => f.key))

function AISettingsTab() {
  const { toast } = useToast()
  const [vals,    setVals]    = useState<Record<string, string>>({})
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [testOk,  setTestOk]  = useState<Record<string, boolean | null>>({})
  const [saving,  setSaving]  = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then(r => r.json())
      .then(data => {
        const m: Record<string, string> = {}
        for (const k of AI_KEYS) if (data[k]) m[k] = data[k]
        setVals(m)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const set = (key: string, val: string) => setVals(v => ({ ...v, [key]: val }))

  async function save() {
    setSaving(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: JSON.stringify(vals),
      })
      if (!r.ok) throw new Error()
      toast({ title: "تم الحفظ ✓", description: "تم حفظ إعدادات الذكاء الاصطناعي بنجاح" })
    } catch {
      toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function testProvider(id: string) {
    setTesting(t => ({ ...t, [id]: true }))
    setTestOk(t => ({ ...t, [id]: null }))
    try {
      const r = await fetch(`${API_BASE}/api/admin/ai/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: JSON.stringify({ provider: id }),
      })
      const data = await r.json() as { ok: boolean; error?: string }
      setTestOk(t => ({ ...t, [id]: data.ok }))
      if (data.ok) {
        toast({ title: `${id}: اتصال ناجح ✓`, description: "المفتاح صحيح والخدمة تعمل" })
      } else {
        toast({ title: `${id}: فشل الاتصال`, description: data.error ?? "خطأ غير معروف", variant: "destructive" })
      }
    } catch {
      setTestOk(t => ({ ...t, [id]: false }))
      toast({ title: "تعذّر الاتصال", variant: "destructive" })
    } finally {
      setTesting(t => ({ ...t, [id]: false }))
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-gray-800">إعدادات الذكاء الاصطناعي</h3>
          <p className="text-sm text-gray-500 mt-1">
            أدخل مفاتيح API — عند الضغط على "توليد بالذكاء الاصطناعي" يُجرِّب المزودين بالترتيب أدناه
          </p>
        </div>
        <Button onClick={save} disabled={saving} size="sm" className="gap-1.5 h-9 shrink-0">
          {saving ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> : <Check size={14} />}
          حفظ الإعدادات
        </Button>
      </div>

      {/* Provider cards */}
      <div className="space-y-4">
        {AI_PROVIDERS.map((p, idx) => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 text-lg">
                  {p.emoji}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                    <span className="font-bold text-gray-800 text-sm">{p.name}</span>
                  </div>
                  <p className="text-xs text-gray-400">{p.brand}</p>
                </div>
                {testOk[p.id] === true  && <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">✓ متصل</span>}
                {testOk[p.id] === false && <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">✕ فشل</span>}
              </div>
              <Button variant="outline" size="sm" onClick={() => testProvider(p.id)} disabled={testing[p.id]} className="gap-1.5 text-xs h-8">
                {testing[p.id]
                  ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                  : <Bot size={13} />}
                اختبار
              </Button>
            </div>

            {/* Fields */}
            <div className="px-5 py-4 space-y-4">
              {p.fields.map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                  <div className="relative">
                    <Input
                      type={f.isSecret && !showKey[f.key] ? "password" : "text"}
                      value={vals[f.key] || ""}
                      onChange={e => set(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      dir="ltr"
                      className={`text-sm font-mono ${f.isSecret ? "pl-10" : ""}`}
                    />
                    {f.isSecret && (
                      <button
                        type="button"
                        onClick={() => setShowKey(s => ({ ...s, [f.key]: !s[f.key] }))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showKey[f.key] ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="flex gap-3 bg-primary/5 border border-primary/15 rounded-xl p-4 text-sm text-primary/80">
        <span className="text-lg shrink-0">!</span>
        <span>
          النظام يجرب المزودين بالترتيب أعلاه عند كل طلب توليد — إذا فشل Gemini انتقل لـ Qwen ثم GLM تلقائياً.
          المفاتيح مخزّنة في قاعدة البيانات وغير مرئية للزوار.
        </span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Hostinger deployment tab ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function HostingerTab() {
  const { toast } = useToast()
  const [form, setForm] = useState({ host: "", username: "", port: "21", remotePath: "public_html", secure: false, password: "" })
  const [hasPassword, setHasPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deployStage, setDeployStage] = useState<"idle" | "preparing" | "uploading" | "verifying" | "complete" | "error">("idle")
  const [deployMessage, setDeployMessage] = useState("")

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/hostinger`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
      cache: "no-store",
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error()))
      .then(data => {
        setForm(f => ({ ...f, host: data.host || "", username: data.username || "", port: String(data.port || "21"), remotePath: data.remotePath || "public_html", secure: data.secure === true }))
        setHasPassword(Boolean(data.hasPassword))
      })
      .catch(() => toast({ title: "تعذر تحميل إعدادات Hostinger", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [toast])

  function update(key: "host" | "username" | "port" | "remotePath" | "password", value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/hostinger`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: JSON.stringify(form),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "فشل الحفظ")
      setHasPassword(Boolean(data.hasPassword))
      setForm(f => ({ ...f, password: "" }))
      toast({ title: "تم حفظ إعدادات Hostinger", description: "كلمة المرور مشفرة ولا يتم عرضها مرة أخرى" })
    } catch (error) {
      toast({ title: "فشل حفظ الإعدادات", description: error instanceof Error ? error.message : "خطأ غير معروف", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function testConnection() {
    setTesting(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/hostinger/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "تعذر الاتصال")
      toast({ title: "تم الاتصال بـ Hostinger بنجاح", description: `المسار: ${data.path}` })
    } catch (error) {
      toast({ title: "فشل اتصال FTP/FTPS", description: error instanceof Error ? error.message : "تحقق من البيانات", variant: "destructive" })
    } finally {
      setTesting(false)
    }
  }

  async function deploy() {
    if (!selectedFile) {
      toast({ title: "اختر ملف الباتش أولاً", variant: "destructive" })
      return
    }
    setUploading(true)
    setDeployStage("preparing")
    setDeployMessage("يتم تجهيز ملف التحديث وفحصه قبل الإرسال")
    try {
      const body = new FormData()
      body.append("patch", selectedFile)
      setDeployStage("uploading")
      setDeployMessage("يتم رفع الملفات إلى Hostinger، لا تغلق الصفحة")
      const r = await fetch(`${API_BASE}/api/admin/hostinger/deploy`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body,
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "فشل رفع الباتش")
      setDeployStage("verifying")
      setDeployMessage(`تم إرسال ${data.uploaded || 0} ملفاً، ويتم الآن تأكيد وصولها`)
      await new Promise(resolve => setTimeout(resolve, 350))
      setDeployStage("complete")
      setDeployMessage(`تم التحقق من ${data.verified || data.uploaded || 0} ملفاً بنجاح`)
      toast({ title: "تم رفع الباتش بنجاح", description: `تم تحديث ${data.uploaded} ملفاً داخل ${data.remotePath}` })
      setSelectedFile(null)
    } catch (error) {
      setDeployStage("error")
      setDeployMessage(error instanceof Error ? error.message : "تعذر رفع الملفات")
      toast({ title: "فشل تحديث Hostinger", description: error instanceof Error ? error.message : "تعذر رفع الملفات", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="space-y-5" dir="rtl">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg"><Server size={20} className="text-primary" />اتصال Hostinger</CardTitle>
          <p className="text-sm text-gray-500">أدخل بيانات FTP/FTPS مرة واحدة، ثم يمكنك اختبار الاتصال ورفع أي Patch من جهازك.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><label className="text-sm font-bold text-gray-700">اسم المضيف FTP</label><Input value={form.host} onChange={e => update("host", e.target.value)} placeholder="ftp.example.com" dir="ltr" /></div>
            <div className="space-y-1.5"><label className="text-sm font-bold text-gray-700">اسم مستخدم FTP</label><Input value={form.username} onChange={e => update("username", e.target.value)} placeholder="اسم المستخدم" dir="ltr" /></div>
            <div className="space-y-1.5"><label className="text-sm font-bold text-gray-700">المنفذ</label><Input value={form.port} onChange={e => update("port", e.target.value)} placeholder="21" inputMode="numeric" dir="ltr" /></div>
            <div className="space-y-1.5"><label className="text-sm font-bold text-gray-700">المسار البعيد</label><Input value={form.remotePath} onChange={e => update("remotePath", e.target.value)} placeholder="public_html" dir="ltr" /></div>
            <div className="space-y-1.5 sm:col-span-2"><label className="text-sm font-bold text-gray-700">كلمة مرور FTP {hasPassword && <span className="font-normal text-emerald-600">(محفوظة ومشفرة — اتركها فارغة دون تغيير)</span>}</label><Input type="password" value={form.password} onChange={e => update("password", e.target.value)} placeholder={hasPassword ? "••••••••••••" : "أدخل كلمة المرور"} dir="ltr" autoComplete="new-password" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={form.secure} onChange={e => setForm(f => ({ ...f, secure: e.target.checked }))} className="h-4 w-4 accent-primary" /> استخدام FTPS المشفر (موصى به)</label>
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button onClick={save} disabled={saving} className="gap-2"><Check size={15} />{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}</Button>
            <Button onClick={testConnection} disabled={testing || !hasPassword} variant="outline" className="gap-2"><Server size={15} />{testing ? "جاري الاختبار..." : "اختبار الاتصال"}</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">رفع Patch إلى Hostinger</CardTitle><p className="text-sm text-gray-500">اختر ملف ZIP مثل <span dir="ltr" className="font-mono">hawiat-update-patch.zip</span> وسيتم رفع محتوياته إلى المسار المحدد.</p></CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" accept=".zip,application/zip" onChange={e => setSelectedFile(e.target.files?.[0] || null)} disabled={uploading} />
          {selectedFile && <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600" dir="ltr">{selectedFile.name} — {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>}
          <Button onClick={deploy} disabled={uploading || !selectedFile || !hasPassword} className="gap-2"><Upload size={15} />{uploading ? "جاري رفع التحديث..." : "رفع وتحديث Hostinger"}</Button>
          {!hasPassword && <p className="text-xs text-amber-700">احفظ بيانات الاتصال وكلمة المرور أولاً لتفعيل الرفع.</p>}
          {deployStage !== "idle" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4" dir="rtl" aria-live="polite">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-800">حالة عملية التحديث</p>
                  <p className="mt-1 text-xs text-slate-500">{deployMessage}</p>
                </div>
                <Badge variant={deployStage === "error" ? "destructive" : deployStage === "complete" ? "secondary" : "default"}>
                  {deployStage === "error" ? "فشل" : deployStage === "complete" ? "مكتمل" : "جاري العمل"}
                </Badge>
              </div>
              <Progress value={deployStage === "preparing" ? 20 : deployStage === "uploading" ? 55 : deployStage === "verifying" ? 85 : deployStage === "complete" ? 100 : 0} className="mb-4 h-2.5" />
              <div className="grid gap-2 sm:grid-cols-4">
                {([
                  ["preparing", "تجهيز وفحص"],
                  ["uploading", "رفع الملفات"],
                  ["verifying", "التحقق"],
                  ["complete", "اكتمل"],
                ] as const).map(([stage, label], index) => {
                  const order = { idle: 0, preparing: 1, uploading: 2, verifying: 3, complete: 4, error: 0 }[deployStage]
                  const done = order > index + 1 || deployStage === "complete"
                  const active = deployStage === stage
                  return (
                    <div key={stage} className={`flex items-center gap-2 rounded-lg px-2 py-2 text-xs ${active ? "bg-white font-bold text-primary shadow-sm" : done ? "text-emerald-700" : "text-slate-400"}`}>
                      {done ? <CheckCircle2 size={15} /> : active ? <Loader2 size={15} className="animate-spin" /> : <Circle size={15} />}
                      <span>{index + 1}. {label}</span>
                    </div>
                  )
                })}
              </div>
              {deployStage === "complete" && <p className="mt-3 text-xs text-emerald-700">يمكنك فتح الموقع بعد التحديث. إذا ظهرت نسخة قديمة، حدّث الصفحة تحديثاً قسرياً مرة واحدة.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Page ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function SiteSettings() {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">إعدادات الموقع</h2>
        <p className="text-sm text-gray-500 mt-1">إدارة شاملة لإعدادات الموقع والمحتوى من مكان واحد</p>
      </div>

      <Tabs defaultValue="general" dir="rtl" className="w-full">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700">
            <SlidersHorizontal size={17} className="text-primary" />
            <span>أقسام الإعدادات</span>
          </div>
          <TabsList dir="rtl" className="grid h-auto w-full grid-cols-3 gap-2 rounded-xl bg-gray-100/90 p-1.5 sm:grid-cols-6">
            <TabsTrigger value="general" className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-2 py-2.5 text-sm font-medium text-gray-600 transition-all data-[state=active]:border-primary/15 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">الإعدادات</span>
              <span className="sm:hidden">عام</span>
            </TabsTrigger>
            <TabsTrigger value="slides" className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-2 py-2.5 text-sm font-medium text-gray-600 transition-all data-[state=active]:border-primary/15 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <ImageIcon size={15} />
              <span className="hidden sm:inline">الشرائح</span>
              <span className="sm:hidden">شرائح</span>
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-2 py-2.5 text-sm font-medium text-gray-600 transition-all data-[state=active]:border-primary/15 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <Star size={15} />
              <span className="hidden sm:inline">الشهادات</span>
              <span className="sm:hidden">شهادات</span>
            </TabsTrigger>
            <TabsTrigger value="partners" className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-2 py-2.5 text-sm font-medium text-gray-600 transition-all data-[state=active]:border-primary/15 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <Users size={15} />
              <span className="hidden sm:inline">الشركاء</span>
              <span className="sm:hidden">شركاء</span>
            </TabsTrigger>
            <TabsTrigger value="sections" className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-2 py-2.5 text-sm font-medium text-gray-600 transition-all data-[state=active]:border-primary/15 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">الأقسام</span>
              <span className="sm:hidden">أقسام</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-2 py-2.5 text-sm font-medium text-gray-600 transition-all data-[state=active]:border-primary/15 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <Bot size={15} />
              <span className="hidden sm:inline">الذكاء الاصطناعي</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
            <TabsTrigger value="hostinger" className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-2 py-2.5 text-sm font-medium text-gray-600 transition-all data-[state=active]:border-primary/15 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <Server size={15} />
              <span className="hidden sm:inline">تحديث Hostinger</span>
              <span className="sm:hidden">تحديث</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-6">
          <TabsContent value="general"><GeneralTab /></TabsContent>
          <TabsContent value="slides"><SlidesTab /></TabsContent>
          <TabsContent value="testimonials"><TestimonialsTab /></TabsContent>
          <TabsContent value="partners"><PartnersTab /></TabsContent>
          <TabsContent value="sections"><SectionsTab /></TabsContent>
          <TabsContent value="ai"><AISettingsTab /></TabsContent>
          <TabsContent value="hostinger"><HostingerTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
