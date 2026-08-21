import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarClock, ChevronLeft, ChevronRight, ClipboardList, FileDown, FileText, MapPin, Printer, Save, Search, Settings2, Truck, UserRound } from "lucide-react"
import { getGetAdminWorkOrdersQueryKey, useGetAdminWorkOrders, type ContainerSystemRecord, type ServiceRequest } from "@workspace/api-client-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Link } from "wouter"
import { amountOf, KIND_LABELS, RecordKind } from "./ContainerSystemComponents"

export type ReportId =
  | "general" | "daily_totals" | "other_revenue" | "receipt" | "expense_voucher"
  | "customer_ledger" | "customer_debt" | "deferred_rentals" | "cash_customers"
  | "rentals" | "contracts" | "trip_followup" | "contract_payments"
  | "unloading" | "withdrawals" | "commissions" | "cash_sales" | "notifications"
  | "cash_rental_returns" | "payment_returns" | "general_expenses" | "truck_expenses"
  | "inventory" | "stock_issue" | "stock_issue_returns" | "item_purchases"
  | "general_purchases" | "purchase_returns"

export const REPORTS: { id: ReportId; title: string; group: string; description: string; kinds: string[]; filters: string[]; columns: string[] }[] = [
  { id: "general", title: "التقرير العام", group: "التقارير العامة والمالية", description: "ملخص الإيرادات الأخرى خلال فترة محددة مع السائق أو المشرف والعمولة والملاحظات والتاريخ.", kinds: ["other_revenue", "receipt"], filters: ["السائق / المشرف", "الفترة الزمنية"], columns: ["السائق / المشرف", "القيمة", "العمولة", "الملاحظات", "التاريخ"] },
  { id: "daily_totals", title: "الإجماليات اليومية", group: "التقارير العامة والمالية", description: "ملخص العمليات المالية اليومية وصافي النتائج.", kinds: ["receipt", "payment", "expense", "daily_expense", "fuel_expense"], filters: ["الفترة الزمنية"], columns: ["التاريخ", "المبيعات", "الإيجارات الآجلة", "المرتجعات", "التسديدات", "المصروفات", "صافي النتائج"] },
  { id: "other_revenue", title: "الإيرادات الأخرى", group: "التقارير العامة والمالية", description: "الإيرادات الأخرى المسجلة مع البحث برقم الإيراد وتحديد الفترة الزمنية.", kinds: ["other_revenue"], filters: ["رقم الإيراد", "الفترة الزمنية"], columns: ["رقم الإيراد", "السائق / المشرف", "القيمة", "العمولة", "التاريخ", "الملاحظات"] },
  { id: "receipt", title: "تقرير سند القبض", group: "سندات القبض والصرف", description: "البحث حسب العميل والخزينة ورقم السند والفترة مع إمكانية الطباعة.", kinds: ["receipt"], filters: ["العميل", "الخزينة", "رقم سند القبض", "الفترة الزمنية"], columns: ["رقم السند", "العميل", "نوع العميل", "تاريخ التسجيل", "الخزينة", "القيمة"] },
  { id: "expense_voucher", title: "تقرير سند الصرف", group: "سندات القبض والصرف", description: "تفاصيل سندات الصرف والقيم المسجلة حسب العميل والخزينة ورقم السند والفترة.", kinds: ["expense"], filters: ["العميل", "الخزينة", "رقم سند الصرف", "الفترة الزمنية"], columns: ["رقم السند", "العميل", "الخزينة", "التاريخ", "القيمة", "الملاحظات"] },
  { id: "customer_ledger", title: "حساب نقلات العميل", group: "تقارير العملاء", description: "تفاصيل عمليات العميل خلال فترة محددة مع الطباعة والتصدير إلى Excel وPDF.", kinds: ["contract_line", "container_movement", "payment"], filters: ["اسم العميل", "رقم الهاتف", "رقم العميل", "الفترة الزمنية"], columns: ["التاريخ", "العميل", "رقم الإيصال والفاتورة", "رقم العملية", "رقم الحاوية", "قيمة الرحلة", "السائق", "رقم العقد", "نوع الخدمة"] },
  { id: "customer_debt", title: "مديونية عميل", group: "تقارير العملاء", description: "مديونية العملاء مع التفصيل حسب عقود أو إيجارات ونوع العميل.", kinds: ["contract", "contract_line", "payment"], filters: ["العميل", "نوع المديونية", "نوع العميل", "الفترة الزمنية"], columns: ["العقد / الفاتورة", "العميل", "المبلغ", "الضريبة", "الإجمالي", "المدفوع", "المتبقي"] },
  { id: "deferred_rentals", title: "الإيجارات الآجلة", group: "تقارير العملاء", description: "الإيجارات الآجلة والمبالغ المستحقة والمدفوعة والمتبقية.", kinds: ["contract_line", "contract"], filters: ["العميل", "رقم الفاتورة", "نوع العميل", "الفترة الزمنية"], columns: ["رقم الفاتورة", "العميل", "الإجمالي", "المدفوع", "المتبقي", "التاريخ"] },
  { id: "cash_customers", title: "نشاط عملاء النقدي", group: "تقارير العملاء", description: "نشاط العملاء النقدي وعدد الإيجارات والفرع.", kinds: ["customer", "contract_line"], filters: ["اسم العميل", "رقم الهاتف", "الفرع", "الفترة الزمنية"], columns: ["رقم هاتف العميل", "اسم العميل", "عدد الإيجارات", "الفرع"] },
  { id: "rentals", title: "تقرير الإيجارات", group: "تقارير الإيجارات والعقود", description: "عمليات الإيجار مع إجماليات النقدي والعقود والإجمالي.", kinds: ["contract_line"], filters: ["الفرع", "نوع المبيعات", "نوع التاريخ", "السائق", "الوسيط", "رقم العقد", "العميل", "نوع العميل", "الفترة الزمنية"], columns: ["الفاتورة", "الإيجار", "العميل", "الحاوية", "السائق", "الوسيط", "الإجمالي", "نوع الإيجار"] },
  { id: "contracts", title: "تقرير العقود", group: "تقارير الإيجارات والعقود", description: "العقود وحالتها ومدتها والمدفوع والمتبقي وعدد الرحلات.", kinds: ["contract"], filters: ["العميل", "نوع العميل", "رقم العقد", "حالة العقد", "نوع العقد", "الفترة الزمنية"], columns: ["رقم العقد", "العميل", "مدة التعاقد", "بداية العقد", "نهاية العقد", "الإجمالي", "المدفوع", "المتبقي", "حالة العقد"] },
  { id: "trip_followup", title: "متابعة عدد الرحلات", group: "تقارير الإيجارات والعقود", description: "متابعة الرحلات حسب التصنيف والعميل وحالة الإيجار.", kinds: ["contract_line", "container_movement"], filters: ["التصنيف", "العميل", "حالة الإيجار", "الفترة الزمنية"], columns: ["العميل", "الحاوية", "السائق", "رقم العملية", "عدد الرحلات", "الإجمالي"] },
  { id: "contract_payments", title: "تسديدات العقود", group: "تقارير الإيجارات والعقود", description: "تسديدات العقود مع طريقة الدفع وإمكانية تسجيل المرتجع.", kinds: ["payment"], filters: ["العميل", "نوع العميل", "الفترة الزمنية"], columns: ["العميل", "تاريخ السداد", "طريقة الدفع", "رقم الفاتورة", "الإجمالي", "رقم العقد", "الملاحظات", "الموظف"] },
  { id: "unloading", title: "تقرير التفريغ", group: "تقارير التشغيل والحاويات", description: "عمليات تفريغ الحاويات وعمولات السائقين والتفريغ الدوري والنهائي.", kinds: ["container_movement"], filters: ["الحاوية", "العميل", "نوع العميل", "نوع التفريغ", "الفترة الزمنية"], columns: ["رقم الحاوية", "العميل", "العقد / الفاتورة", "نوع التفريغ", "السائق", "العمولة", "المشرف", "الإيصال", "التاريخ", "الملاحظات"] },
  { id: "withdrawals", title: "تقرير السحب", group: "تقارير التشغيل والحاويات", description: "عمليات سحب الحاويات وحالة التفريغ.", kinds: ["container_movement"], filters: ["الحاوية", "العميل", "السائق", "حالة التفريغ", "الفترة الزمنية"], columns: ["الحاوية", "العميل", "العقد / الفاتورة", "السائق", "العمولة", "المشرف", "تاريخ السحب", "حالة التفريغ", "الملاحظات"] },
  { id: "commissions", title: "العمولات والبدلات", group: "تقارير التشغيل والحاويات", description: "مستحقات السائقين والمشرفين والعمولات غير المدفوعة.", kinds: ["commission", "container_movement"], filters: ["السائق / المشرف", "الفترة الزمنية", "حالة الدفع"], columns: ["النقدي", "العقود", "التفريغ", "السحب", "أخرى", "الإجمالي", "غير المدفوع"] },
  { id: "cash_sales", title: "مبيعات النقدي", group: "تقارير المبيعات والإشعارات", description: "فواتير المبيعات النقدية والمرتجعات وصافي المبيعات.", kinds: ["invoice", "contract_line"], filters: ["الفرع", "العميل", "نوع العميل", "طريقة الدفع", "السائق", "الحاوية", "الفترة الزمنية"], columns: ["الفاتورة", "العميل", "القيمة", "الصافي", "المدفوع", "الخزينة", "المرتجعات", "الإشعارات"] },
  { id: "notifications", title: "تقرير الإشعارات", group: "تقارير المبيعات والإشعارات", description: "الإشعارات الدائنة والمدينة المرتبطة بالعملاء.", kinds: ["notification"], filters: ["الفرع", "العميل", "نوع الإشعار", "الفترة الزمنية"], columns: ["رقم الإشعار", "العميل", "النوع", "القيمة", "التاريخ", "الملاحظات"] },
  { id: "cash_rental_returns", title: "مرتجع الإيجار النقدي", group: "تقارير المبيعات والإشعارات", description: "مرتجعات الإيجارات النقدية مع الرجوع إلى الفاتورة الأصلية.", kinds: ["invoice_return"], filters: ["الفاتورة الأصلية", "العميل", "الحاوية", "نوع المبيعات", "طريقة الدفع", "الفترة الزمنية"], columns: ["الفاتورة", "الفاتورة الأصلية", "العميل", "الحاوية", "القيمة", "طريقة الدفع", "التاريخ"] },
  { id: "payment_returns", title: "مرتجع التسديدات", group: "تقارير المبيعات والإشعارات", description: "مرتجعات تسديدات العملاء والفاتورة الأصلية والخزينة.", kinds: ["payment_return"], filters: ["الفاتورة", "العميل", "العقد", "الخزينة", "طريقة الدفع", "الفترة الزمنية"], columns: ["الفاتورة", "العميل", "تاريخ السداد", "طريقة الدفع", "القيمة", "العقد", "الخزينة", "الفاتورة الأصلية"] },
  { id: "general_expenses", title: "المصروفات العامة", group: "تقارير المصروفات", description: "المصروفات العامة حسب النوع والرقم والموظف والفترة.", kinds: ["daily_expense", "expense"], filters: ["نوع المصروف", "رقم المصروف", "الموظف", "الفترة الزمنية"], columns: ["رقم المصروف", "نوع المصروف", "الموظف", "القيمة", "التاريخ", "الملاحظات"] },
  { id: "truck_expenses", title: "مصروفات الشاحنة", group: "تقارير المصروفات", description: "مصروفات السيارات والشاحنات.", kinds: ["fuel_expense", "maintenance"], filters: ["رقم المصروف", "نوع المصروف", "رقم السيارة", "الفترة الزمنية"], columns: ["رقم المصروف", "نوع المصروف", "رقم السيارة", "القيمة", "التاريخ", "الملاحظات"] },
  { id: "inventory", title: "تقرير المخزون", group: "تقارير المخزون والمشتريات", description: "رصيد الأصناف داخل المستودعات والمخازن.", kinds: ["category", "warehouse"], filters: ["المخزن", "الصنف"], columns: ["المخزن", "الصنف", "السعر", "الكمية الحالية", "السعر الإجمالي"] },
  { id: "stock_issue", title: "تقرير الصرف", group: "تقارير المخزون والمشتريات", description: "عمليات صرف الأصناف من المخازن.", kinds: ["stock_issue"], filters: ["المخزن", "الصنف", "الموظف", "الشاحنة", "المستخدم", "الفترة الزمنية"], columns: ["المخزن", "الصنف", "الكمية", "الجهة", "المستخدم", "التاريخ"] },
  { id: "stock_issue_returns", title: "مرتجع الصرف", group: "تقارير المخزون والمشتريات", description: "عمليات مرتجع صرف الأصناف.", kinds: ["stock_issue_return"], filters: ["المخزن", "الصنف", "الموظف", "الشاحنة", "المستخدم", "الفترة الزمنية"], columns: ["المخزن", "الصنف", "الشاحنة", "الكمية", "المستخدم", "التاريخ"] },
  { id: "item_purchases", title: "مشتريات الأصناف", group: "تقارير المخزون والمشتريات", description: "تفاصيل مشتريات الأصناف وسجل التغييرات.", kinds: ["purchase"], filters: ["المخزن", "الصنف", "المستخدم", "الفترة الزمنية"], columns: ["المخزن", "الصنف", "السعر", "الكمية", "السعر الإجمالي", "المستخدم", "الفاتورة", "التاريخ"] },
  { id: "general_purchases", title: "المشتريات العامة", group: "تقارير المخزون والمشتريات", description: "المشتريات العامة مع العرض والتعديل والحذف والرجوع.", kinds: ["purchase"], filters: ["المخزن", "المستخدم", "الفترة الزمنية"], columns: ["المخزن", "الإجمالي", "المستخدم", "التاريخ", "سجل التغييرات"] },
  { id: "purchase_returns", title: "مرتجع المشتريات", group: "تقارير المخزون والمشتريات", description: "مرتجع المشتريات ورقم الفاتورة والمخزن والإجمالي.", kinds: ["purchase_return"], filters: ["رقم الفاتورة", "المخزن", "المستخدم", "الفترة الزمنية"], columns: ["رقم الفاتورة", "المخزن", "الإجمالي", "المستخدم", "التاريخ"] },
]

const valueFor = (record: ContainerSystemRecord, label: string) => {
  const p = record.payload as Record<string, unknown>
  const normalized = label.replaceAll(" ", "").replaceAll("/", "")
  const candidates = Object.entries(p).filter(([key]) => key.replaceAll(" ", "").replaceAll("/", "").includes(normalized.slice(0, 4)))
  return String(candidates[0]?.[1] ?? p.name ?? p.reference ?? record.reference ?? "—")
}

function exportRows(title: string, columns: string[], records: ContainerSystemRecord[]) {
  const rows = [columns, ...records.map(record => columns.map(column => valueFor(record, column)))]
  const csv = "\uFEFF" + rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a"); link.href = url; link.download = `${title}.csv`; link.click(); URL.revokeObjectURL(url)
}

export function ReportsHub({ onOpen }: { onOpen: (id: ReportId) => void }) {
  const groups = [...new Set(REPORTS.map(report => report.group))]
  return <div className="space-y-5">{groups.map(group => <section key={group}><h3 className="mb-3 text-base font-black text-slate-900">{group}</h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{REPORTS.filter(report => report.group === group).map(report => <button key={report.id} type="button" onClick={() => onOpen(report.id)} className="rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800"><FileText size={18} /></span><span><b className="block text-sm text-slate-800">{report.title}</b><span className="mt-1 block text-xs leading-6 text-slate-500">{report.description}</span></span></div></button>)}</div></section>)}</div>
}

export function ReportPage({ reportId, records, onBack }: { reportId: ReportId; records: ContainerSystemRecord[]; onBack: () => void }) {
  const report = REPORTS.find(item => item.id === reportId) ?? REPORTS[0]
  const [query, setQuery] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const filtered = useMemo(() => records.filter(record => {
    if (!report.kinds.includes(record.kind)) return false
    const date = String(record.payload.date ?? record.payload.startDate ?? record.createdAt).slice(0, 10)
    const haystack = JSON.stringify(record.payload).toLowerCase()
    return (!from || date >= from) && (!to || date <= to) && (!query || haystack.includes(query.toLowerCase()))
  }), [from, query, records, report.kinds, to])
  const total = filtered.reduce((sum, record) => sum + amountOf(record), 0)
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><Button variant="ghost" onClick={onBack} className="mb-2 gap-2 px-0 text-cyan-800"><ArrowRight size={16} /> كل التقارير</Button><h3 className="text-xl font-black text-slate-900">{report.title}</h3><p className="mt-1 text-xs leading-6 text-slate-500">{report.description}</p></div><div className="flex gap-2"><Button onClick={() => window.print()} variant="outline" className="gap-2"><Printer size={15} /> طباعة</Button><Button onClick={() => exportRows(report.title, report.columns, filtered)} variant="outline" className="gap-2 border-cyan-200 text-cyan-800"><FileDown size={15} /> Excel</Button></div></div>
    <Card><CardContent className="flex flex-wrap items-end gap-3 p-4"><div className="min-w-52 flex-1"><label className="mb-1 block text-xs font-bold text-slate-500">بحث داخل التقرير</label><div className="relative"><Search size={15} className="absolute right-3 top-2.5 text-slate-400" /><Input value={query} onChange={event => setQuery(event.target.value)} className="pr-9" placeholder="اسم العميل أو الرقم أو الحاوية" /></div></div><div><label className="mb-1 block text-xs font-bold text-slate-500">من</label><Input type="date" value={from} onChange={event => setFrom(event.target.value)} /></div><div><label className="mb-1 block text-xs font-bold text-slate-500">إلى</label><Input type="date" value={to} onChange={event => setTo(event.target.value)} /></div>{report.filters.map(filter => <Badge key={filter} variant="outline" className="mb-1 border-cyan-200 bg-cyan-50 text-cyan-800">{filter}</Badge>)}</CardContent></Card>
    <div className="grid gap-3 sm:grid-cols-3"><Card><CardContent className="p-4"><p className="text-xs text-slate-500">عدد السجلات</p><b className="mt-1 block text-2xl">{filtered.length}</b></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-slate-500">الإجمالي</p><b className="mt-1 block text-2xl text-cyan-800">{total.toLocaleString("ar-SA")} ر.س</b></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-slate-500">أنواع السجلات المرتبطة</p><b className="mt-1 block text-sm">{report.kinds.map(kind => KIND_LABELS[kind as RecordKind] ?? kind).join("، ")}</b></CardContent></Card></div>
    <Card className="overflow-hidden"><CardHeader className="border-b bg-slate-50/60"><CardTitle className="text-base">بيانات {report.title}</CardTitle></CardHeader><CardContent className="overflow-x-auto p-0"><table className="min-w-[900px] w-full text-right text-xs"><thead><tr className="border-b bg-slate-50 text-slate-500">{report.columns.map(column => <th key={column} className="whitespace-nowrap px-4 py-3 font-black">{column}</th>)}</tr></thead><tbody>{filtered.length === 0 ? <tr><td colSpan={report.columns.length} className="p-12 text-center text-slate-500">لا توجد بيانات مطابقة للفلاتر الحالية.</td></tr> : filtered.map(record => <tr key={record.id} className="border-b last:border-0 hover:bg-cyan-50/30">{report.columns.map(column => <td key={column} className="whitespace-nowrap px-4 py-3 text-slate-700">{valueFor(record, column)}</td>)}</tr>)}</tbody></table></CardContent></Card>
  </div>
}

type DispatchCalendarProps = {
  records: ContainerSystemRecord[]
  onOpenAppointment: (record: ContainerSystemRecord) => void
}

const dispatchStatus: Record<string, { label: string; className: string }> = {
  scheduled: { label: "مجدول", className: "border-sky-200 bg-sky-50 text-sky-800" },
  assigned: { label: "بانتظار قبول السائق", className: "border-amber-200 bg-amber-50 text-amber-800" },
  accepted: { label: "مقبول", className: "border-indigo-200 bg-indigo-50 text-indigo-800" },
  started: { label: "قيد التنفيذ", className: "border-violet-200 bg-violet-50 text-violet-800" },
  completed: { label: "مكتمل", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  rejected: { label: "مرفوض", className: "border-rose-200 bg-rose-50 text-rose-800" },
}

function dateKey(value: unknown) {
  const date = new Date(String(value ?? ""))
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : ""
}

function displayDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" })
}

function appointmentPayload(record: ContainerSystemRecord) {
  return record.payload as Record<string, unknown>
}

function workOrderFor(appointment: ContainerSystemRecord, workOrders: ServiceRequest[]) {
  const payload = appointmentPayload(appointment)
  const contractId = String(payload.contractRecordId ?? "")
  const requestId = String(payload.requestId ?? "")
  const containerId = String(payload.containerRecordId ?? "")
  return workOrders.find(order => {
    const item = order as ServiceRequest & { contractRecordId?: number | null; containerRecordId?: number | null; customerRecordId?: number | null }
    return (requestId && String(order.id) === requestId)
      || (contractId && String(item.contractRecordId ?? "") === contractId)
      || (containerId && String(item.containerRecordId ?? "") === containerId)
      || (String(order.scheduledAt ?? "") === String(payload.scheduledAt ?? ""))
  })
}

export function DispatchCalendar({ records, onOpenAppointment }: DispatchCalendarProps) {
  const workOrdersQuery = useGetAdminWorkOrders({ query: { queryKey: getGetAdminWorkOrdersQueryKey(), staleTime: 30_000 } })
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date().toISOString()))
  const [mode, setMode] = useState<"day" | "week">("day")
  const appointments = useMemo(() => records.filter(record => record.kind === "appointment" && record.status !== "archived"), [records])
  const workOrders = workOrdersQuery.data ?? []
  const selected = new Date(`${selectedDate}T12:00:00`)
  const dates = useMemo(() => Array.from({ length: mode === "day" ? 1 : 7 }, (_, index) => {
    const date = new Date(selected)
    if (mode === "week") date.setDate(selected.getDate() - ((selected.getDay() + 6) % 7) + index)
    return dateKey(date.toISOString())
  }), [mode, selectedDate])
  const events = useMemo(() => dates.map(date => ({
    date,
    items: appointments
      .filter(record => dateKey(appointmentPayload(record).scheduledAt ?? appointmentPayload(record).appointmentDate) === date)
      .sort((a, b) => String(appointmentPayload(a).appointmentTime ?? "").localeCompare(String(appointmentPayload(b).appointmentTime ?? ""))),
  })), [appointments, dates])
  const allDayCount = events.reduce((sum, group) => sum + group.items.length, 0)

  const moveDate = (days: number) => {
    const next = new Date(`${selectedDate}T12:00:00`)
    next.setDate(next.getDate() + days)
    setSelectedDate(dateKey(next.toISOString()))
  }

  return (
    <div className="space-y-5" data-testid="dispatch-calendar">
      <Card className="overflow-hidden border-slate-200/80 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800"><CalendarClock size={21} /></div>
              <div>
                <CardTitle className="text-base text-slate-900">تقويم التشغيل اليومي</CardTitle>
                <p className="mt-1 text-xs leading-6 text-slate-500">المواعيد المرتبطة بالعقود وأوامر العمل الفعلية، مع حالة السائق والأصل في نفس الشاشة.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(dateKey(new Date().toISOString()))}>اليوم</Button>
              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                <button type="button" onClick={() => setMode("day")} className={`rounded-md px-3 py-1.5 text-xs font-bold ${mode === "day" ? "bg-cyan-800 text-white" : "text-slate-500"}`}>يومي</button>
                <button type="button" onClick={() => setMode("week")} className={`rounded-md px-3 py-1.5 text-xs font-bold ${mode === "week" ? "bg-cyan-800 text-white" : "text-slate-500"}`}>أسبوعي</button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="ghost" size="icon" onClick={() => moveDate(mode === "day" ? -1 : -7)} aria-label="الفترة السابقة"><ChevronRight size={18} /></Button>
            <div className="text-center">
              <p className="text-sm font-black text-slate-900">{mode === "day" ? displayDate(selectedDate) : `أسبوع يبدأ ${displayDate(dates[0])}`}</p>
              <p className="mt-1 text-[11px] text-slate-400">{allDayCount} موعداً في الفترة المحددة</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => moveDate(mode === "day" ? 1 : 7)} aria-label="الفترة التالية"><ChevronLeft size={18} /></Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {workOrdersQuery.isError && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">تعذر تحميل حالات أوامر العمل؛ ستظهر المواعيد دون حالة السائق.</div>}
          {allDayCount === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
              <CalendarClock size={28} className="text-slate-300" />
              <p className="mt-3 font-bold text-slate-700">لا توجد مواعيد في هذه الفترة</p>
              <p className="mt-1 text-xs text-slate-500">أنشئ عقداً بموعد مجدول أو راجع الفترة التالية.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {events.map(group => (
                <section key={group.date} data-testid={`dispatch-day-${group.date}`}>
                  {mode === "week" && <div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-600" /><h3 className="text-sm font-black text-slate-800">{displayDate(group.date)}</h3><span className="text-[11px] text-slate-400">{group.items.length} موعد</span></div>}
                  <div className="space-y-3">
                    {group.items.map(appointment => {
                      const payload = appointmentPayload(appointment)
                      const order = workOrderFor(appointment, workOrders)
                      const status = dispatchStatus[order?.driverStatus ?? appointment.status] ?? { label: appointment.status, className: "border-slate-200 bg-slate-50 text-slate-700" }
                      return (
                        <article key={appointment.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-200 hover:shadow-md" data-testid={`dispatch-event-${appointment.id}`}>
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                            <div className="flex shrink-0 items-center gap-3 xl:w-36 xl:border-l xl:border-slate-100 xl:pl-4">
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800"><CalendarClock size={19} /></div>
                              <div><p className="text-lg font-black text-slate-900" dir="ltr">{String(payload.appointmentTime ?? "—")}</p><p className="text-[10px] text-slate-400">{String(payload.appointmentType ?? "موعد تشغيل")}</p></div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-900">{String(payload.customerName ?? "عميل غير محدد")}</h3><Badge variant="outline" className={status.className}>{status.label}</Badge></div>
                              <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
                                <span className="flex min-w-0 items-center gap-1.5"><MapPin size={14} className="shrink-0 text-slate-400" /><span className="truncate">{String(payload.location ?? "الموقع غير محدد")}</span></span>
                                <span className="flex items-center gap-1.5"><ClipboardList size={14} className="shrink-0 text-slate-400" /> العقد {String(payload.contractNumber ?? "—")}</span>
                                <span className="flex items-center gap-1.5"><Truck size={14} className="shrink-0 text-slate-400" /> الحاوية {String(payload.containerCode ?? "—")}</span>
                                <span className="flex items-center gap-1.5"><UserRound size={14} className="shrink-0 text-slate-400" /> {order?.assignedDriverName ?? "لم يُسند سائق"}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <Button variant="outline" size="sm" onClick={() => onOpenAppointment(appointment)} className="gap-1.5 text-cyan-800">تفاصيل الموعد <ArrowLeft size={14} /></Button>
                              <Link href="/admin/work-orders" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"><ClipboardList size={14} /> أوامر العمل</Link>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const settingSections = [
  { id: "branches", title: "الفروع", fields: ["اسم الفرع", "العنوان", "الشعار", "خط الطول Longitude", "خط العرض Latitude"] },
  { id: "users", title: "المستخدمون والصلاحيات", fields: ["الاسم", "اسم المستخدم", "البريد الإلكتروني", "الفرع", "رؤية الفروع", "اختبار صلاحية الفروع"] },
  { id: "permissions", title: "صلاحيات المستخدم التفصيلية", fields: ["الفواتير و ZATCA", "إعدادات الضرائب والمؤسسة", "الأصناف والمخزون", "الإعدادات وإعادة الضبط", "الإيجارات والعقود", "الإيرادات والتسديدات", "التقارير", "الحاويات والعمليات", "الخزائن والتحويلات", "الرواتب والسلف", "الشاحنات والصيانة", "الفروع والمستخدمون", "المواعيد", "الموظفون", "المصروفات"] },
  { id: "expenses", title: "تعريف المصروفات اليومية", fields: ["اسم المصروف", "نوع المصروف", "المبلغ", "التصنيف", "وحدة القياس", "نوع التصنيف"] },
  { id: "container-types", title: "تصنيفات الحاويات وأحجامها", fields: ["التصنيف", "وحدة القياس", "نوع التصنيف", "الحجم", "السعر"] },
  { id: "containers", title: "إعدادات الحاويات", fields: ["رقم الحاوية", "التصنيف", "حجم الحاوية", "الفرع", "حالة الحاوية"] },
  { id: "employees", title: "الموظفون", fields: ["اسم الموظف", "الوظيفة", "الفرع", "رقم الإقامة", "تاريخ انتهاء الإقامة", "الراتب", "تاريخ انتهاء الرخصة", "تاريخ انتهاء التأمين الطبي", "تاريخ انتهاء جواز السفر", "كارت السائق"] },
  { id: "customers", title: "العملاء", fields: ["اسم العميل", "نوع العميل", "الفرع", "رقم الجوال", "رقم جوال آخر", "العنوان", "المدينة", "الرقم البريدي", "الحد الائتماني", "الرقم الضريبي", "النشاط", "رقم السجل"] },
  { id: "organization", title: "بيانات المؤسسة", fields: ["اسم المؤسسة", "الاسم بالإنجليزية", "الجوال", "البريد الإلكتروني", "العنوان بالإنجليزية", "الشعار", "Latitude", "Longitude"] },
  { id: "printing", title: "إعدادات الطباعة", fields: ["حجم خط الطباعة", "نوع الطباعة", "إظهار الشعار", "إظهار بيانات المؤسسة", "حجم الورق", "طباعة الفاتورة تلقائيًا"] },
  { id: "taxes", title: "إعدادات الضرائب", fields: ["اسم الضريبة", "نسبة الضريبة", "الرقم الضريبي", "حالة الضريبة", "تطبيق الضريبة على العقود", "تطبيق الضريبة على الإيجارات"] },
  { id: "notifications", title: "التنبيهات", fields: ["تنبيه تأخر السداد", "تنبيه انتهاء الاستمارة", "تنبيه انتهاء التأمين", "تنبيه غيار الزيت", "تنبيه انتهاء الإقامة", "تنبيه المخزون المنخفض"] },
  { id: "operation", title: "إعدادات المؤسسة والتشغيل", fields: ["مراحل العقد", "إعدادات العمولات", "الوسيط", "تفعيل الموظفين في المصروفات", "ترقيم العقود", "ترقيم التفريغ", "إيصالات التسليم", "نظام المواعيد", "تبديل الحاويات", "الإيجار المتعدد", "تفعيل رقم العميل", "تفعيل موقع الإيجار", "الشاحنة مطلوبة في الإيجار", "تفعيل العقود المفتوحة", "تفعيل حد ائتمان العميل", "السماح بسحب الحاويات قبل تفريغها", "تفعيل نوع عملية التفريغ", "إغلاق العقود التلقائي"] },
]

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
const toggleSettingFields = new Set([
  "إظهار الشعار", "إظهار بيانات المؤسسة", "طباعة الفاتورة تلقائيًا",
  "حالة الضريبة", "تطبيق الضريبة على العقود", "تطبيق الضريبة على الإيجارات",
  "تنبيه تأخر السداد", "تنبيه انتهاء الاستمارة", "تنبيه انتهاء التأمين",
  "تنبيه غيار الزيت", "تنبيه انتهاء الإقامة", "تنبيه المخزون المنخفض",
  "إعدادات العمولات", "الوسيط", "تفعيل الموظفين في المصروفات", "إيصالات التسليم",
  "نظام المواعيد", "تبديل الحاويات", "الإيجار المتعدد", "تفعيل رقم العميل",
  "تفعيل موقع الإيجار", "الشاحنة مطلوبة في الإيجار", "تفعيل العقود المفتوحة",
  "تفعيل حد ائتمان العميل", "السماح بسحب الحاويات قبل تفريغها",
  "تفعيل نوع عملية التفريغ", "إغلاق العقود التلقائي",
])
const selectSettingOptions: Record<string, string[]> = {
  "نوع الطباعة": ["عام", "حسب المستخدم"],
  "حجم الورق": ["A4", "A5", "حراري 80mm"],
  "مراحل العقد": ["مرحلة واحدة", "تعدد المراحل"],
  "ترقيم العقود": ["تلقائي", "يدوي"],
  "ترقيم التفريغ": ["تلقائي", "يدوي"],
}
const organizationSettingKeys: Record<string, string> = {
  "اسم المؤسسة": "company_name",
  "الاسم بالإنجليزية": "company_name_en",
  "الجوال": "company_phone_call",
  "البريد الإلكتروني": "company_email",
  "العنوان بالإنجليزية": "company_address",
  "الشعار": "company_logo",
  Latitude: "company_latitude",
  Longitude: "company_longitude",
}

export function SettingsPage({
  records,
  organization,
  onSave,
}: {
  records: ContainerSystemRecord[]
  organization?: Record<string, unknown>
  onSave: (payload: Record<string, unknown>) => void
}) {
  const [section, setSection] = useState("organization")
  const config = settingSections.find(item => item.id === section) ?? settingSections[0]
  const [values, setValues] = useState<Record<string, string>>({})
  const existing = records.find(record => record.kind === "setting" && record.payload.section === section)
  const valueFor = (field: string) => values[field] ?? String(existing?.payload[field] ?? "")
  const isEnabled = (field: string) => ["true", "1", "yes", "نعم", "نشط", "مفعل"].includes(valueFor(field).toLowerCase())
  const toggle = (field: string) => setValues(current => ({ ...current, [field]: isEnabled(field) ? "false" : "true" }))
  useEffect(() => {
    setValues({})
    if (section !== "organization") return
    const organizationValues = Object.fromEntries(Object.entries(organizationSettingKeys).map(([label, key]) => {
      const organizationKey = ({
        company_name: "name",
        company_name_en: "englishName",
        company_phone_call: "phone",
        company_email: "email",
        company_address: "address",
        company_logo: "logo",
        company_latitude: "latitude",
        company_longitude: "longitude",
      } as Record<string, string>)[key] ?? key
      return [label, String(organization?.[organizationKey] ?? "")]
    }))
    if (Object.values(organizationValues).some(Boolean)) setValues(organizationValues)
    void fetch(`${API_BASE}/api/settings?ts=${Date.now()}`, { cache: "no-store" })
      .then(response => response.ok ? response.json() as Promise<Record<string, string>> : {})
      .then(data => {
        const settings = data as Record<string, string>
        setValues(Object.fromEntries(Object.entries(organizationSettingKeys).map(([label, key]) => [label, settings[key] ?? ""])))
      })
      .catch(() => undefined)
  }, [organization, section])
  return <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]"><Card className="h-fit"><CardContent className="space-y-1 p-2">{settingSections.map(item => <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`w-full rounded-xl px-3 py-3 text-right text-xs font-bold ${section === item.id ? "bg-cyan-50 text-cyan-900" : "text-slate-500 hover:bg-slate-50"}`}><Settings2 size={14} className="ml-2 inline" />{item.title}</button>)}</CardContent></Card><Card><CardHeader className="border-b"><CardTitle>{config.title}</CardTitle><p className="text-xs text-slate-500">كل قاعدة هنا محفوظة في سجل إعدادات قابل للتدقيق، وتؤثر على مسارات التشغيل المرتبطة بها.</p></CardHeader><CardContent className="grid gap-4 p-5 sm:grid-cols-2">{config.fields.map(field => {
    const options = selectSettingOptions[field]
    const currentValue = valueFor(field)
    return <div key={field} className={toggleSettingFields.has(field) ? "flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3" : ""}>
      <label className="block text-xs font-bold text-slate-600">{field}</label>
      {toggleSettingFields.has(field) ? <button type="button" role="switch" aria-checked={isEnabled(field)} onClick={() => toggle(field)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${isEnabled(field) ? "bg-emerald-600" : "bg-slate-300"}`} data-testid={`toggle-setting-${section}-${field}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${isEnabled(field) ? "right-1" : "right-6"}`} /></button>
        : options ? <select value={currentValue} onChange={event => setValues(current => ({ ...current, [field]: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" data-testid={`select-setting-${section}-${field}`}>{options.map(option => <option key={option} value={option}>{option}</option>)}</select>
        : <Input type={field.includes("حجم خط") ? "number" : "text"} value={currentValue} onChange={event => setValues(current => ({ ...current, [field]: event.target.value }))} placeholder={`أدخل ${field}`} />}
    </div>
  })}<div className="sm:col-span-2 flex justify-end"><Button onClick={() => onSave({ section, sectionTitle: config.title, ...values })} className="gap-2 bg-cyan-800 hover:bg-cyan-900"><Save size={16} /> حفظ إعدادات {config.title}</Button></div></CardContent></Card></div>
}