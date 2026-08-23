import { useEffect, useMemo, useState } from "react"
import type { ContainerSystemRecord } from "@workspace/api-client-react"
import { ArrowLeft, ArrowRight, CheckCircle2, FileCheck2, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ContractWizardProps = {
  open: boolean
  records: ContainerSystemRecord[]
  initialCustomerId?: number | null
  busy?: boolean
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => void
}

type FormState = {
  customerRecordId: string
  siteRecordId: string
  containerRecordId: string
  contractNumber: string
  startDate: string
  endDate: string
  amount: string
  taxRate: string
  taxInclusive: string
  notes: string
  appointmentDate: string
  appointmentTime: string
  appointmentType: string
}

const initialForm: FormState = {
  customerRecordId: "",
  siteRecordId: "",
  containerRecordId: "",
  contractNumber: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  amount: "",
  taxRate: "15",
  taxInclusive: "false",
  notes: "",
  appointmentDate: "",
  appointmentTime: "09:00",
  appointmentType: "delivery",
}

function payloadOf(record: ContainerSystemRecord) {
  return record.payload as Record<string, unknown>
}

function labelOf(record: ContainerSystemRecord) {
  const payload = payloadOf(record)
  return String(payload.name ?? payload.customerName ?? payload.assetCode ?? record.reference ?? `#${record.id}`)
}

export function ContractWizard({ open, records, initialCustomerId = null, busy = false, onClose, onSubmit }: ContractWizardProps) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(initialForm)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setStep(0)
    setError("")
    setForm(current => ({ ...initialForm, customerRecordId: initialCustomerId ? String(initialCustomerId) : current.customerRecordId }))
  }, [initialCustomerId, open])

  const customers = useMemo(
    () => records.filter(record => record.kind === "customer" && record.status !== "archived"),
    [records],
  )
  const containers = useMemo(
    () => records.filter(record => ["container", "container_asset"].includes(record.kind) && record.status !== "archived" && ["available", "متاح", "active"].includes(record.status)),
    [records],
  )
  const sites = useMemo(
    () => records.filter(record => record.kind === "customer_site" && record.status !== "archived" && (!form.customerRecordId || String(payloadOf(record).customerRecordId) === form.customerRecordId)),
    [form.customerRecordId, records],
  )
  const customer = customers.find(record => String(record.id) === form.customerRecordId)
  const site = sites.find(record => String(record.id) === form.siteRecordId)
  const container = containers.find(record => String(record.id) === form.containerRecordId)
  const customerPayload = customer ? payloadOf(customer) : undefined
  const containerPayload = container ? payloadOf(container) : undefined
  const amount = Number(form.amount || 0)
  const taxRate = Number(form.taxRate || 0)
  const taxInclusive = form.taxInclusive === "true"
  const total = taxInclusive ? amount : amount + Math.round(amount * taxRate) / 100
  const taxAmount = taxInclusive
    ? Math.round((amount - amount / (1 + taxRate / 100)) * 100) / 100
    : Math.round(amount * taxRate * 100) / 100
  const netAmount = taxInclusive ? Math.round((amount - taxAmount) * 100) / 100 : amount

  if (!open) return null

  const update = (key: keyof FormState, value: string) => {
    setError("")
    setForm(current => ({ ...current, [key]: value, ...(key === "customerRecordId" ? { siteRecordId: "" } : {}) }))
  }

  const validateStep = (targetStep = step) => {
    if (targetStep === 0 && !customer) return "اختر عميلاً مسجلاً قبل المتابعة"
    if (targetStep === 1 && !site) return "اختر موقع العميل قبل المتابعة"
    if (targetStep === 1 && !container) return "اختر أصلاً متاحاً للتخصيص قبل المتابعة"
    if (targetStep === 1 && !form.startDate) return "تاريخ بداية العقد مطلوب"
    if (targetStep === 1 && !form.endDate) return "تاريخ نهاية العقد مطلوب"
    if (targetStep === 1 && form.endDate < form.startDate) return "نهاية العقد يجب أن تكون بعد بدايته"
    if (targetStep === 2 && (!form.amount || amount <= 0)) return "أدخل قيمة العقد قبل المتابعة"
    if (targetStep === 3 && !form.appointmentDate) return "حدد موعد العملية الأولى قبل المتابعة"
    return ""
  }

  const next = () => {
    const message = validateStep()
    if (message) {
      setError(message)
      return
    }
    setError("")
    setStep(current => Math.min(current + 1, 4))
  }

  const submit = () => {
    const message = [0, 1, 2, 3].map(currentStep => validateStep(currentStep)).find(Boolean)
    if (message) {
      setError(message)
      return
    }
    onSubmit({
      requestId: null,
      customerRecordId: customer?.id,
      siteRecordId: site?.id,
      customerName: String(customerPayload?.name ?? customerPayload?.customerName ?? ""),
      customerPhone: String(customerPayload?.phone ?? ""),
      containerRecordId: container?.id,
      containerCode: String(containerPayload?.assetCode ?? containerPayload?.code ?? ""),
      contractNumber: form.contractNumber.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
       amount: netAmount,
      taxRate,
      taxAmount,
      total,
       taxInclusive,
      status: "active",
      notes: form.notes.trim(),
      location: String(site ? payloadOf(site).address ?? "" : ""),
      createdFrom: "contract_workflow",
      appointmentDate: form.appointmentDate,
      appointmentTime: form.appointmentTime,
      appointmentType: form.appointmentType,
    })
  }

  const steps = ["العميل", "العقد والأصل", "التسعير", "الجدولة", "المراجعة"]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6" dir="rtl">
      <Card className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto border-cyan-100 shadow-2xl">
        <CardContent className="p-0">
          <div className="border-b border-slate-100 bg-[#123d4e] p-5 text-white sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-900"><FileCheck2 size={21} /></div>
                <div><h2 className="text-xl font-black">إنشاء عقد تشغيلي</h2><p className="mt-1 text-xs text-cyan-100/75">مسار مرتبط بعميل وأصل متاح، وليس سجلًا عامًا.</p></div>
              </div>
              <button type="button" onClick={onClose} className="text-2xl leading-none text-cyan-100/70 hover:text-white" aria-label="إغلاق">×</button>
            </div>
            <div className="mt-6 grid grid-cols-5 gap-2">
              {steps.map((title, index) => <div key={title} className="flex items-center gap-2 text-[11px] font-bold"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${index <= step ? "bg-amber-400 text-slate-900" : "bg-white/15 text-cyan-100"}`}>{index < step ? <CheckCircle2 size={15} /> : index + 1}</span><span className={index === step ? "text-white" : "text-cyan-100/60"}>{title}</span></div>)}
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-7">
            {step === 0 && <section className="space-y-4">
              <div><h3 className="font-black text-slate-900">من هو العميل؟</h3><p className="mt-1 text-sm text-slate-500">اختر طرفًا تجاريًا موجودًا حتى ترتبط به الفاتورة والتحصيل لاحقًا.</p></div>
              <div><Label htmlFor="contract-customer">العميل</Label><select id="contract-customer" value={form.customerRecordId} onChange={event => update("customerRecordId", event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">اختر العميل</option>{customers.map(record => <option key={record.id} value={record.id}>{labelOf(record)}{payloadOf(record).phone ? ` · ${String(payloadOf(record).phone)}` : ""}</option>)}</select></div>
              {customer && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-sm font-black text-emerald-900"><ShieldCheck size={17} /> سياق العميل جاهز</div><div className="mt-3 grid grid-cols-2 gap-3 text-xs text-emerald-900"><span>الاسم: <b>{labelOf(customer)}</b></span><span>الجوال: <b dir="ltr">{String(customerPayload?.phone ?? "—")}</b></span><span>المدينة: <b>{String(customerPayload?.city ?? "—")}</b></span><span>العقود الحالية: <b>{records.filter(record => record.kind === "contract" && String(payloadOf(record).customerRecordId) === String(customer.id) && record.status !== "archived").length}</b></span></div></div>}
            </section>}

            {step === 1 && <section className="space-y-4">
               <div><h3 className="font-black text-slate-900">بيانات العقد والتخصيص</h3><p className="mt-1 text-sm text-slate-500">لا يمكن إصدار عقد تشغيلي دون موقع عميل وأصل متاح وفترة واضحة.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label htmlFor="contract-number">رقم العقد</Label><Input id="contract-number" value={form.contractNumber} onChange={event => update("contractNumber", event.target.value)} placeholder="سيولد تلقائياً عند الحفظ" className="mt-2" dir="ltr" /><p className="mt-1 text-[11px] text-slate-500">اتركه فارغاً ليولد النظام رقماً فريداً تلقائياً.</p></div>
                <div><Label htmlFor="contract-container">الأصل المتاح</Label><select id="contract-container" value={form.containerRecordId} onChange={event => update("containerRecordId", event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">اختر الأصل</option>{containers.map(record => <option key={record.id} value={record.id}>{labelOf(record)} · {String(payloadOf(record).typeName ?? "نوع غير محدد")}</option>)}</select></div>
                 <div><Label htmlFor="contract-site">موقع العميل</Label><select id="contract-site" value={form.siteRecordId} onChange={event => update("siteRecordId", event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">{sites.length ? "اختر موقع العميل" : "لا توجد مواقع لهذا العميل"}</option>{sites.map(record => <option key={record.id} value={record.id}>{labelOf(record)} · {String(payloadOf(record).address ?? "")}</option>)}</select></div>
                <div><Label htmlFor="contract-start">بداية العقد</Label><Input id="contract-start" type="date" value={form.startDate} onChange={event => update("startDate", event.target.value)} className="mt-2" dir="ltr" /></div>
                <div><Label htmlFor="contract-end">نهاية العقد</Label><Input id="contract-end" type="date" value={form.endDate} onChange={event => update("endDate", event.target.value)} className="mt-2" dir="ltr" /></div>
              </div>
              {container && <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-950"><b>{labelOf(container)}</b><span className="mx-2 text-cyan-500">·</span>{String(containerPayload?.typeName ?? "نوع غير محدد")}<span className="mx-2 text-cyan-500">·</span>الحالة الحالية: <Badge variant="outline" className="border-cyan-200 bg-white text-cyan-800">{recordStatusLabel(container.status)}</Badge></div>}
            </section>}

            {step === 2 && <section className="space-y-4">
              <div><h3 className="font-black text-slate-900">التسعير والضريبة</h3><p className="mt-1 text-sm text-slate-500">أدخل القيمة الأساسية، وسيحسب النظام الضريبة والإجمالي تلقائيًا.</p></div>
               <div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="contract-amount">قيمة العقد المدخلة</Label><Input id="contract-amount" type="number" min="0" value={form.amount} onChange={event => update("amount", event.target.value)} className="mt-2" dir="ltr" /><p className="mt-1 text-[11px] text-slate-500">{taxInclusive ? "ستُعامل كقيمة شاملة للضريبة" : "ستُعامل كقيمة قبل الضريبة"}</p></div><div><Label htmlFor="contract-tax">نسبة الضريبة %</Label><Input id="contract-tax" type="number" min="0" value={form.taxRate} onChange={event => update("taxRate", event.target.value)} className="mt-2" dir="ltr" /></div><div><Label htmlFor="contract-tax-inclusive">هل السعر شامل الضريبة؟</Label><select id="contract-tax-inclusive" value={form.taxInclusive} onChange={event => update("taxInclusive", event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="false">لا، قبل الضريبة</option><option value="true">نعم، شامل الضريبة</option></select></div></div>
               <div className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 text-center"><div><p className="text-xs text-slate-500">قبل الضريبة</p><b className="mt-1 block text-lg text-slate-900">{netAmount.toLocaleString("ar-SA")} ر.س</b></div><div><p className="text-xs text-slate-500">الضريبة</p><b className="mt-1 block text-lg text-amber-700">{taxAmount.toLocaleString("ar-SA")} ر.س</b></div><div><p className="text-xs text-slate-500">الإجمالي</p><b className="mt-1 block text-lg text-emerald-700">{total.toLocaleString("ar-SA")} ر.س</b></div></div>
              <div><Label htmlFor="contract-notes">الشروط والملاحظات</Label><textarea id="contract-notes" value={form.notes} onChange={event => update("notes", event.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-cyan-600" placeholder="شروط التسليم أو الاستثناءات..." /></div>
            </section>}

            {step === 3 && <section className="space-y-4">
              <div><h3 className="font-black text-slate-900">العملية الأولى والموعد</h3><p className="mt-1 text-sm text-slate-500">اربط العقد بموعد حقيقي حتى يظهر مباشرة في مركز التشغيل.</p></div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><Label htmlFor="appointment-type">نوع العملية</Label><select id="appointment-type" value={form.appointmentType} onChange={event => update("appointmentType", event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="delivery">تسليم الحاوية</option><option value="pickup">استرجاع الحاوية</option><option value="inspection">فحص وتجهيز</option></select></div>
                <div><Label htmlFor="appointment-date">تاريخ الموعد</Label><Input id="appointment-date" type="date" value={form.appointmentDate} onChange={event => update("appointmentDate", event.target.value)} className="mt-2" dir="ltr" /></div>
                <div><Label htmlFor="appointment-time">الوقت المتوقع</Label><Input id="appointment-time" type="time" value={form.appointmentTime} onChange={event => update("appointmentTime", event.target.value)} className="mt-2" dir="ltr" /></div>
              </div>
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm leading-6 text-cyan-950">سيُنشأ موعد مرتبط بالعقد والعميل والأصل بعد نجاح الإصدار. إذا رفض النظام الموعد بسبب تعارض، سيبقى العقد محفوظًا وتظهر نتيجة واضحة للمشرف.</div>
            </section>}

             {step === 4 && <section className="space-y-4"><div><h3 className="font-black text-slate-900">مراجعة قبل الإصدار</h3><p className="mt-1 text-sm text-slate-500">تحقق من العلاقات والقيمة والموعد قبل إنشاء العقد النشط.</p></div><div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2"><span>العميل: <b>{customer ? labelOf(customer) : "—"}</b></span><span>الموقع: <b>{site ? labelOf(site) : "—"}</b></span><span>الأصل: <b>{container ? labelOf(container) : "—"}</b></span><span>رقم العقد: <b dir="ltr">{form.contractNumber || "سيولد تلقائياً"}</b></span><span>الفترة: <b dir="ltr">{form.startDate || "—"} → {form.endDate || "—"}</b></span><span>الموعد الأول: <b dir="ltr">{form.appointmentDate || "—"} · {form.appointmentTime}</b></span><span>الإجمالي: <b>{total.toLocaleString("ar-SA")} ر.س</b></span><span>الحالة بعد الإصدار: <b className="text-emerald-700">نشط</b></span></div><div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-6 text-amber-950"><ShieldCheck size={16} className="mt-1 shrink-0" />سيُحفظ العقد مع معرّف العميل والموقع والأصل، وسيُنشأ موعد مرتبط بهم، مع منع تعارض الفترة أو إعادة استخدام رقم العقد.</div></section>}

            {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700" role="alert">{error}</p>}
            <div className="flex items-center justify-between border-t border-slate-100 pt-5"><Button type="button" variant="outline" onClick={step === 0 ? onClose : () => { setError(""); setStep(current => current - 1) }} className="gap-2">{step === 0 ? "إلغاء" : <><ArrowRight size={16} /> السابق</>}</Button>{step < 4 ? <Button type="button" onClick={next} className="gap-2 bg-cyan-800 hover:bg-cyan-900">التالي <ArrowLeft size={16} /></Button> : <Button type="button" disabled={busy} onClick={submit} className="gap-2 bg-emerald-700 hover:bg-emerald-800">{busy ? "جارٍ الإصدار..." : "إصدار العقد"} <CheckCircle2 size={16} /></Button>}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function recordStatusLabel(status: string) {
  return status === "available" || status === "متاح" || status === "active" ? "متاح" : status
}