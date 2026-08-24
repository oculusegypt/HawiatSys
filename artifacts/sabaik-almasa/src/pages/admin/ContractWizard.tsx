import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ContainerSystemRecord } from "@workspace/api-client-react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { ArrowLeft, ArrowRight, CheckCircle2, FileCheck2, LocateFixed, MapPin, Plus, ShieldCheck, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { reverseGeocode } from "@/lib/reverseGeocode"

type ContractWizardProps = {
  open: boolean
  records: ContainerSystemRecord[]
  initialCustomerId?: number | null
  initialRequest?: {
    id: number
    clientName: string
    phone: string
    email?: string | null
    serviceType: string
    containerSize: string
    location: string
    duration?: string | null
    notes?: string | null
    appointmentType?: string | null
    scheduledAt?: string | null
  } | null
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
  requestId: string
  customerPhone: string
  customerEmail: string
  serviceType: string
  containerSize: string
  location: string
  locationCoordinates: string
  locationMode: "manual" | "map"
  billingFrequency: "daily" | "weekly" | "monthly" | "yearly"
  contractType: string
  propertyNumber: string
  planNumber: string
  classification: string
  trips: string
  unitPrice: string
  pricingMode: "dynamic" | "manual"
  newClause: string
  clauses: string[]
}

const DEFAULT_CLAUSES = [
  "يلتزم الطرف الأول بتوفير الحاوية وتسليمها إلى الموقع المحدد في العقد، وتنفيذ خدمات النقل والتفريغ المتفق عليها.",
  "يلتزم الطرف الثاني بالمحافظة على الحاوية وعدم نقلها أو استخدامها لغير الغرض المتفق عليه دون موافقة الطرف الأول.",
  "تحتسب قيمة العقد والضريبة وأي خدمات إضافية وفق البيانات المالية المثبتة في هذا المستند.",
  "يتحمل الطرف الثاني أي أضرار ناتجة عن سوء الاستخدام أو تجاوز الوزن أو تعبئة مواد غير مسموحة.",
  "تسجل كل عملية تسليم أو تبديل أو تفريغ أو استرجاع في النظام وترتبط بهذا العقد.",
  "يلتزم الطرف الثاني بسداد المستحقات في مواعيدها، ويحق للطرف الأول تعليق الخدمة عند التأخر وفق سياسة المؤسسة.",
  "أي تعديل على هذا العقد لا يكون نافذًا إلا بعد اعتماده وتسجيله كتابيًا من الطرفين.",
]

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
  requestId: "",
  customerPhone: "",
  customerEmail: "",
  serviceType: "",
  containerSize: "",
  location: "",
  locationCoordinates: "",
  locationMode: "manual",
  billingFrequency: "monthly",
  contractType: "أنقاض",
  propertyNumber: "",
  planNumber: "",
  classification: "",
  trips: "",
  unitPrice: "",
  pricingMode: "dynamic",
  newClause: "",
  clauses: DEFAULT_CLAUSES,
}

function payloadOf(record: ContainerSystemRecord) {
  return record.payload as Record<string, unknown>
}

function labelOf(record: ContainerSystemRecord) {
  const payload = payloadOf(record)
  return String(payload.name ?? payload.customerName ?? payload.assetCode ?? record.reference ?? `#${record.id}`)
}

function billingFrequencyFromValue(value?: string | null): FormState["billingFrequency"] {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (/يوم|daily|day/.test(normalized)) return "daily"
  if (/أسبوع|اسبوع|weekly|week/.test(normalized)) return "weekly"
  if (/سنة|سنوي|yearly|annual|year/.test(normalized)) return "yearly"
  return "monthly"
}

function endDateFromBillingFrequency(startDate: string, frequency: FormState["billingFrequency"]) {
  const result = new Date(`${startDate}T00:00:00`)
  if (Number.isNaN(result.getTime())) return ""
  if (frequency === "yearly") result.setFullYear(result.getFullYear() + 1)
  else if (frequency === "monthly") result.setMonth(result.getMonth() + 1)
  else if (frequency === "weekly") result.setDate(result.getDate() + 7)
  else result.setDate(result.getDate() + 1)
  return result.toISOString().slice(0, 10)
}

function MapPicker({ initialCoordinates, onSelect }: { initialCoordinates: string; onSelect: (coordinates: string, address: string) => void }) {
  const mapElement = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return
    const [initialLat, initialLng] = initialCoordinates.split(",").map(Number)
    const hasInitial = Number.isFinite(initialLat) && Number.isFinite(initialLng)
    const map = L.map(mapElement.current).setView(hasInitial ? [initialLat, initialLng] : [24.7136, 46.6753], hasInitial ? 16 : 11)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map

    const placeMarker = (lat: number, lng: number) => {
      markerRef.current?.remove()
      markerRef.current = L.marker([lat, lng], {
        icon: L.divIcon({ className: "contract-map-marker", html: '<span style="display:block;width:18px;height:18px;border-radius:50% 50% 50% 0;background:#0e7490;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);transform:rotate(-45deg)"></span>', iconSize: [18, 18], iconAnchor: [9, 18] }),
      }).addTo(map)
    }
    if (hasInitial) placeMarker(initialLat, initialLng)

    map.on("click", event => {
      const lat = Number(event.latlng.lat.toFixed(6))
      const lng = Number(event.latlng.lng.toFixed(6))
      placeMarker(lat, lng)
      void reverseGeocode(lat, lng)
        .then(address => onSelect(`${lat}, ${lng}`, address.full || `${lat}, ${lng}`))
        .catch(() => onSelect(`${lat}, ${lng}`, `${lat}, ${lng}`))
    })
    const timer = window.setTimeout(() => map.invalidateSize(), 100)
    return () => {
      window.clearTimeout(timer)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [initialCoordinates, onSelect])

  return <div ref={mapElement} className="h-64 w-full overflow-hidden rounded-xl border border-cyan-200" aria-label="خريطة اختيار موقع العقد" />
}

export function ContractWizard({ open, records, initialCustomerId = null, initialRequest = null, busy = false, onClose, onSubmit }: ContractWizardProps) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(initialForm)
  const [error, setError] = useState("")
  const [priceConfirmed, setPriceConfirmed] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep(0)
    setError("")
    setPriceConfirmed(false)
    setMapOpen(false)
    const requestCustomer = initialRequest
      ? records.find(record => {
          if (record.kind !== "customer" || record.status === "archived") return false
          const payload = payloadOf(record)
          return String(payload.name ?? payload.customerName ?? "").trim() === initialRequest.clientName.trim() ||
            String(payload.phone ?? "").replace(/\D/g, "") === initialRequest.phone.replace(/\D/g, "")
        })
      : undefined
    const customerId = initialCustomerId ? String(initialCustomerId) : requestCustomer?.id ? String(requestCustomer.id) : ""
    const requestSite = initialRequest
      ? records.find(record => {
          if (record.kind !== "customer_site" || record.status === "archived") return false
          const payload = payloadOf(record)
          const sameCustomer = !customerId || String(payload.customerRecordId) === customerId
          const address = String(payload.address ?? payload.name ?? "")
          return sameCustomer && Boolean(address) && initialRequest.location.includes(address)
        })
      : undefined
    const requestContainer = initialRequest
      ? records.find(record => {
          if (!["container", "container_asset"].includes(record.kind) || record.status === "archived") return false
          const payload = payloadOf(record)
          const type = String(payload.typeName ?? payload.containerType ?? payload.size ?? payload.capacity ?? payload.assetCode ?? "")
          return ["available", "متاح", "active"].includes(record.status) &&
            Boolean(initialRequest.containerSize) && (type.includes(initialRequest.containerSize) || initialRequest.containerSize.includes(type))
        })
      : undefined
    const scheduledDate = initialRequest?.scheduledAt ? new Date(initialRequest.scheduledAt).toISOString().slice(0, 10) : ""
    const billingFrequency = billingFrequencyFromValue(initialRequest?.duration)
    const endDate = endDateFromBillingFrequency(initialForm.startDate, billingFrequency)
    setForm({
      ...initialForm,
      customerRecordId: customerId,
      siteRecordId: requestSite?.id ? String(requestSite.id) : "",
      containerRecordId: requestContainer?.id ? String(requestContainer.id) : "",
      requestId: initialRequest ? String(initialRequest.id) : "",
      endDate,
      customerPhone: initialRequest?.phone ?? "",
      customerEmail: initialRequest?.email ?? "",
      serviceType: initialRequest?.serviceType ?? "",
      containerSize: initialRequest?.containerSize ?? "",
      location: initialRequest?.location ?? "",
      billingFrequency,
      notes: initialRequest?.notes ?? "",
      appointmentDate: scheduledDate,
      appointmentType: initialRequest?.appointmentType === "pickup" ? "pickup" : initialRequest?.appointmentType === "inspection" ? "inspection" : "delivery",
    })
  }, [initialCustomerId, initialRequest, open, records])

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
  const containerCategory = String(containerPayload?.category ?? containerPayload?.classification ?? containerPayload?.categoryName ?? "")
  const containerSize = String(containerPayload?.size ?? containerPayload?.containerSize ?? containerPayload?.capacity ?? containerPayload?.typeName ?? "")
  const categoryOptions = Array.from(new Set([
    "أنقاض",
    "نفايات",
    ...records.filter(record => ["category", "category_size", "container", "container_asset"].includes(record.kind))
      .flatMap(record => {
        const payload = payloadOf(record)
        return [payload.name, payload.category, payload.categoryName, payload.classification]
      })
      .map(value => String(value ?? "").trim())
      .filter(value => value && /أنقاض|نفايات/i.test(value)),
  ]))
  const amount = Number(form.amount || 0)
  const taxRate = Number(form.taxRate || 0)
  const taxInclusive = form.taxInclusive === "true"
  const total = taxInclusive ? amount : amount + Math.round(amount * taxRate) / 100
  const taxAmount = taxInclusive
    ? Math.round((amount - amount / (1 + taxRate / 100)) * 100) / 100
    : Math.round(amount * taxRate * 100) / 100
  const netAmount = taxInclusive ? Math.round((amount - taxAmount) * 100) / 100 : amount

  const update = (key: keyof FormState, value: string) => {
    setError("")
    if (key === "unitPrice" || key === "trips" || key === "amount" || key === "pricingMode") setPriceConfirmed(false)
    setForm(current => {
      const next = { ...current, [key]: value, ...(key === "customerRecordId" ? { siteRecordId: "" } : {}) }
      if (key === "startDate" || key === "billingFrequency") {
        next.endDate = endDateFromBillingFrequency(
          key === "startDate" ? value : next.startDate,
          key === "billingFrequency" ? value as FormState["billingFrequency"] : next.billingFrequency,
        )
      }
      return next
    })
  }

  const selectContainer = (value: string) => {
    const selected = containers.find(record => String(record.id) === value)
    const selectedPayload = selected ? payloadOf(selected) : {}
    const selectedCategory = String(selectedPayload.category ?? selectedPayload.classification ?? selectedPayload.categoryName ?? "")
    const selectedSize = String(selectedPayload.size ?? selectedPayload.containerSize ?? selectedPayload.capacity ?? selectedPayload.typeName ?? "")
    setError("")
    setForm(current => ({
      ...current,
      containerRecordId: value,
      classification: selectedCategory || current.classification,
      containerSize: selectedSize,
    }))
  }

  const handleMapSelect = useCallback((coordinates: string, address: string) => {
    setForm(current => ({ ...current, locationMode: "map", locationCoordinates: coordinates, location: address }))
    setError("")
  }, [])

  if (!open) return null

  const calculatePricing = () => {
    if (form.pricingMode === "manual") {
      if (!form.amount || amount < 0) {
        setError("أدخل قيمة العقد يدويًا قبل الاعتماد.")
        return
      }
      setPriceConfirmed(true)
      setError("")
      return
    }
    const trips = Number(form.trips || 0)
    const unitPrice = Number(form.unitPrice || 0)
    if (!form.unitPrice || unitPrice < 0 || trips <= 0) {
      setError("أدخل عدد الرحلات وسعر الرحلة أولاً لاحتساب قيمة التعاقد.")
      return
    }
    setForm(current => ({ ...current, amount: String(Math.round(trips * unitPrice * 100) / 100) }))
    setPriceConfirmed(true)
    setError("")
  }

  const validateStep = (targetStep = step) => {
    if (targetStep === 0 && !customer) return "اختر عميلاً مسجلاً قبل المتابعة"
    if (targetStep === 1 && !form.location.trim()) return "أدخل الموقع يدويًا أو حدده من الخريطة"
    if (targetStep === 1 && !container) return "اختر أصلاً متاحاً للتخصيص قبل المتابعة"
    if (targetStep === 1 && !form.startDate) return "تاريخ بداية العقد مطلوب"
    if (targetStep === 1 && !form.endDate) return "تاريخ نهاية العقد مطلوب"
    if (targetStep === 1 && form.endDate < form.startDate) return "نهاية العقد يجب أن تكون بعد بدايته"
    if (targetStep === 2 && form.pricingMode === "dynamic" && (!form.unitPrice || Number(form.trips) <= 0 || !priceConfirmed)) return "أدخل عدد الرحلات وسعر الوحدة ثم اعتمد التسعير الديناميكي"
    if (targetStep === 2 && form.pricingMode === "manual" && (!form.amount || amount < 0 || !priceConfirmed)) return "أدخل قيمة العقد يدويًا ثم اعتمد السعر"
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

  const addClause = () => {
    const clause = form.newClause.trim()
    if (!clause) return
    setForm(current => ({ ...current, clauses: [...current.clauses, clause], newClause: "" }))
  }

  const submit = () => {
    const message = [0, 1, 2, 3].map(currentStep => validateStep(currentStep)).find(Boolean)
    if (message) {
      setError(message)
      return
    }
    onSubmit({
      requestId: form.requestId ? Number(form.requestId) : null,
      customerRecordId: customer?.id,
      siteRecordId: site?.id,
      customerName: String(customerPayload?.name ?? customerPayload?.customerName ?? ""),
      customerPhone: String(customerPayload?.phone ?? form.customerPhone ?? ""),
      customerEmail: String(customerPayload?.email ?? form.customerEmail ?? ""),
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
       contractType: form.contractType,
       propertyNumber: form.propertyNumber.trim(),
       planNumber: form.planNumber.trim(),
       classification: form.classification.trim(),
       trips: form.trips ? Number(form.trips) : null,
       unitPrice: form.unitPrice ? Number(form.unitPrice) : null,
       contractTerms: form.clauses.filter(Boolean),
       location: form.location.trim() || String(site ? payloadOf(site).address ?? "" : ""),
       locationCoordinates: form.locationCoordinates,
       locationMode: form.locationMode,
       serviceType: form.serviceType,
       containerSize: form.containerSize,
       duration: form.billingFrequency === "daily" ? "يومي" : form.billingFrequency === "weekly" ? "أسبوعي" : form.billingFrequency === "yearly" ? "سنوي" : "شهري",
       billingFrequency: form.billingFrequency,
      createdFrom: "contract_workflow",
      appointmentDate: form.appointmentDate,
      appointmentTime: form.appointmentTime,
      appointmentType: form.appointmentType,
    })
  }

  const steps = ["العميل", "العقد والأصل", "التسعير", "الجدولة", "المراجعة"]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3 sm:p-6" dir="rtl">
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
              {initialRequest && <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-xs leading-6 text-indigo-950"><div className="font-black">تم تحميل بيانات الطلب #{initialRequest.id}</div><div className="mt-1">الاسم: <b>{initialRequest.clientName}</b> · الجوال: <b dir="ltr">{initialRequest.phone}</b></div><div>الخدمة: <b>{initialRequest.serviceType}</b> · نوع الحاوية: <b>{initialRequest.containerSize || "غير محدد"}</b></div><div>الموقع: <b>{initialRequest.location}</b></div></div>}
              {customer && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-sm font-black text-emerald-900"><ShieldCheck size={17} /> سياق العميل جاهز</div><div className="mt-3 grid grid-cols-2 gap-3 text-xs text-emerald-900"><span>الاسم: <b>{labelOf(customer)}</b></span><span>الجوال: <b dir="ltr">{String(customerPayload?.phone ?? form.customerPhone ?? "—")}</b></span><span>المدينة: <b>{String(customerPayload?.city ?? "—")}</b></span><span>العقود الحالية: <b>{records.filter(record => record.kind === "contract" && String(payloadOf(record).customerRecordId) === String(customer.id) && record.status !== "archived").length}</b></span></div></div>}
            </section>}

            {step === 1 && <section className="space-y-4">
               <div><h3 className="font-black text-slate-900">بيانات العقد والتخصيص</h3><p className="mt-1 text-sm text-slate-500">لا يمكن إصدار عقد تشغيلي دون موقع عميل وأصل متاح وفترة واضحة.</p></div>
               {initialRequest && <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs leading-6 text-indigo-950"><div className="mb-2 font-black">بيانات الطلب المحملة تلقائياً</div><div className="grid gap-x-4 sm:grid-cols-2"><span>العميل: <b>{initialRequest.clientName}</b></span><span>الجوال: <b dir="ltr">{initialRequest.phone}</b></span><span>الخدمة: <b>{initialRequest.serviceType}</b></span><span>الحاوية المطلوبة: <b>{initialRequest.containerSize || "غير محدد"}</b></span><span className="sm:col-span-2">العنوان: <b>{initialRequest.location}</b></span>{initialRequest.duration && <span>المدة: <b>{initialRequest.duration}</b></span>}{initialRequest.notes && <span className="sm:col-span-2">الملاحظات: <b>{initialRequest.notes}</b></span>}</div></div>}
               <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label htmlFor="contract-type">نوع العقد</Label><select id="contract-type" value={form.contractType} onChange={event => update("contractType", event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="نفايات">نفايات</option><option value="أنقاض">أنقاض</option></select></div>
                <div><Label htmlFor="contract-number">رقم العقد</Label><Input id="contract-number" value={form.contractNumber} onChange={event => update("contractNumber", event.target.value)} placeholder="سيولد تلقائياً عند الحفظ" className="mt-2" dir="ltr" /><p className="mt-1 text-[11px] text-slate-500">اتركه فارغاً ليولد النظام رقماً فريداً تلقائياً.</p></div>
                 <div><Label htmlFor="contract-container">أصل الحاوية</Label><select id="contract-container" value={form.containerRecordId} onChange={event => selectContainer(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">اختر الأصل</option>{containers.map(record => <option key={record.id} value={record.id}>{labelOf(record)} · {String(payloadOf(record).typeName ?? payloadOf(record).size ?? "نوع غير محدد")}</option>)}</select></div>
                   <div className="sm:col-span-2"><Label htmlFor="contract-location">موقع العقد</Label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><Input id="contract-location" value={form.location} onChange={event => setForm(current => ({ ...current, location: event.target.value, locationMode: "manual", locationCoordinates: "" }))} placeholder="أدخل العنوان يدويًا أو اختر نقطة من الخريطة" className="flex-1" /><Button type="button" variant="outline" onClick={() => setMapOpen(current => !current)} className="gap-2 border-cyan-200 text-cyan-800"><MapPin size={16} /> {mapOpen ? "إخفاء الخريطة" : "اختيار من الخريطة"}</Button></div>{mapOpen && <div className="mt-3 space-y-2"><p className="text-xs text-slate-500">انقر على النقطة المطلوبة مباشرة على الخريطة، وسيتم حفظ الإحداثيات والعنوان الناتج.</p><MapPicker initialCoordinates={form.locationCoordinates} onSelect={handleMapSelect} /></div>}{form.locationMode === "map" && <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-700"><LocateFixed size={13} /> تم اختيار الموقع يدويًا: {form.locationCoordinates}</p>}</div>
                  {form.locationMode === "manual" && <><div><Label htmlFor="contract-site">موقع العميل المسجل</Label><select id="contract-site" value={form.siteRecordId} onChange={event => update("siteRecordId", event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">{sites.length ? "اختر موقع العميل" : "لا توجد مواقع لهذا العميل"}</option>{sites.map(record => <option key={record.id} value={record.id}>{labelOf(record)} · {String(payloadOf(record).address ?? "")}</option>)}</select></div><div><Label htmlFor="contract-property-number">رقم القطعة</Label><Input id="contract-property-number" value={form.propertyNumber} onChange={event => update("propertyNumber", event.target.value)} placeholder="رقم القطعة" className="mt-2" /></div><div><Label htmlFor="contract-plan-number">رقم المخطط</Label><Input id="contract-plan-number" value={form.planNumber} onChange={event => update("planNumber", event.target.value)} placeholder="رقم المخطط" className="mt-2" /></div></>}
                  <div><Label htmlFor="contract-classification">التصنيف</Label><select id="contract-classification" value={form.classification || containerCategory} onChange={event => update("classification", event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">اختر التصنيف</option>{categoryOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></div>
                  <div><Label htmlFor="contract-size">حجم الحاوية</Label><Input id="contract-size" value={form.containerSize || containerSize} readOnly placeholder="يُحدد تلقائيًا من الأصل" className="mt-2 bg-slate-50" /></div>
                 <div><Label htmlFor="contract-trips">عدد الرحلات</Label><Input id="contract-trips" type="number" min="0" value={form.trips} onChange={event => update("trips", event.target.value)} placeholder="عدد الرحلات" className="mt-2" dir="ltr" /></div>
                  <div><Label htmlFor="contract-billing-frequency">دورية التعاقد</Label><select id="contract-billing-frequency" value={form.billingFrequency} onChange={event => update("billingFrequency", event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="daily">يومي</option><option value="weekly">أسبوعي</option><option value="monthly">شهري</option><option value="yearly">سنوي</option></select><p className="mt-1 text-[11px] text-slate-500">يُحتسب تاريخ النهاية تلقائيًا من تاريخ البداية.</p></div>
                <div><Label htmlFor="contract-start">بداية العقد</Label><Input id="contract-start" type="date" value={form.startDate} onChange={event => update("startDate", event.target.value)} className="mt-2" dir="ltr" /></div>
                <div><Label htmlFor="contract-end">نهاية العقد</Label><Input id="contract-end" type="date" value={form.endDate} onChange={event => update("endDate", event.target.value)} className="mt-2" dir="ltr" /></div>
              </div>
              {container && <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-950"><b>{labelOf(container)}</b><span className="mx-2 text-cyan-500">·</span>{String(containerPayload?.typeName ?? "نوع غير محدد")}<span className="mx-2 text-cyan-500">·</span>الحالة الحالية: <Badge variant="outline" className="border-cyan-200 bg-white text-cyan-800">{recordStatusLabel(container.status)}</Badge></div>}
            </section>}

            {step === 2 && <section className="space-y-4">
              <div><h3 className="font-black text-slate-900">التسعير والضريبة</h3><p className="mt-1 text-sm text-slate-500">أدخل القيمة الأساسية، وسيحسب النظام الضريبة والإجمالي تلقائيًا.</p></div>
                <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="contract-pricing-mode">طريقة التسعير</Label><select id="contract-pricing-mode" value={form.pricingMode} onChange={event => update("pricingMode", event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="dynamic">ديناميكي حسب عدد الرحلات</option><option value="manual">إدخال يدوي لقيمة العقد</option></select></div><div><Label htmlFor="contract-tax">نسبة الضريبة %</Label><Input id="contract-tax" type="number" min="0" value={form.taxRate} onChange={event => update("taxRate", event.target.value)} className="mt-2" dir="ltr" /></div></div>
                {form.pricingMode === "dynamic" ? <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="contract-trips-pricing">عدد الرحلات</Label><Input id="contract-trips-pricing" type="number" min="1" value={form.trips} onChange={event => update("trips", event.target.value)} className="mt-2" dir="ltr" placeholder="0" /></div><div><Label htmlFor="contract-unit-price">سعر الوحدة / الرحلة</Label><Input id="contract-unit-price" type="number" min="0" value={form.unitPrice} onChange={event => update("unitPrice", event.target.value)} className="mt-2" dir="ltr" placeholder="0" /></div></div> : <div><Label htmlFor="contract-amount">قيمة العقد قبل الضريبة</Label><Input id="contract-amount" type="number" min="0" value={form.amount} onChange={event => update("amount", event.target.value)} className="mt-2" dir="ltr" placeholder="أدخل القيمة" /><p className="mt-1 text-[11px] text-slate-500">لن يتم احتسابها من عدد الرحلات.</p></div>}
               <div className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 text-center"><div><p className="text-xs text-slate-500">قبل الضريبة</p><b className="mt-1 block text-lg text-slate-900">{netAmount.toLocaleString("ar-SA")} ر.س</b></div><div><p className="text-xs text-slate-500">الضريبة</p><b className="mt-1 block text-lg text-amber-700">{taxAmount.toLocaleString("ar-SA")} ر.س</b></div><div><p className="text-xs text-slate-500">الإجمالي</p><b className="mt-1 block text-lg text-emerald-700">{total.toLocaleString("ar-SA")} ر.س</b></div></div>
               <div><Label htmlFor="contract-notes">ملاحظات</Label><textarea id="contract-notes" value={form.notes} onChange={event => update("notes", event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-cyan-600" placeholder="شروط التسليم أو الاستثناءات..." /></div>
               <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4"><div><h4 className="font-black text-slate-900">بنود العقد</h4><p className="mt-1 text-xs text-slate-600">البنود الموجودة محفوظة تلقائياً، ويمكنك إضافة أي بند خاص بالعقد.</p></div><ol className="mt-3 space-y-2 pr-5 text-sm leading-6">{form.clauses.map((clause, index) => <li key={`${clause}-${index}`} className="flex items-start gap-2"><span className="flex-1">{clause}</span><button type="button" onClick={() => setForm(current => ({ ...current, clauses: current.clauses.filter((_, clauseIndex) => clauseIndex !== index) }))} className="mt-1 text-rose-600 hover:text-rose-800" aria-label="حذف البند"><Trash2 size={15} /></button></li>)}</ol><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input value={form.newClause} onChange={event => update("newClause", event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addClause() } }} placeholder="اكتب بنداً جديداً" /><Button type="button" variant="outline" onClick={addClause} className="gap-2 border-amber-300 text-amber-900 hover:bg-amber-100"><Plus size={16} /> إضافة البند</Button></div></div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-emerald-950">تأكيد التسعير</p><p className="mt-1 text-xs text-emerald-800">{form.pricingMode === "dynamic" ? "سيحسب النظام قيمة العقد من عدد الرحلات × سعر الوحدة." : "سيستخدم النظام القيمة التي أدخلتها مباشرة."}</p></div><Button type="button" onClick={calculatePricing} className="gap-2 bg-emerald-700 hover:bg-emerald-800"><CheckCircle2 size={16} /> اعتماد السعر</Button></div>{priceConfirmed && <p className="mt-3 text-xs font-bold text-emerald-700">تم اعتماد السعر: {amount.toLocaleString("ar-SA")} ر.س قبل الضريبة</p>}</div></section>}

            {step === 3 && <section className="space-y-4">
              <div><h3 className="font-black text-slate-900">العملية الأولى والموعد</h3><p className="mt-1 text-sm text-slate-500">اربط العقد بموعد حقيقي حتى يظهر مباشرة في مركز التشغيل.</p></div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><Label htmlFor="appointment-type">نوع العملية</Label><select id="appointment-type" value={form.appointmentType} onChange={event => update("appointmentType", event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="delivery">تسليم الحاوية</option><option value="pickup">استرجاع الحاوية</option><option value="inspection">فحص وتجهيز</option></select></div>
                <div><Label htmlFor="appointment-date">تاريخ الموعد</Label><Input id="appointment-date" type="date" value={form.appointmentDate} onChange={event => update("appointmentDate", event.target.value)} className="mt-2" dir="ltr" /></div>
                <div><Label htmlFor="appointment-time">الوقت المتوقع</Label><Input id="appointment-time" type="time" value={form.appointmentTime} onChange={event => update("appointmentTime", event.target.value)} className="mt-2" dir="ltr" /></div>
              </div>
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm leading-6 text-cyan-950">سيُنشأ موعد مرتبط بالعقد والعميل والأصل بعد نجاح الإصدار. إذا رفض النظام الموعد بسبب تعارض، سيبقى العقد محفوظًا وتظهر نتيجة واضحة للمشرف.</div>
            </section>}

              {step === 4 && <section className="space-y-4"><div><h3 className="font-black text-slate-900">مراجعة قبل الإضافة</h3><p className="mt-1 text-sm text-slate-500">اضغط «تأكيد وإضافة العقد» لحفظ التعاقد وبنوده.</p></div>{initialRequest && <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-xs leading-6 text-indigo-950"><b>مصدر العقد: طلب الخدمة #{initialRequest.id}</b><div>العنوان: {initialRequest.location} · الحاوية المطلوبة: {initialRequest.containerSize || "غير محدد"}</div></div>}<div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2"><span>العميل: <b>{customer ? labelOf(customer) : initialRequest?.clientName || "—"}</b></span><span>الموقع: <b>{site ? labelOf(site) : initialRequest?.location || "—"}</b></span><span>نوع العقد: <b>{form.contractType}</b></span><span>رقم القطعة / المخطط: <b>{form.propertyNumber || "—"} / {form.planNumber || "—"}</b></span><span>الأصل: <b>{container ? labelOf(container) : initialRequest?.containerSize || "—"}</b></span><span>الفترة: <b dir="ltr">{form.startDate || "—"} → {form.endDate || "—"}</b></span><span>عدد البنود: <b>{form.clauses.length}</b></span><span>الإجمالي: <b>{total.toLocaleString("ar-SA")} ر.س</b></span></div><div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-6 text-amber-950"><ShieldCheck size={16} className="mt-1 shrink-0" />سيُحفظ العقد مع بيانات العميل والموقع والأصل والبنود المضافة، وسيُنشأ موعد مرتبط به.</div></section>}

            {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700" role="alert">{error}</p>}
             <div className="flex items-center justify-between border-t border-slate-100 pt-5"><Button type="button" variant="outline" onClick={step === 0 ? onClose : () => { setError(""); setStep(current => current - 1) }} className="gap-2">{step === 0 ? "إلغاء" : <><ArrowRight size={16} /> السابق</>}</Button>{step < 4 ? <Button type="button" onClick={next} className="gap-2 bg-cyan-800 hover:bg-cyan-900">التالي <ArrowLeft size={16} /></Button> : <Button type="button" disabled={busy} onClick={submit} className="gap-2 bg-emerald-700 hover:bg-emerald-800">{busy ? "جارٍ الحفظ..." : "تأكيد وإضافة العقد"} <CheckCircle2 size={16} /></Button>}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function recordStatusLabel(status: string) {
  return status === "available" || status === "متاح" || status === "active" ? "متاح" : status
}