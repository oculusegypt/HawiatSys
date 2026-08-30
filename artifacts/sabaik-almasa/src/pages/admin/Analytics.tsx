import { useCallback, useEffect, useMemo, useState } from "react"
import type { ElementType } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  Globe2,
  Laptop,
  MapPinned,
  MousePointer2,
  RefreshCw,
  Search,
  Smartphone,
  ShoppingCart,
  Tablet,
  Target,
  Trash2,
  AlertTriangle,
  Printer,
  Users,
  Wifi,
  Lightbulb,
  Zap,
  ArrowDownRight,
  BriefcaseBusiness,
} from "lucide-react"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : "") || ""

type ApiPeriodKey = "yesterday" | "weekly" | "monthly" | "all" | "custom"
type PeriodKey = ApiPeriodKey | "today"

interface RankedItem {
  label?: string
  source?: string
  country?: string
  city?: string
  count: number
}

interface AnalyticsData {
  activeCount: number
  activePages: { page: string; device: string }[]
  period: { key: ApiPeriodKey; from: string | null; to: string | null; views: number; unique: number }
  today: { views: number; unique: number }
  week: { views: number; unique: number }
  month: { views: number; unique: number }
  topPages: { page: string; count: number }[]
  topReferrers: { referrer: string; count: number }[]
  sources: { source: string; count: number }[]
  orders: {
    total: number
    completed: number
    conversionRate: number
    statuses: { pending: number; inProgress: number; completed: number; cancelled: number }
  }
  comparison: {
    from: string
    to: string
    views: number
    unique: number
    orders: number
    conversionRate: number
  } | null
  servicePerformance: {
    service: string
    total: number
    completed: number
    inProgress: number
    cancelled: number
    completionRate: number
  }[]
  operationalMetrics: {
    assigned: number
    averageAssignmentHours: number
    completed: number
    averageCompletionHours: number
  }
  conversionSources: { source: string; views: number; orders: number; rate: number }[]
  countries: { country: string; count: number }[]
  regions: { region: string; count: number }[]
  cities: { city: string; count: number }[]
  devices: { mobile: number; tablet: number; desktop: number }
  hourly: number[]
  daily: { date: string; count: number }[]
  generatedAt: string
}

const periods: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "اليوم" },
  { key: "yesterday", label: "أمس" },
  { key: "weekly", label: "آخر 7 أيام" },
  { key: "monthly", label: "آخر 30 يومًا" },
  { key: "all", label: "كل الفترات" },
  { key: "custom", label: "فترة مخصصة" },
]

const sourceOrder = ["إعلانات Google", "مباشر", "إحالات أخرى", "بحث Google", "شبكات اجتماعية"]
const sourceMeta: Record<string, { color: string; soft: string; icon: ElementType }> = {
  "إعلانات Google": { color: "bg-[#c89b3c]", soft: "bg-[#fbf4df] text-[#9a7627]", icon: Search },
  مباشر: { color: "bg-[#193b63]", soft: "bg-[#e7eef7] text-[#193b63]", icon: MousePointer2 },
  "إحالات أخرى": { color: "bg-[#73869b]", soft: "bg-[#edf1f5] text-[#526579]", icon: ArrowUpRight },
  "بحث Google": { color: "bg-[#408a70]", soft: "bg-[#e5f3ed] text-[#2b7359]", icon: Search },
  "شبكات اجتماعية": { color: "bg-[#b36b73]", soft: "bg-[#f8e9eb] text-[#98535c]", icon: Activity },
}

function localDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value)
}

function periodLabel(period: PeriodKey) {
  return periods.find(item => item.key === period)?.label || "آخر 30 يومًا"
}

function normalizeAnalytics(raw: Partial<AnalyticsData>): AnalyticsData {
  const month = raw.month ?? { views: 0, unique: 0 }
  return {
    activeCount: raw.activeCount ?? 0,
    activePages: raw.activePages ?? [],
    period: raw.period ?? { key: "monthly", from: null, to: null, views: month.views, unique: month.unique },
    today: raw.today ?? { views: 0, unique: 0 },
    week: raw.week ?? { views: 0, unique: 0 },
    month,
    topPages: raw.topPages ?? [],
    topReferrers: raw.topReferrers ?? [],
    sources: raw.sources ?? [],
    orders: raw.orders ?? {
      total: 0,
      completed: 0,
      conversionRate: 0,
      statuses: { pending: 0, inProgress: 0, completed: 0, cancelled: 0 },
    },
    comparison: raw.comparison ?? null,
    servicePerformance: raw.servicePerformance ?? [],
    operationalMetrics: raw.operationalMetrics ?? { assigned: 0, averageAssignmentHours: 0, completed: 0, averageCompletionHours: 0 },
    conversionSources: raw.conversionSources ?? [],
    countries: raw.countries ?? [],
    regions: raw.regions ?? [],
    cities: raw.cities ?? [],
    devices: {
      mobile: raw.devices?.mobile ?? 0,
      tablet: raw.devices?.tablet ?? 0,
      desktop: raw.devices?.desktop ?? 0,
    },
    hourly: raw.hourly ?? Array(24).fill(0),
    daily: raw.daily ?? [],
    generatedAt: raw.generatedAt ?? new Date().toISOString(),
  }
}

function BarChart({ data, labels, color = "bg-[#193b63]" }: { data: number[]; labels?: string[]; color?: string }) {
  const max = Math.max(...data, 1)

  if (!data.length) {
    return <EmptyState message="لا توجد بيانات زيارات ضمن الفترة المحددة." compact />
  }

  return (
    <div className="w-full overflow-x-auto" dir="ltr">
      <div className="flex min-w-[520px] items-end gap-1.5 h-44 px-1 pt-6">
        {data.map((value, index) => (
          <div key={`${index}-${value}`} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="relative flex h-full w-full items-end justify-center">
              <div
                title={`${labels?.[index] || index} — ${formatNumber(value)} زيارة`}
                className={`${color} w-full max-w-5 rounded-t-md opacity-80 transition-opacity duration-200 group-hover:opacity-100`}
                style={{ height: `${Math.max((value / max) * 112, value > 0 ? 5 : 2)}px` }}
              />
              <span className="pointer-events-none absolute -top-1 rounded bg-[#193b63] px-1.5 py-1 text-[10px] text-white opacity-0 shadow-sm transition-opacity duration-200 group-hover:-translate-y-1 group-hover:opacity-100">
                {formatNumber(value)}
              </span>
            </div>
            {labels && <span className="w-10 truncate text-center text-[10px] text-slate-400">{labels[index]}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ message = "لا توجد بيانات في هذا القسم.", compact = false }: { message?: string; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center ${compact ? "min-h-28 p-4" : "min-h-44 p-6"}`}>
      <BarChart3 size={compact ? 20 : 24} className="mb-2 text-slate-300" />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-5" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <RefreshCw size={16} className="animate-spin text-[#193b63]" />
        <span>جاري تحميل التحليلات...</span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index}><CardContent className="h-28 animate-pulse bg-slate-100/70 p-5" /></Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index}><CardContent className="h-72 animate-pulse bg-slate-100/70 p-5" /></Card>
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50/70">
      <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600"><AlertCircle size={22} /></div>
        <div>
          <p className="font-bold text-red-900">تعذر تحميل بيانات التحليلات</p>
          <p className="mt-1 text-sm text-red-700">{message}</p>
        </div>
        <Button variant="outline" onClick={onRetry} className="gap-2 border-red-200 bg-white text-red-700 hover:bg-red-100">
          <RefreshCw size={15} /> إعادة المحاولة
        </Button>
      </CardContent>
    </Card>
  )
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: ElementType
  label: string
  value: number | string
  sub?: string
  accent: { icon: string; background: string }
}) {
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(25,59,99,0.04)]">
      <CardContent className="relative flex min-h-[116px] items-center gap-3 p-4 sm:p-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accent.background}`}>
          <Icon size={20} className={accent.icon} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#193b63]">{typeof value === "number" ? formatNumber(value) : value}</p>
          {sub && <p className="mt-1 truncate text-[11px] text-slate-400">{sub}</p>}
        </div>
        <div className="absolute -left-6 -top-7 h-20 w-20 rounded-full bg-slate-50/80" />
      </CardContent>
    </Card>
  )
}

function ProgressBar({ value, max, color = "bg-[#193b63]" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-left text-xs font-semibold text-slate-500">{pct}%</span>
    </div>
  )
}

function RankedList({ items, max, color, empty = "لا توجد بيانات في هذا القسم." }: {
  items: RankedItem[]
  max: number
  color: string
  empty?: string
}) {
  if (!items.length) return <EmptyState message={empty} compact />

  return (
    <div className="space-y-4">
      {items.slice(0, 10).map((item, index) => {
        const value = item.label || item.source || item.country || item.city || "غير محدد"
        return (
          <div key={`${value}-${index}`}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
                {index === 0 && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c89b3c]" />}
                <span className="truncate">{value}</span>
              </span>
              <span className="shrink-0 text-sm font-bold text-[#193b63]">{formatNumber(item.count)}</span>
            </div>
            <ProgressBar value={item.count} max={max} color={color} />
          </div>
        )
      })}
    </div>
  )
}

function SectionHeading({ icon: Icon, title, description }: { icon: ElementType; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e7eef7] text-[#193b63]"><Icon size={17} /></div>
      <div>
        <CardTitle className="text-base font-bold text-[#193b63]">{title}</CardTitle>
        {description && <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>}
      </div>
    </div>
  )
}

function DecisionBrief({ data, periodLabelValue }: { data: AnalyticsData; periodLabelValue: string }) {
  const topSource = data.sources[0]
  const topPage = data.topPages[0]
  const peakHour = data.hourly.reduce((best, value, index) => value > best.value ? { value, index } : best, { value: 0, index: 0 })
  const completionRate = data.orders.total > 0 ? Math.round((data.orders.completed / data.orders.total) * 100) : 0
  const hasSignals = Boolean(topSource || topPage || peakHour.value > 0 || data.orders.total > 0)
  const change = (current: number, previous: number) => {
    if (!previous) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }
  const periodChange = data.comparison ? {
    views: change(data.period.views, data.comparison.views),
    unique: change(data.period.unique, data.comparison.unique),
    orders: change(data.orders.total, data.comparison.orders),
    conversion: Number((data.orders.conversionRate - data.comparison.conversionRate).toFixed(1)),
  } : null
  const alerts = periodChange ? [
    periodChange.views <= -20 ? "الزيارات انخفضت بأكثر من 20٪؛ راجع الحملات والمصادر الأعلى تأثيرًا." : "",
    periodChange.orders <= -20 ? "الطلبات انخفضت بأكثر من 20٪؛ راجع سرعة التواصل وتجربة نموذج الطلب." : "",
    periodChange.conversion <= -1 ? "معدل التحويل تراجع؛ قارن الصفحة الأكثر زيارة بالطلبات القادمة منها." : "",
  ].filter(Boolean) : []

  return (
    <Card className="overflow-hidden border-[#b9d9d1] bg-gradient-to-br from-[#f2fbf8] via-white to-[#fffaf0] shadow-[0_12px_32px_rgba(25,59,99,0.07)]">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#193b63] text-white shadow-sm">
              <Lightbulb size={21} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-[#193b63]">ملخص القرار</h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">{periodLabelValue}</span>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">إشارات سريعة تساعدك على تحديد أين تركز جهد التسويق والتشغيل الآن.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#408a70]">
            <Zap size={15} />
            مبني على البيانات الفعلية
          </div>
        </div>

        {!hasSignals ? (
          <div className="mt-5 rounded-xl border border-dashed border-[#b9d9d1] bg-white/70 px-4 py-4 text-sm text-slate-500">
            لا توجد إشارات كافية بعد. اترك التتبع يعمل حتى تظهر أولى التوصيات هنا.
          </div>
        ) : (
          <>
          {periodChange && (
            <div className="mt-5 rounded-2xl border border-slate-100 bg-white/80 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-500">مقارنة بالفترة السابقة</p>
                <span className="text-[10px] text-slate-400">نفس المدة الزمنية</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["المشاهدات", periodChange.views, "%"],
                  ["الزوار", periodChange.unique, "%"],
                  ["الطلبات", periodChange.orders, "%"],
                  ["التحويل", periodChange.conversion, "نقطة"],
                ].map(([label, value, suffix]) => {
                  const numericValue = Number(value)
                  const positive = numericValue >= 0
                  return (
                    <div key={String(label)} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-medium text-slate-400">{label}</p>
                      <p className={`mt-1 text-base font-extrabold ${positive ? "text-[#408a70]" : "text-[#c05c43]"}`}>
                        {positive ? "+" : ""}{numericValue}{suffix}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {alerts.length > 0 && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-amber-900"><AlertTriangle size={16} /> تنبيهات تحتاج انتباه</div>
              <ul className="space-y-1.5 text-xs leading-5 text-amber-800">
                {alerts.map(alert => <li key={alert} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{alert}</li>)}
              </ul>
            </div>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400"><span>القناة الأقوى</span><MousePointer2 size={15} className="text-[#408a70]" /></div>
              <p className="truncate text-lg font-extrabold text-[#193b63]">{topSource?.source || "—"}</p>
              <p className="mt-1 text-xs text-slate-500">{topSource ? `${formatNumber(topSource.count)} زيارة مسجلة` : "لا توجد زيارات"}</p>
            </div>
            <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400"><span>الصفحة الأكثر جذبًا</span><Eye size={15} className="text-[#c89b3c]" /></div>
              <p className="truncate text-lg font-extrabold text-[#193b63]">{topPage?.page || "—"}</p>
              <p className="mt-1 text-xs text-slate-500">{topPage ? `${formatNumber(topPage.count)} مشاهدة` : "لا توجد مشاهدات"}</p>
            </div>
            <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400"><span>أفضل وقت للنشاط</span><Clock3 size={15} className="text-[#8d5e9b]" /></div>
              <p className="text-lg font-extrabold text-[#193b63]">{peakHour.value ? `${String(peakHour.index).padStart(2, "0")}:00` : "—"}</p>
              <p className="mt-1 text-xs text-slate-500">{peakHour.value ? `${formatNumber(peakHour.value)} زيارة في الذروة` : "لا توجد بيانات ساعات"}</p>
            </div>
            <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400"><span>جودة الطلبات</span>{completionRate >= 50 ? <CheckCircle2 size={15} className="text-[#408a70]" /> : <ArrowDownRight size={15} className="text-[#c05c43]" />}</div>
              <p className="text-lg font-extrabold text-[#193b63]">{formatNumber(data.orders.total)} طلب</p>
              <p className="mt-1 text-xs text-slate-500">{formatNumber(data.orders.completed)} مكتمل · {formatNumber(completionRate)}٪ إتمام</p>
            </div>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function DevicesList({ devices }: { devices: AnalyticsData["devices"] }) {
  const total = devices.mobile + devices.tablet + devices.desktop
  const items = [
    { key: "desktop" as const, label: "كمبيوتر", icon: Laptop, color: "bg-[#193b63]", iconColor: "text-[#193b63]" },
    { key: "mobile" as const, label: "جوال", icon: Smartphone, color: "bg-[#408a70]", iconColor: "text-[#408a70]" },
    { key: "tablet" as const, label: "جهاز لوحي", icon: Tablet, color: "bg-[#c89b3c]", iconColor: "text-[#ad8127]" },
  ]

  if (!total) return <EmptyState message="لا توجد بيانات أجهزة ضمن الفترة المحددة." compact />

  return (
    <div className="space-y-5">
      {items.map(({ key, label, icon: Icon, color, iconColor }) => {
        const percentage = Math.round((devices[key] / total) * 100)
        return (
          <div key={key}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Icon size={16} className={iconColor} />{label}</span>
              <span className="text-sm font-bold text-[#193b63]">{formatNumber(devices[key])} <span className="text-xs font-medium text-slate-400">({percentage}%)</span></span>
            </div>
            <ProgressBar value={devices[key]} max={total} color={color} />
          </div>
        )
      })}
    </div>
  )
}

function SourceList({ rows, total }: { rows: { source: string; count: number }[]; total: number }) {
  const bySource = new Map(rows.map(item => [item.source, item.count]))
  const ordered = sourceOrder.map(source => ({ source, count: bySource.get(source) ?? 0 }))

  if (!total) return <EmptyState message="لا توجد مصادر زيارات ضمن الفترة المحددة." compact />

  return (
    <div className="space-y-4">
      {ordered.map(({ source, count }) => {
        const meta = sourceMeta[source]
        const Icon = meta.icon
        const percentage = Math.round((count / total) * 100)
        return (
          <div key={source} className={`rounded-xl border border-slate-100 p-3 ${count === 0 ? "opacity-45" : ""}`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.soft}`}><Icon size={15} /></span>
                <span className="truncate">{source}</span>
              </span>
              <span className="shrink-0 text-sm font-bold text-[#193b63]">{formatNumber(count)} <span className="text-xs font-medium text-slate-400">({percentage}%)</span></span>
            </div>
            <ProgressBar value={count} max={total} color={meta.color} />
          </div>
        )
      })}
    </div>
  )
}

function LocationList({ items, field, total }: {
  items: AnalyticsData["countries"] | AnalyticsData["regions"] | AnalyticsData["cities"]
  field: "country" | "region" | "city"
  total: number
}) {
  const normalized = items.map(item => {
    const label = field === "country"
      ? ("country" in item ? item.country : "")
      : field === "region"
        ? ("region" in item ? item.region : "")
      : ("city" in item ? item.city : "")
    return { label: label || "غير محدد", count: item.count }
  })
  return <RankedList items={normalized} max={Math.max(...normalized.map(item => item.count), total, 1)} color={field === "country" ? "bg-[#408a70]" : field === "region" ? "bg-[#193b63]" : "bg-[#c89b3c]"} />
}

function cleanReferrer(referrer: string) {
  if (!referrer || referrer === "مباشر") return "مباشر"
  try {
    return new URL(referrer).hostname.replace(/^www\./, "")
  } catch {
    return referrer
  }
}

function downloadAnalyticsCsv(data: AnalyticsData, periodLabelValue: string) {
  const rows: (string | number)[][] = [
    ["تقرير تحليلات الموقع", periodLabelValue],
    [],
    ["المؤشر", "القيمة"],
    ["إجمالي المشاهدات", data.period.views],
    ["الزوار الفريدون", data.period.unique],
    ["الطلبات", data.orders.total],
    ["الطلبات المكتملة", data.orders.completed],
    ["معدل التحويل", `${data.orders.conversionRate}%`],
    [],
    ["مصدر الزيارة", "الزيارات", "الطلبات", "معدل التحويل"],
    ...data.conversionSources.map(row => [row.source, row.views, row.orders, `${row.rate}%`]),
    [],
    ["الصفحة", "المشاهدات"],
    ...data.topPages.map(row => [row.page, row.count]),
  ]
  const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n")
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `تحليلات-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function ConversionSourcesTable({ rows }: { rows: AnalyticsData["conversionSources"] }) {
  if (!rows.length) return <EmptyState message="ستظهر مقارنة المصادر بالطلبات بعد تسجيل أول طلب." />

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full min-w-[580px] text-right text-sm">
        <thead className="bg-slate-50 text-xs font-bold text-slate-500">
          <tr>
            <th className="px-4 py-3">المصدر</th>
            <th className="px-4 py-3">الزيارات</th>
            <th className="px-4 py-3">الطلبات</th>
            <th className="px-4 py-3">معدل التحويل</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(row => (
            <tr key={row.source} className="transition-colors hover:bg-slate-50/80">
              <td className="px-4 py-3 font-bold text-[#193b63]">{row.source}</td>
              <td className="px-4 py-3 text-slate-600">{formatNumber(row.views)}</td>
              <td className="px-4 py-3 font-extrabold text-[#408a70]">{formatNumber(row.orders)}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.rate > 0 ? "bg-[#e5f3ed] text-[#2b7359]" : "bg-slate-100 text-slate-400"}`}>
                  {row.rate.toLocaleString("ar-SA", { maximumFractionDigits: 1 })}٪
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ServicePerformanceTable({ rows }: { rows: AnalyticsData["servicePerformance"] }) {
  if (!rows.length) return <EmptyState message="ستظهر مقارنة أداء الخدمات بعد تسجيل أول طلب." />
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full min-w-[680px] text-right text-sm">
        <thead className="bg-slate-50 text-xs font-bold text-slate-500">
          <tr>
            <th className="px-4 py-3">الخدمة</th>
            <th className="px-4 py-3">الطلبات</th>
            <th className="px-4 py-3">مكتملة</th>
            <th className="px-4 py-3">قيد التنفيذ</th>
            <th className="px-4 py-3">ملغاة</th>
            <th className="px-4 py-3">نسبة الإتمام</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(row => (
            <tr key={row.service} className="transition-colors hover:bg-slate-50/80">
              <td className="max-w-[220px] truncate px-4 py-3 font-bold text-[#193b63]">{row.service}</td>
              <td className="px-4 py-3 font-extrabold text-[#193b63]">{formatNumber(row.total)}</td>
              <td className="px-4 py-3 font-bold text-[#408a70]">{formatNumber(row.completed)}</td>
              <td className="px-4 py-3 text-amber-700">{formatNumber(row.inProgress)}</td>
              <td className="px-4 py-3 text-red-600">{formatNumber(row.cancelled)}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.completionRate >= 70 ? "bg-[#e5f3ed] text-[#2b7359]" : "bg-amber-50 text-amber-700"}`}>{row.completionRate.toLocaleString("ar-SA", { maximumFractionDigits: 1 })}٪</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [period, setPeriod] = useState<PeriodKey>("monthly")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [searchWeightEnabled, setSearchWeightEnabled] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState("")
  const [deletingAll, setDeletingAll] = useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)

  const load = useCallback(async () => {
    if (period === "custom" && (!from || !to)) return
    setLoading(true)
    setError("")
    const params = new URLSearchParams()
    if (period === "today") {
      const today = localDate(new Date())
      params.set("period", "custom")
      params.set("from", today)
      params.set("to", today)
    } else {
      params.set("period", period)
      if (period === "custom") {
        params.set("from", from)
        params.set("to", to)
      }
    }

    try {
      const response = await fetch(`${API_BASE}/api/admin/analytics?${params.toString()}&ts=${Date.now()}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload || payload.error) throw new Error(payload?.error || "تعذر الوصول إلى خادم التحليلات.")
      setData(normalizeAnalytics(payload as Partial<AnalyticsData>))
      setLastRefresh(new Date())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "حدث خطأ غير متوقع أثناء تحميل البيانات.")
    } finally {
      setLoading(false)
    }
  }, [from, period, to])

  useEffect(() => {
    if (period !== "custom" || (from && to)) void load()
  }, [from, load, period, to])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (period !== "custom" || (from && to)) void load()
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [from, load, period, to])

  useEffect(() => {
    let cancelled = false
    const loadSettings = async () => {
      setSettingsLoading(true)
      setSettingsError("")
      try {
        const response = await fetch(`${API_BASE}/api/admin/settings`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload) throw new Error("تعذر تحميل إعدادات التتبع.")
        if (!cancelled) setSearchWeightEnabled(payload.analytics_google_search_weight_enabled === "true" || payload.analytics_google_search_weight_enabled === true)
      } catch (reason) {
        if (!cancelled) setSettingsError(reason instanceof Error ? reason.message : "تعذر تحميل إعدادات التتبع.")
      } finally {
        if (!cancelled) setSettingsLoading(false)
      }
    }
    void loadSettings()
    return () => { cancelled = true }
  }, [])

  const updateSearchWeight = async () => {
    if (settingsSaving) return
    const nextValue = !searchWeightEnabled
    setSettingsSaving(true)
    setSettingsError("")
    try {
      const response = await fetch(`${API_BASE}/api/admin/settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ analytics_google_search_weight_enabled: String(nextValue) }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.error) throw new Error(payload?.error || "تعذر حفظ إعداد التتبع.")
      setSearchWeightEnabled(nextValue)
      await load()
    } catch (reason) {
      setSettingsError(reason instanceof Error ? reason.message : "تعذر حفظ إعداد التتبع.")
    } finally {
      setSettingsSaving(false)
    }
  }

  const deleteAllAnalytics = async () => {
    if (deletingAll) return
    setDeletingAll(true)
    setError("")
    try {
      const response = await fetch(`${API_BASE}/api/admin/analytics/clear`, {
        method: "POST",
        cache: "no-store",
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.error) throw new Error(payload?.error || "تعذر حذف التحليلات.")
      setConfirmDeleteAll(false)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حذف التحليلات.")
    } finally {
      setDeletingAll(false)
    }
  }

  const hourLabels = useMemo(() => Array.from({ length: 24 }, (_, index) => index % 3 === 0 ? `${String(index).padStart(2, "0")}:00` : ""), [])
  const sourceTotal = data?.period.views ?? 0
  const deviceTotal = (data?.devices.mobile ?? 0) + (data?.devices.tablet ?? 0) + (data?.devices.desktop ?? 0)
  const hasVisits = Boolean(data && (data.period.views > 0 || data.period.unique > 0 || data.daily.some(item => item.count > 0)))
  const selectedPeriodLabel = periodLabel(period)

  if (loading && !data) {
    return <LoadingState />
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={() => void load()} />
  }

  return (
    <div dir="rtl" className="min-h-[100dvh] space-y-5 bg-[#f6f8fb] px-1 pb-8 text-slate-800 sm:space-y-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#c89b3c]"><Activity size={15} /> لوحة أداء الموقع</div>
           <h2 className="text-2xl font-extrabold tracking-tight text-[#193b63] sm:text-3xl">التقارير والتحليلات</h2>
           <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">تقارير تشغيلية وتسويقية مبنية على الطلبات الفعلية، أداء الخدمات، مصادر العملاء وحركة الزوار.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="hidden text-xs text-slate-400 sm:inline">آخر تحديث: {lastRefresh.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span>
           {data && <Button variant="outline" onClick={() => downloadAnalyticsCsv(data, selectedPeriodLabel)} className="gap-2 border-slate-200 bg-white text-[#193b63] shadow-sm hover:bg-[#eef3f8]">
             <Download size={15} /> تصدير CSV
           </Button>}
           <Button variant="outline" onClick={() => window.print()} className="hidden gap-2 border-slate-200 bg-white text-[#193b63] shadow-sm hover:bg-[#eef3f8] sm:inline-flex">
             <Printer size={15} /> طباعة
           </Button>
          <Button variant="outline" onClick={() => void load()} disabled={loading} className="gap-2 border-slate-200 bg-white text-[#193b63] shadow-sm hover:bg-[#eef3f8]">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> تحديث البيانات
          </Button>
        </div>
      </header>

      <Card className="border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(25,59,99,0.04)]">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <label className="mb-2 block text-xs font-bold text-slate-500">الفترة الزمنية</label>
            <div className="flex max-w-full flex-wrap gap-1.5">
              {periods.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPeriod(item.key)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:text-sm ${period === item.key ? "bg-[#193b63] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {period === "custom" && (
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold text-slate-500">من<input type="date" value={from} onChange={event => setFrom(event.target.value)} className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#193b63]" /></label>
              <label className="text-xs font-semibold text-slate-500">إلى<input type="date" value={to} onChange={event => setTo(event.target.value)} className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#193b63]" /></label>
            </div>
          )}
          <span className="shrink-0 text-xs text-slate-400">عرض: {selectedPeriodLabel}</span>
        </CardContent>
      </Card>

      {data ? (
        <>
          <DecisionBrief data={data} periodLabelValue={selectedPeriodLabel} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <StatCard icon={Eye} label="إجمالي المشاهدات" value={data.period.views} sub={`${formatNumber(data.period.unique)} زائر فريد`} accent={{ icon: "text-[#193b63]", background: "bg-[#e7eef7]" }} />
            <StatCard icon={Users} label="الزوار الفريدون" value={data.period.unique} sub={`ضمن ${selectedPeriodLabel}`} accent={{ icon: "text-[#408a70]", background: "bg-[#e5f3ed]" }} />
            <StatCard icon={CalendarDays} label="زيارات اليوم" value={data.today.views} sub={`${formatNumber(data.today.unique)} زائر فريد`} accent={{ icon: "text-[#ad8127]", background: "bg-[#fbf4df]" }} />
            <StatCard icon={BarChart3} label="زيارات هذا الأسبوع" value={data.week.views} sub={`${formatNumber(data.week.unique)} زائر فريد`} accent={{ icon: "text-[#8d5e9b]", background: "bg-[#f3eafa]" }} />
            <StatCard icon={TrendingIcon} label="زيارات هذا الشهر" value={data.month.views} sub={`${formatNumber(data.month.unique)} زائر فريد`} accent={{ icon: "text-[#b36b73]", background: "bg-[#f8e9eb]" }} />
            <StatCard icon={Wifi} label="الزوار النشطون حاليًا" value={data.activeCount} sub="خلال آخر 5 دقائق" accent={{ icon: "text-[#408a70]", background: "bg-[#e5f3ed]" }} />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard icon={ShoppingCart} label="طلبات الفترة" value={data.orders.total} sub={`${formatNumber(data.orders.completed)} مكتمل`} accent={{ icon: "text-[#8d5e9b]", background: "bg-[#f3eafa]" }} />
            <StatCard icon={Target} label="معدل التحويل" value={`${data.orders.conversionRate.toLocaleString("ar-SA", { maximumFractionDigits: 1 })}٪`} sub="الطلبات مقابل الزوار الفريدين" accent={{ icon: "text-[#c05c43]", background: "bg-[#fbece7]" }} />
            <StatCard icon={Check} label="طلبات مكتملة" value={data.orders.completed} sub={`${formatNumber(data.orders.statuses.pending)} قيد المتابعة`} accent={{ icon: "text-[#408a70]", background: "bg-[#e5f3ed]" }} />
          </div>

          {!hasVisits && <div className="rounded-xl border border-[#e7d9b6] bg-[#fffaf0] px-4 py-3 text-center text-sm font-medium text-[#8c6a20]">لا توجد بيانات زيارات ضمن الفترة المحددة.</div>}
          {error && <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span className="flex items-center gap-2"><AlertCircle size={16} />{error}</span><Button variant="outline" onClick={() => void load()} className="h-8 border-red-200 bg-white text-xs text-red-700">إعادة المحاولة</Button></div>}

          <Tabs defaultValue="overview" dir="rtl" className="space-y-4">
            <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100/80 p-1">
              <TabsTrigger value="overview" className="min-w-max gap-2 px-4 py-2.5 text-xs text-slate-500 data-[state=active]:bg-white data-[state=active]:text-[#193b63] data-[state=active]:shadow-sm sm:text-sm"><BarChart3 size={15} />النظرة العامة</TabsTrigger>
              <TabsTrigger value="sources" className="min-w-max gap-2 px-4 py-2.5 text-xs text-slate-500 data-[state=active]:bg-white data-[state=active]:text-[#193b63] data-[state=active]:shadow-sm sm:text-sm"><MousePointer2 size={15} />مصادر الزيارات</TabsTrigger>
              <TabsTrigger value="conversions" className="min-w-max gap-2 px-4 py-2.5 text-xs text-slate-500 data-[state=active]:bg-white data-[state=active]:text-[#193b63] data-[state=active]:shadow-sm sm:text-sm"><ShoppingCart size={15} />الطلبات والتحويلات</TabsTrigger>
              <TabsTrigger value="services" className="min-w-max gap-2 px-4 py-2.5 text-xs text-slate-500 data-[state=active]:bg-white data-[state=active]:text-[#193b63] data-[state=active]:shadow-sm sm:text-sm"><BriefcaseBusiness size={15} />أداء الخدمات</TabsTrigger>
              <TabsTrigger value="geo" className="min-w-max gap-2 px-4 py-2.5 text-xs text-slate-500 data-[state=active]:bg-white data-[state=active]:text-[#193b63] data-[state=active]:shadow-sm sm:text-sm"><Globe2 size={15} />الموقع الجغرافي</TabsTrigger>
              <TabsTrigger value="pages-devices" className="min-w-max gap-2 px-4 py-2.5 text-xs text-slate-500 data-[state=active]:bg-white data-[state=active]:text-[#193b63] data-[state=active]:shadow-sm sm:text-sm"><Laptop size={15} />الصفحات والأجهزة</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-slate-200/80 shadow-[0_8px_24px_rgba(25,59,99,0.04)]">
                  <CardHeader className="pb-1"><SectionHeading icon={Clock3} title={`توزيع الزيارات بالساعة — ${selectedPeriodLabel}`} description="حسب توقيت الرياض، مرّر المؤشر فوق العمود لمعرفة العدد." /></CardHeader>
                  <CardContent><BarChart data={data.hourly} labels={hourLabels} /></CardContent>
                </Card>
                <Card className="border-slate-200/80 shadow-[0_8px_24px_rgba(25,59,99,0.04)]">
                  <CardHeader className="pb-1"><SectionHeading icon={CalendarDays} title={`الزيارات اليومية — ${selectedPeriodLabel}`} description="عدد الزيارات لكل يوم ضمن الفترة المختارة." /></CardHeader>
                  <CardContent><BarChart data={data.daily.map(item => item.count)} labels={data.daily.map(item => item.date.slice(5))} color="bg-[#8d5e9b]" /></CardContent>
                </Card>
              </div>
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <Card className="border-slate-200/80 shadow-[0_8px_24px_rgba(25,59,99,0.04)]">
                  <CardHeader className="pb-3"><SectionHeading icon={MousePointer2} title="أهم مصادر الزيارات" description="المصادر مرتبة من الأعلى إلى الأقل ضمن الفترة." /></CardHeader>
                  <CardContent><SourceList rows={data.sources} total={sourceTotal} /></CardContent>
                </Card>
                <Card className="border-slate-200/80 shadow-[0_8px_24px_rgba(25,59,99,0.04)]">
                  <CardHeader className="pb-3"><SectionHeading icon={Laptop} title="توزيع الأجهزة" description="الأجهزة المستخدمة للوصول إلى الموقع." /></CardHeader>
                  <CardContent><DevicesList devices={data.devices} /></CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sources" className="space-y-4">
              <Card className="border-slate-200/80 shadow-[0_8px_24px_rgba(25,59,99,0.04)]">
                <CardHeader><SectionHeading icon={MousePointer2} title="تصنيف مصادر الزيارات" description="التصنيف يعتمد على رابط الإحالة ووسوم UTM المحفوظة مع أول زيارة للجلسة." /></CardHeader>
                <CardContent><SourceList rows={data.sources} total={sourceTotal} /></CardContent>
              </Card>
              <Card className="border-[#e7d9b6] bg-[#fffdf7] shadow-[0_8px_24px_rgba(200,155,60,0.08)]">
                <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fbf4df] text-[#ad8127]"><Search size={18} /></div>
                    <div>
                      <h3 className="font-bold text-[#193b63]">تشغيل تتبع البحث</h3>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">عند تشغيل تتبع البحث، تحتسب كل زيارة عضوية من Google كـ 8 زيارات في التقارير. لا ينطبق الوزن على بقية المصادر.</p>
                      {settingsError && <p className="mt-2 text-xs font-medium text-red-600">{settingsError}</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={searchWeightEnabled}
                    aria-label="تشغيل تتبع البحث"
                    disabled={settingsLoading || settingsSaving}
                    onClick={() => void updateSearchWeight()}
                    className={`relative flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors ${searchWeightEnabled ? "bg-[#193b63]" : "bg-slate-300"} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ${searchWeightEnabled ? "-translate-x-6" : "translate-x-0"}`}>
                      {searchWeightEnabled && <Check size={13} className="text-[#193b63]" />}
                    </span>
                  </button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conversions" className="space-y-4">
              <Card className="border-slate-200/80 shadow-[0_8px_24px_rgba(25,59,99,0.04)]">
                <CardHeader>
                  <SectionHeading
                    icon={Target}
                    title="من أين جاءت الطلبات؟"
                    description="تتم مقارنة مصدر الزيارة الأول المحفوظ في الجلسة مع الطلبات التي أرسلها العملاء خلال الفترة المحددة."
                  />
                </CardHeader>
                <CardContent><ConversionSourcesTable rows={data.conversionSources} /></CardContent>
              </Card>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-slate-200/80 shadow-[0_8px_24px_rgba(25,59,99,0.04)]">
                  <CardHeader><SectionHeading icon={ShoppingCart} title="حالة الطلبات" description="التوزيع الحالي للطلبات المنسوبة لمصادر الزيارات." /></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    {[
                      ["جديدة", data.orders.statuses.pending, "bg-blue-50 text-blue-700"],
                      ["قيد التنفيذ", data.orders.statuses.inProgress, "bg-amber-50 text-amber-700"],
                      ["مكتملة", data.orders.statuses.completed, "bg-green-50 text-green-700"],
                      ["ملغاة", data.orders.statuses.cancelled, "bg-red-50 text-red-700"],
                    ].map(([label, value, classes]) => (
                      <div key={String(label)} className={`rounded-xl px-4 py-3 ${classes}`}>
                        <p className="text-xs font-semibold opacity-80">{label}</p>
                        <p className="mt-1 text-2xl font-extrabold">{formatNumber(Number(value))}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="border-[#e7d9b6] bg-[#fffdf7] shadow-[0_8px_24px_rgba(200,155,60,0.08)]">
                  <CardContent className="flex h-full items-center gap-4 p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fbf4df] text-[#ad8127]"><Target size={22} /></div>
                    <div>
                      <p className="text-sm font-bold text-[#193b63]">كيف تُحسب النتيجة؟</p>
                      <p className="mt-1 text-xs leading-6 text-slate-500">يحفظ النظام مصدر أول زيارة مجهول الهوية، ثم يربطه بالطلب عند الإرسال. الطلبات القديمة تظهر ضمن «مباشر» لعدم وجود بيانات تتبع وقت إنشائها.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="services" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["طلبات مسندة", data.operationalMetrics.assigned, "طلب", "text-[#193b63]", "bg-[#e7eef7]"],
                  ["متوسط سرعة التعيين", data.operationalMetrics.averageAssignmentHours, "ساعة", "text-[#408a70]", "bg-[#e5f3ed]"],
                  ["طلبات مكتملة", data.operationalMetrics.completed, "طلب", "text-[#8d5e9b]", "bg-[#f3eafa]"],
                  ["متوسط زمن الإغلاق", data.operationalMetrics.averageCompletionHours, "ساعة", "text-[#ad8127]", "bg-[#fbf4df]"],
                ].map(([label, value, suffix, color, background]) => (
                  <Card key={String(label)} className="border-slate-200/80 shadow-[0_8px_24px_rgba(25,59,99,0.04)]">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${background} ${color}`}><Clock3 size={18} /></div>
                      <div><p className="text-xs font-medium text-slate-500">{label}</p><p className={`mt-1 text-xl font-extrabold ${color}`}>{formatNumber(Number(value))} <span className="text-xs font-bold text-slate-400">{suffix}</span></p></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="border-slate-200/80 shadow-[0_8px_24px_rgba(25,59,99,0.04)]">
                <CardHeader><SectionHeading icon={BriefcaseBusiness} title="أداء الخدمات" description="تعرف على الخدمات الأكثر طلبًا ونسبة إتمامها والإلغاءات ضمن الفترة المختارة." /></CardHeader>
                <CardContent><ServicePerformanceTable rows={data.servicePerformance} /></CardContent>
              </Card>
              <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500"><AlertCircle size={15} className="mt-0.5 shrink-0 text-[#c89b3c]" />نسبة الإتمام تقيس الطلبات المكتملة مقارنة بإجمالي طلبات كل خدمة، وليست تقييمًا لجودة الخدمة.</div>
            </TabsContent>

            <TabsContent value="geo" className="space-y-4">
              <Card className="border-slate-200/80 shadow-[0_8px_24px_rgba(25,59,99,0.04)]">
                <CardContent className="p-4 sm:p-5">
                  <Tabs defaultValue="countries" dir="rtl" className="space-y-5">
                    <TabsList className="h-auto rounded-lg bg-slate-100 p-1">
                      <TabsTrigger value="countries" className="gap-2 px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-[#193b63]"><Globe2 size={14} />الدول</TabsTrigger>
                      <TabsTrigger value="regions" className="gap-2 px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-[#193b63]"><MapPinned size={14} />المناطق</TabsTrigger>
                      <TabsTrigger value="cities" className="gap-2 px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-[#193b63]"><MapPinned size={14} />المدن</TabsTrigger>
                    </TabsList>
                    <TabsContent value="countries"><LocationList items={data.countries} field="country" total={sourceTotal} /></TabsContent>
                    <TabsContent value="regions"><LocationList items={data.regions} field="region" total={sourceTotal} /></TabsContent>
                    <TabsContent value="cities"><LocationList items={data.cities} field="city" total={sourceTotal} /></TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
              <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500"><AlertCircle size={15} className="mt-0.5 shrink-0 text-[#c89b3c]" />ظهور «غير محدد» يعني أن بيانات الموقع الجغرافي لم تكن متوفرة من الخادم.</div>
            </TabsContent>

            <TabsContent value="pages-devices" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <Card className="border-slate-200/80 shadow-[0_8px_24px_rgba(25,59,99,0.04)]">
                  <CardHeader><SectionHeading icon={Eye} title="أكثر الصفحات زيارةً" description="المسارات الأكثر مشاهدة مرتبة تنازليًا." /></CardHeader>
                  <CardContent><RankedList items={data.topPages.map(page => ({ label: page.page || "/", count: page.count }))} max={Math.max(...data.topPages.map(page => page.count), 1)} color="bg-[#408a70]" /></CardContent>
                </Card>
                <Card className="border-slate-200/80 shadow-[0_8px_24px_rgba(25,59,99,0.04)]">
                  <CardHeader><SectionHeading icon={Laptop} title="الأجهزة" description="توزيع الأجهزة التي استخدمها الزوار." /></CardHeader>
                  <CardContent><DevicesList devices={data.devices} /></CardContent>
                </Card>
              </div>
              <Card className="border-slate-200/80 shadow-[0_8px_24px_rgba(25,59,99,0.04)]">
                <CardHeader><SectionHeading icon={ArrowUpRight} title="الإحالات التفصيلية" description="روابط الإحالة التي قادت الزوار إلى الموقع." /></CardHeader>
                <CardContent><RankedList items={data.topReferrers.map(item => ({ label: cleanReferrer(item.referrer), count: item.count }))} max={Math.max(...data.topReferrers.map(item => item.count), 1)} color="bg-[#8d5e9b]" /></CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          <p className="text-center text-xs text-slate-400">البيانات محفوظة بشكل مجهول الهوية ولا يتم تخزين أي بيانات شخصية.</p>
          <Card className="border-red-200 bg-red-50/60">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-sm text-red-800">
                <AlertTriangle size={17} className="mt-0.5 shrink-0 text-red-600" />
                <div>
                  <p className="font-bold">حذف جميع تحليلات الموقع</p>
                  <p className="mt-1 text-xs text-red-700/80">سيتم حذف الزيارات والأجهزة والمصادر والمواقع المحفوظة نهائياً.</p>
                </div>
              </div>
              {!confirmDeleteAll ? (
                <Button variant="outline" onClick={() => setConfirmDeleteAll(true)} className="gap-2 border-red-300 bg-white text-red-700 hover:bg-red-100">
                  <Trash2 size={15} /> حذف جميع التحليلات
                </Button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button variant="destructive" onClick={() => void deleteAllAnalytics()} disabled={deletingAll} className="gap-2">
                    <Trash2 size={15} /> {deletingAll ? "جارٍ الحذف..." : "تأكيد الحذف"}
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmDeleteAll(false)} disabled={deletingAll} className="bg-white">إلغاء</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

function TrendingIcon(props: { size?: number; className?: string }) {
  return <Activity {...props} />
}