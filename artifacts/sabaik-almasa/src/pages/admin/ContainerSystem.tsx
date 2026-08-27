import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link, useLocation } from "wouter"
import {
  AlertCircle, Archive, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BellRing, BookOpenCheck, Box, CalendarDays, CarFront, CheckCircle2, CircleDollarSign,
  ChevronDown, ChevronLeft, ClipboardList, Coins, FileCheck2, FileDown, FilePenLine, FileText, FolderSearch, Gauge, HandCoins, Landmark, LayoutDashboard, ReceiptText, Trash2, Truck,
  ExternalLink, Link2, Loader2, MapPin, Plus, RefreshCw, Search, Settings2, ShieldCheck, SlidersHorizontal, UserCog, UserRound, Users, Wallet, WalletCards, Wrench, X,
} from "lucide-react"
import {
  getGetContainerSystemAuditQueryKey,
  getGetContainerSystemQueryKey,
  getGetContainerSystemRecordsQueryKey,
  getGetFinancialTruthQueryKey,
  getGetServiceRequestsQueryKey,
  useArchiveContainerSystemRecord,
  useCreateContainerSystemRecord,
  useCreateContainerContractWorkflow,
  useGetContainerSystem,
  useGetContainerSystemAudit,
  useGetContainerSystemRecords,
  useGetFinancialTruth,
  useGetServiceRequests,
  useUpdateContainerSystemRecord,
} from "@workspace/api-client-react"
import type { ContainerSystemRecord } from "@workspace/api-client-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { getContainerVisualStatus } from "@/lib/containerStatusVisuals"
import { ContainerStatusImage } from "@/components/admin/ContainerStatusImage"
import {
  FIELD_CONFIG, KIND_ICONS, KIND_LABELS, RecordDialog, RecordKind, RecordStatus, amountOf, formatAuditAction, formatRecordDate, formatStatus,
} from "./ContainerSystemComponents"
import { ContractSettlementWorkspace, DispatchCalendar, FinancialControlCenter, ReportsHub, ReportPage, SettingsPage, REPORTS, ReportId } from "./ContainerSystemSpecialPages"
import { ContractWizard } from "./ContractWizard"
import type { ServiceRequest } from "@workspace/api-client-react"
import { ContainerAssignmentWizard } from "./ContainerAssignmentWizard"
import { FinancialCycleWorkspace } from "./FinancialCycleWorkspace"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

function requestContextFromStorage(requestId: number | null): ServiceRequest | null {
  if (!requestId || typeof window === "undefined") return null
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem("cleanflow_request_context") ?? "null") as ServiceRequest | null
    if (parsed?.id === requestId) return parsed
  } catch {
    // Ignore malformed context and let the normal forms continue to work.
  }
  return null
}

function invoicePayloadFromRequest(
  request: ServiceRequest | null,
  records: ContainerSystemRecord[] = [],
): Record<string, string> | undefined {
  if (!request) return undefined
  const customer = records.find(record => {
    if (record.kind !== "customer" || record.status === "archived") return false
    const payload = record.payload as Record<string, unknown>
    const name = String(payload.name ?? payload.customerName ?? "").trim()
    const phone = String(payload.phone ?? payload.mobile ?? "").replace(/\D/g, "")
    return name === request.clientName.trim() ||
      (phone && phone === request.phone.replace(/\D/g, ""))
  })
  const customerPayload = customer?.payload as Record<string, unknown> | undefined
  const customerId = customer?.id ? String(customer.id) : ""
  const customerName = String(customerPayload?.name ?? customerPayload?.customerName ?? request.clientName)
  const customerAddress = String(customerPayload?.address ?? customerPayload?.location ?? request.location)
  const relatedContract = customer
    ? records.find(record => {
        if (record.kind !== "contract" || record.status === "archived") return false
        const payload = record.payload as Record<string, unknown>
        return String(payload.customerRecordId ?? "") === customerId ||
          (!payload.customerRecordId && String(payload.customerName ?? "").trim() === customerName.trim())
      })
    : undefined
  const contractPayload = relatedContract?.payload as Record<string, unknown> | undefined
  return {
    serviceRequestId: String(request.id),
    customerRecordId: customerId,
    customerName,
    customerPhone: request.phone,
    customerEmail: request.email ?? "",
    customerAddress,
    customerTaxNumber: String(customerPayload?.taxNumber ?? customerPayload?.vatNumber ?? customerPayload?.taxId ?? ""),
    contractNumber: String(contractPayload?.contractNumber ?? ""),
    description: `${request.serviceType}${request.containerSize ? ` — ${request.containerSize}` : ""}`,
    serviceAddress: request.location,
    containerCode: request.containerSize,
    quantity: "1",
    unitPrice: "",
    amount: "",
    notes: request.notes ?? "",
    date: new Date().toISOString().slice(0, 10),
  }
}

type ViewKey =
  | "overview" | "financial_center" | RecordKind | "reports" | "audit" | "container_search"
  | "rental" | "vouchers" | "operations" | "customer_payments" | "bookings"
  | "expenses" | "payroll" | "fleet" | "warehouses" | "system_settings" | "contracts_list"
  | "settlements"
  | "financial_cycle"
type NavItem = { key?: ViewKey; href?: string; label: string; icon: typeof LayoutDashboard }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "مركز التشغيل",
    items: [
      { key: "overview" as ViewKey, label: "الرئيسية", icon: LayoutDashboard },
      { key: "alert" as ViewKey, label: "التنبيهات اليومية", icon: BellRing },
      { key: "container_search" as ViewKey, label: "البحث عن حاوية", icon: FolderSearch },
    ],
  },
  {
    label: "العملاء والتعاقدات",
    items: [
      { key: "customer" as ViewKey, label: "العملاء", icon: Users },
      { key: "customer_site" as ViewKey, label: "مواقع العملاء", icon: MapPin },
      { key: "contract" as ViewKey, label: "إنشاء عقد", icon: FileCheck2 },
      { key: "contracts_list" as ViewKey, label: "العقود", icon: FileText },
      { key: "rental" as ViewKey, label: "بنود الإيجار", icon: ReceiptText },
    ],
  },
  {
    label: "الأصول والأسطول",
    items: [
      { key: "container" as ViewKey, label: "أصول الحاويات", icon: Box },
      { key: "container_assignment" as ViewKey, label: "تخصيص الحاويات", icon: Link2 },
      { key: "container_type" as ViewKey, label: "أنواع الحاويات", icon: SlidersHorizontal },
      { key: "operations" as ViewKey, label: "الحركات التشغيلية", icon: ArrowLeftRight },
      { key: "vehicle" as ViewKey, label: "الشاحنات", icon: CarFront },
      { key: "maintenance" as ViewKey, label: "الصيانة", icon: Wrench },
      { key: "permit" as ViewKey, label: "التصاريح", icon: FileCheck2 },
      { key: "oil_change" as ViewKey, label: "غيار الزيت والعدادات", icon: Gauge },
      { key: "driver" as ViewKey, label: "السائقون", icon: UserRound },
    ],
  },
  {
    label: "المواعيد وأوامر العمل",
    items: [
      { key: "bookings" as ViewKey, label: "المواعيد والحجوزات", icon: CalendarDays },
      { href: "/admin/work-orders", label: "أوامر العمل الميدانية", icon: ClipboardList },
    ],
  },
  {
    label: "المالية والتحصيل",
    items: [
      { key: "financial_center" as ViewKey, label: "المركز المالي", icon: WalletCards },
      { key: "receipt" as ViewKey, label: "سندات القبض", icon: HandCoins },
      { key: "expense" as ViewKey, label: "سندات الصرف", icon: ArrowDownLeft },
      { key: "deposit" as ViewKey, label: "الإيداعات البنكية", icon: Landmark },
      { key: "treasury" as ViewKey, label: "الخزائن", icon: Landmark },
      { key: "transfer" as ViewKey, label: "التحويل بين الخزائن", icon: ArrowUpRight },
      { key: "customer_payments" as ViewKey, label: "سداد العملاء", icon: Coins },
      { key: "settlements" as ViewKey, label: "تسوية العقود وكشف الحساب", icon: FileText },
      { key: "financial_cycle" as ViewKey, label: "دورة الإقفال والمطابقة", icon: ClipboardList },
      { key: "ledger_entry" as ViewKey, label: "كشف مديونية العملاء", icon: FileText },
      { key: "invoice" as ViewKey, label: "الفواتير", icon: FileText },
      { key: "daily_expense" as ViewKey, label: "المصروفات العامة", icon: ArrowDownLeft },
      { key: "fuel_expense" as ViewKey, label: "مصروفات الشاحنات", icon: CarFront },
      { key: "salary_advance" as ViewKey, label: "السلف", icon: Coins },
      { key: "salary_payment" as ViewKey, label: "الرواتب", icon: Coins },
    ],
  },
  {
    label: "الموظفون والصلاحيات",
    items: [
      { key: "employee" as ViewKey, label: "الموظفون", icon: Users },
      { key: "commission" as ViewKey, label: "العمولات", icon: Coins },
      { href: "/admin/employees", label: "المستخدمون والصلاحيات", icon: UserCog },
    ],
  },
  {
    label: "المخزون والمستودعات",
    items: [
      { key: "warehouse" as ViewKey, label: "إدارة المخازن", icon: Box },
      { key: "category" as ViewKey, label: "الأصناف", icon: SlidersHorizontal },
      { key: "category_size" as ViewKey, label: "أحجام الأصناف", icon: SlidersHorizontal },
    ],
  },
  {
    label: "التقارير والتدقيق",
    items: [
      { key: "reports" as ViewKey, label: "التقارير الشاملة", icon: ArrowUpRight },
      { key: "audit" as ViewKey, label: "سجل التدقيق", icon: BookOpenCheck },
    ],
  },
  {
    label: "الإعدادات",
    items: [
      { key: "system_settings" as ViewKey, label: "إعدادات المؤسسة والتشغيل", icon: Settings2 },
      { key: "branch" as ViewKey, label: "الفروع", icon: Landmark },
      { key: "tax" as ViewKey, label: "الضرائب", icon: FileCheck2 },
      { key: "invoice_return" as ViewKey, label: "مرتجعات الفواتير", icon: Archive },
    ],
  },
]

const allKinds = Object.keys(KIND_LABELS) as RecordKind[]
const viewKind: Partial<Record<ViewKey, RecordKind>> = {
  rental: "contract_line",
  vouchers: "receipt",
  operations: "container_movement",
  customer_payments: "payment",
  bookings: "appointment",
  expenses: "expense",
  payroll: "salary_payment",
  fleet: "vehicle",
  warehouses: "warehouse",
  system_settings: "setting",
  contracts_list: "contract",
}
const viewLabel = (view: ViewKey) =>
  view === "overview" ? "الرئيسية"
  : view === "financial_center" ? "المركز المالي"
  : view === "container_search" ? "البحث عن حاوية"
  : view === "reports" ? "التقارير الشاملة"
  : view === "audit" ? "سجل التدقيق"
  : view === "rental" ? "تسجيل إيجار حاوية"
  : view === "vouchers" ? "سندات القبض والصرف"
  : view === "operations" ? "التبديل والتفريغ"
  : view === "customer_payments" ? "سداد العملاء"
  : view === "settlements" ? "تسوية العقود وكشف الحساب"
  : view === "bookings" ? "المواعيد والحجوزات"
  : view === "expenses" ? "الإيرادات والمصروفات"
  : view === "payroll" ? "الرواتب والسلف"
  : view === "fleet" ? "أسطول الشاحنات"
  : view === "warehouses" ? "المستودعات والمخازن"
  : view === "system_settings" ? "إعدادات النظام والتشغيل"
  : view === "contracts_list" ? "العقود"
  : KIND_LABELS[view as RecordKind]

function ContainerSidebar({ view, onSelect }: { view: ViewKey; onSelect: (view: ViewKey) => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(NAV_GROUPS.map(group => [group.label, ["مركز التشغيل", "المالية والتحصيل"].includes(group.label)])),
  )
  return (
    <Card className="sticky top-20 border-slate-200/80 bg-white/90 shadow-sm">
      <CardContent className="p-2.5">
        {NAV_GROUPS.map(group => {
          const isOpen = expanded[group.label]
          const hasActive = group.items.some(item => item.key === view)
          return (
            <div key={group.label} className="mb-2 last:mb-0">
              <button
                type="button"
                onClick={() => setExpanded(current => ({ ...current, [group.label]: !current[group.label] }))}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-right text-[11px] font-black transition ${hasActive ? "bg-cyan-50 text-cyan-900" : "text-slate-500 hover:bg-slate-50"}`}
                data-testid={`button-toggle-container-group-${group.label}`}
              >
                <span>{group.label}</span>
                <ChevronDown size={15} className={`transition-transform ${isOpen ? "rotate-180 text-cyan-700" : "text-slate-400"}`} />
              </button>
              {isOpen && (
                <div className="mt-1 space-y-0.5 border-r border-slate-100 pr-1">
                  {group.items.map(item => {
                    const Icon = item.icon
                    const active = Boolean(item.key && view === item.key)
                    const className = `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-xs font-bold transition-all ${active ? "bg-cyan-100/70 text-cyan-950" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`
                    const testId = item.key ?? item.href?.replace("/admin/", "admin-") ?? item.label
                    return item.href
                      ? <Link key={testId} href={item.href} className={className} data-testid={`nav-container-${testId}`}><Icon size={15} className="text-slate-400" /><span>{item.label}</span></Link>
                      : <button key={testId} type="button" onClick={() => item.key && onSelect(item.key)} className={className} data-testid={`nav-container-${testId}`}><Icon size={15} className={active ? "text-cyan-700" : "text-slate-400"} /><span>{item.label}</span>{active && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-amber-400" />}</button>
                  })}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function numericSummary(summary: Record<string, unknown> | undefined, keys: string[], fallback: number) {
  for (const key of keys) {
    const number = Number(summary?.[key])
    if (Number.isFinite(number)) return number
  }
  return fallback
}

function ContainerAvailabilityBoard({
  records,
  onOpen,
  onAssign,
}: {
  records: ContainerSystemRecord[]
  onOpen: (record: ContainerSystemRecord) => void
  onAssign: (record: ContainerSystemRecord) => void
}) {
  const [filter, setFilter] = useState<"all" | "available" | "rented" | "maintenance" | "other">("all")
  const containers = records.filter(record =>
    ["container", "container_asset"].includes(record.kind) && record.status !== "archived",
  )
  const classify = (record: ContainerSystemRecord) => {
    return getContainerVisualStatus(record.payload.status ?? record.status)
  }
  const labels = {
    available: { label: "متاحة", tone: "border-emerald-200 bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
    rented: { label: "مؤجرة / غير متاحة", tone: "border-rose-200 bg-rose-50 text-rose-800", dot: "bg-rose-500" },
    maintenance: { label: "في الصيانة", tone: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-500" },
    other: { label: "حالة تحتاج مراجعة", tone: "border-slate-200 bg-slate-100 text-slate-700", dot: "bg-slate-500" },
  } as const
  const visible = filter === "all" ? containers : containers.filter(record => classify(record) === filter)
  const daysRemaining = (record: ContainerSystemRecord) => {
    const value = record.payload.rentalEndDate ?? record.payload.endDate ?? record.payload.returnDate ?? record.payload.emptyingDate
    if (!value) return null
    const time = new Date(String(value)).getTime()
    if (!Number.isFinite(time)) return null
    return Math.ceil((time - Date.now()) / 86400000)
  }
  const counts = {
    available: containers.filter(record => classify(record) === "available").length,
    rented: containers.filter(record => classify(record) === "rented").length,
    maintenance: containers.filter(record => classify(record) === "maintenance").length,
    other: containers.filter(record => classify(record) === "other").length,
  }
  return (
    <Card className="border-slate-200/80 shadow-[0_8px_28px_rgba(15,44,58,.05)]">
      <CardHeader className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-slate-900"><Trash2 size={18} className="text-cyan-700" /> حالة الحاويات الآن</CardTitle>
            <p className="mt-1 text-xs text-slate-500">رؤية سريعة للأصول المتاحة والإيجارات والصيانة</p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
            {(["all", "available", "rented", "maintenance", "other"] as const).map(key => (
              <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-full border px-3 py-1.5 transition ${filter === key ? "border-cyan-700 bg-cyan-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300"}`}>
                {key === "all" ? `الكل (${containers.length})` : `${labels[key].label} (${counts[key]})`}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {visible.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">لا توجد حاويات ضمن هذا التصنيف.</div> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map(record => {
              const state = labels[classify(record)]
              const payload = record.payload as Record<string, unknown>
              const code = String(payload.assetCode ?? payload.code ?? record.reference ?? `#${record.id}`)
              const remaining = daysRemaining(record)
              const urgent = remaining !== null && remaining <= 3
              return (
                <div key={record.id} className="group text-right" data-testid={`card-container-availability-${record.id}`}>
                  <div className={`rounded-2xl border p-3 transition group-hover:-translate-y-0.5 group-hover:shadow-md ${state.tone}`}>
                    <div className="relative flex min-h-40 items-center justify-center rounded-xl bg-white/35 px-1">
                      <ContainerStatusImage
                        status={record.payload.status ?? record.status}
                        code={code}
                        className="aspect-[2/1] w-full"
                      />
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2 py-1 text-[10px] font-black shadow-sm"><span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />{state.label}</span>
                    </div>
                    <p className="mt-3 truncate font-black text-slate-900">{String(payload.typeName ?? payload.containerType ?? "حاوية تشغيلية")}</p>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-current/10 pt-2 text-[11px]">
                      <span>{String(payload.size ?? payload.capacity ?? "الحجم غير محدد")}</span>
                      {remaining !== null && <span className={`font-black ${urgent ? "text-rose-700" : ""}`}>{remaining < 0 ? `منتهية منذ ${Math.abs(remaining)} يوم` : remaining === 0 ? "تنتهي اليوم" : `متبقي ${remaining} يوم`}</span>}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => onOpen(record)} className="h-8 flex-1 gap-1 border-cyan-200 bg-white/80 text-[11px] text-cyan-800 hover:bg-white">
                        <FileText size={13} /> التفاصيل
                      </Button>
                      {classify(record) === "available" && (
                        <Button type="button" size="sm" onClick={() => onAssign(record)} className="h-8 flex-1 gap-1 bg-cyan-800 text-[11px] text-white hover:bg-cyan-900" data-testid={`button-assign-container-${record.id}`}>
                          <Link2 size={13} /> تخصيص
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} aria-hidden="true" />
}

function MetricCard({ label, value, icon: Icon, tone, hint }: { label: string; value: string | number; icon: typeof Box; tone: string; hint: string }) {
  const iconSurface = tone === "bg-amber-500" ? "bg-amber-50 text-amber-700" : tone === "bg-emerald-600" ? "bg-emerald-50 text-emerald-700" : tone === "bg-rose-500" ? "bg-rose-50 text-rose-700" : "bg-cyan-50 text-cyan-800"
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,44,58,.06)] transition-transform duration-200 hover:-translate-y-0.5" data-testid={`card-metric-${label}`}>
      <CardContent className="relative p-5">
        <div className={`absolute inset-y-0 right-0 w-1 ${tone}`} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-900" data-testid={`text-metric-${label}`}>{value}</p>
            <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconSurface}`}><Icon size={20} /></div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ kind, onAdd }: { kind: RecordKind; onAdd: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center" data-testid={`empty-state-${kind}`}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-800"><ClipboardList size={24} /></div>
      <h3 className="font-bold text-slate-800">لا توجد سجلات في {KIND_LABELS[kind]}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">ابدأ بإضافة أول سجل. ستظهر التغييرات مباشرة في لوحة التشغيل والتقارير.</p>
      <Button onClick={onAdd} className="mt-5 gap-2 bg-cyan-800 hover:bg-cyan-900" data-testid={`button-empty-add-${kind}`}><Plus size={16} /> إضافة سجل</Button>
    </div>
  )
}

function RecordRow({ record, kind, records, onDetails, onEdit, onArchive }: { record: ContainerSystemRecord; kind: RecordKind; records: ContainerSystemRecord[]; onDetails: () => void; onEdit: () => void; onArchive: () => void }) {
  const fields = FIELD_CONFIG[kind].slice(0, 4)
  const primary = String(record.payload[fields[0]?.key] ?? record.reference ?? `#${record.id}`)
  const relatedLabel = (fieldKey: string) => {
    const id = Number(record.payload[fieldKey])
    const related = records.find(item => item.id === id)
    if (!related) return String(record.payload[fieldKey] ?? "—")
    const payload = related.payload as Record<string, unknown>
    if (fieldKey === "customerRecordId") return String(payload.name ?? payload.customerName ?? related.reference ?? `#${related.id}`)
    if (fieldKey === "siteRecordId") return String(payload.address ?? payload.name ?? related.reference ?? `#${related.id}`)
    if (fieldKey === "containerRecordId") return String(payload.assetCode ?? payload.code ?? related.reference ?? `#${related.id}`)
    return String(record.payload[fieldKey] ?? "—")
  }
  return (
    <div className="group grid grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto] items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-0 hover:bg-cyan-50/30 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,1fr)_auto]" data-testid={`row-record-${record.id}`}>
       <div className="min-w-0">
         {["container", "container_asset"].includes(record.kind) ? (
           <div className="flex items-center gap-3">
             <ContainerStatusImage
               status={record.payload.status ?? record.status}
               code={primary}
               className="h-12 w-24 shrink-0"
             />
             <div className="min-w-0">
               <p className="truncate font-bold text-slate-800" data-testid={`text-record-primary-${record.id}`}>{primary}</p>
               <p className="mt-0.5 truncate text-[11px] text-slate-500">{String(record.payload.typeName ?? record.payload.containerType ?? "أصل حاوية")}</p>
             </div>
           </div>
         ) : <button type="button" onClick={onDetails} className={`truncate text-right font-bold ${kind === "customer" ? "text-cyan-900 hover:underline" : "text-slate-800"}`} data-testid={`text-record-primary-${record.id}`}>{primary}</button>}
        <p className="mt-0.5 text-[11px] font-mono text-slate-400" dir="ltr">{record.reference || `#${record.id}`}</p>
      </div>
      <div className="hidden min-w-0 gap-2 sm:grid sm:grid-cols-2">
         {fields.slice(1, 3).map(field => <div key={field.key} className="min-w-0"><p className="text-[10px] text-slate-400">{field.label}</p><p className="truncate text-xs text-slate-700">{kind === "contract" && ["customerRecordId", "siteRecordId", "containerRecordId"].includes(field.key) ? relatedLabel(field.key) : String(record.payload[field.key] ?? "—")}</p></div>)}
      </div>
      <div className="hidden sm:block"><RecordStatus status={record.status} /><p className="mt-1 text-[10px] text-slate-400">{formatRecordDate(record.updatedAt)}</p></div>
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={onDetails} className="h-8 gap-1 text-xs text-cyan-800 hover:bg-cyan-50" data-testid={`button-details-record-${record.id}`}><FileText size={14} /> <span className="hidden md:inline">التفاصيل</span></Button>
        {kind !== "container_movement" && <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 gap-1 text-xs text-slate-500 hover:bg-cyan-50 hover:text-cyan-800" data-testid={`button-edit-record-${record.id}`}><FilePenLine size={14} /> <span className="hidden md:inline">تعديل</span></Button>}
        <Button variant="ghost" size="icon" onClick={onArchive} className="h-8 w-8 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="أرشفة السجل" data-testid={`button-archive-record-${record.id}`}><Archive size={14} /></Button>
      </div>
    </div>
  )
}

function InvoiceWorkspace({ records, onAdd, onDetails, onEdit, onArchive }: { records: ContainerSystemRecord[]; onAdd: () => void; onDetails: (record: ContainerSystemRecord) => void; onEdit: (record: ContainerSystemRecord) => void; onArchive: (record: ContainerSystemRecord) => void }) {
  type InvoiceFilter = "all" | "draft" | "due" | "partial" | "paid" | "overdue"
  const [filter, setFilter] = useState<InvoiceFilter>("all")
  const [search, setSearch] = useState("")
  const activeRecords = records.filter(record => record.kind === "invoice" && record.status !== "archived")
  const payments = records.filter(record => record.kind === "payment" && record.status === "posted")
  const money = (value: number) => `${value.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`
  const invoiceData = (record: ContainerSystemRecord) => {
    const payload = record.payload as Record<string, unknown>
    const number = String(payload.invoiceNumber ?? record.reference ?? "")
    const linkedPayments = payments.filter(payment => {
      const p = payment.payload as Record<string, unknown>
      return Number(p.invoiceRecordId ?? 0) === record.id || String(p.invoiceNumber ?? "") === number
    })
    // The API persists the authoritative paid value after each posting. Do not
    // add the same posted payments again, otherwise a 500 + 100 cycle renders
    // as 1200 after the invoice payload has been updated.
    const paidFromPostedPayments = linkedPayments.reduce((sum, payment) => {
      const p = payment.payload as Record<string, unknown>
      return sum + Number(p.amount ?? p.total ?? 0)
    }, 0)
    const paid = Number.isFinite(Number(payload.paid))
      ? Number(payload.paid)
      : paidFromPostedPayments
    const total = Number(payload.total ?? payload.amount ?? 0) || 0
    const remaining = Math.max(total - paid, 0)
    const dueDate = String(payload.dueDate ?? payload.paymentDueDate ?? payload.endDate ?? payload.date ?? "").slice(0, 10)
    const baseStatus = String(payload.invoiceStatus ?? payload.lifecycleStatus ?? record.status).toLowerCase()
    const status: InvoiceFilter = remaining <= 0 && total > 0 ? "paid" :
      baseStatus === "draft" || record.status === "draft" ? "draft" :
      remaining < total && paid > 0 ? "partial" :
      dueDate && dueDate < new Date().toISOString().slice(0, 10) ? "overdue" : "due"
    return { payload, number, paid, total, remaining, dueDate, status }
  }
  const rows = activeRecords.map(record => ({ record, ...invoiceData(record) }))
  const normalizedSearch = search.trim().toLowerCase()
  const visibleRecords = rows.filter(row => {
    const matchesStatus = filter === "all" || row.status === filter
    const haystack = [row.number, row.payload.customerName, row.payload.containerCode, row.payload.contractNumber, row.dueDate].map(value => String(value ?? "").toLowerCase()).join(" ")
    return matchesStatus && (!normalizedSearch || haystack.includes(normalizedSearch))
  })
  const total = rows.reduce((sum, row) => sum + row.total, 0)
  const paidAmount = rows.reduce((sum, row) => sum + row.paid, 0)
  const outstanding = rows.reduce((sum, row) => sum + row.remaining, 0)
  const counts = {
    draft: rows.filter(row => row.status === "draft").length,
    due: rows.filter(row => row.status === "due").length,
    partial: rows.filter(row => row.status === "partial").length,
    paid: rows.filter(row => row.status === "paid").length,
    overdue: rows.filter(row => row.status === "overdue").length,
  }
  const statusText: Record<InvoiceFilter, string> = { all: "كل الفواتير", draft: "مسودة", due: "مستحقة", partial: "مدفوعة جزئياً", paid: "مدفوعة", overdue: "متأخرة" }
  const statusClass: Record<InvoiceFilter, string> = {
    all: "border-slate-200 bg-slate-50 text-slate-600",
    draft: "border-slate-200 bg-slate-50 text-slate-600",
    due: "border-amber-200 bg-amber-50 text-amber-800",
    partial: "border-indigo-200 bg-indigo-50 text-indigo-800",
    paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
    overdue: "border-rose-200 bg-rose-50 text-rose-800",
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="إجمالي الفواتير" value={rows.length} icon={FileText} tone="bg-cyan-600" hint="الفواتير غير المؤرشفة" />
        <MetricCard label="إجمالي الفواتير" value={money(total)} icon={Coins} tone="bg-indigo-600" hint="قبل التحصيل" />
        <MetricCard label="المحصّل" value={money(paidAmount)} icon={HandCoins} tone="bg-emerald-600" hint="من الدفعات المرحّلة فقط" />
        <MetricCard label="المستحق" value={money(outstanding)} icon={CircleDollarSign} tone="bg-amber-500" hint="الرصيد المتبقي" />
        <MetricCard label="متأخرة" value={counts.overdue} icon={AlertCircle} tone="bg-rose-600" hint="تجاوزت تاريخ الاستحقاق" />
      </div>
      <Card className="overflow-hidden border-cyan-100 shadow-[0_10px_30px_rgba(15,44,58,.06)]">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-l from-cyan-50/80 to-white px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg text-slate-900">الفواتير الإلكترونية</CardTitle>
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">مهيأة للفوترة الإلكترونية</Badge>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-6 text-slate-500">الفاتورة تبدأ من العقد والحاوية تلقائيًا، وتعرض دورة التحصيل كاملة دون تكرار بيانات العميل أو السعر.</p>
            </div>
            <Button onClick={onAdd} className="gap-2 bg-cyan-800 px-5 hover:bg-cyan-900" data-testid="button-create-electronic-invoice"><Plus size={16} /> إنشاء فاتورة إلكترونية</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {([
              ["all", `${statusText.all} (${rows.length})`],
              ["draft", `${statusText.draft} (${counts.draft})`],
              ["due", `${statusText.due} (${counts.due})`],
              ["partial", `${statusText.partial} (${counts.partial})`],
              ["paid", `${statusText.paid} (${counts.paid})`],
              ["overdue", `${statusText.overdue} (${counts.overdue})`],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${filter === value ? "border-cyan-700 bg-cyan-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300"}`}>{label}</button>
            ))}
          </div>
           <div className="relative mt-4 max-w-xl">
             <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث برقم الفاتورة أو العميل أو العقد أو الحاوية" className="h-10 border-slate-200 bg-white pr-9" />
           </div>
        </CardHeader>
        <CardContent className="p-0">
          {visibleRecords.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-800"><FileText size={22} /></div>
              <h3 className="mt-4 font-bold text-slate-800">لا توجد فواتير ضمن هذا التصنيف</h3>
              <p className="mt-1 text-xs text-slate-500">ابدأ بإنشاء فاتورة إلكترونية جديدة، وستظهر هنا بعد حفظها.</p>
              <Button onClick={onAdd} variant="outline" className="mt-4 gap-2 border-cyan-200 text-cyan-800"><Plus size={15} /> إنشاء أول فاتورة</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[820px]">
                <div className="grid grid-cols-[1.1fr_1.4fr_1.2fr_1fr_1fr_auto] gap-3 bg-slate-50 px-5 py-3 text-[10px] font-black text-slate-400">
                  <span>رقم الفاتورة</span><span>العميل</span><span>البيان</span><span>تاريخ الإصدار</span><span>الإجمالي</span><span>الحالة</span>
                </div>
                {visibleRecords.map(({ record, payload, number, paid, total, remaining, status, dueDate }) => {
                  const contract = records.find(item => item.kind === "contract" && (item.id === Number(payload.contractRecordId) || String((item.payload as Record<string, unknown>).contractNumber ?? item.reference) === String(payload.contractNumber ?? "")))
                  return (
                    <div key={record.id} className="grid grid-cols-[1.1fr_1.4fr_1.2fr_1fr_1fr_auto] items-center gap-3 border-t border-slate-100 px-5 py-4 text-xs transition hover:bg-cyan-50/30" data-testid={`row-invoice-${record.id}`}>
                      <div><button type="button" onClick={() => onDetails(record)} className="text-right font-black text-cyan-800 hover:underline" dir="ltr">{number || `#${record.id}`}</button><span className="mt-1 block text-[10px] text-slate-400">{String(payload.billingPeriod ?? dueDate ?? "—")}</span></div>
                      <span className="truncate font-bold text-slate-700">{String(payload.customerName ?? "عميل غير محدد")}</span>
                      <span className="truncate text-slate-600">{String(payload.containerCode ?? payload.description ?? "خدمات الحاوية")}{contract ? ` · ${String((contract.payload as Record<string, unknown>).contractNumber ?? contract.reference)}` : ""}</span>
                      <span className="text-slate-600">{String(payload.date ?? "غير محدد")}</span>
                      <div><span className="font-black text-slate-800">{money(total)}</span><span className="mt-1 block text-[10px] text-slate-400">مدفوع {money(paid)} · متبقٍ {money(remaining)}</span></div>
                      <div className="flex items-center justify-end gap-1">
                        <Badge variant="outline" className={`whitespace-nowrap ${statusClass[status]}`}>{statusText[status]}</Badge>
                         <Link href={`/admin/container-system/invoice/${record.id}/details`} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-cyan-50 hover:text-cyan-800" title="تفاصيل الفاتورة"><FileDown size={14} /></Link>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(record)} className="h-8 w-8 text-slate-500 hover:bg-cyan-50 hover:text-cyan-800" title="تعديل الفاتورة"><FilePenLine size={14} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onArchive(record)} className="h-8 w-8 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="أرشفة الفاتورة"><Archive size={14} /></Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RecordsPanel({ kind, records, allRecords = records, loading, onAdd, onDetails, onEdit, onArchive }: { kind: RecordKind; records: ContainerSystemRecord[]; allRecords?: ContainerSystemRecord[]; loading: boolean; onAdd: () => void; onDetails: (record: ContainerSystemRecord) => void; onEdit: (record: ContainerSystemRecord) => void; onArchive: (record: ContainerSystemRecord) => void }) {
  return (
    <Card className="border-slate-200/80 shadow-[0_8px_28px_rgba(15,44,58,.05)]">
      <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="text-base text-slate-900">سجلات {KIND_LABELS[kind]}</CardTitle><p className="mt-1 text-xs text-slate-500">آخر تحديث محفوظ من نظام العمليات</p></div>
          <Button onClick={onAdd} className="gap-2 bg-cyan-800 hover:bg-cyan-900" data-testid={`button-add-${kind}`}><Plus size={16} /> إضافة سجل</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? <div className="space-y-1 p-4">{[1, 2, 3, 4].map(i => <SkeletonLine key={i} className="h-14 w-full" />)}</div> : records.length === 0 ? <div className="p-4"><EmptyState kind={kind} onAdd={onAdd} /></div> : (
          <div>
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_minmax(0,1fr)_auto] gap-4 bg-slate-50 px-4 py-2.5 text-[10px] font-bold text-slate-400 sm:grid"><span>السجل</span><span>التفاصيل</span><span>الحالة والتحديث</span><span /></div>
             {records.map(record => <RecordRow key={record.id} record={record} kind={kind} records={allRecords} onDetails={() => onDetails(record)} onEdit={() => onEdit(record)} onArchive={() => onArchive(record)} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ContainerPOS({ records, onDetails, onEdit, onAdd }: { records: ContainerSystemRecord[]; onDetails: (record: ContainerSystemRecord) => void; onEdit: (record: ContainerSystemRecord) => void; onAdd: () => void }) {
  return (
    <Card className="border-slate-200/80 shadow-[0_8px_28px_rgba(15,44,58,.05)]">
      <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3"><div><CardTitle className="text-base">مخزون الحاويات الفعلية</CardTitle><p className="mt-1 text-xs text-slate-500">عرض تشغيلي سريع لكل أصل وموقعه وحالته الحالية</p></div><Button onClick={onAdd} className="gap-2 bg-cyan-800 hover:bg-cyan-900"><Plus size={16} /> حاوية جديدة</Button></div>
      </CardHeader>
      <CardContent className="p-4">
        {records.length === 0 ? <EmptyState kind="container" onAdd={onAdd} /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {records.map((record, index) => {
            const payload = record.payload as Record<string, unknown>
            const code = String(payload.assetCode ?? payload.code ?? record.reference ?? `حاوية ${record.id}`)
            const customer = String(payload.customerName ?? payload.contractCustomer ?? "متاحة في المستودع")
            const location = String(payload.location ?? "الموقع غير محدد")
            const nextEmptying = String(payload.emptyingDate ?? payload.nextEmptyingDate ?? payload.endDate ?? "")
            return <div key={record.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" data-testid={`pos-container-${record.id}`}>
              <div className="relative flex aspect-[2/1] items-center justify-center overflow-hidden bg-slate-950/5">
                <ContainerStatusImage status={record.payload.status ?? record.status} code={code} className="h-full w-full object-contain" numberClassName="top-[45.5%]" />
                <div className="absolute right-3 top-3"><RecordStatus status={record.status} /></div>
              </div>
              <div className="space-y-3 p-4"><div><p className="font-black text-slate-900">{String(payload.typeName ?? payload.containerType ?? "حاوية تشغيلية")}</p><p className="mt-1 text-xs text-slate-500">{String(payload.size ?? payload.capacity ?? "الحجم غير محدد")}</p></div><div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-slate-50 p-2"><span className="block text-[10px] text-slate-400">الموقع</span><span className="mt-1 block truncate font-bold text-slate-700">{location}</span></div><div className="rounded-xl bg-slate-50 p-2"><span className="block text-[10px] text-slate-400">العميل / التفريغ</span><span className="mt-1 block truncate font-bold text-slate-700">{nextEmptying || customer}</span></div></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => onDetails(record)} className="flex-1 gap-1 text-xs text-cyan-800"><FileText size={14} /> التفاصيل</Button><Button variant="outline" size="sm" onClick={() => onEdit(record)} className="gap-1 text-xs"><FilePenLine size={14} /> تعديل</Button></div></div>
            </div>
          })}
        </div>}
      </CardContent>
    </Card>
  )
}

function Overview({ snapshot, records, onAdd, onOpen, onAssign }: { snapshot?: any; records: ContainerSystemRecord[]; onAdd: (kind: RecordKind) => void; onOpen: (record: ContainerSystemRecord) => void; onAssign: (record: ContainerSystemRecord) => void }) {
  const summary = snapshot?.summary as Record<string, unknown> | undefined
  const count = (kind: RecordKind) => records.filter(record => record.kind === kind && record.status !== "archived").length
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isPast = (value: unknown) => {
    const date = new Date(String(value ?? ""))
    return Number.isFinite(date.getTime()) && date < today
  }
  const payload = (kind: RecordKind) => records.filter(record => record.kind === kind && record.status !== "archived").map(record => record.payload as Record<string, unknown>)
  const containers = records.filter(record => ["container", "container_asset"].includes(record.kind) && record.status !== "archived")
  const lateContainers = containers.filter(record => ["overdue", "delayed", "متأخرة"].includes(record.status) || isPast(record.payload.dueDate ?? record.payload.returnDate ?? record.payload.emptyingDate))
  const rentedContainers = containers.filter(record => ["rented", "with_customer", "مؤجرة"].includes(record.status))
  const availableContainers = containers.filter(record => ["available", "متاحة", "متاح"].includes(record.status))
  const pulledContainers = containers.filter(record => ["withdrawn", "pulled", "مسحوبة"].includes(record.status) || Boolean(record.payload.withdrawnAt ?? record.payload.pulledAt))
  const expiredPermits = payload("permit").filter(item => isPast(item.expiryDate ?? item.endDate)).length
  const oilDelays = payload("oil_change").filter(item => Number(item.nextDueMileage ?? 0) > 0 && Number(item.mileage ?? 0) >= Number(item.nextDueMileage)).length
  const paymentDelays = records.filter(record => ["payment", "ledger_entry", "receipt"].includes(record.kind) && ["overdue", "due", "متأخرة", "مستحقة"].includes(record.status)).length
  const expiredContracts = payload("contract").filter(item => isPast(item.endDate)).length
  const employeeAlerts = payload("employee").filter(item => [item.residencyExpiry, item.licenseExpiry, item.medicalInsuranceExpiry, item.passportExpiry].some(isPast)).length
  const vehicleAlerts = payload("vehicle").filter(item => ["maintenance", "overdue", "مستحقة"].includes(String(item.status)) || isPast(item.registrationExpiry ?? item.insuranceExpiry)).length
  const activeContracts = numericSummary(summary, ["activeContracts", "contracts"], count("contract"))
  const availableCount = numericSummary(summary, ["availableContainers", "available"], availableContainers.length || count("container"))
  const outstanding = numericSummary(summary, ["debt", "outstandingAmount", "outstanding"], records.filter(r => r.kind === "payment").reduce((sum, r) => sum + amountOf(r), 0))
  const openAlerts = numericSummary(summary, ["openAlerts", "alerts"], count("alert"))
  const recent = (snapshot?.recent as ContainerSystemRecord[] | undefined)?.slice(0, 5) ?? records.slice(0, 5)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="العقود النشطة" value={activeContracts} icon={FileCheck2} tone="bg-cyan-600" hint="تحتاج متابعة يومية" />
        <MetricCard label="الحاويات المتاحة" value={availableCount} icon={Box} tone="bg-emerald-600" hint="جاهزة للتسليم" />
        <MetricCard label="التحصيل المسجل" value={`${outstanding.toLocaleString("ar-SA")} ر.س`} icon={Coins} tone="bg-amber-500" hint="من سجلات المدفوعات" />
        <MetricCard label="تنبيهات مفتوحة" value={openAlerts} icon={BellRing} tone="bg-rose-500" hint="مراجعة قبل نهاية اليوم" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {[
          ["الحاويات المتأخرة", lateContainers.length, "rose", "عرض الحاويات المتأخرة"],
          ["الحاويات المؤجرة", rentedContainers.length, "cyan", "مرتبطة بعقود نشطة"],
          ["إجمالي الحاويات", containers.length, "slate", "كل الأصول المسجلة"],
          ["الحاويات المسحوبة", pulledContainers.length, "amber", "تحتاج مراجعة تشغيلية"],
          ["التصاريح المنتهية", expiredPermits, "rose", "تجديد قبل التشغيل"],
          ["تأخيرات تغيير الزيت", oilDelays, "amber", "مراجعة عداد المركبة"],
          ["تأخيرات الدفع", paymentDelays, "rose", "متابعة التحصيل"],
          ["العقود المنتهية", expiredContracts, "amber", "مراجعة الرحلات والتصفية"],
          ["تنبيهات الموظفين", employeeAlerts, "amber", "وثائق ورخص منتهية"],
          ["تنبيهات الشاحنات", vehicleAlerts, "amber", "تسجيل وصيانة وتأمين"],
        ].map(([label, value, tone, hint]) => (
          <Card key={String(label)} className={`${tone === "rose" ? "border-rose-200" : tone === "amber" ? "border-amber-200" : tone === "cyan" ? "border-cyan-200" : "border-slate-200"} bg-white shadow-sm`}>
            <CardContent className="p-4"><p className="text-[11px] font-bold text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${tone === "rose" ? "text-rose-700" : tone === "amber" ? "text-amber-700" : tone === "cyan" ? "text-cyan-800" : "text-slate-800"}`}>{value}</p><p className="mt-1 text-[10px] text-slate-400">{hint}</p></CardContent>
          </Card>
        ))}
      </div>
      <ContainerAvailabilityBoard records={records} onOpen={onOpen} onAssign={onAssign} />
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="border-slate-200/80 shadow-[0_8px_28px_rgba(15,44,58,.05)]">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 px-5 py-4"><div><CardTitle className="text-base text-slate-900">آخر حركة تشغيلية</CardTitle><p className="mt-1 text-xs text-slate-500">سجل زمني مختصر لأحدث التغييرات</p></div><ShieldCheck size={19} className="text-emerald-600" /></CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">ستظهر آخر العمليات هنا عند إضافة السجلات.</div> : recent.map((record, index) => (
              <div key={record.id} className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5 last:border-0" data-testid={`row-recent-${record.id}`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-[10px] font-black text-cyan-800">{KIND_ICONS[record.kind as RecordKind] ?? "سجل"}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{String(record.payload.name ?? record.payload.customerName ?? record.reference ?? `سجل ${record.id}`)}</p><p className="text-[11px] text-slate-400">{KIND_LABELS[record.kind as RecordKind] ?? record.kind} · {formatRecordDate(record.createdAt)}</p></div>
                <RecordStatus status={record.status} />
                {index === 0 && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 bg-[#123d4e] text-white shadow-[0_14px_40px_rgba(18,61,78,.18)]">
          <CardContent className="relative flex h-full flex-col justify-between p-6">
            <div className="absolute -left-12 -top-16 h-40 w-40 rounded-full border border-cyan-300/20" /><div className="absolute -left-5 -top-9 h-24 w-24 rounded-full border border-cyan-300/20" />
            <div className="relative"><Badge className="border-cyan-200/30 bg-cyan-200/10 text-cyan-100 hover:bg-cyan-200/10">مركز العمليات</Badge><h3 className="mt-5 max-w-xs text-2xl font-black leading-tight">كل قرار يبدأ من سجل واضح.</h3><p className="mt-3 max-w-xs text-sm leading-7 text-cyan-100/70">أضف أو حدّث السجلات، وستتولى لوحة الحاويات ترتيب الصورة التشغيلية أمام الفريق.</p></div>
            <div className="relative mt-8 grid grid-cols-2 gap-2"><Button onClick={() => onAdd("contract")} className="bg-amber-400 text-slate-900 hover:bg-amber-300" data-testid="button-quick-add-contract"><Plus size={15} /> عقد جديد</Button><Button onClick={() => onAdd("container")} variant="outline" className="border-cyan-200/30 bg-white/5 text-white hover:bg-white/10" data-testid="button-quick-add-container"><Box size={15} /> أصل جديد</Button></div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["customer", "vehicle", "driver", "expense"] as RecordKind[]).map(kind => <button key={kind} onClick={() => onAdd(kind)} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md" data-testid={`button-quick-add-${kind}`}><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-cyan-800">{kind === "customer" ? <Users size={18} /> : kind === "vehicle" ? <CarFront size={18} /> : kind === "driver" ? <UserRound size={18} /> : <Coins size={18} />}</span><span><span className="block text-xs text-slate-400">إضافة سريعة</span><span className="block font-bold text-slate-800">{KIND_LABELS[kind]}</span></span><ChevronLeft size={16} className="mr-auto text-slate-300" /></button>)}
      </div>
    </div>
  )
}

function Reports({ records, snapshot }: { records: ContainerSystemRecord[]; snapshot?: any }) {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [reportGroup, setReportGroup] = useState("all")
  const filteredRecords = records.filter(record => {
    const date = String(record.payload.date ?? record.payload.startDate ?? record.createdAt).slice(0, 10)
    return (!from || date >= from) && (!to || date <= to)
  })
  const totals = allKinds.map(kind => ({ kind, count: filteredRecords.filter(record => record.kind === kind && record.status !== "archived").length, amount: filteredRecords.filter(record => record.kind === kind).reduce((sum, record) => sum + amountOf(record), 0) })).filter(item => item.count > 0)
  const totalFinance = filteredRecords.filter(record => ["receipt", "payment", "expense", "deposit"].includes(record.kind)).reduce((sum, record) => sum + amountOf(record), 0)
  const summary = snapshot?.summary as Record<string, unknown> | undefined
  const money = (value: unknown) => `${Number(value ?? 0).toLocaleString("ar-SA")} ر.س`
  const receipts = filteredRecords.filter(record => record.kind === "receipt").reduce((sum, record) => sum + amountOf(record), 0)
  const deposits = filteredRecords.filter(record => ["deposit", "bank_deposit"].includes(record.kind)).reduce((sum, record) => sum + amountOf(record), 0)
  const reconciliationGap = deposits - receipts
  const reportGroups = [
    { id: "all", label: "كل التقارير", items: ["التقرير العام", "الإجماليات اليومية"] },
    { id: "finance", label: "التقارير العامة والمالية", items: ["التقرير العام", "الإجماليات اليومية", "الإيرادات الأخرى", "سند القبض", "سند الصرف"] },
    { id: "customers", label: "تقارير العملاء", items: ["حساب نقلات العميل", "مديونية عميل", "الإيجارات الآجلة", "نشاط عملاء النقدي"] },
    { id: "contracts", label: "تقارير الإيجارات والعقود", items: ["الإيجارات", "العقود", "متابعة عدد الرحلات", "تسديدات العقود"] },
    { id: "operations", label: "تقارير التشغيل والحاويات", items: ["التفريغ", "السحب", "العمولات والبدلات"] },
    { id: "sales", label: "تقارير المبيعات والإشعارات", items: ["مبيعات النقدي", "الإشعارات", "مرتجع الإيجار النقدي", "مرتجع التسديدات"] },
    { id: "expenses", label: "تقارير المصروفات", items: ["المصروفات العامة", "مصروفات الشاحنة"] },
    { id: "inventory", label: "تقارير المخزون والمشتريات", items: ["المخزون", "الصرف", "مرتجع الصرف", "مشتريات الأصناف", "المشتريات العامة", "مرتجع المشتريات"] },
  ]
  const exportReport = () => {
      const rows = [
      ["القسم", "عدد السجلات", "القيمة"],
        ["الفترة", `${from || "البداية"} إلى ${to || "اليوم"}`, ""],
        ...totals.map(item => [KIND_LABELS[item.kind], String(item.count), String(item.amount)]),
      ["قيمة العقود", "", String(summary?.contractValue ?? 0)],
      ["المديونية القائمة", "", String(summary?.debt ?? 0)],
      ["المصروفات", "", String(summary?.expenses ?? 0)],
      ["تكلفة الصيانة", "", String(summary?.maintenanceCost ?? 0)],
      ["الفرق البنكي", "", String(reconciliationGap)],
    ]
    const csv = "\uFEFF" + rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `container-system-report-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="space-y-5">
       <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-base font-black text-slate-900">التقارير المالية والتشغيلية</h3><p className="mt-1 text-xs text-slate-500">أرقام محسوبة من العقود والتحصيل والمصروفات والأصول.</p></div>
        <Button onClick={exportReport} variant="outline" className="gap-2 border-cyan-200 text-cyan-800 hover:bg-cyan-50" data-testid="button-export-container-report"><FileDown size={15} /> تصدير CSV</Button>
      </div>
       <Card className="border-slate-200/80 shadow-sm">
         <CardContent className="flex flex-wrap items-end gap-3 p-4">
           <div><label className="mb-1 block text-xs font-bold text-slate-500">من تاريخ</label><Input type="date" value={from} onChange={event => setFrom(event.target.value)} className="h-9" data-testid="input-report-from" /></div>
           <div><label className="mb-1 block text-xs font-bold text-slate-500">إلى تاريخ</label><Input type="date" value={to} onChange={event => setTo(event.target.value)} className="h-9" data-testid="input-report-to" /></div>
           <div><label className="mb-1 block text-xs font-bold text-slate-500">مجموعة التقرير</label><select value={reportGroup} onChange={event => setReportGroup(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" data-testid="select-report-group">{reportGroups.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}</select></div>
           <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); setReportGroup("all") }} className="h-9 text-xs text-slate-500">مسح الفلاتر</Button>
           <span className="mr-auto text-xs font-bold text-cyan-800">يعرض {filteredRecords.length} سجل</span>
         </CardContent>
       </Card>
       <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
         {(reportGroups.find(group => group.id === reportGroup) ?? reportGroups[0]).items.map(item => (
           <Card key={item} className="border-slate-200 bg-white shadow-sm transition hover:border-cyan-300 hover:shadow-md">
             <CardContent className="flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800"><FileText size={16} /></div><div><p className="text-sm font-bold text-slate-800">{item}</p><p className="mt-1 text-[10px] text-slate-400">محسوب من السجلات المحفوظة</p></div></CardContent>
           </Card>
         ))}
       </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="قيمة العقود" value={money(summary?.contractValue)} icon={FileCheck2} tone="bg-cyan-600" hint="الإجمالي شامل الضريبة" />
        <MetricCard label="المديونية القائمة" value={money(summary?.debt)} icon={Coins} tone="bg-rose-500" hint="بعد خصم التحصيل المرتبط بالعقد" />
        <MetricCard label="تكلفة الأسطول والصيانة" value={money(Number(summary?.expenses ?? 0) + Number(summary?.maintenanceCost ?? 0))} icon={Wrench} tone="bg-amber-500" hint="مصروفات وصيانة مسجلة" />
        <MetricCard label="استفادة الحاويات" value={`${Number(summary?.containerUtilization ?? 0)}%`} icon={Gauge} tone="bg-emerald-600" hint={`${Number(summary?.rentedContainers ?? 0)} مؤجرة من إجمالي الأصول`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3"><MetricCard label="إجمالي السجلات" value={records.length} icon={Gauge} tone="bg-cyan-600" hint="كل وحدات النظام" /><MetricCard label="حركة مالية" value={`${totalFinance.toLocaleString("ar-SA")} ر.س`} icon={Coins} tone="bg-amber-500" hint="إيصالات ومدفوعات ومصروفات" /><MetricCard label="آخر مزامنة" value={records.length ? "محدث" : "—"} icon={RefreshCw} tone="bg-emerald-600" hint={records.length ? formatRecordDate(records[0]?.updatedAt) : "لا توجد سجلات"} /></div>
      <Card className={`border ${Math.abs(reconciliationGap) < 0.01 ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"}`}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div><p className="text-sm font-black text-slate-900">مطابقة الإيداعات البنكية مع الإيصالات</p><p className="mt-1 text-xs text-slate-600">الإيصالات: {money(receipts)} · الإيداعات: {money(deposits)}</p></div>
          <div className="text-left"><p className="text-[11px] font-bold text-slate-500">الفرق غير المطابق</p><p className={`mt-1 text-xl font-black ${Math.abs(reconciliationGap) < 0.01 ? "text-emerald-700" : "text-amber-700"}`}>{money(reconciliationGap)}</p></div>
        </CardContent>
      </Card>
      <Card className="border-slate-200/80 shadow-sm"><CardHeader className="border-b border-slate-100 px-5 py-4"><CardTitle className="text-base">توزيع وحدات التشغيل</CardTitle></CardHeader><CardContent className="space-y-4 p-5">{totals.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">أضف سجلات لتكوين التقرير التشغيلي.</div> : totals.map(item => <div key={item.kind} data-testid={`report-row-${item.kind}`}><div className="mb-1.5 flex justify-between text-xs"><span className="font-bold text-slate-700">{KIND_LABELS[item.kind]}</span><span className="font-mono text-slate-400">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-700 transition-all duration-500" style={{ width: `${Math.min(100, Math.max(7, item.count / records.length * 100))}%` }} /></div></div>)}</CardContent></Card>
    </div>
  )
}

function AuditLog({ audits, loading }: { audits: any[]; loading: boolean }) {
  return <Card className="border-slate-200/80 shadow-sm"><CardHeader className="border-b border-slate-100 px-5 py-4"><CardTitle className="flex items-center gap-2 text-base"><BookOpenCheck size={18} className="text-cyan-800" /> سجل التدقيق</CardTitle><p className="mt-1 text-xs text-slate-500">أثر قابل للمراجعة لكل إضافة وتعديل وأرشفة</p></CardHeader><CardContent className="p-0">{loading ? <div className="space-y-2 p-5">{[1, 2, 3].map(i => <SkeletonLine key={i} className="h-14" />)}</div> : audits.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">لا توجد حركات تدقيق بعد.</div> : audits.map(audit => <div key={audit.id} className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 last:border-0" data-testid={`audit-row-${audit.id}`}><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><ShieldCheck size={15} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-800">{formatAuditAction(audit.action)}</Badge><span className="text-xs font-bold text-slate-700">{KIND_LABELS[audit.kind as RecordKind] ?? audit.kind}</span><span className="text-[11px] text-slate-400">#{audit.recordId ?? "—"}</span></div><p className="mt-1 text-[11px] text-slate-400">{formatRecordDate(audit.createdAt)}</p></div></div>)}</CardContent></Card>
}

const DETAIL_LABELS: Record<string, string> = {
  assetCode: "رقم الأصل", containerCode: "رقم الحاوية", typeName: "نوع الحاوية", containerType: "نوع الحاوية",
  size: "الحجم", capacity: "السعة", location: "الموقع", address: "العنوان", lastInspection: "آخر فحص",
  notes: "ملاحظات التشغيل", testData: "بيانات تجريبية", sequence: "الترتيب", status: "الحالة",
  assignmentRecordId: "رقم سجل التخصيص", assignedContractRecordId: "رقم سجل العقد", assignedSiteRecordId: "رقم سجل الموقع",
  contractNumber: "رقم العقد", customerName: "اسم العميل", customerPhone: "جوال العميل",
  customerRecordId: "العميل", containerRecordId: "أصل الحاوية", siteRecordId: "موقع العميل",
  assignmentStatus: "حالة التخصيص", startDate: "بداية التخصيص", endDate: "نهاية التخصيص",
  movementType: "نوع الحركة", driverName: "اسم السائق", vehiclePlate: "لوحة المركبة",
  serviceType: "نوع الخدمة", scheduledAt: "الموعد", duration: "مدة التعاقد", billingFrequency: "دورية التعاقد",
  sourceKind: "نوع السجل المصدر", sourceId: "رقم السجل المصدر", contractId: "العقد المرتبط",
  invoiceRecordId: "الفاتورة المرتبطة", invoiceNumber: "رقم الفاتورة", amount: "المبلغ",
  paymentMethod: "طريقة الدفع", direction: "اتجاه القيد", date: "التاريخ", allocations: "توزيعات السداد",
  operationKey: "مفتاح العملية", source: "مصدر العملية", customerEmail: "البريد الإلكتروني", customerAddress: "عنوان العميل",
  contractRecordId: "العقد المرتبط",
}

function detailLabel(key: string) {
  return DETAIL_LABELS[key] ?? FIELD_CONFIG.container.find(field => field.key === key)?.label ?? "تفاصيل إضافية"
}

function recordDisplayName(record: ContainerSystemRecord | undefined, fallback: string) {
  if (!record) return fallback
  const payload = record.payload as Record<string, unknown>
  return String(payload.name ?? payload.customerName ?? payload.contractNumber ?? payload.assetCode ?? record.reference ?? fallback)
}

function coordinatesFromLocation(location: string) {
  const match = location.match(/(?:إحداثيات GPS|GPS)\s*:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i)
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : null
}

function RecordDetails({ record, allRecords, serviceRequests = [], open, onOpenChange, onContractAction }: { record?: ContainerSystemRecord | null; allRecords: ContainerSystemRecord[]; serviceRequests?: ServiceRequest[]; open: boolean; onOpenChange: (open: boolean) => void; onContractAction: (record: ContainerSystemRecord, action: string) => void }) {
  const [, navigate] = useLocation()
  if (!record) return null
  const isContainer = ["container", "container_asset"].includes(record.kind)
  const isPaymentRecord = ["payment", "receipt", "payment_return", "ledger_entry"].includes(record.kind)
  const sourcePayment = record.kind === "ledger_entry"
    ? allRecords.find(item => item.kind === "payment" && item.id === Number(record.payload.sourceId ?? 0))
    : undefined
  const sourcePaymentPayload = sourcePayment?.payload as Record<string, unknown> | undefined
  const detailPayload = record.kind === "ledger_entry"
    ? {
        ...record.payload,
        customerName: record.payload.customerName ?? sourcePaymentPayload?.customerName,
        customerRecordId: record.payload.customerRecordId ?? sourcePaymentPayload?.customerRecordId,
        invoiceRecordId: record.payload.invoiceRecordId ?? sourcePaymentPayload?.invoiceRecordId,
        invoiceNumber: record.payload.invoiceNumber ?? sourcePaymentPayload?.invoiceNumber,
        paymentMethod: record.payload.paymentMethod ?? sourcePaymentPayload?.paymentMethod,
      }
    : record.payload
  const entries = Object.entries(detailPayload).filter(([key]) => key !== "status" || !isContainer).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  const containerPayload = record.payload as Record<string, unknown>
  const containerCode = String(containerPayload.assetCode ?? containerPayload.code ?? record.reference ?? `#${record.id}`)
  const containerStatus = String(containerPayload.status ?? record.status)
  const relatedContainerRecords = isContainer
    ? allRecords.filter(item => {
        const payload = item.payload as Record<string, unknown>
        return String(payload.containerRecordId ?? payload.containerCode ?? payload.assetCode ?? "") === String(record.id) ||
          String(payload.containerCode ?? "") === containerCode
      })
    : []
  const containerMovements = relatedContainerRecords.filter(item => item.kind === "container_movement").length
  const containerContracts = relatedContainerRecords.filter(item => item.kind === "contract" || item.kind === "container_assignment").length
  const customerName = String(detailPayload.name ?? detailPayload.customerName ?? "")
  const linkedCustomer = allRecords.find(item => {
    if (item.kind !== "customer" || item.status === "archived") return false
    const payload = item.payload as Record<string, unknown>
    return (detailPayload.customerRecordId && String(item.id) === String(detailPayload.customerRecordId)) ||
      (customerName && String(payload.name ?? payload.customerName ?? "").trim() === customerName.trim())
  })
  const linkedCustomerId = linkedCustomer?.id ?? (detailPayload.customerRecordId ? Number(detailPayload.customerRecordId) : null)
  const customerRecords = allRecords.filter(item => {
    const payload = item.payload as Record<string, unknown>
    return (linkedCustomerId && String(payload.customerRecordId ?? "") === String(linkedCustomerId)) ||
      (customerName && String(payload.customerName ?? "").trim() === customerName.trim()) ||
      String(payload.customerRecordId ?? "") === String(record.id)
  })
  const customerContracts = customerRecords.filter(item => item.kind === "contract")
  const customerInvoices = customerRecords.filter(item => item.kind === "invoice")
  const contractInvoices = record.kind === "contract"
    ? allRecords.filter(item => item.kind === "invoice" && (
        Number((item.payload as Record<string, unknown>).contractRecordId) === record.id ||
        String((item.payload as Record<string, unknown>).contractNumber ?? "") === String(record.payload.contractNumber ?? record.reference)
      ))
    : []
  const customerPaymentsRecords = customerRecords.filter(item => ["payment", "receipt"].includes(item.kind))
  const customerPayments = customerRecords.filter(item => ["payment", "receipt"].includes(item.kind)).reduce((sum, item) => sum + amountOf(item), 0)
  const customerCharges = customerContracts.reduce((sum, item) => sum + Number(item.payload.total ?? item.payload.amount ?? 0), 0)
  const customerExpenses = allRecords
    .filter(item => ["expense", "fuel_expense", "maintenance"].includes(item.kind))
    .filter(item => {
      const payload = item.payload as Record<string, unknown>
      return String(payload.customerName ?? payload.contractNumber ?? "") === customerName ||
        customerContracts.some(contract => String(payload.contractNumber ?? "") === String(contract.payload.contractNumber ?? ""))
    })
    .reduce((sum, item) => sum + amountOf(item), 0)
  const customerProfit = customerCharges - customerExpenses
  const containerContractsRecords = relatedContainerRecords.filter(item => item.kind === "contract")
  const latestContract = containerContractsRecords
    .slice()
    .sort((a, b) => String(b.updatedAt ?? b.createdAt).localeCompare(String(a.updatedAt ?? a.createdAt)))[0]
  const latestContractPayload = (latestContract?.payload ?? {}) as Record<string, unknown>
  const linkedSite = allRecords.find(item => item.kind === "customer_site" && (
    String(latestContractPayload.siteRecordId ?? "") === String(item.id) ||
    (latestContractPayload.customerName && String(item.payload.customerName ?? "") === String(latestContractPayload.customerName))
  ))
  const linkedRequestId = Number(latestContractPayload.requestId ?? 0)
  const linkedRequest = serviceRequests.find(item =>
    (linkedRequestId > 0 && item.id === linkedRequestId) ||
    ((item as ServiceRequest & { containerRecordId?: number | null }).containerRecordId === record.id && (!latestContractPayload.customerName || item.clientName === latestContractPayload.customerName))
  )
  const requestLocation = linkedRequest?.location ?? String(latestContractPayload.location ?? linkedSite?.payload.address ?? linkedSite?.payload.location ?? "")
  const requestCoordinates = coordinatesFromLocation(requestLocation)
  const relatedCustomers = allRecords.filter(item => item.kind === "customer" && (
    String(latestContractPayload.customerRecordId ?? "") === String(item.id) ||
    (latestContractPayload.customerName && String(item.payload.name ?? item.payload.customerName ?? "") === String(latestContractPayload.customerName))
  ))
  const linkedCustomerName = recordDisplayName(relatedCustomers[0], String(latestContractPayload.customerName ?? "غير مرتبط بعميل"))
  const displayEntries = entries
    .filter(([key]) => !["assetCode", "containerCode", "typeName", "containerType", "status"].includes(key))
    .map(([key, value]) => {
      const linkedId = ["assignmentRecordId", "assignedContractRecordId", "assignedSiteRecordId"].includes(key) ? Number(value) : 0
      const linkedRecord = linkedId > 0 ? allRecords.find(item => item.id === linkedId) : undefined
      if (linkedRecord) return [detailLabel(key), recordDisplayName(linkedRecord, String(value))] as const
      if (key === "allocations" && Array.isArray(value)) {
        const allocationText = value.map((item: unknown) => {
          const allocation = item as Record<string, unknown>
          const contract = allRecords.find(candidate => candidate.kind === "contract" && candidate.id === Number(allocation.contractId ?? 0))
          const invoice = allRecords.find(candidate => candidate.kind === "invoice" && candidate.id === Number(allocation.invoiceId ?? 0))
          const contractName = contract ? recordDisplayName(contract, String(allocation.contractId ?? "")) : `عقد ${allocation.contractId ?? "—"}`
          const invoicePayload = invoice?.payload as Record<string, unknown> | undefined
          const invoiceName = invoice ? String(invoicePayload?.invoiceNumber ?? invoice.reference) : (allocation.invoiceId ? `فاتورة ${allocation.invoiceId}` : "بدون فاتورة")
          return `${contractName} · ${invoiceName} · ${Number(allocation.amount ?? 0).toLocaleString("ar-SA")} ر.س`
        }).join("، ")
        return [detailLabel(key), allocationText] as const
      }
       if (typeof value === "object") {
         const objectValue = value as Record<string, unknown>
         const readable = Object.entries(objectValue)
           .filter(([, item]) => item !== "" && item !== null && item !== undefined)
           .map(([childKey, item]) => `${detailLabel(childKey)}: ${typeof item === "object" ? "بيانات مرتبطة" : String(item)}`)
           .join("، ")
         return [detailLabel(key), readable || "لا توجد بيانات"] as const
       }
      return [detailLabel(key), String(value)] as const
    })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[94vh] max-w-5xl overflow-y-auto border-cyan-100">
        <DialogHeader className="text-right">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-xl text-slate-900">{isContainer ? "تفاصيل أصل الحاوية" : KIND_LABELS[record.kind as RecordKind] ?? "تفاصيل السجل"}</DialogTitle>
              <DialogDescription>{isContainer ? `بيانات التشغيل والمتابعة للحاوية ${containerCode}` : record.reference || `سجل رقم ${record.id}`} · آخر تحديث {formatRecordDate(record.updatedAt)}</DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {record.kind === "customer" && <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); navigate(`/admin/container-system/profile/customer/${record.id}`) }} className="gap-1.5 border-cyan-200 text-cyan-800"><UserRound size={14} /> فتح ملف العميل</Button>}
              {["employee", "driver"].includes(record.kind) && <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); navigate(`/admin/container-system/profile/employee/${record.id}`) }} className="gap-1.5 border-cyan-200 text-cyan-800"><UserCog size={14} /> فتح ملف الموظف</Button>}
              {record.kind === "contract" && <Button size="sm" onClick={() => { onOpenChange(false); navigate(`/admin/container-system/contract/${record.id}/print`) }} className="gap-1.5 bg-cyan-800 hover:bg-cyan-900"><FileText size={14} /> فتح العقد A4</Button>}
              {record.kind === "invoice" && <Button size="sm" onClick={() => { onOpenChange(false); navigate(`/admin/container-system/invoice/${record.id}/details`) }} className="gap-1.5 bg-cyan-800 hover:bg-cyan-900"><FileText size={14} /> تفاصيل الفاتورة</Button>}
            </div>
          </div>
        </DialogHeader>
        {["invoice", "payment", "receipt", "invoice_return", "payment_return", "ledger_entry", "contract"].includes(record.kind) && (
          <div className="mb-4 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h4 className="text-sm font-black text-cyan-950">الروابط المالية وملف العميل</h4><p className="mt-1 text-[11px] text-slate-600">البيانات المرتبطة بالسجل الرسمي.</p></div>
              {linkedCustomer && <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); navigate(`/admin/container-system/profile/customer/${linkedCustomer.id}`) }} className="gap-1.5 border-cyan-200 bg-white text-cyan-800"><UserRound size={14} /> فتح ملف العميل</Button>}
            </div>
            {!linkedCustomer ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">لا يوجد عميل رسمي مرتبط بهذا السجل. افتح التعديل واختر العميل من القائمة.</p> : <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-500">العميل</p><p className="mt-1 truncate text-sm font-black text-slate-800">{String(linkedCustomer.payload.name ?? linkedCustomer.reference)}</p></div>
              <div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-500">العقود</p><p className="mt-1 text-lg font-black text-cyan-800">{customerContracts.length}</p></div>
              <div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-500">الفواتير</p><p className="mt-1 text-lg font-black text-cyan-800">{customerInvoices.length}</p></div>
              <div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-500">المدفوعات</p><p className="mt-1 text-lg font-black text-emerald-700">{customerPaymentsRecords.length}</p></div>
            </div>}
          </div>
        )}
        {isContainer && (
          <div className="rounded-2xl border border-cyan-100 bg-gradient-to-l from-cyan-50 to-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <ContainerStatusImage status={containerStatus} code={containerCode} className="h-28 w-full shrink-0 sm:h-28 sm:w-56" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-cyan-700">رقم الأصل</p>
                <p className="mt-1 text-2xl font-black tracking-tight text-slate-900" dir="ltr">{containerCode}</p>
                <p className="mt-1 text-sm text-slate-600">{String(containerPayload.typeName ?? containerPayload.containerType ?? "نوع الحاوية غير محدد")}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">الحالة التشغيلية الحالية:</span>
                  <RecordStatus status={containerStatus} />
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl bg-white/80 p-3"><p className="text-[10px] font-bold text-slate-500">الموقع الحالي</p><p className="mt-1 truncate text-sm font-black text-slate-800">{String(containerPayload.location ?? "غير محدد")}</p></div>
              <div className="rounded-xl bg-white/80 p-3"><p className="text-[10px] font-bold text-slate-500">آخر فحص</p><p className="mt-1 text-sm font-black text-slate-800">{String(containerPayload.lastInspection ?? "غير مسجل")}</p></div>
              <div className="rounded-xl bg-white/80 p-3"><p className="text-[10px] font-bold text-slate-500">العقود والتخصيصات</p><p className="mt-1 text-lg font-black text-cyan-800">{containerContracts}</p></div>
              <div className="rounded-xl bg-white/80 p-3"><p className="text-[10px] font-bold text-slate-500">الحركات التشغيلية</p><p className="mt-1 text-lg font-black text-cyan-800">{containerMovements}</p></div>
            </div>
          </div>
        )}
        {isContainer && (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div><h4 className="text-sm font-black text-blue-950">موقع الحاوية عند العميل</h4><p className="mt-1 text-[11px] text-blue-800/70">الموقع المحدد في طلب التأجير والعقد المرتبط.</p></div>
                {requestCoordinates && <a href={`https://www.google.com/maps/search/?api=1&query=${requestCoordinates.lat},${requestCoordinates.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline"><ExternalLink size={13} /> فتح الخريطة</a>}
              </div>
              <p className="mb-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-800">{requestLocation || "لم يتم تسجيل موقع مرتبط بالطلب"}</p>
              {requestCoordinates ? <iframe title="موقع العميل المرتبط بالحاوية" src={`https://www.google.com/maps?q=${requestCoordinates.lat},${requestCoordinates.lng}&output=embed`} className="h-56 w-full rounded-xl border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-blue-200 bg-white text-center text-xs text-slate-500"><MapPin size={18} className="ml-2 text-blue-500" /> لا توجد إحداثيات GPS محفوظة لهذا الطلب</div>}
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
              <h4 className="mb-3 text-sm font-black text-amber-950">العميل والتشغيل المرتبط</h4>
              <div className="space-y-2 text-sm">
                <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-bold text-slate-500">العميل المستأجر</p><p className="mt-1 font-black text-slate-900">{linkedCustomerName}</p></div>
                <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-bold text-slate-500">العقد المرتبط</p><p className="mt-1 font-black text-slate-900">{String(latestContractPayload.contractNumber ?? "لا يوجد عقد مرتبط")}</p></div>
                <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-bold text-slate-500">موقع العميل</p><p className="mt-1 font-black text-slate-900">{recordDisplayName(linkedSite, requestLocation || "غير محدد")}</p></div>
                <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-bold text-slate-500">الطلب المرتبط</p><p className="mt-1 font-black text-slate-900">{linkedRequest ? `طلب رقم ${linkedRequest.id}` : "لا يوجد طلب مرتبط"}</p></div>
              </div>
            </div>
          </div>
        )}
         {isPaymentRecord && <div className="mb-4 rounded-2xl border border-emerald-100 bg-gradient-to-l from-emerald-50 to-white p-4">
           <div className="flex items-start justify-between gap-3">
             <div><p className="text-xs font-bold text-emerald-700">السجل المالي</p><h3 className="mt-1 text-lg font-black text-slate-900">سداد العملاء</h3><p className="mt-1 text-xs text-slate-500">بيانات الدفع والربط المالي بشكل واضح وقابل للمراجعة.</p></div>
             <Wallet className="text-emerald-700" size={24} />
           </div>
           <div className="mt-4 grid gap-3 sm:grid-cols-4">
             <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-bold text-slate-400">رقم السجل</p><p className="mt-1 font-mono text-xs font-black text-slate-800" dir="ltr">{record.reference || `PAY-${record.id}`}</p></div>
             <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-bold text-slate-400">العميل</p><p className="mt-1 text-sm font-black text-slate-800">{String(detailPayload.customerName ?? "غير محدد")}</p></div>
             <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-bold text-slate-400">المبلغ</p><p className="mt-1 text-sm font-black text-emerald-700">{Number(detailPayload.amount ?? 0).toLocaleString("ar-SA")} ر.س</p></div>
             <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-bold text-slate-400">الحالة</p><div className="mt-1"><RecordStatus status={String(record.payload.status ?? record.status)} /></div></div>
           </div>
         </div>}
         <div className="grid gap-3 sm:grid-cols-2">
            {!isContainer && <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">الحالة</p><div className="mt-1"><RecordStatus status={String(record.payload.status ?? record.status)} /></div></div>}
           {!isPaymentRecord && displayEntries.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p></div>)}
        </div>
         {isPaymentRecord && <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
           <h4 className="mb-3 text-sm font-black text-slate-900">تفاصيل السداد</h4>
           <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
             {([
               ["اسم العميل", detailPayload.customerName],
               ["جوال العميل", detailPayload.customerPhone],
               ["رقم العقد", detailPayload.contractNumber],
               ["رقم الفاتورة", detailPayload.invoiceNumber],
               ["طريقة الدفع", detailPayload.paymentMethod === "cash" ? "نقدي" : detailPayload.paymentMethod === "card" ? "بطاقة / شبكة" : detailPayload.paymentMethod === "bank_transfer" ? "تحويل بنكي" : detailPayload.paymentMethod],
               ["تاريخ السداد", detailPayload.date],
              ] as Array<[string, unknown]>).filter(([, value]) => value !== undefined && value !== null && String(value).trim()).map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-bold text-slate-800">{String(value)}</p></div>)}
           </div>
         </div>}
        {isContainer && <div className="mt-2 flex justify-end border-t border-slate-100 pt-4"><Button onClick={() => { onOpenChange(false); navigate(`/admin/container-system/profile/container/${record.id}`) }} className="gap-2 bg-cyan-800 hover:bg-cyan-900"><Box size={15} /> فتح ملف الحاوية الكامل</Button></div>}
          {record.kind === "customer" && <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4"><h4 className="mb-3 text-sm font-black text-emerald-950">ملف العميل وكشف الحساب</h4><div className="grid grid-cols-2 gap-2 sm:grid-cols-5"><div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-500">العقود</p><p className="mt-1 text-lg font-black text-slate-900">{customerContracts.length}</p></div><div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-500">إجمالي المطالبات</p><p className="mt-1 text-lg font-black text-slate-900">{customerCharges.toLocaleString("ar-SA")} ر.س</p></div><div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-500">المدفوع</p><p className="mt-1 text-lg font-black text-emerald-700">{customerPayments.toLocaleString("ar-SA")} ر.س</p></div><div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-500">تكلفة التشغيل</p><p className="mt-1 text-lg font-black text-amber-700">{customerExpenses.toLocaleString("ar-SA")} ر.س</p></div><div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-500">ربحية العملية</p><p className={`mt-1 text-lg font-black ${customerProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{customerProfit.toLocaleString("ar-SA")} ر.س</p></div></div><div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-black text-rose-700">الرصيد المستحق: {Math.max(customerCharges - customerPayments, 0).toLocaleString("ar-SA")} ر.س</div></div>}
           {record.kind === "contract" && <div className="mt-5 space-y-4">
             <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
               <div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-black text-cyan-950">فواتير العقد</h4><p className="mt-1 text-[11px] text-cyan-800/70">الفترات المفوترة والتحصيل الفعلي المرتبط بهذا العقد.</p></div><Badge variant="outline" className="border-cyan-200 bg-white text-cyan-800">{contractInvoices.length} فاتورة</Badge></div>
               {contractInvoices.length === 0 ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-bold text-amber-800">لا توجد فاتورة لهذه الفترة بعد. ستنشأ تلقائيًا عند اعتماد العقد إذا كان مؤهلاً للفوترة.</p> : <div className="mt-3 space-y-2">{contractInvoices.map(invoice => {
                 const invoicePayload = invoice.payload as Record<string, unknown>
                 const total = Number(invoicePayload.total ?? invoicePayload.amount ?? 0)
                 const paid = Number(invoicePayload.paid ?? 0)
                 return <button type="button" key={invoice.id} onClick={() => { onOpenChange(false); navigate(`/admin/container-system/invoice/${invoice.id}/details`) }} className="grid w-full gap-2 rounded-xl bg-white p-3 text-right transition hover:bg-cyan-100/60 sm:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]"><span className="font-black text-cyan-800" dir="ltr">{String(invoicePayload.invoiceNumber ?? invoice.reference)}</span><span><small className="block text-[10px] text-slate-400">الفترة</small>{String(invoicePayload.billingPeriod ?? invoicePayload.date ?? "—")}</span><span><small className="block text-[10px] text-slate-400">الإجمالي</small>{total.toLocaleString("ar-SA")} ر.س</span><span><small className="block text-[10px] text-slate-400">المدفوع</small><span className="text-emerald-700">{paid.toLocaleString("ar-SA")} ر.س</span></span><span><small className="block text-[10px] text-slate-400">المتبقي</small><span className="font-black text-rose-700">{Math.max(total - paid, 0).toLocaleString("ar-SA")} ر.س</span></span></button>
               })}</div>}
             </div>
             <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4"><h4 className="mb-3 text-sm font-black text-amber-950">دورة العقد</h4><div className="flex flex-wrap gap-2">{["draft", "pending_approval", "issued"].includes(record.status) && <><Button size="sm" onClick={() => onContractAction(record, "approve")} className="bg-emerald-700 hover:bg-emerald-800">اعتماد العقد</Button><Button size="sm" variant="outline" onClick={() => onContractAction(record, "reject")} className="border-rose-200 text-rose-700">رفض العقد</Button></>}<Button size="sm" onClick={() => onContractAction(record, "deliver")} className="bg-cyan-800 hover:bg-cyan-900">تسجيل التسليم</Button><Button size="sm" variant="outline" onClick={() => onContractAction(record, "return")} className="border-cyan-200 text-cyan-900">تسجيل الاسترجاع</Button><Button size="sm" variant="outline" onClick={() => onContractAction(record, "settle")} className="border-emerald-200 text-emerald-800">تصفية العقد</Button><Button size="sm" variant="outline" onClick={() => onContractAction(record, "debt")} className="border-rose-200 text-rose-700">تحويل لمديونية</Button><Button size="sm" variant="outline" onClick={() => onContractAction(record, "close")} className="border-slate-200 text-slate-700">إغلاق العقد</Button></div></div>
           </div>}
      </DialogContent>
    </Dialog>
  )
}

function ContainerSearchPanel({ records, loading, onDetails, onEdit }: { records: ContainerSystemRecord[]; loading: boolean; onDetails: (record: ContainerSystemRecord) => void; onEdit: (record: ContainerSystemRecord) => void }) {
  const searchableRecords = records.filter(record =>
    record.status !== "archived" &&
    ["container", "container_asset", "contract", "container_assignment", "appointment", "work_order"].includes(record.kind),
  )
  return (
    <Card className="overflow-hidden border-slate-200/80 shadow-[0_8px_28px_rgba(15,44,58,.05)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-800"><FolderSearch size={19} /></div>
          <div>
            <CardTitle className="text-base text-slate-900">البحث عن حاوية</CardTitle>
            <p className="mt-1 text-xs leading-6 text-slate-500">ابحث برقم الحاوية أو اسم العميل أو رقم الهاتف، ثم افتح سجل الإيجار أو العقد المرتبط.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? <div className="space-y-2 p-4">{[1, 2, 3].map(index => <SkeletonLine key={index} className="h-16" />)}</div> : searchableRecords.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Search size={21} /></div>
            <h3 className="mt-4 font-bold text-slate-800">لا توجد نتائج</h3>
            <p className="mt-1 max-w-sm text-xs leading-6 text-slate-500">جرّب رقم حاوية أو اسم عميل مختلفًا. ستظهر النتائج من السجلات المحفوظة فقط.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[1.1fr_1.2fr_1.2fr_1fr_1fr_auto] gap-3 bg-slate-50 px-4 py-3 text-[10px] font-black text-slate-400">
                <span>رقم الحاوية</span><span>العميل</span><span>الهاتف</span><span>بداية الإيجار</span><span>نهاية الإيجار</span><span>الحالة</span>
              </div>
              {searchableRecords.map(record => {
                const payload = record.payload as Record<string, unknown>
                const code = String(payload.containerCode ?? payload.assetCode ?? payload.code ?? record.reference ?? `#${record.id}`)
                return <div key={record.id} className="grid grid-cols-[1.1fr_1.2fr_1.2fr_1fr_1fr_auto] items-center gap-3 border-t border-slate-100 px-4 py-3.5 text-xs hover:bg-cyan-50/30" data-testid={`row-container-search-${record.id}`}>
                  <button type="button" onClick={() => onDetails(record)} className="truncate text-right font-black text-cyan-900 hover:underline" dir="ltr">{code}</button>
                  <span className="truncate font-bold text-slate-700">{String(payload.customerName ?? payload.name ?? "—")}</span>
                  <span className="truncate text-slate-500" dir="ltr">{String(payload.customerPhone ?? payload.phone ?? "—")}</span>
                  <span className="text-slate-500">{String(payload.startDate ?? payload.rentalStartDate ?? "—")}</span>
                  <span className="text-slate-500">{String(payload.endDate ?? payload.rentalEndDate ?? "—")}</span>
                  <div className="flex items-center gap-1.5"><RecordStatus status={String(payload.status ?? record.status)} />{record.kind !== "container_movement" && <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(record)} className="h-8 w-8 text-slate-400 hover:bg-cyan-50 hover:text-cyan-800" title="تعديل السجل"><FilePenLine size={14} /></Button>}</div>
                </div>
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ContainerSystem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [location, navigate] = useLocation()
  // Wouter may expose only the pathname in its location value depending on
  // the history adapter. Read the browser query as the source of truth so
  // dashboard shortcuts such as ?view=invoice&create=1 cannot fall back to
  // the default customer view.
  const queryParams = useMemo(() => {
    const browserSearch = typeof window !== "undefined" ? window.location.search : ""
    const locationSearch = location.includes("?") ? `?${location.split("?").slice(1).join("?")}` : ""
    return new URLSearchParams(browserSearch || locationSearch)
  }, [location])
  const requestedView = queryParams.get("view") as ViewKey | null
  const requestedCreate = queryParams.get("create") === "1"
  const requestedCustomerId = Number(queryParams.get("customerId") ?? 0) || null
  const requestedContractId = Number(queryParams.get("contractId") ?? 0) || null
  const requestedRequestId = Number(queryParams.get("requestId") ?? 0) || null
  const serviceRequestsQuery = useGetServiceRequests(undefined, { query: { staleTime: 30_000, queryKey: getGetServiceRequestsQueryKey() } })
  const requestContext = useMemo(() => {
    const stored = requestContextFromStorage(requestedRequestId)
    if (stored) return stored
    if (!requestedRequestId) return null
    return (serviceRequestsQuery.data ?? []).find(request => request.id === requestedRequestId) ?? null
  }, [requestedRequestId, serviceRequestsQuery.data])
  const [view, setView] = useState<ViewKey>("overview")
  const [search, setSearch] = useState("")
  const [dialog, setDialog] = useState<{ open: boolean; kind: RecordKind; record?: ContainerSystemRecord | null }>({ open: false, kind: "customer" })
  const [contractWizardOpen, setContractWizardOpen] = useState(false)
  const [assignmentWizardOpen, setAssignmentWizardOpen] = useState(false)
  const [assignmentContainerId, setAssignmentContainerId] = useState<number | null>(null)
  const [contractFlowBusy, setContractFlowBusy] = useState(false)
  const [detailRecord, setDetailRecord] = useState<ContainerSystemRecord | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reportId, setReportId] = useState<ReportId | null>(null)
  useEffect(() => {
    if (!requestedView) return
    setView(requestedView)
    if (requestedView === "contract") setContractWizardOpen(true)
    if (requestedCreate && ["customer", "receipt", "payment", "container"].includes(requestedView)) {
      setDialog({ open: true, kind: requestedView as RecordKind, record: null })
    }
    if (requestedView === "customer_site") setDialog({ open: true, kind: "customer_site", record: null })
    if (requestedView === "invoice" && requestedCreate) {
      setDialog({ open: true, kind: "invoice", record: null })
    }
  }, [requestContext, requestedContractId, requestedCreate, requestedCustomerId, requestedView])
  const collectionKind = viewKind[view] ?? (allKinds.includes(view as RecordKind) ? view as RecordKind : undefined)
  const isCollection = Boolean(collectionKind)
  const filterParams = useMemo(() => ({ kind: collectionKind, search: search.trim() || undefined }), [collectionKind, search])
  const snapshotQuery = useGetContainerSystem()
  const recordsQuery = useGetContainerSystemRecords(filterParams)
  const auditQuery = useGetContainerSystemAudit({ query: { enabled: view === "audit", queryKey: getGetContainerSystemAuditQueryKey() } })
  const createMutation = useCreateContainerSystemRecord()
  const contractWorkflowMutation = useCreateContainerContractWorkflow()
  const updateMutation = useUpdateContainerSystemRecord()
  const archiveMutation = useArchiveContainerSystemRecord()
  const snapshot = snapshotQuery.data
  const organization = (snapshot as typeof snapshot & { organization?: Record<string, unknown> } | undefined)?.organization
  const records = useMemo(() => {
    const response = recordsQuery.data ?? []
    if (isCollection || search.trim()) return response
    return snapshot?.records ?? response
  }, [isCollection, recordsQuery.data, search, snapshot?.records])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetContainerSystemQueryKey() })
    queryClient.invalidateQueries({ queryKey: getGetFinancialTruthQueryKey() })
    queryClient.invalidateQueries({ queryKey: getGetContainerSystemRecordsQueryKey() })
    queryClient.invalidateQueries({ queryKey: getGetContainerSystemAuditQueryKey() })
  }
  const showSuccess = (message: string) => {
    setNotice(message)
    toast({ title: message })
    window.setTimeout(() => setNotice(null), 3500)
  }
  const openCreate = (kind: RecordKind = collectionKind ?? "customer") => {
    if (kind === "contract") {
      setContractWizardOpen(true)
      return
    }
    if (kind === "container_assignment") {
      setAssignmentContainerId(null)
      setAssignmentWizardOpen(true)
      return
    }
    setDialog({ open: true, kind, record: null })
  }
  const openEdit = (record: ContainerSystemRecord) => setDialog({ open: true, kind: (record.kind as RecordKind) || "customer", record })
  const archiveRecord = (record: ContainerSystemRecord) => {
    if (!window.confirm(`هل تريد أرشفة السجل ${record.reference || `#${record.id}`}؟`)) return
    archiveMutation.mutate({ id: record.id }, { onSuccess: () => { invalidate(); showSuccess("تمت أرشفة السجل") }, onError: () => toast({ title: "تعذر أرشفة السجل", variant: "destructive" }) })
  }
  const openRecordDetails = (record: ContainerSystemRecord) => {
    if (record.kind === "customer") {
      navigate(`/admin/container-system/profile/customer/${record.id}`)
      return
    }
    setDetailRecord(record)
  }
  const submitRecord = (payload: Record<string, unknown>, status: string) => {
    const criticalKinds = new Set(["container_movement", "receipt", "payment", "expense", "deposit", "bank_deposit", "invoice", "invoice_return", "payment_return", "transfer", "purchase", "purchase_return"])
    const data = {
      kind: dialog.kind,
      status,
      payload: !dialog.record && criticalKinds.has(dialog.kind)
        ? { ...payload, operationKey: crypto.randomUUID() }
        : payload,
    }
    if (!dialog.record && dialog.kind === "payment") {
      let allocations = Array.isArray(payload.allocations)
        ? payload.allocations.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")).map(item => ({
            contractId: Number(item.contractId ?? 0),
            amount: Number(item.amount ?? 0),
            invoiceId: item.invoiceId == null ? null : Number(item.invoiceId),
          }))
        : []
      // An invoice selection is sufficient context for a customer payment.
      // Resolve its contract here as a final client-side boundary so every
      // payment entry point sends the same explicit allocation payload.
      const selectedInvoice = records.find(record => {
        if (record.kind !== "invoice" || record.status === "archived") return false
        const invoicePayload = record.payload as Record<string, unknown>
        return (payload.invoiceRecordId != null && Number(payload.invoiceRecordId) === record.id) ||
          (payload.invoiceId != null && Number(payload.invoiceId) === record.id) ||
          (String(payload.invoiceNumber ?? "").trim() !== "" &&
            String(invoicePayload.invoiceNumber ?? record.reference ?? "").trim() === String(payload.invoiceNumber).trim())
      })
      const selectedInvoicePayload = selectedInvoice?.payload as Record<string, unknown> | undefined
      const invoiceContract = selectedInvoicePayload
        ? records.find(record => record.kind === "contract" && record.status !== "archived" && (
            Number(selectedInvoicePayload.contractRecordId ?? 0) === record.id ||
            (String(selectedInvoicePayload.contractNumber ?? "").trim() !== "" &&
              String((record.payload as Record<string, unknown>).contractNumber ?? record.reference ?? "").trim() === String(selectedInvoicePayload.contractNumber).trim())
          ))
        : undefined
      if (allocations.length === 0) {
        let ids: string[] = []
        let amounts: Record<string, string> = {}
        let invoices: Record<string, string> = {}
        try {
          const storedIds = JSON.parse(String(payload.contractRecordIds ?? ""))
          ids = Array.isArray(storedIds) ? storedIds.map(String) : []
          amounts = JSON.parse(String(payload.allocationAmounts ?? "{}"))
          invoices = JSON.parse(String(payload.allocationInvoices ?? "{}"))
        } catch { ids = [] }
        const legacyId = String(payload.contractRecordId ?? "").trim()
        if (ids.length === 0 && invoiceContract?.id) ids = [String(invoiceContract.id)]
        if (ids.length === 0 && legacyId) ids = [legacyId]
        const paymentAmount = Number(payload.amount ?? 0)
        allocations = ids.map(id => ({
          contractId: Number(id),
          amount: ids.length === 1 ? paymentAmount : Number(amounts[id] ?? 0),
          invoiceId: invoices[id] ? Number(invoices[id]) : selectedInvoice?.id ?? null,
        }))
      }
      if (allocations.length === 1 && selectedInvoice?.id && allocations[0].invoiceId == null) {
        allocations[0].invoiceId = selectedInvoice.id
      }
      if (allocations.length > 0 && allocations.every(item => item.contractId > 0 && item.amount > 0)) {
        const operationKey = String(payload.operationKey ?? crypto.randomUUID())
        void fetch(`${API_BASE}/api/admin/container-system/financial/settle`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}`, "Idempotency-Key": operationKey },
          body: JSON.stringify({ ...payload, amount: Number(payload.amount ?? 0), operationKey, allocations }),
        }).then(async response => {
          const body = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(String(body.error ?? "تعذر تسجيل السداد"))
          invalidate(); setDialog(current => ({ ...current, open: false })); showSuccess(body.idempotent ? "تم تأكيد السداد السابق دون تكراره" : "تم تسجيل السداد وتوزيعه على العقود")
        }).catch(error => toast({ title: error instanceof Error ? error.message : "تعذر تسجيل السداد", variant: "destructive" }))
        return
      }
      toast({ title: "اختر فاتورة أو عقداً واحداً على الأقل وحدد مبلغ السداد", variant: "destructive" })
      return
    }
    if (dialog.record) {
      updateMutation.mutate({ id: dialog.record.id, data: { status, payload } }, { onSuccess: () => { invalidate(); setDialog(current => ({ ...current, open: false })); showSuccess("تم تحديث السجل") }, onError: error => toast({ title: error instanceof Error ? error.message : "تعذر تحديث السجل", variant: "destructive" }) })
    } else {
      createMutation.mutate({ data }, {
        onSuccess: created => {
          invalidate()
          setDialog(current => ({ ...current, open: false }))
          if (dialog.kind === "invoice" && created?.id) {
            showSuccess("تم إنشاء الفاتورة بنجاح، جارٍ فتحها")
             navigate(`/admin/container-system/invoice/${created.id}/details`)
          } else {
            showSuccess("تمت إضافة السجل")
          }
        },
        onError: error => toast({ title: error instanceof Error ? error.message : "تعذر إضافة السجل", variant: "destructive" }),
      })
    }
  }
  const submitContract = (payload: Record<string, unknown>) => {
    if (contractFlowBusy) return
    setContractFlowBusy(true)
    const { appointmentDate, appointmentTime, appointmentType, ...contractPayload } = payload
    const scheduledAt = `${String(appointmentDate)}T${String(appointmentTime)}:00`
    const contractNumber = String(contractPayload.contractNumber ?? "")
    contractWorkflowMutation.mutate({
      data: {
        operationKey: crypto.randomUUID(),
        contract: contractPayload,
        assignment: {
          siteRecordId: contractPayload.siteRecordId,
          containerRecordId: contractPayload.containerRecordId,
          contractNumber,
          assignmentStatus: "reserved",
          startDate: contractPayload.startDate,
          endDate: contractPayload.endDate,
          containerCode: contractPayload.containerCode,
          customerRecordId: contractPayload.customerRecordId,
          notes: "تم الإنشاء تلقائياً من معالج العقد",
        },
        appointment: {
          contractNumber,
          customerRecordId: contractPayload.customerRecordId,
          customerName: contractPayload.customerName,
          containerRecordId: contractPayload.containerRecordId,
          containerCode: contractPayload.containerCode,
          appointmentType,
          appointmentDate,
          appointmentTime,
          scheduledAt,
          source: "contract_workflow",
        },
        serviceRequest: {
          requestId: contractPayload.requestId ?? null,
          clientName: contractPayload.customerName,
          phone: contractPayload.customerPhone,
          email: contractPayload.customerEmail,
          serviceType: appointmentType === "pickup" ? "استرجاع حاوية" : appointmentType === "inspection" ? "فحص وتجهيز حاوية" : "تسليم حاوية",
          containerSize: contractPayload.containerCode,
          location: contractPayload.location ?? "يحدد لاحقًا",
          duration: contractPayload.duration ?? "",
          notes: contractPayload.notes ?? "",
          appointmentType: "scheduled",
          scheduledAt,
        },
      },
    }, {
      onSuccess: result => {
        invalidate()
        setContractWizardOpen(false)
        setContractFlowBusy(false)
        showSuccess((result as { invoice?: unknown } | undefined)?.invoice
          ? "تم إنشاء العقد والفاتورة الأولى تلقائياً مع الموعد وأمر العمل"
          : "تم إصدار العقد وإنشاء الموعد وأمر العمل وربطهما بالأصل")
        const contractId = (result as { contract?: { id?: number } } | undefined)?.contract?.id
        if (contractId) navigate(`/admin/container-system/contract/${contractId}/print`)
      },
      onError: error => {
        setContractFlowBusy(false)
        toast({ title: error instanceof Error ? error.message : "تعذر إنشاء دورة العقد كاملة", variant: "destructive" })
      },
    })
  }
  const submitAssignment = (payload: Record<string, unknown>) => {
    createMutation.mutate({ data: { kind: "container_assignment", status: "reserved", payload } }, {
      onSuccess: () => { invalidate(); setAssignmentWizardOpen(false); showSuccess("تم تخصيص الأصل وربطه بالعقد والموقع") },
      onError: error => toast({ title: error instanceof Error ? error.message : "تعذر حفظ التخصيص", variant: "destructive" }),
    })
  }
  const saveSettings = (payload: Record<string, unknown>) => {
    if (payload.section === "organization") {
      const values = payload as Record<string, string>
      const updates = {
        company_name: (values["اسم المؤسسة"] ?? "").trim(),
        company_name_en: values["الاسم بالإنجليزية"] ?? "",
        company_phone_call: values["الجوال"] ?? "",
        company_email: values["البريد الإلكتروني"] ?? "",
        company_address: values["العنوان بالإنجليزية"] ?? "",
        company_logo: values["الشعار"] ?? "",
        company_latitude: values.Latitude ?? "",
        company_longitude: values.Longitude ?? "",
      }
      void fetch(`${API_BASE}/api/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}` },
        body: JSON.stringify(updates),
      }).then(response => {
        if (!response.ok) throw new Error("settings")
        void snapshotQuery.refetch()
        showSuccess("تم حفظ بيانات المؤسسة وربطها بالعقود")
      }).catch(() => toast({ title: "تعذر حفظ بيانات المؤسسة", variant: "destructive" }))
      return
    }
    const existing = (snapshot?.records ?? []).find(record => record.kind === "setting" && record.payload.section === payload.section)
    if (existing) {
      updateMutation.mutate({ id: existing.id, data: { status: "active", payload } }, { onSuccess: () => { invalidate(); showSuccess("تم حفظ الإعدادات") }, onError: () => toast({ title: "تعذر حفظ الإعدادات", variant: "destructive" }) })
    } else {
      createMutation.mutate({ data: { kind: "setting", status: "active", payload } }, { onSuccess: () => { invalidate(); showSuccess("تم حفظ الإعدادات") }, onError: () => toast({ title: "تعذر حفظ الإعدادات", variant: "destructive" }) })
    }
  }
  const contractAction = (record: ContainerSystemRecord, action: string) => {
    if (action === "settle") {
      setView("settlements")
      setSearch(String(record.payload.customerName ?? record.reference ?? ""))
      setDetailRecord(null)
      showSuccess("تم فتح شاشة التسوية الآمنة؛ سجّل الدفعة من كشف العقد")
      return
    }
    if (action === "debt" || action === "close") {
      toast({
        title: action === "debt"
          ? "تحويل العقد إلى مديونية يتم من خلال قيد مالي مرحّل"
          : "إغلاق العقد يتطلب إكمال دورة التسليم والاسترجاع والتسوية",
        description: "لم يتم تغيير حالة العقد حتى لا ينفصل العقد عن كشف الحساب والقيود المالية.",
        variant: "destructive",
      })
      return
    }
    const now = new Date().toISOString()
    if (["deliver", "return", "approve", "reject"].includes(action)) {
      void fetch(`${API_BASE}/api/admin/container-system/contracts/${record.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}` },
        body: JSON.stringify({ action, location: record.payload.location ?? "" }),
      }).then(async response => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(String(body.error ?? "تعذر تنفيذ حركة العقد"))
        invalidate()
        setDetailRecord(null)
        showSuccess(body.idempotent ? "تم تأكيد الحركة السابقة دون تكرارها" : action === "deliver" ? "تم التسليم وتحديث الأصل والحركة والتدقيق" : action === "return" ? "تم الاسترجاع وتحديث الأصل والحركة والتدقيق" : action === "approve" ? "تم اعتماد العقد وتسجيل أثر الاعتماد" : "تم رفض العقد وتسجيل السبب في التدقيق")
      }).catch(error => toast({ title: error instanceof Error ? error.message : "تعذر تنفيذ حركة العقد", variant: "destructive" }))
      return
    }
    const payload = { ...record.payload, [`${action}At`]: now, lifecycleAction: action }
    updateMutation.mutate({ id: record.id, data: { status, payload } }, {
      onSuccess: updated => {
        invalidate()
        setDetailRecord(null)
        showSuccess(`تم ${action === "deliver" ? "تسجيل التسليم" : action === "return" ? "تسجيل الاسترجاع" : action === "settle" ? "تصفية العقد" : action === "debt" ? "تحويل العقد إلى مديونية" : "إغلاق العقد"}`)
        const containerCode = String(updated.payload.containerCode ?? "")
        if (containerCode && (action === "deliver" || action === "return")) {
          createMutation.mutate(
            { data: { kind: "container_movement", status: "posted", payload: { contractNumber: updated.payload.contractNumber ?? updated.reference, containerCode, movementType: action === "deliver" ? "تسليم" : "استرجاع", movementDate: now, location: updated.payload.location ?? "" } } },
            {
              onSuccess: () => {
                invalidate()
                showSuccess(action === "deliver" ? "تم تحديث حالة الحاوية إلى مؤجرة" : "تم تحديث حالة الحاوية إلى متاحة")
              },
              onError: error => {
                invalidate()
                toast({ title: error instanceof Error ? error.message : "تم تحديث العقد ولم تتم مزامنة حالة الحاوية", variant: "destructive" })
              },
            },
          )
        }
      },
      onError: () => toast({ title: "تعذر تحديث دورة العقد", variant: "destructive" }),
    })
  }
  const busy = createMutation.isPending || updateMutation.isPending || contractFlowBusy
  const loading = snapshotQuery.isLoading || (isCollection && recordsQuery.isLoading)
  const error = snapshotQuery.isError || (isCollection && recordsQuery.isError)

  return (
    <div className="container-system min-h-[calc(100dvh-4rem)] space-y-5" dir="rtl">
      <div className="relative overflow-hidden rounded-[1.65rem] bg-[#123d4e] px-5 py-6 text-white shadow-[0_16px_42px_rgba(18,61,78,.18)] sm:px-8 sm:py-8">
        <div className="absolute -left-14 -top-20 h-56 w-56 rounded-full border border-cyan-200/15" /><div className="absolute -left-2 -top-9 h-32 w-32 rounded-full border border-cyan-200/15" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="mb-3 flex items-center gap-2 text-xs font-bold text-cyan-200"><span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_0_5px_rgba(252,211,77,.13)]" /> مركز العمليات · نظام الحاويات الكامل</div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">مرحباً بك في غرفة التحكم</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-cyan-100/70">إدارة العقود، الأصول، الأسطول، التحصيل والتنبيهات من لوحة واحدة واضحة.</p></div>
          <div className="flex flex-wrap gap-2"><Button onClick={() => openCreate()} className="gap-2 bg-amber-400 text-slate-900 hover:bg-amber-300" data-testid="button-header-add"><Plus size={16} /> إضافة سجل</Button><Button onClick={() => { snapshotQuery.refetch(); recordsQuery.refetch() }} variant="outline" className="gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10" data-testid="button-refresh-container-system"><RefreshCw size={15} className={snapshotQuery.isFetching ? "animate-spin" : ""} /> تحديث</Button></div>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="order-2 lg:order-1">
          <ContainerSidebar view={view} onSelect={nextView => { setView(nextView); setSearch(""); if (nextView !== "reports") setReportId(null) }} />
        </aside>
        <main className="order-1 min-w-0 space-y-5 lg:order-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold text-cyan-700">نظام الحاويات الكامل / {viewLabel(view)}</p><h2 className="mt-1 text-xl font-black text-slate-900">{viewLabel(view)}</h2></div>{(isCollection || view === "container_search") && <div className="relative w-full sm:w-80"><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="رقم الحاوية أو اسم العميل أو الجوال" className="h-10 border-slate-200 bg-white pr-9" data-testid="input-search-container-records" />{search && <button type="button" onClick={() => setSearch("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" data-testid="button-clear-container-search"><X size={15} /></button>}</div>}</div>
          {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800" role="status" data-testid="status-container-success"><CheckCircle2 size={17} /> {notice}</div>}
          {error ? <Card className="border-rose-200 bg-rose-50/50"><CardContent className="flex flex-col items-center gap-3 p-12 text-center"><AlertCircle size={27} className="text-rose-500" /><h3 className="font-bold text-rose-900">تعذر تحميل بيانات النظام</h3><p className="text-sm text-rose-700">تحقق من الاتصال ثم حاول مرة أخرى.</p><Button onClick={() => { snapshotQuery.refetch(); recordsQuery.refetch() }} variant="outline" className="gap-2 border-rose-200 bg-white text-rose-800" data-testid="button-retry-container-system"><RefreshCw size={15} /> إعادة المحاولة</Button></CardContent></Card>
               : view === "overview" ? <Overview snapshot={snapshot} records={records} onAdd={openCreate} onOpen={setDetailRecord} onAssign={record => { setDetailRecord(null); setAssignmentContainerId(record.id); setAssignmentWizardOpen(true) }} />
               : view === "financial_center" ? <FinancialControlCenter records={snapshot?.records ?? records} onAdd={kind => openCreate(kind)} onNavigate={nextView => { setView(nextView); setSearch(""); if (nextView !== "reports") setReportId(null) }} />
              : view === "reports" ? reportId ? <ReportPage reportId={reportId} records={snapshot?.records ?? records} onBack={() => setReportId(null)} /> : <ReportsHub onOpen={setReportId} />
               : view === "settlements" ? <ContractSettlementWorkspace records={snapshot?.records ?? records} initialCustomerId={requestedCustomerId} initialContractId={requestedContractId} />
              : view === "financial_cycle" ? <FinancialCycleWorkspace records={snapshot?.records ?? records} onAdd={openCreate} onOpenSettlements={() => { setView("settlements"); setSearch("") }} />
              : view === "system_settings" ? <SettingsPage records={snapshot?.records ?? records} organization={organization} onSave={saveSettings} />
             : view === "audit" ? <AuditLog audits={auditQuery.data ?? []} loading={auditQuery.isLoading} />
              : view === "container_search" ? <ContainerSearchPanel records={records} loading={loading} onDetails={openRecordDetails} onEdit={openEdit} />
              : view === "bookings" ? <DispatchCalendar records={snapshot?.records ?? records} onOpenAppointment={openRecordDetails} />
              : view === "invoice"
                ? <InvoiceWorkspace records={records} onAdd={() => openCreate("invoice")} onDetails={record => navigate(`/admin/container-system/invoice/${record.id}/details`)} onEdit={openEdit} onArchive={archiveRecord} />
              : view === "container"
               ? <ContainerPOS records={records} onAdd={() => openCreate("container")} onDetails={openRecordDetails} onEdit={openEdit} />
                : <RecordsPanel kind={collectionKind ?? "customer"} records={records} allRecords={snapshot?.records ?? records} loading={loading} onAdd={() => openCreate(collectionKind ?? "customer")} onDetails={openRecordDetails} onEdit={openEdit} onArchive={archiveRecord} />}
        </main>
      </div>
      <RecordDetails record={detailRecord} allRecords={snapshot?.records ?? records} serviceRequests={serviceRequestsQuery.data ?? []} open={Boolean(detailRecord)} onOpenChange={open => { if (!open) setDetailRecord(null) }} onContractAction={contractAction} />
      <ContractWizard open={contractWizardOpen} records={snapshot?.records ?? records} initialCustomerId={requestedCustomerId} initialRequest={requestContext} busy={busy} onClose={() => { if (!contractFlowBusy) setContractWizardOpen(false) }} onSubmit={submitContract} />
       <ContainerAssignmentWizard open={assignmentWizardOpen} records={snapshot?.records ?? records} initialContainerId={assignmentContainerId} busy={createMutation.isPending} onClose={() => { if (!createMutation.isPending) { setAssignmentWizardOpen(false); setAssignmentContainerId(null) } }} onSubmit={submitAssignment} />
      <RecordDialog
        open={dialog.open}
        kind={dialog.kind}
        record={dialog.record}
        serviceRequests={serviceRequestsQuery.data ?? []}
        initialPayload={
          dialog.kind === "invoice" && requestContext
            ? invoicePayloadFromRequest(requestContext, snapshot?.records ?? records)
            : dialog.kind === "customer_site" && requestedCustomerId
              ? { customerRecordId: String(requestedCustomerId) }
              : undefined
        }
        records={snapshot?.records ?? records}
        busy={busy}
        onOpenChange={open => setDialog(current => ({ ...current, open }))}
        onSubmit={submitRecord}
      />
      {archiveMutation.isPending && <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl" data-testid="status-archive-loading"><Loader2 size={14} className="animate-spin" /> جارٍ أرشفة السجل...</div>}
    </div>
  )
}