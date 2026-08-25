import { ArrowRight, BriefcaseBusiness, CalendarDays, CheckCircle2, FileDown, FileText, MapPin, Phone, Printer, Truck, UserRound, Wallet, Wrench, RotateCcw, Trash2, LockKeyhole } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useLocation, useParams } from "wouter"
import { getGetContainerSystemQueryKey, getGetServiceRequestsQueryKey, useCreateContainerContractWorkflow, useCreateContainerSystemRecord, useGetContainerSystem, useGetServiceRequests } from "@workspace/api-client-react"
import type { ContainerSystemRecord } from "@workspace/api-client-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { amountOf, FIELD_CONFIG, formatRecordDate, formatStatus, KIND_LABELS, RecordDialog, RecordStatus, RecordKind } from "./ContainerSystemComponents"
import { ContainerStatusImage } from "@/components/admin/ContainerStatusImage"
import { ContractWizard } from "./ContractWizard"
import { useToast } from "@/hooks/use-toast"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

type ProfileMode = "customer" | "employee" | "container"

const money = (value: number) => `${value.toLocaleString("ar-SA")} ر.س`
const payloadOf = (record?: ContainerSystemRecord | null) => (record?.payload ?? {}) as Record<string, unknown>
const text = (value: unknown, fallback = "—") => String(value ?? "").trim() || fallback
const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—"
  if (Array.isArray(value)) {
    if (!value.length) return "لا توجد"
    return `${value.length} توزيعات`
  }
  if (typeof value === "object") return "متاح في التفاصيل المرتبطة"
  return text(value)
}
const collectionKey = (record: ContainerSystemRecord) => {
  const payload = payloadOf(record)
  return [
    payload.customerRecordId ?? "",
    payload.contractRecordId ?? payload.contractNumber ?? "",
    payload.invoiceRecordId ?? payload.invoiceNumber ?? "",
    payload.amount ?? payload.total ?? "",
    payload.date ?? "",
  ].join("|")
}
const canonicalCollections = (records: ContainerSystemRecord[]) => {
  const payments = records.filter(record => record.kind === "payment" && record.status === "posted")
  const paymentKeys = new Set(payments.map(collectionKey))
  return [
    ...payments,
    ...records.filter(record => {
      if (record.kind !== "receipt" || record.status !== "posted") return false
      const payload = payloadOf(record)
      return !payload.sourcePaymentId && !paymentKeys.has(collectionKey(record))
    }),
  ]
}
const allocatedAmount = (record: ContainerSystemRecord, key: "contractId" | "invoiceId", id: number) => {
  const allocations = payloadOf(record).allocations
  if (!Array.isArray(allocations)) return 0
  return allocations.reduce((sum, entry) => {
    const allocation = entry as Record<string, unknown>
    return Number(allocation[key]) === id ? sum + Number(allocation.amount ?? 0) : sum
  }, 0)
}
const collectionAmountForInvoice = (record: ContainerSystemRecord, invoice: ContainerSystemRecord) => {
  const payload = payloadOf(record)
  const invoicePayload = payloadOf(invoice)
  const allocated = allocatedAmount(record, "invoiceId", invoice.id)
  if (allocated > 0) return allocated
  if (Array.isArray(payload.allocations)) return 0
  return Number(payload.invoiceRecordId ?? 0) === invoice.id ||
    text(payload.invoiceNumber, "") === text(invoicePayload.invoiceNumber ?? invoice.reference, "")
    ? Number(payload.amount ?? 0)
    : 0
}
const customerSiteBelongsTo = (site: ContainerSystemRecord, customer: ContainerSystemRecord) => {
  const sitePayload = payloadOf(site)
  const customerPayload = payloadOf(customer)
  const linkedId = sitePayload.customerRecordId ?? sitePayload.customerId ?? sitePayload.customer_id
  const customerName = text(customerPayload.name ?? customerPayload.customerName, "")
  return String(linkedId ?? "") === String(customer.id) ||
    (!linkedId && Boolean(customerName) && text(sitePayload.customerName, "").trim() === customerName.trim())
}
const siteAddress = (site: ContainerSystemRecord) => {
  const payload = payloadOf(site)
  return text(payload.address ?? payload.location ?? payload.name, "")
}

async function createProfileWorkOrder(input: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}/api/admin/service-requests/from-contract`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}` },
    body: JSON.stringify({ ...input, appointmentType: "scheduled", scheduledAt: `${new Date().toISOString().slice(0, 10)}T09:00:00` }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(String(body.error ?? "تعذر إنشاء أمر العمل"))
}

function OperationalQuickActions({ customerId, customerName, phone, email, location, contracts, containers, onRefresh }: {
  customerId: number; customerName: string; phone: string; email: string; location: string
  contracts: ContainerSystemRecord[]; containers: ContainerSystemRecord[]; onRefresh: () => void
}) {
  const [, navigate] = useLocation()
  const { toast } = useToast()
  const [busy, setBusy] = useState("")
  const contract = contracts.find(item => item.status !== "archived")
  const contractPayload = payloadOf(contract)
  const container = containers.find(item => item.status !== "archived" && (
    String(contractPayload.containerRecordId ?? "") === String(item.id) ||
    text(contractPayload.containerCode ?? contractPayload.assetCode, "") === text(payloadOf(item).assetCode ?? payloadOf(item).containerCode ?? item.reference, "")
  )) ?? containers.find(item => item.status !== "archived")
  const ap = payloadOf(container)
  const run = async (kind: "pickup" | "empty") => {
    if (!contract || !container || !customerId) return
    setBusy(kind)
    try {
      await createProfileWorkOrder({
        customerRecordId: customerId, containerRecordId: container.id, contractRecordId: contract.id,
        clientName: customerName, phone, email,
        serviceType: kind === "pickup" ? "استرجاع وسحب حاوية" : "أمر تفريغ حاوية",
        containerSize: text(ap.assetCode ?? ap.containerCode ?? container.reference),
        location, notes: kind === "pickup" ? "طلب استرجاع الحاوية من ملف العميل" : "طلب تفريغ الحاوية من ملف العميل",
      })
      toast({ title: "تم إنشاء أمر العمل وربطه بالعقد" })
      onRefresh()
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "تعذر إنشاء أمر العمل",
        variant: "destructive",
      })
    } finally {
      setBusy("")
    }
  }
  return <Card className="border-amber-200 bg-amber-50/60 shadow-sm"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="text-sm font-black text-amber-950">إجراءات تشغيل سريعة</p><p className="mt-1 text-xs text-amber-900/70">مرتبطة بالعقد والحاوية ولا تغيّر القيود المالية.</p></div><div className="flex flex-wrap gap-2"><Button size="sm" disabled={!!busy || !contract || !container || !customerId} onClick={() => run("pickup")} className="gap-2 bg-amber-700 hover:bg-amber-800"><RotateCcw size={14} />{busy === "pickup" ? "جارٍ الإنشاء..." : "استرجاع وسحب الحاوية"}</Button><Button size="sm" variant="outline" disabled={!!busy || !contract || !container || !customerId} onClick={() => run("empty")} className="gap-2 border-amber-300 text-amber-900 hover:bg-white"><Trash2 size={14} />{busy === "empty" ? "جارٍ الإنشاء..." : "أمر تفريغ"}</Button>{contract && <Button size="sm" variant="outline" onClick={() => navigate(`/admin/container-system?view=overview&contractId=${contract.id}&prepare=1`)} className="gap-2 border-cyan-300 text-cyan-900 hover:bg-white"><LockKeyhole size={14} /> تجهيز العقد</Button>}</div>{(!contract || !container) && <p className="w-full text-xs font-semibold text-amber-800">يلزم عقد نشط وحاوية مخصصة لإظهار إجراءات التشغيل.</p>}</CardContent></Card>
}

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: string | number; tone?: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-[11px] font-bold text-slate-400">{label}</p><p className={`mt-2 text-xl font-black ${tone}`}>{value}</p></div>
}

function FieldGrid({ record }: { record: ContainerSystemRecord }) {
  const fields = FIELD_CONFIG[record.kind as RecordKind] ?? []
  const payload = payloadOf(record)
  const entries = fields.filter(field => payload[field.key] !== undefined && payload[field.key] !== "").map(field => ({ label: field.label, value: payload[field.key] }))
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{entries.map(entry => <div key={entry.label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><p className="text-[10px] font-bold text-slate-400">{entry.label}</p><p className="mt-1 break-words text-sm font-bold text-slate-800">{displayValue(entry.value)}</p></div>)}</div>
}

function RelatedRows({ title, records, empty = "لا توجد سجلات مرتبطة", headerAction }: { title: string; records: ContainerSystemRecord[]; empty?: string; headerAction?: ReactNode }) {
  const embeddedAction = (records as ContainerSystemRecord[] & { headerAction?: ReactNode }).headerAction
  return <Card className="border-slate-200/80 shadow-sm"><CardHeader className="border-b border-slate-100 px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="text-base">{title}</CardTitle>{headerAction ?? embeddedAction}</div></CardHeader><CardContent className="p-0">{records.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{empty}</p> : records.map(record => <div key={record.id} className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5 last:border-0"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800"><FileText size={16} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-800">{text(record.payload.name ?? record.payload.customerName ?? record.payload.contractNumber ?? record.payload.assetCode ?? record.reference, `سجل ${record.id}`)}</p><p className="mt-1 text-[11px] text-slate-400">{KIND_LABELS[record.kind as RecordKind] ?? record.kind} · {formatRecordDate(record.createdAt)}</p></div><RecordStatus status={record.status} /><span className="text-xs font-black text-slate-700">{amountOf(record) ? money(amountOf(record)) : ""}</span></div>)}</CardContent></Card>
}

function InvoiceRows({ invoices, payments }: { invoices: ContainerSystemRecord[]; payments: ContainerSystemRecord[] }) {
  const [, navigate] = useLocation()
  return <Card className="border-cyan-100 shadow-sm"><CardHeader className="border-b border-slate-100 px-5 py-4"><div className="flex items-center justify-between gap-3"><CardTitle className="text-base">الفواتير</CardTitle><span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-800">{invoices.length}</span></div></CardHeader><CardContent className="p-0">{invoices.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">لا توجد فواتير مرتبطة بهذا العميل.</p> : invoices.map(invoice => {
    const p = payloadOf(invoice)
    const total = Number(p.total ?? p.amount ?? 0)
    const paid = canonicalCollections(payments).reduce((sum, payment) => sum + collectionAmountForInvoice(payment, invoice), 0)
    const remaining = Math.max(total - paid, 0)
    const number = text(p.invoiceNumber ?? invoice.reference)
    const status = remaining <= 0 && total > 0 ? "مدفوعة" : paid > 0 ? "مدفوعة جزئياً" : String(p.invoiceStatus ?? invoice.status) === "overdue" ? "متأخرة" : "مستحقة"
    return <button type="button" key={invoice.id} onClick={() => navigate(`/admin/container-system/invoice/${invoice.id}/details`)} className="grid w-full grid-cols-2 gap-3 border-b border-slate-100 px-5 py-4 text-right transition hover:bg-cyan-50/40 sm:grid-cols-[1.15fr_1fr_1fr_1fr_1fr]">
      <span><b className="block text-sm text-cyan-800" dir="ltr">{number}</b><small className="text-[11px] text-slate-400">{text(p.date, "—")}</small></span>
      <span><small className="block text-[11px] text-slate-400">العقد</small><b className="text-xs">{text(p.contractNumber, "غير مرتبط")}</b></span>
      <span><small className="block text-[11px] text-slate-400">الحاوية</small><b className="text-xs" dir="ltr">#{text(p.containerCode)}</b></span>
      <span><small className="block text-[11px] text-slate-400">الإجمالي / المدفوع</small><b className="text-xs">{money(total)} <span className="font-normal text-emerald-700">({money(paid)})</span></b></span>
      <span className="col-span-2 sm:col-span-1"><small className="block text-[11px] text-slate-400">المتبقي والحالة</small><b className="text-xs text-rose-700">{money(remaining)} · {status}</b></span>
    </button>
  })}</CardContent></Card>
}

function findProfileRecord(records: ContainerSystemRecord[], mode: ProfileMode, id: string) {
  const numericId = Number(id)
  return records.find(record => record.id === numericId && record.kind === mode)
    ?? records.find(record => record.id === numericId && (mode === "employee" ? ["employee", "driver"].includes(record.kind) : mode === "container" ? ["container", "container_asset"].includes(record.kind) : record.kind === "customer"))
}

function CustomerProfile({ record, records }: { record: ContainerSystemRecord; records: ContainerSystemRecord[] }) {
  const [, navigate] = useLocation()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [action, setAction] = useState<"contract" | "site" | "payment" | null>(null)
  const [busy, setBusy] = useState(false)
  const createMutation = useCreateContainerSystemRecord()
  const contractMutation = useCreateContainerContractWorkflow()
  const closeAction = () => {
    setAction(null)
    const url = new URL(window.location.href)
    if (url.searchParams.has("paymentInvoiceId")) {
      url.searchParams.delete("paymentInvoiceId")
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
    }
  }
  const p = payloadOf(record)
  const name = text(p.name ?? p.customerName)
  const related = records.filter(item => {
    const payload = payloadOf(item)
    return text(payload.customerName, "") === name || text(payload.customerRecordId, "") === String(record.id)
  })
  const contracts = related.filter(item => item.kind === "contract")
  const contractIds = new Set(contracts.map(item => item.id))
  const paymentInvoiceId = Number(new URLSearchParams(window.location.search).get("paymentInvoiceId") ?? 0)
  const paymentInvoice = paymentInvoiceId > 0
    ? records.find(item => item.kind === "invoice" && item.id === paymentInvoiceId && item.status !== "archived")
    : undefined
  const paymentInvoicePayload = payloadOf(paymentInvoice)
  const paymentInvoiceContract = contracts.find(item =>
    item.id === Number(paymentInvoicePayload.contractRecordId ?? 0)
    || text(payloadOf(item).contractNumber, "") === text(paymentInvoicePayload.contractNumber, ""),
  )
  const paymentInvoiceTotal = Number(paymentInvoicePayload.total ?? paymentInvoicePayload.amount ?? 0)
  const paymentInvoicePaid = Number(paymentInvoicePayload.paid ?? 0)
  const paymentInvoiceRemaining = Math.max(paymentInvoiceTotal - paymentInvoicePaid, 0)
  useEffect(() => {
    if (paymentInvoice && action === null) setAction("payment")
  }, [paymentInvoice, action])
  const sites = records.filter(item => item.kind === "customer_site" && item.status !== "archived" && customerSiteBelongsTo(item, record))
  const assignments = related.filter(item => item.kind === "container_assignment" || contractIds.has(Number(payloadOf(item).contractRecordId)))
  const appointments = related.filter(item => item.kind === "appointment" || contractIds.has(Number(payloadOf(item).contractRecordId)))
  const containers = records.filter(item => ["container", "container_asset"].includes(item.kind) && (
    assignments.some(assignment => String(payloadOf(assignment).containerRecordId) === String(item.id)) ||
    assignments.some(assignment => text(payloadOf(assignment).containerCode, "") === text(payloadOf(item).assetCode ?? payloadOf(item).code, ""))
  ))
  const payments = related.filter(item => ["payment", "receipt", "payment_return"].includes(item.kind))
  const charges = contracts.reduce((sum, item) => sum + Number(payloadOf(item).total ?? payloadOf(item).amount ?? 0), 0)
  const paid = canonicalCollections(payments).reduce((sum, item) => sum + amountOf(item), 0) -
    payments.filter(item => item.kind === "payment_return" && item.status === "posted").reduce((sum, item) => sum + amountOf(item), 0)
  const workOrdersQuery = useGetServiceRequests(undefined, { query: { queryKey: getGetServiceRequestsQueryKey(), staleTime: 30_000 } })
  const workOrders = (workOrdersQuery.data ?? []).filter(item => {
    const linked = item as typeof item & { customerRecordId?: number | null; contractRecordId?: number | null }
    return linked.customerRecordId === record.id || (linked.contractRecordId != null && contractIds.has(linked.contractRecordId))
  })
  const upcomingAppointments = appointments.filter(item => String(payloadOf(item).appointmentDate ?? "") >= new Date().toISOString().slice(0, 10))
  const refreshProfile = () => {
    void queryClient.invalidateQueries({ queryKey: getGetContainerSystemQueryKey() })
  }
  const submitSite = (payload: Record<string, unknown>, status: string) => {
    createMutation.mutate({
      data: {
        kind: "customer_site",
        status,
        payload: {
          ...payload,
          customerRecordId: String(record.id),
          customerName: name,
        },
      },
    }, {
      onSuccess: () => {
        refreshProfile()
        closeAction()
        toast({ title: "تمت إضافة الموقع إلى ملف العميل" })
      },
      onError: error => toast({ title: error instanceof Error ? error.message : "تعذر إضافة الموقع", variant: "destructive" }),
    })
  }
  const submitContract = (payload: Record<string, unknown>) => {
    if (busy) return
    setBusy(true)
    const { appointmentDate, appointmentTime, appointmentType, ...contractPayload } = payload
    const contractNumber = String(contractPayload.contractNumber ?? "")
    contractMutation.mutate({
      data: {
        operationKey: crypto.randomUUID(),
        contract: { ...contractPayload, customerRecordId: String(record.id), customerName: name },
        assignment: {
          siteRecordId: contractPayload.siteRecordId,
          containerRecordId: contractPayload.containerRecordId,
          contractNumber,
          assignmentStatus: "reserved",
          startDate: contractPayload.startDate,
          endDate: contractPayload.endDate,
          containerCode: contractPayload.containerCode,
          customerRecordId: String(record.id),
          notes: "تم الإنشاء من ملف العميل",
        },
        appointment: {
          contractNumber,
          customerRecordId: String(record.id),
          customerName: name,
          containerRecordId: contractPayload.containerRecordId,
          containerCode: contractPayload.containerCode,
          appointmentType,
          appointmentDate,
          appointmentTime,
          scheduledAt: `${String(appointmentDate)}T${String(appointmentTime)}:00`,
          source: "customer_profile",
        },
        serviceRequest: {
          clientName: name,
          phone: p.phone,
          email: p.email,
          serviceType: appointmentType === "pickup" ? "استرجاع حاوية" : appointmentType === "inspection" ? "فحص وتجهيز حاوية" : "تسليم حاوية",
          containerSize: contractPayload.containerCode,
          location: contractPayload.location ?? "يحدد لاحقًا",
          duration: contractPayload.duration ?? "",
          notes: contractPayload.notes ?? "",
          appointmentType: "scheduled",
          scheduledAt: `${String(appointmentDate)}T${String(appointmentTime)}:00`,
        },
      },
    }, {
      onSuccess: () => {
        refreshProfile()
        closeAction()
        setBusy(false)
        toast({ title: "تم إنشاء العقد وربطه بملف العميل" })
      },
      onError: error => {
        setBusy(false)
        toast({ title: error instanceof Error ? error.message : "تعذر إنشاء العقد", variant: "destructive" })
      },
    })
  }
  const submitPayment = (payload: Record<string, unknown>) => {
    if (Array.isArray(payload.allocations) && payload.allocations.length > 0) {
      const operationKey = crypto.randomUUID()
      setBusy(true)
      void fetch(`${API_BASE}/api/admin/container-system/financial/settle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}`,
          "Idempotency-Key": operationKey,
        },
        body: JSON.stringify({
          ...payload,
          customerRecordId: String(record.id),
          customerName: name,
          amount: Number(payload.amount ?? 0),
          operationKey,
        }),
      }).then(async response => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(String(body.error ?? "تعذر تسجيل الدفعة"))
        refreshProfile()
        closeAction()
        toast({ title: body.idempotent ? "تم تأكيد الدفعة السابقة دون تكرارها" : "تم تسجيل الدفعة وتحديث كشف العميل" })
      }).catch(error => {
        toast({ title: error instanceof Error ? error.message : "تعذر تسجيل الدفعة", variant: "destructive" })
      }).finally(() => setBusy(false))
      return
    }
    let ids: string[] = []
    let amounts: Record<string, string> = {}
    let invoices: Record<string, string> = {}
    try {
      ids = JSON.parse(String(payload.contractRecordIds ?? ""))
      amounts = JSON.parse(String(payload.allocationAmounts ?? "{}"))
      invoices = JSON.parse(String(payload.allocationInvoices ?? "{}"))
    } catch {
      ids = []
    }
    const allocations = ids.map(id => ({
      contractId: Number(id),
      amount: Number(amounts[id] ?? 0),
      invoiceId: invoices[id] ? Number(invoices[id]) : null,
    })).filter(item => item.contractId && item.amount > 0)
    if (allocations.length === 0) {
      toast({ title: "اختر عقداً واحداً على الأقل وحدد مبلغ التوزيع", variant: "destructive" })
      return
    }
    const operationKey = crypto.randomUUID()
    setBusy(true)
    void fetch(`${API_BASE}/api/admin/container-system/financial/settle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}`,
        "Idempotency-Key": operationKey,
      },
      body: JSON.stringify({
        ...payload,
        customerRecordId: String(record.id),
        customerName: name,
        amount: Number(payload.amount ?? 0),
        operationKey,
        allocations,
      }),
    }).then(async response => {
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(String(body.error ?? "تعذر تسجيل الدفعة"))
      refreshProfile()
      closeAction()
      toast({ title: body.idempotent ? "تم تأكيد الدفعة السابقة دون تكرارها" : "تم تسجيل الدفعة وتحديث كشف العميل" })
    }).catch(error => {
      toast({ title: error instanceof Error ? error.message : "تعذر تسجيل الدفعة", variant: "destructive" })
    }).finally(() => setBusy(false))
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
      <div><p className="text-sm font-black text-cyan-950">إجراءات العميل</p><p className="mt-1 text-xs text-cyan-800/70">كل العمليات تبدأ من ملف العميل وتبقى مرتبطة بسجله.</p></div>
      <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => setAction("contract")} className="bg-cyan-800 hover:bg-cyan-900">إنشاء عقد</Button><Button size="sm" variant="outline" onClick={() => setAction("site")} className="border-cyan-200 text-cyan-800">إضافة موقع</Button><Button size="sm" variant="outline" onClick={() => setAction("payment")} className="border-emerald-200 text-emerald-800">تسجيل دفعة</Button></div>
    </div>
    <ContractWizard
      open={action === "contract"}
      records={records}
      initialCustomerId={record.id}
      busy={busy}
      onClose={() => { if (!busy) closeAction() }}
      onSubmit={submitContract}
    />
    <OperationalQuickActions
      customerId={record.id}
      customerName={name}
      phone={text(p.phone ?? p.mobile, "")}
      email={text(p.email, "")}
      location={text(p.address ?? p.location ?? siteAddress(sites[0]), "يحدد لاحقاً")}
      contracts={contracts}
      containers={containers}
      onRefresh={refreshProfile}
    />
    <RecordDialog
      open={action === "site" || action === "payment"}
      kind={action === "payment" ? "payment" : "customer_site"}
      records={records}
      initialPayload={action === "payment"
        ? {
            customerRecordId: String(record.id),
            customerName: name,
            ...(paymentInvoice ? {
              invoiceRecordId: String(paymentInvoice.id),
              invoiceId: String(paymentInvoice.id),
              invoiceNumber: String(paymentInvoicePayload.invoiceNumber ?? paymentInvoice.reference ?? ""),
              contractRecordId: paymentInvoiceContract?.id ? String(paymentInvoiceContract.id) : String(paymentInvoicePayload.contractRecordId ?? ""),
              amount: String(paymentInvoiceRemaining),
            } : {}),
          }
        : { customerRecordId: String(record.id), customerName: name, city: String(p.city ?? ""), address: String(p.address ?? "") }}
      busy={busy || createMutation.isPending}
      onOpenChange={open => { if (!open && !busy) closeAction() }}
      onSubmit={action === "payment" ? submitPayment : submitSite}
    />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="إجمالي العقود" value={contracts.length} /><Stat label="المواقع" value={sites.length} /><Stat label="الحاويات الحالية" value={containers.length} /><Stat label="المواعيد القادمة" value={upcomingAppointments.length} /></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="إجمالي المطالبات" value={money(charges)} /><Stat label="المدفوع" value={money(paid)} tone="text-emerald-700" /><Stat label="الرصيد المستحق" value={money(Math.max(charges - paid, 0))} tone="text-rose-700" /><Stat label="أوامر العمل" value={workOrders.length} tone="text-amber-700" /></div>
    <InvoiceRows invoices={related.filter(item => item.kind === "invoice" && item.status !== "archived")} payments={related.filter(item => item.kind === "payment" && item.status === "posted")} />
    <div className="grid gap-5 xl:grid-cols-2"><RelatedRows title="مواقع العميل" records={sites} empty="لم تتم إضافة موقع لهذا العميل بعد" /><RelatedRows title="الحاويات المخصصة" records={containers} empty="لا توجد حاويات مخصصة حاليًا" /></div>
    <div className="grid gap-5 xl:grid-cols-2"><RelatedRows title="العقود والإيجارات" records={related.filter(item => ["contract", "contract_line"].includes(item.kind))} /><RelatedRows title="المواعيد وأوامر العمل" records={[...appointments, ...workOrders.map(item => ({ id: item.id, kind: "appointment", status: item.driverStatus ?? "pending", reference: `WO-${item.id}`, payload: { name: item.serviceType, customerName: item.clientName, scheduledAt: item.scheduledAt ?? "" }, createdAt: item.createdAt, updatedAt: item.updatedAt ?? item.createdAt }))]} empty="لا توجد مواعيد أو أوامر عمل" /></div>
    <RelatedRows title="التحصيلات والحركات المالية" records={payments} />
  </div>
}

function EmployeeProfile({ record, records }: { record: ContainerSystemRecord; records: ContainerSystemRecord[] }) {
  const p = payloadOf(record)
  const name = text(p.name ?? p.employeeName ?? p.driverName)
  const related = records.filter(item => {
    const payload = payloadOf(item)
    return [payload.employeeName, payload.driverName, payload.supervisorName].some(value => text(value, "") === name)
  })
  const advances = related.filter(item => item.kind === "salary_advance").reduce((sum, item) => sum + amountOf(item), 0)
  const salaries = related.filter(item => item.kind === "salary_payment").reduce((sum, item) => sum + amountOf(item), 0)
  return <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="الوظيفة" value={text(p.jobTitle, "غير محددة")} /><Stat label="الراتب المسجل" value={money(Number(p.salary ?? 0))} /><Stat label="السلف" value={money(advances)} tone="text-amber-700" /><Stat label="الرواتب المصروفة" value={money(salaries)} tone="text-emerald-700" /></div><div className="grid gap-5 xl:grid-cols-[1fr_1fr]"><RelatedRows title="أوامر العمل والحركات" records={related.filter(item => ["container_movement", "appointment", "commission"].includes(item.kind))} /><RelatedRows title="الرواتب والسلف" records={related.filter(item => ["salary_advance", "salary_payment"].includes(item.kind))} /></div></>
}

function ContainerProfile({ record, records }: { record: ContainerSystemRecord; records: ContainerSystemRecord[] }) {
  const p = payloadOf(record)
  const code = text(p.assetCode ?? p.containerCode ?? p.code ?? record.reference)
  const currentStatus = p.status ?? record.status
  const related = records.filter(item => {
    const payload = payloadOf(item)
    return text(payload.containerCode ?? payload.assetCode, "") === code || text(payload.containerRecordId, "") === String(record.id)
  })
  const movements = related.filter(item => item.kind === "container_movement")
  const contracts = related.filter(item => item.kind === "contract")
  const maintenance = related.filter(item => ["maintenance", "oil_change"].includes(item.kind))
  const financials = related.filter(item => ["payment", "receipt", "expense", "invoice", "ledger_entry"].includes(item.kind))
  const revenue = financials.filter(item => ["payment", "receipt", "invoice"].includes(item.kind)).reduce((sum, item) => sum + amountOf(item), 0)
  const costs = financials.filter(item => item.kind === "expense").reduce((sum, item) => sum + amountOf(item), 0) +
    maintenance.reduce((sum, item) => sum + Number(payloadOf(item).cost ?? payloadOf(item).amount ?? 0), 0)
  const rentalDays = contracts.reduce((sum, item) => {
    const contract = payloadOf(item)
    const start = Date.parse(String(contract.startDate ?? ""))
    const end = Date.parse(String(contract.endDate ?? ""))
    return sum + (Number.isFinite(start) && Number.isFinite(end) && end >= start ? Math.ceil((end - start) / 86_400_000) + 1 : 0)
  }, 0)
  const utilization = rentalDays > 0 ? Math.min(100, Math.round((rentalDays / Math.max(contracts.length * 30, rentalDays)) * 100)) : 0
  const workOrdersQuery = useGetServiceRequests(undefined, { query: { queryKey: getGetServiceRequestsQueryKey(), staleTime: 30_000 } })
  const workOrders = (workOrdersQuery.data ?? []).filter(item => {
    const linked = item as typeof item & { containerRecordId?: number | null; contractRecordId?: number | null }
    return linked.containerRecordId === record.id || (linked.contractRecordId != null && contracts.some(contract => contract.id === linked.contractRecordId))
  })
  const activeContract = contracts.find(item => item.status !== "archived")
  const activeContractPayload = payloadOf(activeContract)
  const customer = records.find(item => item.kind === "customer" && String(item.id) === String(activeContractPayload.customerRecordId))
    ?? records.find(item => item.kind === "customer" && text(payloadOf(item).name ?? payloadOf(item).customerName, "") === text(activeContractPayload.customerName, ""))
  const customerPayload = payloadOf(customer)
  const timeline = [
    ...movements.map(item => ({ id: `movement-${item.id}`, date: item.createdAt, title: text(payloadOf(item).movementType, "حركة حاوية"), detail: text(payloadOf(item).location, "الموقع غير محدد"), icon: ArrowRight, tone: "bg-cyan-50 text-cyan-800" })),
    ...workOrders.map(item => ({ id: `work-${item.id}`, date: item.scheduledAt ?? item.createdAt, title: item.serviceType, detail: `${item.clientName} · ${text(item.driverStatus, "غير مسند")}`, icon: CalendarDays, tone: "bg-amber-50 text-amber-800" })),
    ...contracts.map(item => ({ id: `contract-${item.id}`, date: item.createdAt, title: `العقد ${text(payloadOf(item).contractNumber ?? item.reference)}`, detail: text(item.status), icon: FileText, tone: "bg-emerald-50 text-emerald-800" })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  const workOrderRecords: ContainerSystemRecord[] = workOrders.map(item => ({
    id: item.id,
    kind: "appointment",
    status: item.driverStatus ?? "pending",
    reference: `WO-${item.id}`,
    payload: { name: item.serviceType, customerName: item.clientName, scheduledAt: item.scheduledAt ?? "", driverStatus: item.driverStatus ?? "unassigned" },
    createdAt: item.createdAt,
    updatedAt: item.updatedAt ?? item.createdAt,
  }))
  const quickActions = <OperationalQuickActions
    customerId={customer?.id ?? Number(activeContractPayload.customerRecordId ?? 0)}
    customerName={text(customerPayload.name ?? customerPayload.customerName ?? activeContractPayload.customerName, "العميل")}
    phone={text(customerPayload.phone ?? customerPayload.mobile ?? activeContractPayload.customerPhone, "")}
    email={text(customerPayload.email, "")}
    location={text(p.location ?? activeContractPayload.location ?? activeContractPayload.address, "يحدد لاحقاً")}
    contracts={contracts}
    containers={[record]}
    onRefresh={() => void workOrdersQuery.refetch()}
  />
  ;(workOrderRecords as ContainerSystemRecord[] & { headerAction?: ReactNode }).headerAction = quickActions
  return <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Stat label="الحالة الحالية" value={formatStatus(String(currentStatus))} tone="text-cyan-800" /><Stat label="الموقع الحالي" value={text(p.location, "غير محدد")} /><Stat label="عدد الحركات" value={movements.length} /><Stat label="العقود المرتبطة" value={contracts.length} /><Stat label="أوامر العمل" value={workOrders.length} /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Stat label="أيام التأجير المحسوبة" value={rentalDays} tone="text-indigo-700" /><Stat label="الاستفادة التقديرية" value={`${utilization}%`} tone="text-emerald-700" /><Stat label="الإيراد المرتبط" value={money(revenue)} tone="text-cyan-800" /><Stat label="التكلفة المرتبطة" value={money(costs)} tone="text-rose-700" /><Stat label="صافي القيمة" value={money(revenue - costs)} tone={revenue - costs >= 0 ? "text-emerald-700" : "text-rose-700"} /></div><div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><Card className="border-slate-200/80 shadow-sm"><CardHeader className="border-b border-slate-100 px-5 py-4"><CardTitle className="flex items-center gap-2 text-base"><CalendarDays size={17} className="text-cyan-800" /> القصة التشغيلية للأصل</CardTitle></CardHeader><CardContent className="p-5">{timeline.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">لا توجد أحداث مرتبطة بعد.</p> : <div className="space-y-4">{timeline.map(event => { const Icon = event.icon; return <div key={event.id} className="flex gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${event.tone}`}><Icon size={16} /></div><div className="min-w-0 flex-1 border-b border-slate-100 pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black text-slate-800">{event.title}</p><time className="text-[11px] text-slate-400">{formatRecordDate(event.date)}</time></div><p className="mt-1 text-xs text-slate-500">{event.detail}</p></div></div> })}</div>}</CardContent></Card><div className="space-y-5"><RelatedRows title="سجل الحركات" records={movements} /><RelatedRows title="العقود المرتبطة" records={contracts} /><RelatedRows title="أوامر العمل" records={workOrderRecords} empty="لا توجد أوامر عمل مرتبطة" /><RelatedRows title="الفحوصات والصيانة" records={maintenance} empty="لا توجد صيانة مسجلة لهذا الأصل" /></div></div></>
}

export function ContainerRecordProfile({ mode }: { mode: ProfileMode }) {
  const [, setLocation] = useLocation()
  const navigate = (to: string) => to === "/admin/container-system" ? (window.history.length > 1 ? window.history.back() : setLocation(to)) : setLocation(to)
  const params = useParams<{ id: string }>()
  const query = useGetContainerSystem()
  const records = query.data?.records ?? []
  const record = useMemo(() => findProfileRecord(records, mode, params.id), [mode, params.id, records])
  const p = payloadOf(record)
  const title = mode === "customer" ? text(p.name ?? p.customerName, "ملف العميل") : mode === "employee" ? text(p.name ?? p.employeeName ?? p.driverName, "ملف الموظف") : text(p.assetCode ?? p.containerCode ?? p.code, "ملف الحاوية")
  const Icon = mode === "customer" ? UserRound : mode === "employee" ? BriefcaseBusiness : Truck
  const goBack = () => window.history.length > 1 ? window.history.back() : navigate("/admin/container-system")
  if (query.isLoading) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">جارٍ تحميل الملف...</div>
  if (!record) return <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center"><h2 className="font-black text-rose-900">لم يتم العثور على الملف</h2><Button onClick={goBack} variant="outline">العودة إلى نظام الحاويات</Button></div>
  const customerSites = mode === "customer"
    ? records.filter(item => item.kind === "customer_site" && item.status !== "archived" && customerSiteBelongsTo(item, record))
    : []
  const headerAddress = mode === "customer"
    ? text(p.address ?? p.location, "") || siteAddress(customerSites[0])
    : text(p.address ?? p.location ?? p.branchName, "")
  return <div dir="rtl" className="container-system space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" onClick={() => navigate("/admin/container-system")} className="gap-2 px-0 text-cyan-800"><ArrowRight size={16} /> العودة لنظام الحاويات</Button><div className="flex gap-2"><Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer size={15} /> طباعة الملف</Button><Button onClick={() => navigate(`/admin/container-system/profile/${mode}/${record.id}`)} className="hidden">الملف</Button></div></div><Card className="overflow-hidden border-0 bg-[#123d4e] text-white shadow-[0_14px_40px_rgba(18,61,78,.18)]"><CardContent className="p-4 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center">{mode === "container" ? <div className="order-2 flex h-28 w-full shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white sm:order-1 sm:h-28 sm:w-56"><ContainerStatusImage status={p.status ?? record.status} code={title} className="h-full w-full" numberClassName="top-[45.5%]" /></div> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-slate-900"><Icon size={30} /></div>}<div className="order-1 min-w-0 flex-1 sm:order-2"><p className="text-xs font-bold text-cyan-200">{mode === "customer" ? "ملف عميل" : mode === "employee" ? "ملف موظف" : "ملف أصل حاوية"}</p><h1 className="mt-1 text-2xl font-black" dir={mode === "container" ? "ltr" : undefined}>{title}</h1><div className="mt-3 flex flex-wrap gap-3 text-xs text-cyan-100/75">{mode !== "container" && <><span className="flex items-center gap-1"><Phone size={13} /> {text(p.phone ?? p.customerPhone, "لا يوجد هاتف")}</span><span className="flex items-center gap-1"><MapPin size={13} /> {text(headerAddress, "لا يوجد عنوان")}</span>{mode === "customer" && customerSites.length > 0 && <span className="flex items-center gap-1"><MapPin size={13} /> {customerSites.length} {customerSites.length === 1 ? "موقع مسجل" : "مواقع مسجلة"}</span>}</>} {mode === "container" && <span>{text(p.typeName ?? p.containerType, "نوع الحاوية غير محدد")} · {text(p.size ?? p.capacity, "الحجم غير محدد")}</span>}<span className="flex items-center gap-1"><CalendarDays size={13} /> آخر تحديث {formatRecordDate(record.updatedAt)}</span></div></div><RecordStatus status={String(p.status ?? record.status)} /></div></CardContent></Card>{mode !== "container" && <Card className="border-slate-200/80 shadow-sm"><CardHeader className="border-b border-slate-100 px-5 py-4"><CardTitle className="text-base">البيانات الأساسية</CardTitle></CardHeader><CardContent className="p-5"><FieldGrid record={record} /></CardContent></Card>}{mode === "customer" ? <CustomerProfile record={record} records={records} /> : mode === "employee" ? <EmployeeProfile record={record} records={records} /> : <ContainerProfile record={record} records={records} />}</div>
}

export function ContractPrintPage() {
  const [, setLocation] = useLocation()
  const navigate = (to: string) => to === "/admin/container-system" ? (window.history.length > 1 ? window.history.back() : setLocation("/admin/container-system?view=contracts_list")) : setLocation(to)
  const params = useParams<{ id: string }>()
  const query = useGetContainerSystem()
  const record = query.data?.records.find(item => item.id === Number(params.id) && item.kind === "contract")
  const p = payloadOf(record)
  if (query.isLoading) return <div className="p-10 text-center">جارٍ تجهيز العقد...</div>
  if (!record) return <div className="p-10 text-center"><p className="mb-4 font-bold">العقد غير موجود</p><Button onClick={() => navigate("/admin/container-system")}>العودة</Button></div>
  const customer = text(p.customerName)
  const organization = (query.data as typeof query.data & { organization?: Record<string, unknown> })?.organization ?? {}
  const organizationName = text(organization.name ?? organization.englishName, "اسم المنشأة غير مضبوط")
  const organizationPhone = text(organization.phone ?? organization.whatsapp, "غير مسجل")
  const organizationAddress = [organization.address, organization.city, organization.region].map(value => text(value, "")).filter(Boolean).join("، ")
   const defaultClauses = ["يلتزم الطرف الأول بتوفير الحاوية وتسليمها إلى الموقع المحدد في العقد، وتنفيذ خدمات النقل والتفريغ المتفق عليها.","يلتزم الطرف الثاني بالمحافظة على الحاوية وعدم نقلها أو استخدامها لغير الغرض المتفق عليه دون موافقة الطرف الأول.","تحتسب قيمة العقد والضريبة وأي خدمات إضافية وفق البيانات المالية المثبتة في هذا المستند.","يتحمل الطرف الثاني أي أضرار ناتجة عن سوء الاستخدام أو تجاوز الوزن أو تعبئة مواد غير مسموحة.","تسجل كل عملية تسليم أو تبديل أو تفريغ أو استرجاع في النظام وترتبط بهذا العقد.","يلتزم الطرف الثاني بسداد المستحقات في مواعيدها، ويحق للطرف الأول تعليق الخدمة عند التأخر وفق سياسة المؤسسة.","أي تعديل على هذا العقد لا يكون نافذًا إلا بعد اعتماده وتسجيله كتابيًا من الطرفين."]
   const clauses = Array.isArray(p.contractTerms) ? p.contractTerms.map(item => String(item).trim()).filter(Boolean) : defaultClauses
   return <div dir="rtl" className="contract-print-shell min-h-screen bg-slate-100 p-4 sm:p-8"><style>{`@page { size: A4; margin: 0; } @media print { body:has(.contract-print-shell) .admin-shell > aside, body:has(.contract-print-shell) .admin-shell > main > header, body:has(.contract-print-shell) .admin-shell > main > .notification-status-strip, body:has(.contract-print-shell) .admin-toast-portal { display: none !important; } body:has(.contract-print-shell) .admin-shell > main { margin: 0 !important; } body:has(.contract-print-shell) .admin-shell > main > div:last-child { padding: 0 !important; } .contract-print-shell { padding: 0 !important; background: white !important; } .a4-contract { box-shadow: none !important; margin: 0 !important; } .print-hidden { display: none !important; } } .a4-contract { width: 210mm; min-height: 297mm; }`}</style><div className="print-hidden mx-auto mb-4 flex max-w-[210mm] justify-between"><Button variant="ghost" onClick={() => navigate("/admin/container-system")} className="gap-2"><ArrowRight size={16} /> العودة</Button><Button onClick={() => window.print()} className="gap-2 bg-cyan-800"><Printer size={15} /> طباعة عقد A4</Button></div><article className="a4-contract mx-auto bg-white px-[18mm] py-[16mm] text-slate-900"><header className="flex items-start justify-between border-b-2 border-cyan-800 pb-5"><div><p className="text-xs font-bold text-cyan-800">{organizationName}</p><h1 className="mt-2 text-2xl font-black">عقد {text(p.contractType, "تأجير حاوية")}</h1><p className="mt-1 text-xs text-slate-500">مستند تعاقدي تشغيلي</p><p className="mt-1 text-xs text-slate-500">{organizationAddress || "العنوان غير مسجل"} · {organizationPhone}</p></div><div className="text-left text-xs leading-6"><p><b>رقم العقد:</b> {text(p.contractNumber ?? record.reference)}</p><p><b>تاريخ الإصدار:</b> {text(p.issueDate ?? record.createdAt)}</p><p><b>الحالة:</b> {formatStatus(record.status)}</p></div></header><section className="mt-7 space-y-4 text-sm leading-8"><p>بحمد الله تم الاتفاق في هذا العقد بين الطرف الأول <b>{organizationName}</b> والطرف الثاني <b>{customer}</b> وفق البيانات والبنود التالية:</p><div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-4"><p><b>جوال العميل:</b> {text(p.customerPhone)}</p><p><b>رقم الحاوية:</b> {text(p.containerCode)}</p><p><b>الموقع:</b> {text(p.location ?? p.address)}</p><p><b>رقم القطعة:</b> {text(p.propertyNumber)}</p><p><b>رقم المخطط:</b> {text(p.planNumber)}</p><p><b>التصنيف:</b> {text(p.classification)}</p><p><b>حجم الحاوية:</b> {text(p.containerSize)}</p><p><b>بداية العقد:</b> {text(p.startDate)}</p><p><b>نهاية العقد:</b> {text(p.endDate)}</p><p><b>عدد الرحلات:</b> {text(p.trips ?? p.quantity)}</p><p><b>السعر:</b> {money(Number(p.unitPrice ?? 0))}</p><p><b>قيمة التعاقد:</b> {money(Number(p.total ?? p.amount ?? 0))}</p></div><h2 className="mt-6 border-r-4 border-amber-400 pr-3 text-base font-black">بنود العقد</h2><ol className="list-decimal space-y-1 pr-6">{clauses.map((clause, index) => <li key={`${clause}-${index}`}>{clause}</li>)}</ol><h2 className="mt-6 border-r-4 border-amber-400 pr-3 text-base font-black">ملاحظات</h2><p className="min-h-20 rounded-xl border border-slate-200 p-4">{text(p.notes, "لا توجد ملاحظات إضافية.")}</p></section><footer className="mt-16 grid grid-cols-2 gap-12 border-t border-slate-200 pt-8 text-center text-sm font-bold"><div><p>الطرف الأول</p><div className="mt-12 border-t border-slate-400 pt-2">{organizationName}</div></div><div><p>الطرف الثاني</p><div className="mt-12 border-t border-slate-400 pt-2">{customer}</div></div></footer><p className="mt-8 text-center text-[10px] text-slate-400">تم إنشاء هذا العقد من نظام إدارة الحاويات — رقم السجل {record.id}</p></article></div>
}