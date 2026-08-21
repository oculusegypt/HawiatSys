import { useMemo, useState } from "react"
import {
  getGetAdminWorkOrdersQueryKey,
  getGetDriverWorkOrdersQueryKey,
  useGetAdminWorkOrders,
  useGetDriverWorkOrders,
  useUpdateDriverWorkOrder,
  DriverWorkOrderStatus,
  type ServiceRequest,
} from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { SignaturePad } from "./ContainerSystemComponents"
import {
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  Play,
  RotateCcw,
  UserRound,
  X,
  XCircle,
} from "lucide-react"

const STATUS: Record<string, { label: string; tone: string; dot: string }> = {
  assigned: { label: "بانتظار قبول السائق", tone: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  accepted: { label: "مقبول — جاهز للبدء", tone: "bg-sky-50 text-sky-800 border-sky-200", dot: "bg-sky-500" },
  started: { label: "قيد التنفيذ", tone: "bg-indigo-50 text-indigo-800 border-indigo-200", dot: "bg-indigo-500" },
  rejected: { label: "مرفوض", tone: "bg-rose-50 text-rose-800 border-rose-200", dot: "bg-rose-500" },
  completed: { label: "مكتمل", tone: "bg-emerald-50 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
}

function statusInfo(status?: string) {
  return STATUS[status ?? ""] ?? { label: "غير محدد", tone: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400" }
}

function directionsUrl(location: string) {
  const gps = location.match(/إحداثيات GPS:\s*([-\d.]+),\s*([-\d.]+)/) ?? location.match(/^([-\d.]+),\s*([-\d.]+)$/)
  const destination = gps ? `${gps[1]},${gps[2]}` : `${location}، الرياض، المملكة العربية السعودية`
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

function SummaryTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm" data-testid={`summary-${label}`}>
      <div className={`mb-3 h-1.5 w-10 rounded-full ${accent}`} />
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{value}</p>
    </div>
  )
}

function OrderDetailsDialog({ order, open, onClose, isDriver }: {
  order: ServiceRequest | null
  open: boolean
  onClose: () => void
  isDriver: boolean
}) {
  if (!order) return null
  const cleanLocation = order.location.replace(/\n?إحداثيات GPS:\s*[-\d.]+,\s*[-\d.]+/, "").trim()
  const locationLabel = cleanLocation || order.location
  const mapUrl = directionsUrl(order.location)

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-xl overflow-y-auto rounded-2xl p-0" dir="rtl">
        <div className="bg-[#0b2a3f] px-5 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-right text-xl font-black text-white">تفاصيل أمر العمل #{order.id}</DialogTitle>
          </DialogHeader>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusInfo(order.driverStatus).tone}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusInfo(order.driverStatus).dot}`} />
              {statusInfo(order.driverStatus).label}
            </span>
            {order.assignedDriverName && (
              <span className="text-xs text-white/70">السائق: {order.assignedDriverName}</span>
            )}
          </div>
        </div>

        <div className="space-y-4 p-5">
          <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <UserRound size={16} className="text-[#0b2a3f]" /> بيانات العميل
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="اسم العميل" value={order.clientName} />
              <div>
                <p className="text-[11px] font-semibold text-slate-400">رقم الجوال</p>
                <a href={`tel:${order.phone}`} dir="ltr" className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:underline">
                  <Phone size={14} /> {order.phone}
                </a>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <ClipboardList size={16} className="text-[#0b2a3f]" /> تفاصيل الخدمة
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="نوع الخدمة" value={order.serviceType} />
              <Info label="باقة التنظيف / العقار" value={order.containerSize || "غير محدد"} />
              <Info label="المدة" value={order.duration || "حسب الطلب"} />
              <Info label="الموعد" value={order.scheduledAt ? new Date(order.scheduledAt).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" }) : "حسب التوفر"} />
            </div>
            {order.notes && (
              <div className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-600">
                <p className="mb-1 text-xs font-bold text-slate-400">ملاحظات الطلب</p>
                <p className="whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <MapPin size={16} className="text-rose-600" /> موقع التنفيذ
            </h3>
            <p className="text-sm leading-6 text-slate-700">{locationLabel || "الموقع غير محدد"}</p>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
              data-testid={`button-directions-${order.id}`}
            >
              <Navigation size={17} /> فتح الاتجاهات إلى موقع الطلب <ExternalLink size={14} />
            </a>
          </section>

          {isDriver && (
            <p className="text-center text-[11px] text-slate-400">تفاصيل التشغيل لا تتضمن بيانات الأسعار.</p>
          )}

          {(order.driverReceiverName || order.driverSignatureData || order.driverProofPhotoUrl || order.driverNotes) && (
            <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800">
                <CheckCircle2 size={16} className="text-emerald-600" /> إثبات التنفيذ
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {order.driverReceiverName && <Info label="اسم المستلم" value={order.driverReceiverName} />}
                {order.driverCompletedAt && <Info label="وقت الإكمال" value={new Date(order.driverCompletedAt).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })} />}
                {order.driverLocationLat && order.driverLocationLng && <Info label="موقع التنفيذ" value={`${order.driverLocationLat}, ${order.driverLocationLng}`} />}
              </div>
              {order.driverProofPhotoUrl && (
                <a href={order.driverProofPhotoUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-bold text-emerald-700 hover:underline">
                  فتح صورة إثبات التنفيذ <ExternalLink size={14} className="mr-1" />
                </a>
              )}
              {order.driverSignatureData && <p className="mt-3 text-xs font-bold text-emerald-800">تم حفظ توقيع العميل.</p>}
              {order.driverNotes && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-3 text-sm leading-6 text-slate-600">{order.driverNotes}</p>}
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  )
}

function CompletionEvidenceDialog({ open, onClose, onSubmit, pending }: {
  open: boolean
  onClose: () => void
  onSubmit: (evidence: { receiverName: string; locationLat: string; locationLng: string; proofPhotoUrl: string; signatureData: string }) => void
  pending: boolean
}) {
  const [receiverName, setReceiverName] = useState("")
  const [locationLat, setLocationLat] = useState("")
  const [locationLng, setLocationLng] = useState("")
  const [proofPhotoUrl, setProofPhotoUrl] = useState("")
  const [signatureData, setSignatureData] = useState("")
  return (
    <Dialog open={open} onOpenChange={value => { if (!value) onClose() }}>
      <DialogContent dir="rtl" className="max-w-xl">
        <DialogHeader><DialogTitle>إثبات إكمال المهمة</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); onSubmit({ receiverName, locationLat, locationLng, proofPhotoUrl, signatureData }) }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">اسم المستلم<input required value={receiverName} onChange={event => setReceiverName(event.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="اسم ممثل العميل" /></label>
            <label className="text-xs font-bold text-slate-600">رابط صورة الإثبات<input value={proofPhotoUrl} onChange={event => setProofPhotoUrl(event.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="اختياري" /></label>
            <label className="text-xs font-bold text-slate-600">خط العرض<input value={locationLat} onChange={event => setLocationLat(event.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="24.7136" dir="ltr" /></label>
            <label className="text-xs font-bold text-slate-600">خط الطول<input value={locationLng} onChange={event => setLocationLng(event.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="46.6753" dir="ltr" /></label>
          </div>
          <SignaturePad value={signatureData} onChange={setSignatureData} />
          <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="submit" disabled={pending || !signatureData} className="bg-emerald-600 hover:bg-emerald-700">{pending ? "جارٍ الحفظ..." : "تأكيد الإكمال"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function WorkOrderCard({
  order,
  onAction,
  onOpenDetails,
  pending,
  isDriver,
}: {
  order: ServiceRequest
  onAction: (order: ServiceRequest, status: DriverWorkOrderStatus) => void
  onOpenDetails: (order: ServiceRequest) => void
  pending: boolean
  isDriver: boolean
}) {
  const info = statusInfo(order.driverStatus)
  const isHistory = order.driverStatus === DriverWorkOrderStatus.rejected || order.driverStatus === DriverWorkOrderStatus.completed
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5" data-testid={`card-work-order-${order.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-400">طلب #{order.id}</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${info.tone}`} data-testid={`status-work-order-${order.id}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${info.dot}`} /> {info.label}
            </span>
          </div>
          <h3 className="mt-3 truncate text-lg font-extrabold text-slate-900">{order.serviceType}</h3>
          <p className="mt-1 text-sm text-slate-500">{order.clientName}</p>
          {!isDriver && order.assignedDriverName && <p className="mt-1 text-xs font-semibold text-slate-400">السائق: {order.assignedDriverName}</p>}
        </div>
        <div className="rounded-xl bg-[#0b2a3f] p-2.5 text-[#e0b84f]"><ClipboardList size={20} /></div>
      </div>

      <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-2"><MapPin size={15} className="shrink-0 text-slate-400" /><span className="truncate">{order.location || "الموقع غير محدد"}</span></div>
        <div className="flex items-center gap-2"><Clock3 size={15} className="shrink-0 text-slate-400" /><span>{order.scheduledAt ? new Date(order.scheduledAt).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" }) : "حسب التوفر"}</span></div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
        <Button variant="outline" onClick={() => onOpenDetails(order)} className="h-11 flex-1 gap-2 border-slate-200 text-slate-700 hover:bg-slate-50" data-testid={`button-details-${order.id}`}>
          <ClipboardList size={16} /> عرض التفاصيل
        </Button>
        {isDriver && !isHistory && (
          <>
            {order.driverStatus === DriverWorkOrderStatus.assigned && (
              <>
                <Button disabled={pending} onClick={() => onAction(order, DriverWorkOrderStatus.accepted)} className="h-11 flex-1 gap-2 bg-[#0b2a3f] text-white hover:bg-[#123f5a]" data-testid={`button-accept-${order.id}`}><Check size={16} /> قبول</Button>
                <Button disabled={pending} variant="outline" onClick={() => onAction(order, DriverWorkOrderStatus.rejected)} className="h-11 flex-1 gap-2 border-rose-200 text-rose-700 hover:bg-rose-50" data-testid={`button-reject-${order.id}`}><X size={16} /> رفض</Button>
              </>
            )}
            {order.driverStatus === DriverWorkOrderStatus.accepted && <Button disabled={pending} onClick={() => onAction(order, DriverWorkOrderStatus.started)} className="h-11 flex-1 gap-2 bg-indigo-600 text-white hover:bg-indigo-700" data-testid={`button-start-${order.id}`}><Play size={16} /> بدء التنفيذ</Button>}
            {order.driverStatus === DriverWorkOrderStatus.started && <Button disabled={pending} onClick={() => onAction(order, DriverWorkOrderStatus.completed)} className="h-11 flex-1 gap-2 bg-emerald-600 text-white hover:bg-emerald-700" data-testid={`button-complete-${order.id}`}><CheckCircle2 size={16} /> تأكيد الإكمال</Button>}
          </>
        )}
      </div>
    </article>
  )
}

export default function WorkOrders() {
  const { toast } = useToast()
  const isDriver = localStorage.getItem("admin_role") === "driver"
  const isManager = ["admin", "manager"].includes(localStorage.getItem("admin_role") ?? "")
  const driverQuery = useGetDriverWorkOrders(undefined, { query: { enabled: isDriver, queryKey: getGetDriverWorkOrdersQueryKey() } })
  const managerQuery = useGetAdminWorkOrders({ query: { enabled: isManager, queryKey: getGetAdminWorkOrdersQueryKey() } })
  const activeQuery = isDriver ? driverQuery : managerQuery
  const orders = activeQuery.data
  const { mutate: updateOrder, isPending } = useUpdateDriverWorkOrder()
  const [view, setView] = useState<"active" | "history">("active")
  const [selectedOrder, setSelectedOrder] = useState<ServiceRequest | null>(null)
  const [completionTarget, setCompletionTarget] = useState<ServiceRequest | null>(null)

  const counts = useMemo(() => ({
    assigned: orders?.filter(o => o.driverStatus === DriverWorkOrderStatus.assigned).length ?? 0,
    accepted: orders?.filter(o => o.driverStatus === DriverWorkOrderStatus.accepted).length ?? 0,
    started: orders?.filter(o => o.driverStatus === DriverWorkOrderStatus.started).length ?? 0,
    history: orders?.filter(o => o.driverStatus === DriverWorkOrderStatus.rejected || o.driverStatus === DriverWorkOrderStatus.completed).length ?? 0,
  }), [orders])

  const visibleOrders = (orders ?? []).filter(order =>
    view === "active"
      ? order.driverStatus !== DriverWorkOrderStatus.rejected && order.driverStatus !== DriverWorkOrderStatus.completed
      : order.driverStatus === DriverWorkOrderStatus.rejected || order.driverStatus === DriverWorkOrderStatus.completed,
  )

  function handleAction(order: ServiceRequest, status: DriverWorkOrderStatus) {
    const extended = order as ServiceRequest & { contractRecordId?: number | null; containerRecordId?: number | null }
    const isContainerOrder = Boolean(extended.contractRecordId || extended.containerRecordId) ||
      /حاوي|أنقاض|تفريغ|سحب|استرجاع|تسليم|container|debris|waste/i.test(`${order.serviceType} ${order.containerSize}`)
    if (status === DriverWorkOrderStatus.completed && isContainerOrder) {
      setCompletionTarget(order)
      return
    }
    const notes = status === DriverWorkOrderStatus.rejected ? window.prompt("اذكر سبب رفض المهمة")?.trim() : null
    if (status === DriverWorkOrderStatus.rejected && !notes) {
      toast({ variant: "destructive", title: "سبب الرفض مطلوب" })
      return
    }
    updateOrder({ id: order.id, data: { status, notes: notes ?? null } }, {
      onSuccess: () => {
        toast({ title: status === DriverWorkOrderStatus.completed ? "تم إكمال المهمة" : "تم تحديث حالة المهمة" })
        activeQuery.refetch()
      },
      onError: () => toast({ variant: "destructive", title: "تعذر تحديث المهمة", description: "تحقق من الاتصال وحاول مرة أخرى" }),
    })
  }

  function submitCompletion(evidence: { receiverName: string; locationLat: string; locationLng: string; proofPhotoUrl: string; signatureData: string }) {
    if (!completionTarget) return
    updateOrder({ id: completionTarget.id, data: { status: DriverWorkOrderStatus.completed, notes: "تم استلام إثبات التسليم من السائق", ...evidence } }, {
      onSuccess: () => {
        toast({ title: "تم إكمال المهمة وحفظ إثبات التسليم" })
        setCompletionTarget(null)
        activeQuery.refetch()
      },
      onError: () => toast({ variant: "destructive", title: "تعذر حفظ إثبات المهمة", description: "تحقق من البيانات وحاول مرة أخرى" }),
    })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6" dir="rtl">
      <header className="rounded-[1.75rem] bg-[#0b2a3f] px-5 py-6 text-white shadow-lg sm:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#e0b84f]">{isDriver ? "مسار العمل اليومي" : "متابعة التشغيل"}</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">{isDriver ? "مهامي الحالية" : "مهام السائقين الحالية"}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">{isDriver ? "راجع تفاصيل الطلب، افتح الاتجاهات، وحدّث الحالة عند كل انتقال." : "عرض مباشر لجميع أوامر العمل المسندة إلى السائقين ومراحل تنفيذها."}</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/75"><span className="h-2 w-2 rounded-full bg-emerald-300" /> لوحة تشغيل مباشرة</div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile label="بانتظار القبول" value={counts.assigned} accent="bg-amber-500" />
        <SummaryTile label="مقبولة" value={counts.accepted} accent="bg-sky-500" />
        <SummaryTile label="قيد التنفيذ" value={counts.started} accent="bg-indigo-500" />
        <SummaryTile label={isDriver ? "السجل" : "إجمالي الحالي"} value={isDriver ? counts.history : (orders?.length ?? 0)} accent="bg-slate-400" />
      </section>

      {isDriver && (
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button onClick={() => setView("active")} className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${view === "active" ? "bg-[#0b2a3f] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid="button-active-orders">المهام الحالية</button>
            <button onClick={() => setView("history")} className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${view === "history" ? "bg-[#0b2a3f] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid="button-order-history">السجل</button>
          </div>
          <p className="text-xs text-slate-500">{visibleOrders.length} مهمة</p>
        </div>
      )}

      {activeQuery.isLoading && <div className="grid gap-4 md:grid-cols-2" aria-label="جاري تحميل المهام" data-testid="loading-work-orders">{[1, 2, 3, 4].map(item => <Card key={item} className="h-52 animate-pulse border-0 bg-slate-200/70"><CardContent /></Card>)}</div>}
      {activeQuery.isError && <Card className="border-rose-200 bg-rose-50" data-testid="error-work-orders"><CardContent className="flex flex-col items-center gap-3 p-8 text-center"><XCircle className="text-rose-600" /><p className="font-bold text-rose-900">تعذر تحميل مهام العمل</p><p className="text-sm text-rose-700">تحقق من الصلاحية والاتصال ثم أعد المحاولة.</p><Button onClick={() => activeQuery.refetch()} variant="outline" className="gap-2 border-rose-200 text-rose-700"><RotateCcw size={15} /> إعادة المحاولة</Button></CardContent></Card>}
      {!activeQuery.isLoading && !activeQuery.isError && visibleOrders.length === 0 && <Card className="border-dashed border-slate-300 bg-slate-50/60" data-testid="empty-work-orders"><CardContent className="flex flex-col items-center gap-3 p-10 text-center"><CheckCircle2 className="text-emerald-600" size={30} /><p className="font-bold text-slate-800">{isDriver ? (view === "active" ? "لا توجد مهام تحتاج إجراءً الآن" : "لا يوجد سجل مهام بعد") : "لا توجد أوامر عمل حالية"}</p><p className="text-sm text-slate-500">{isDriver ? "ستظهر هنا المهام الجديدة بمجرد إسنادها إليك." : "ستظهر هنا الطلبات التي تم إسنادها إلى السائقين حتى إكمالها."}</p></CardContent></Card>}
      {!activeQuery.isLoading && !activeQuery.isError && visibleOrders.length > 0 && <div className="grid gap-4 md:grid-cols-2">{visibleOrders.map(order => <WorkOrderCard key={order.id} order={order} onAction={handleAction} onOpenDetails={setSelectedOrder} pending={isPending} isDriver={isDriver} />)}</div>}

      <OrderDetailsDialog order={selectedOrder} open={!!selectedOrder} onClose={() => setSelectedOrder(null)} isDriver={isDriver} />
      <CompletionEvidenceDialog open={Boolean(completionTarget)} onClose={() => setCompletionTarget(null)} onSubmit={submitCompletion} pending={isPending} />
    </div>
  )
}