import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link } from "wouter"
import {
  AlertCircle, Archive, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BellRing, BookOpenCheck, Box, CalendarDays, CarFront, CheckCircle2,
  ChevronDown, ChevronLeft, ClipboardList, Coins, FileCheck2, FileDown, FilePenLine, FileText, FolderSearch, Gauge, HandCoins, Landmark, LayoutDashboard, ReceiptText, Truck,
  Loader2, Plus, RefreshCw, Search, Settings2, ShieldCheck, SlidersHorizontal, UserCog, UserRound, Users, Wrench, X,
} from "lucide-react"
import {
  getGetContainerSystemAuditQueryKey,
  getGetContainerSystemQueryKey,
  getGetContainerSystemRecordsQueryKey,
  useArchiveContainerSystemRecord,
  useCreateContainerSystemRecord,
  useGetContainerSystem,
  useGetContainerSystemAudit,
  useGetContainerSystemRecords,
  useUpdateContainerSystemRecord,
} from "@workspace/api-client-react"
import type { ContainerSystemRecord } from "@workspace/api-client-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  FIELD_CONFIG, KIND_ICONS, KIND_LABELS, RecordDialog, RecordKind, RecordStatus, amountOf, formatAuditAction, formatRecordDate, formatStatus,
} from "./ContainerSystemComponents"
import { ReportsHub, ReportPage, SettingsPage, REPORTS, ReportId } from "./ContainerSystemSpecialPages"

type ViewKey =
  | "overview" | RecordKind | "reports" | "audit" | "container_search"
  | "rental" | "vouchers" | "operations" | "customer_payments" | "bookings"
  | "expenses" | "payroll" | "fleet" | "warehouses" | "system_settings" | "contracts_list"
type NavItem = { key?: ViewKey; href?: string; label: string; icon: typeof LayoutDashboard }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "الرئيسية",
    items: [{ key: "overview" as ViewKey, label: "الرئيسية", icon: LayoutDashboard }],
  },
  {
    label: "العقود والإيجارات",
    items: [
      { key: "contract" as ViewKey, label: "تسجيل تعاقد", icon: FileCheck2 },
      { key: "rental" as ViewKey, label: "تسجيل إيجار حاوية", icon: ReceiptText },
      { key: "container_search" as ViewKey, label: "البحث عن حاوية", icon: FolderSearch },
      { key: "container" as ViewKey, label: "الحاويات", icon: Box },
      { key: "container_type" as ViewKey, label: "أنواع الحاويات", icon: SlidersHorizontal },
      { key: "contract_line" as ViewKey, label: "بنود العقود", icon: ClipboardList },
      { key: "contracts_list" as ViewKey, label: "العقود", icon: FileText },
    ],
  },
  {
    label: "التبديل والتفريغ",
    items: [
      { key: "operations" as ViewKey, label: "التبديل والتفريغ", icon: ArrowLeftRight },
      { key: "bookings" as ViewKey, label: "المواعيد والحجوزات", icon: CalendarDays },
    ],
  },
  {
    label: "سندات القبض والصرف",
    items: [
      { key: "vouchers" as ViewKey, label: "سندات القبض والصرف", icon: HandCoins },
      { key: "receipt" as ViewKey, label: "سندات القبض", icon: HandCoins },
      { key: "expense" as ViewKey, label: "سندات الصرف", icon: ArrowDownLeft },
      { key: "deposit" as ViewKey, label: "الإيداعات البنكية", icon: Landmark },
      { key: "treasury" as ViewKey, label: "الخزائن", icon: Landmark },
    ],
  },
  {
    label: "سداد العملاء",
    items: [
      { key: "customer_payments" as ViewKey, label: "سداد العملاء", icon: Coins },
      { key: "ledger_entry" as ViewKey, label: "كشف مديونية العملاء", icon: FileText },
    ],
  },
  {
    label: "الإيرادات والمصروفات",
    items: [
      { key: "expenses" as ViewKey, label: "الإيرادات والمصروفات", icon: ArrowDownLeft },
      { key: "daily_expense" as ViewKey, label: "المصروفات العامة", icon: ArrowDownLeft },
      { key: "fuel_expense" as ViewKey, label: "مصروفات الشاحنات", icon: CarFront },
    ],
  },
  {
    label: "التقارير",
    items: [
      { key: "reports" as ViewKey, label: "التقارير", icon: ArrowUpRight },
    ],
  },
  {
    label: "الرواتب والسلف",
    items: [
      { key: "payroll" as ViewKey, label: "الرواتب والسلف", icon: Coins },
      { key: "salary_advance" as ViewKey, label: "السلف", icon: Coins },
      { key: "salary_payment" as ViewKey, label: "الرواتب", icon: Coins },
    ],
  },
  {
    label: "الشاحنات",
    items: [
      { key: "fleet" as ViewKey, label: "أسطول الشاحنات", icon: Truck },
      { key: "vehicle" as ViewKey, label: "الشاحنات", icon: Truck },
      { key: "maintenance" as ViewKey, label: "الصيانة", icon: Wrench },
      { key: "permit" as ViewKey, label: "التصاريح", icon: FileCheck2 },
      { key: "oil_change" as ViewKey, label: "غيار الزيت والعدادات", icon: Gauge },
      { key: "driver" as ViewKey, label: "السائقون", icon: UserRound },
    ],
  },
  {
    label: "المستودعات والمخازن",
    items: [
      { key: "warehouses" as ViewKey, label: "المستودعات والمخازن", icon: Box },
      { key: "warehouse" as ViewKey, label: "إدارة المخازن", icon: Box },
      { key: "category" as ViewKey, label: "الأصناف", icon: SlidersHorizontal },
      { key: "category_size" as ViewKey, label: "أحجام الأصناف", icon: SlidersHorizontal },
    ],
  },
  {
    label: "العملاء",
    items: [
      { key: "customer" as ViewKey, label: "العملاء", icon: Users },
    ],
  },
  {
    label: "الموظفون",
    items: [
      { key: "employee" as ViewKey, label: "الموظفون", icon: Users },
      { key: "commission" as ViewKey, label: "العمولات", icon: Coins },
      { key: "branch" as ViewKey, label: "الفروع", icon: Landmark },
    ],
  },
  {
    label: "المستخدمون والصلاحيات",
    items: [
      { href: "/admin/employees", label: "المستخدمون والصلاحيات", icon: UserCog },
    ],
  },
  {
    label: "الإعدادات",
    items: [
      { key: "system_settings" as ViewKey, label: "إعدادات النظام والتشغيل", icon: Settings2 },
      { key: "setting" as ViewKey, label: "الإعدادات", icon: Settings2 },
      { key: "tax" as ViewKey, label: "الضرائب", icon: FileCheck2 },
    ],
  },
  {
    label: "سجل التدقيق",
    items: [
      { key: "audit" as ViewKey, label: "سجل التدقيق", icon: BookOpenCheck },
    ],
  },
  {
    label: "مراجع التشغيل",
    items: [
      { key: "alert" as ViewKey, label: "التنبيهات اليومية", icon: BellRing },
      { key: "invoice" as ViewKey, label: "الفواتير", icon: FileText },
      { key: "invoice_return" as ViewKey, label: "مرتجعات الفواتير", icon: Archive },
      { key: "transfer" as ViewKey, label: "التحويل بين الخزائن", icon: ArrowUpRight },
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
  : view === "container_search" ? "البحث عن حاوية"
  : view === "reports" ? "التقارير الشاملة"
  : view === "audit" ? "سجل التدقيق"
  : view === "rental" ? "تسجيل إيجار حاوية"
  : view === "vouchers" ? "سندات القبض والصرف"
  : view === "operations" ? "التبديل والتفريغ"
  : view === "customer_payments" ? "سداد العملاء"
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
    Object.fromEntries(NAV_GROUPS.map(group => [group.label, ["الرئيسية", "العقود والإيجارات"].includes(group.label)])),
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

function RecordRow({ record, kind, onDetails, onEdit, onArchive }: { record: ContainerSystemRecord; kind: RecordKind; onDetails: () => void; onEdit: () => void; onArchive: () => void }) {
  const fields = FIELD_CONFIG[kind].slice(0, 4)
  const primary = String(record.payload[fields[0]?.key] ?? record.reference ?? `#${record.id}`)
  return (
    <div className="group grid grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto] items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-0 hover:bg-cyan-50/30 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,1fr)_auto]" data-testid={`row-record-${record.id}`}>
      <div className="min-w-0">
        <p className="truncate font-bold text-slate-800" data-testid={`text-record-primary-${record.id}`}>{primary}</p>
        <p className="mt-0.5 text-[11px] font-mono text-slate-400" dir="ltr">{record.reference || `#${record.id}`}</p>
      </div>
      <div className="hidden min-w-0 gap-2 sm:grid sm:grid-cols-2">
        {fields.slice(1, 3).map(field => <div key={field.key} className="min-w-0"><p className="text-[10px] text-slate-400">{field.label}</p><p className="truncate text-xs text-slate-700">{String(record.payload[field.key] ?? "—")}</p></div>)}
      </div>
      <div className="hidden sm:block"><RecordStatus status={record.status} /><p className="mt-1 text-[10px] text-slate-400">{formatRecordDate(record.updatedAt)}</p></div>
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={onDetails} className="h-8 gap-1 text-xs text-cyan-800 hover:bg-cyan-50" data-testid={`button-details-record-${record.id}`}><FileText size={14} /> <span className="hidden md:inline">التفاصيل</span></Button>
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 gap-1 text-xs text-slate-500 hover:bg-cyan-50 hover:text-cyan-800" data-testid={`button-edit-record-${record.id}`}><FilePenLine size={14} /> <span className="hidden md:inline">تعديل</span></Button>
        <Button variant="ghost" size="icon" onClick={onArchive} className="h-8 w-8 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="أرشفة السجل" data-testid={`button-archive-record-${record.id}`}><Archive size={14} /></Button>
      </div>
    </div>
  )
}

function RecordsPanel({ kind, records, loading, onAdd, onDetails, onEdit, onArchive }: { kind: RecordKind; records: ContainerSystemRecord[]; loading: boolean; onAdd: () => void; onDetails: (record: ContainerSystemRecord) => void; onEdit: (record: ContainerSystemRecord) => void; onArchive: (record: ContainerSystemRecord) => void }) {
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
            {records.map(record => <RecordRow key={record.id} record={record} kind={kind} onDetails={() => onDetails(record)} onEdit={() => onEdit(record)} onArchive={() => onArchive(record)} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ContainerPOS({ records, onDetails, onEdit, onAdd }: { records: ContainerSystemRecord[]; onDetails: (record: ContainerSystemRecord) => void; onEdit: (record: ContainerSystemRecord) => void; onAdd: () => void }) {
  const imageFor = (record: ContainerSystemRecord, index: number) => String(record.payload.imageUrl ?? record.payload.image ?? `/uploads/container-${(index % 4) + 1}.jpeg`)
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
              <div className="relative h-36 bg-slate-100"><img src={imageFor(record, index)} alt={`صورة ${code}`} className="h-full w-full object-cover" onError={event => { event.currentTarget.src = "/uploads/container-1.jpeg" }} /><div className="absolute right-3 top-3"><RecordStatus status={record.status} /></div><div className="absolute bottom-3 left-3 rounded-lg bg-slate-950/70 px-2 py-1 text-xs font-bold text-white" dir="ltr">{code}</div></div>
              <div className="space-y-3 p-4"><div><p className="font-black text-slate-900">{String(payload.typeName ?? payload.containerType ?? "حاوية تشغيلية")}</p><p className="mt-1 text-xs text-slate-500">{String(payload.size ?? payload.capacity ?? "الحجم غير محدد")}</p></div><div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-slate-50 p-2"><span className="block text-[10px] text-slate-400">الموقع</span><span className="mt-1 block truncate font-bold text-slate-700">{location}</span></div><div className="rounded-xl bg-slate-50 p-2"><span className="block text-[10px] text-slate-400">العميل / التفريغ</span><span className="mt-1 block truncate font-bold text-slate-700">{nextEmptying || customer}</span></div></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => onDetails(record)} className="flex-1 gap-1 text-xs text-cyan-800"><FileText size={14} /> التفاصيل</Button><Button variant="outline" size="sm" onClick={() => onEdit(record)} className="gap-1 text-xs"><FilePenLine size={14} /> تعديل</Button></div></div>
            </div>
          })}
        </div>}
      </CardContent>
    </Card>
  )
}

function Overview({ snapshot, records, onAdd }: { snapshot?: any; records: ContainerSystemRecord[]; onAdd: (kind: RecordKind) => void }) {
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

function RecordDetails({ record, allRecords, open, onOpenChange, onContractAction }: { record?: ContainerSystemRecord | null; allRecords: ContainerSystemRecord[]; open: boolean; onOpenChange: (open: boolean) => void; onContractAction: (record: ContainerSystemRecord, action: string) => void }) {
  if (!record) return null
  const entries = Object.entries(record.payload).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  const customerName = String(record.payload.name ?? record.payload.customerName ?? "")
  const customerRecords = allRecords.filter(item => {
    const payload = item.payload as Record<string, unknown>
    return String(payload.customerName ?? "") === customerName || String(payload.customerRecordId ?? "") === String(record.id)
  })
  const customerContracts = customerRecords.filter(item => item.kind === "contract")
  const customerPayments = customerRecords.filter(item => ["payment", "receipt"].includes(item.kind)).reduce((sum, item) => sum + amountOf(item), 0)
  const customerCharges = customerContracts.reduce((sum, item) => sum + Number(item.payload.total ?? item.payload.amount ?? 0), 0)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[85vh] max-w-3xl overflow-y-auto border-cyan-100">
        <DialogHeader className="text-right">
          <DialogTitle className="text-xl text-slate-900">{KIND_LABELS[record.kind as RecordKind] ?? "تفاصيل السجل"}</DialogTitle>
          <DialogDescription>{record.reference || `سجل رقم ${record.id}`} · آخر تحديث {formatRecordDate(record.updatedAt)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">الحالة</p><div className="mt-1"><RecordStatus status={record.status} /></div></div>
          {entries.map(([key, value]) => <div key={key} className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-[11px] text-slate-500">{FIELD_CONFIG[record.kind as RecordKind]?.find(field => field.key === key)?.label ?? key}</p><p className="mt-1 break-words text-sm font-bold text-slate-800">{String(value)}</p></div>)}
        </div>
          {record.kind === "customer" && <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4"><h4 className="mb-3 text-sm font-black text-emerald-950">ملف العميل وكشف الحساب</h4><div className="grid grid-cols-3 gap-2"><div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-500">العقود</p><p className="mt-1 text-lg font-black text-slate-900">{customerContracts.length}</p></div><div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-500">إجمالي المطالبات</p><p className="mt-1 text-lg font-black text-slate-900">{customerCharges.toLocaleString("ar-SA")} ر.س</p></div><div className="rounded-xl bg-white p-3"><p className="text-[10px] text-slate-500">المدفوع</p><p className="mt-1 text-lg font-black text-emerald-700">{customerPayments.toLocaleString("ar-SA")} ر.س</p></div></div><div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-black text-rose-700">الرصيد المستحق: {Math.max(customerCharges - customerPayments, 0).toLocaleString("ar-SA")} ر.س</div></div>}
          {record.kind === "contract" && <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4"><h4 className="mb-3 text-sm font-black text-amber-950">دورة العقد</h4><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => onContractAction(record, "deliver")} className="bg-cyan-800 hover:bg-cyan-900">تسجيل التسليم</Button><Button size="sm" variant="outline" onClick={() => onContractAction(record, "return")} className="border-cyan-200 text-cyan-900">تسجيل الاسترجاع</Button><Button size="sm" variant="outline" onClick={() => onContractAction(record, "settle")} className="border-emerald-200 text-emerald-800">تصفية العقد</Button><Button size="sm" variant="outline" onClick={() => onContractAction(record, "debt")} className="border-rose-200 text-rose-700">تحويل لمديونية</Button><Button size="sm" variant="outline" onClick={() => onContractAction(record, "close")} className="border-slate-200 text-slate-700">إغلاق العقد</Button></div></div>}
      </DialogContent>
    </Dialog>
  )
}

function ContainerSearchPanel({ records, loading, onDetails, onEdit }: { records: ContainerSystemRecord[]; loading: boolean; onDetails: (record: ContainerSystemRecord) => void; onEdit: (record: ContainerSystemRecord) => void }) {
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
        {loading ? <div className="space-y-2 p-4">{[1, 2, 3].map(index => <SkeletonLine key={index} className="h-16" />)}</div> : records.length === 0 ? (
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
              {records.map(record => {
                const payload = record.payload as Record<string, unknown>
                const code = String(payload.containerCode ?? payload.assetCode ?? payload.code ?? record.reference ?? `#${record.id}`)
                return <div key={record.id} className="grid grid-cols-[1.1fr_1.2fr_1.2fr_1fr_1fr_auto] items-center gap-3 border-t border-slate-100 px-4 py-3.5 text-xs hover:bg-cyan-50/30" data-testid={`row-container-search-${record.id}`}>
                  <button type="button" onClick={() => onDetails(record)} className="truncate text-right font-black text-cyan-900 hover:underline" dir="ltr">{code}</button>
                  <span className="truncate font-bold text-slate-700">{String(payload.customerName ?? payload.name ?? "—")}</span>
                  <span className="truncate text-slate-500" dir="ltr">{String(payload.customerPhone ?? payload.phone ?? "—")}</span>
                  <span className="text-slate-500">{String(payload.startDate ?? payload.rentalStartDate ?? "—")}</span>
                  <span className="text-slate-500">{String(payload.endDate ?? payload.rentalEndDate ?? "—")}</span>
                  <div className="flex items-center gap-1.5"><RecordStatus status={record.status} /><Button type="button" variant="ghost" size="icon" onClick={() => onEdit(record)} className="h-8 w-8 text-slate-400 hover:bg-cyan-50 hover:text-cyan-800" title="تعديل السجل"><FilePenLine size={14} /></Button></div>
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
  const [view, setView] = useState<ViewKey>("overview")
  const [search, setSearch] = useState("")
  const [dialog, setDialog] = useState<{ open: boolean; kind: RecordKind; record?: ContainerSystemRecord | null }>({ open: false, kind: "customer" })
  const [detailRecord, setDetailRecord] = useState<ContainerSystemRecord | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reportId, setReportId] = useState<ReportId | null>(null)
  const collectionKind = viewKind[view] ?? (allKinds.includes(view as RecordKind) ? view as RecordKind : undefined)
  const isCollection = Boolean(collectionKind)
  const filterParams = useMemo(() => ({ kind: collectionKind, search: search.trim() || undefined }), [collectionKind, search])
  const snapshotQuery = useGetContainerSystem()
  const recordsQuery = useGetContainerSystemRecords(filterParams)
  const auditQuery = useGetContainerSystemAudit({ query: { enabled: view === "audit", queryKey: getGetContainerSystemAuditQueryKey() } })
  const createMutation = useCreateContainerSystemRecord()
  const updateMutation = useUpdateContainerSystemRecord()
  const archiveMutation = useArchiveContainerSystemRecord()
  const snapshot = snapshotQuery.data
  const records = useMemo(() => {
    const response = recordsQuery.data ?? []
    if (isCollection || search.trim()) return response
    return snapshot?.records ?? response
  }, [isCollection, recordsQuery.data, search, snapshot?.records])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetContainerSystemQueryKey() })
    queryClient.invalidateQueries({ queryKey: getGetContainerSystemRecordsQueryKey() })
    queryClient.invalidateQueries({ queryKey: getGetContainerSystemAuditQueryKey() })
  }
  const showSuccess = (message: string) => {
    setNotice(message)
    toast({ title: message })
    window.setTimeout(() => setNotice(null), 3500)
  }
  const openCreate = (kind: RecordKind = collectionKind ?? "customer") => setDialog({ open: true, kind, record: null })
  const openEdit = (record: ContainerSystemRecord) => setDialog({ open: true, kind: (record.kind as RecordKind) || "customer", record })
  const archiveRecord = (record: ContainerSystemRecord) => {
    if (!window.confirm(`هل تريد أرشفة السجل ${record.reference || `#${record.id}`}؟`)) return
    archiveMutation.mutate({ id: record.id }, { onSuccess: () => { invalidate(); showSuccess("تمت أرشفة السجل") }, onError: () => toast({ title: "تعذر أرشفة السجل", variant: "destructive" }) })
  }
  const submitRecord = (payload: Record<string, unknown>, status: string) => {
    const data = { kind: dialog.kind, status, payload }
    if (dialog.record) {
      updateMutation.mutate({ id: dialog.record.id, data: { status, payload } }, { onSuccess: () => { invalidate(); setDialog(current => ({ ...current, open: false })); showSuccess("تم تحديث السجل") }, onError: () => toast({ title: "تعذر تحديث السجل", variant: "destructive" }) })
    } else {
      createMutation.mutate({ data }, { onSuccess: () => { invalidate(); setDialog(current => ({ ...current, open: false })); showSuccess("تمت إضافة السجل") }, onError: () => toast({ title: "تعذر إضافة السجل", variant: "destructive" }) })
    }
  }
  const saveSettings = (payload: Record<string, unknown>) => {
    const existing = (snapshot?.records ?? []).find(record => record.kind === "setting" && record.payload.section === payload.section)
    if (existing) {
      updateMutation.mutate({ id: existing.id, data: { status: "active", payload } }, { onSuccess: () => { invalidate(); showSuccess("تم حفظ الإعدادات") }, onError: () => toast({ title: "تعذر حفظ الإعدادات", variant: "destructive" }) })
    } else {
      createMutation.mutate({ data: { kind: "setting", status: "active", payload } }, { onSuccess: () => { invalidate(); showSuccess("تم حفظ الإعدادات") }, onError: () => toast({ title: "تعذر حفظ الإعدادات", variant: "destructive" }) })
    }
  }
  const contractAction = (record: ContainerSystemRecord, action: string) => {
    const actionStatus: Record<string, string> = { deliver: "delivered", return: "returned", settle: "settled", debt: "delinquent", close: "closed" }
    const status = actionStatus[action] ?? record.status
    const now = new Date().toISOString()
    const payload = { ...record.payload, [`${action}At`]: now, lifecycleAction: action }
    updateMutation.mutate({ id: record.id, data: { status, payload } }, {
      onSuccess: updated => {
        invalidate()
        setDetailRecord(null)
        showSuccess(`تم ${action === "deliver" ? "تسجيل التسليم" : action === "return" ? "تسجيل الاسترجاع" : action === "settle" ? "تصفية العقد" : action === "debt" ? "تحويل العقد إلى مديونية" : "إغلاق العقد"}`)
        const containerCode = String(updated.payload.containerCode ?? "")
        if (containerCode && (action === "deliver" || action === "return")) {
          createMutation.mutate({ data: { kind: "container_movement", status: "posted", payload: { contractNumber: updated.payload.contractNumber ?? updated.reference, containerCode, movementType: action === "deliver" ? "تسليم" : "استرجاع", movementDate: now, location: updated.payload.location ?? "" } } })
        }
      },
      onError: () => toast({ title: "تعذر تحديث دورة العقد", variant: "destructive" }),
    })
  }
  const busy = createMutation.isPending || updateMutation.isPending
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
            : view === "overview" ? <Overview snapshot={snapshot} records={records} onAdd={openCreate} />
              : view === "reports" ? reportId ? <ReportPage reportId={reportId} records={snapshot?.records ?? records} onBack={() => setReportId(null)} /> : <ReportsHub onOpen={setReportId} />
              : view === "system_settings" ? <SettingsPage records={snapshot?.records ?? records} onSave={saveSettings} />
             : view === "audit" ? <AuditLog audits={auditQuery.data ?? []} loading={auditQuery.isLoading} />
              : view === "container_search" ? <ContainerSearchPanel records={records} loading={loading} onDetails={record => setDetailRecord(record)} onEdit={openEdit} />
             : view === "container"
               ? <ContainerPOS records={records} onAdd={() => openCreate("container")} onDetails={record => setDetailRecord(record)} onEdit={openEdit} />
                : <RecordsPanel kind={collectionKind ?? "customer"} records={records} loading={loading} onAdd={() => openCreate(collectionKind ?? "customer")} onDetails={record => setDetailRecord(record)} onEdit={openEdit} onArchive={archiveRecord} />}
        </main>
      </div>
      <RecordDetails record={detailRecord} allRecords={snapshot?.records ?? records} open={Boolean(detailRecord)} onOpenChange={open => { if (!open) setDetailRecord(null) }} onContractAction={contractAction} />
      <RecordDialog open={dialog.open} kind={dialog.kind} record={dialog.record} records={snapshot?.records ?? records} busy={busy} onOpenChange={open => setDialog(current => ({ ...current, open }))} onSubmit={submitRecord} />
      {archiveMutation.isPending && <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl" data-testid="status-archive-loading"><Loader2 size={14} className="animate-spin" /> جارٍ أرشفة السجل...</div>}
    </div>
  )
}