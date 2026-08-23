import { useMemo, useState } from "react"
import { AlertTriangle, ArrowDownLeft, ArrowLeftRight, Banknote, CheckCircle2, ClipboardCheck, FileCheck2, Landmark, Package, ReceiptText, RotateCcw, WalletCards } from "lucide-react"
import { getGetFinancialTruthQueryKey, useGetFinancialTruth, type ContainerSystemRecord } from "@workspace/api-client-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { RecordKind } from "./ContainerSystemComponents"

type CycleTab = "reconciliation" | "cash-close" | "notes" | "payroll" | "inventory"

const tabs: { id: CycleTab; label: string; icon: typeof Landmark }[] = [
  { id: "reconciliation", label: "المطابقة البنكية", icon: Landmark },
  { id: "cash-close", label: "إقفال الخزائن", icon: WalletCards },
  { id: "notes", label: "المرتجعات والمذكرات", icon: ReceiptText },
  { id: "payroll", label: "الرواتب والسلف", icon: Banknote },
  { id: "inventory", label: "المخزون والمشتريات", icon: Package },
]

function payload(record: ContainerSystemRecord) {
  return record.payload as Record<string, unknown>
}

function amount(record: ContainerSystemRecord) {
  return Number(payload(record).amount ?? payload(record).total ?? payload(record).value ?? 0) || 0
}

function collectionKey(record: ContainerSystemRecord) {
  const p = payload(record)
  return [
    p.customerRecordId ?? "",
    p.contractRecordId ?? p.contractNumber ?? "",
    p.invoiceRecordId ?? p.invoiceNumber ?? "",
    p.amount ?? "",
    p.date ?? "",
  ].join("|")
}

function postedCollections(records: ContainerSystemRecord[]) {
  const posted = records.filter(record => record.status === "posted" && ["payment", "receipt"].includes(record.kind))
  const payments = posted.filter(record => record.kind === "payment")
  const paymentKeys = new Set(payments.map(collectionKey))
  return [
    ...payments,
    ...posted.filter(record => {
      const p = payload(record)
      return record.kind === "receipt" && !paymentKeys.has(collectionKey(record)) && !p.sourcePaymentId
    }),
  ]
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("ar-SA")} ر.س`
}

function statusLabel(status: string) {
  return ({ draft: "مسودة", pending_approval: "بانتظار الاعتماد", approved: "معتمد", posted: "مرحّل", rejected: "مرفوض", cancelled: "ملغى" } as Record<string, string>)[status] ?? status
}

function statusTone(status: string) {
  return status === "posted" || status === "approved" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
    status === "rejected" || status === "cancelled" ? "bg-rose-50 text-rose-800 border-rose-200" :
      "bg-amber-50 text-amber-800 border-amber-200"
}

export function FinancialCycleWorkspace({
  records,
  onAdd,
  onOpenSettlements,
}: {
  records: ContainerSystemRecord[]
  onAdd: (kind: RecordKind) => void
  onOpenSettlements: () => void
}) {
  const [tab, setTab] = useState<CycleTab>("reconciliation")
  const [query, setQuery] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const active = records.filter(record => record.status !== "archived")
  const inPeriod = (record: ContainerSystemRecord) => {
    const p = payload(record)
    const date = String(p.date ?? p.paymentDate ?? p.issueDate ?? record.createdAt).slice(0, 10)
    return (!from || date >= from) && (!to || date <= to)
  }
  const scoped = active.filter(inPeriod)
  const financial = scoped.filter(record => ["receipt", "payment", "deposit", "bank_deposit", "invoice", "invoice_return", "payment_return", "treasury", "salary_advance", "salary_payment", "commission", "purchase", "purchase_return", "stock_issue", "stock_issue_return"].includes(record.kind))
  const search = query.trim().toLowerCase()
  const visible = useMemo(() => financial.filter(record => !search || `${record.reference} ${JSON.stringify(record.payload)}`.toLowerCase().includes(search)), [financial, search])
  const posted = scoped.filter(record => record.status === "posted")
  const receipts = postedCollections(scoped).reduce((sum, record) => sum + amount(record), 0) -
    posted.filter(record => record.kind === "payment_return").reduce((sum, record) => sum + amount(record), 0)
  const deposits = posted.filter(record => ["deposit", "bank_deposit"].includes(record.kind)).reduce((sum, record) => sum + amount(record), 0)
  const openReturns = posted.filter(record => ["invoice_return", "payment_return"].includes(record.kind))
  const payroll = posted.filter(record => ["salary_payment", "salary_advance", "commission"].includes(record.kind))
  const stock = posted.filter(record => ["purchase", "purchase_return", "stock_issue", "stock_issue_return"].includes(record.kind))
  const difference = deposits - receipts
  const periodTruthQuery = useGetFinancialTruth(
    { from: from || undefined, to: to || undefined },
    { query: { staleTime: 15_000, queryKey: getGetFinancialTruthQueryKey({ from: from || undefined, to: to || undefined }) } },
  )
  const truth = periodTruthQuery.data?.totals
  const reportedReceipts = truth?.netCollections ?? 0
  const reportedDeposits = truth?.deposits ?? 0

  const addAction = (kind: RecordKind, label: string) => <Button size="sm" onClick={() => onAdd(kind)} className="gap-2 bg-cyan-800 hover:bg-cyan-900"><ArrowDownLeft size={14} /> {label}</Button>

  return <div className="space-y-5">
    <div className="grid gap-3 md:grid-cols-5">
      {tabs.map(item => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`flex items-center gap-3 rounded-2xl border p-4 text-right transition ${tab === item.id ? "border-cyan-300 bg-cyan-50 text-cyan-950 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-cyan-200"}`}><Icon size={19} /><span className="text-xs font-black">{item.label}</span></button> })}
    </div>
     <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h3 className="text-lg font-black text-slate-900">{tabs.find(item => item.id === tab)?.label}</h3><p className="mt-1 text-xs text-slate-500">تشغيل مالي مستقل مع ربط كل حركة بمستندها وحالتها وسجل التدقيق.</p></div>
       <div className="flex flex-wrap items-center gap-2">
         <Input type="date" value={from} onChange={event => setFrom(event.target.value)} aria-label="من تاريخ" className="h-10 w-36 bg-white" />
         <Input type="date" value={to} onChange={event => setTo(event.target.value)} aria-label="إلى تاريخ" className="h-10 w-36 bg-white" />
         <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث في الرقم أو البيان..." className="h-10 bg-white sm:w-56" />
         {(from || to || query) && <Button size="sm" variant="ghost" onClick={() => { setFrom(""); setTo(""); setQuery("") }}>مسح</Button>}
       </div>
    </div>

    {tab === "reconciliation" && <div className="space-y-4">
       <div className="grid gap-3 md:grid-cols-3"><Card><CardContent className="p-4"><p className="text-xs text-slate-500">إجمالي المقبوضات</p><b className="mt-1 block text-xl text-emerald-700">{money(reportedReceipts)}</b></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-slate-500">الإيداعات البنكية</p><b className="mt-1 block text-xl text-indigo-700">{money(reportedDeposits)}</b></CardContent></Card><Card className={Math.abs(reportedDeposits - reportedReceipts) < .01 ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"}><CardContent className="p-4"><p className="text-xs text-slate-500">الفرق المطلوب تفسيره</p><b className="mt-1 block text-xl text-amber-700">{money(reportedDeposits - reportedReceipts)}</b></CardContent></Card></div>
     <Card><CardHeader className="flex-row items-center justify-between border-b"><div><CardTitle className="text-base">مطابقة جزئية ومتعددة</CardTitle><p className="mt-1 text-xs text-slate-500">وزّع سنداً واحداً على عدة عقود من شاشة التسويات، ثم سجّل الإيداع البنكي واربطه برقم المرجع.</p></div><div className="flex gap-2">{addAction("bank_deposit", "إضافة إيداع")}<Button size="sm" variant="outline" onClick={onOpenSettlements} className="gap-2"><ArrowLeftRight size={14} /> فتح التوزيع المتعدد</Button></div></CardHeader><CardContent className="p-4"><div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm">{Math.abs(reportedDeposits - reportedReceipts) < .01 ? <span className="font-bold text-emerald-700"><CheckCircle2 className="ml-2 inline" size={18} /> الأرصدة البنكية متطابقة</span> : <span className="font-bold text-amber-800"><AlertTriangle className="ml-2 inline" size={18} /> توجد مطابقة تحتاج مستنداً أو تفسيراً للفارق</span>}</div></CardContent></Card>
    </div>}

    {tab === "cash-close" && <div className="grid gap-4 lg:grid-cols-[1fr_20rem]"><Card><CardHeader className="flex-row items-center justify-between border-b"><div><CardTitle className="text-base">إقفال يومي للخزائن</CardTitle><p className="mt-1 text-xs text-slate-500">سجّل الرصيد الفعلي، الرصيد الدفتري، والفروقات مع اعتماد المدير.</p></div>{addAction("treasury", "إقفال خزينة")}</CardHeader><CardContent className="p-4"><RecordTable records={visible.filter(record => record.kind === "treasury")} empty="لم تُسجل إقفالات خزائن بعد." /></CardContent></Card><Card className="border-amber-200 bg-amber-50/50"><CardContent className="p-5"><ClipboardCheck className="text-amber-700" /><h4 className="mt-3 font-black text-amber-950">قاعدة الإقفال النهائي</h4><p className="mt-2 text-xs leading-6 text-amber-900">لا يُغلق اليوم المالي قبل تفسير كل فرق، اعتماد الفروقات من المدير، وترحيل الحركات غير المسودة.</p><Button size="sm" variant="outline" onClick={() => onAdd("treasury")} className="mt-4 border-amber-300 bg-white text-amber-900">بدء إقفال جديد</Button></CardContent></Card></div>}

    {tab === "notes" && <Card><CardHeader className="flex-row items-center justify-between border-b"><div><CardTitle className="text-base">رد المبالغ والمذكرات الدائنة والمدينة</CardTitle><p className="mt-1 text-xs text-slate-500">كل رد أو تعديل يرتبط بالفاتورة الأصلية ويمر بالاعتماد قبل الترحيل.</p></div><div className="flex gap-2">{addAction("invoice_return", "مذكرة دائنة")}<Button size="sm" variant="outline" onClick={() => onAdd("payment_return")} className="gap-2"><RotateCcw size={14} /> رد مبلغ</Button></div></CardHeader><CardContent className="p-4"><RecordTable records={visible.filter(record => ["invoice_return", "payment_return", "invoice"].includes(record.kind))} empty="لا توجد مرتجعات أو مذكرات مسجلة." /></CardContent></Card>}

     {tab === "payroll" && <Card><CardHeader className="flex-row items-center justify-between border-b"><div><CardTitle className="text-base">دورة الرواتب والسلف والعمولات</CardTitle><p className="mt-1 text-xs text-slate-500">أنشئ السلفة أو كشف الراتب أو العمولة، ثم اعتمدها ورحّلها دون تعديل الحركة المرحّلة.</p></div><div className="flex flex-wrap gap-2">{addAction("salary_payment", "كشف راتب")}<Button size="sm" variant="outline" onClick={() => onAdd("salary_advance")} className="gap-2"><Banknote size={14} /> سلفة</Button><Button size="sm" variant="outline" onClick={() => onAdd("commission")} className="gap-2"><FileCheck2 size={14} /> عمولة</Button></div></CardHeader><CardContent className="p-4"><div className="mb-4 rounded-xl bg-slate-50 p-4 text-sm"><b>{payroll.length}</b> حركة في الدورة الحالية · <b className="text-cyan-800">{money(truth?.expenses ?? 0)}</b> إجمالي القيمة المرحّلة</div><RecordTable records={visible.filter(record => ["salary_payment", "salary_advance", "commission"].includes(record.kind))} empty="لا توجد حركات رواتب أو سلف أو عمولات." /></CardContent></Card>}

     {tab === "inventory" && <Card><CardHeader className="flex-row items-center justify-between border-b"><div><CardTitle className="text-base">ربط المخزون بالمشتريات والصرف والمرتجع</CardTitle><p className="mt-1 text-xs text-slate-500">سجّل الكميات والوحدة والمستودع في المستند، وتابع أثر الشراء والصرف والمرتجع في سجل واحد.</p></div><div className="flex flex-wrap gap-2">{addAction("purchase", "شراء")}<Button size="sm" variant="outline" onClick={() => onAdd("stock_issue")} className="gap-2"><Package size={14} /> صرف</Button><Button size="sm" variant="outline" onClick={() => onAdd("purchase_return")} className="gap-2"><RotateCcw size={14} /> مرتجع</Button></div></CardHeader><CardContent className="p-4"><div className="mb-4 rounded-xl bg-slate-50 p-4 text-sm"><b>{stock.length}</b> حركة مخزون · <b className="text-cyan-800">{money(truth?.inventory ?? 0)}</b> قيمة مرحّلة مرتبطة بالمستندات</div><RecordTable records={visible.filter(record => ["purchase", "purchase_return", "stock_issue", "stock_issue_return"].includes(record.kind))} empty="لا توجد حركات مخزون أو مشتريات." /></CardContent></Card>}
  </div>
}

function RecordTable({ records, empty }: { records: ContainerSystemRecord[]; empty: string }) {
  if (!records.length) return <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{empty}</div>
  return <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-right text-xs"><thead><tr className="border-b text-slate-500"><th className="p-3">المرجع</th><th className="p-3">البيان</th><th className="p-3">القيمة</th><th className="p-3">الحالة</th><th className="p-3">التاريخ</th></tr></thead><tbody>{records.slice(0, 50).map(record => { const p = payload(record); return <tr key={record.id} className="border-b last:border-0 hover:bg-slate-50"><td className="p-3 font-bold text-slate-800">{record.reference || `#${record.id}`}</td><td className="max-w-[18rem] truncate p-3 text-slate-600">{String(p.description ?? p.notes ?? p.name ?? p.employeeName ?? p.customerName ?? record.kind)}</td><td className="p-3 font-bold">{money(amount(record))}</td><td className="p-3"><Badge variant="outline" className={statusTone(record.status)}>{statusLabel(record.status)}</Badge></td><td className="p-3 text-slate-500">{String(p.date ?? p.paymentDate ?? record.createdAt).slice(0, 10)}</td></tr> })}</tbody></table></div>
}