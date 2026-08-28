import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Search, CheckCircle, Clock, Truck, XCircle, Package,
  MapPin, Phone, CalendarClock, Zap, FileText, ChevronRight,
  Loader2, AlertCircle, RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { normalizeCompanyText, useSiteSettings } from "@/context/SiteSettingsContext"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    label: "جديد",
    desc: "تم استلام طلبك وسيتم التواصل معك قريباً",
    icon: Clock,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
    step: 1,
  },
  in_progress: {
    label: "قيد التنفيذ",
    desc: "طلبك قيد التنفيذ حالياً وسيكتمل قريباً",
    icon: Truck,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    dot: "bg-orange-500",
    step: 2,
  },
  completed: {
    label: "مكتمل",
    desc: "تم تنفيذ طلبك بنجاح. شكراً لثقتك بالشركة",
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    dot: "bg-green-500",
    step: 3,
  },
  cancelled: {
    label: "ملغي",
    desc: "تم إلغاء هذا الطلب. للاستفسار تواصل معنا مباشرة",
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-400",
    step: 0,
  },
}

const STEPS = [
  { key: "pending",     label: "استلام الطلب",  icon: FileText    },
  { key: "in_progress", label: "قيد التنفيذ",   icon: Truck       },
  { key: "completed",   label: "تم التنفيذ",    icon: CheckCircle },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskPhone(phone: string) {
  if (!phone || phone.length < 4) return phone
  return phone.slice(0, -4).replace(/./g, "*") + phone.slice(-4)
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface TrackOrderModalProps {
  isOpen: boolean
  onClose: () => void
  initialId?: string
}

interface OrderData {
  id: number
  clientName: string
  phone: string
  serviceType: string
  containerSize: string | null
  location: string
  status: string
  appointmentType: string
  scheduledAt: string | null
  notes: string | null
  adminNotes: string | null
  createdAt: string
  updatedAt: string
}

export function TrackOrderModal({ isOpen, onClose, initialId }: TrackOrderModalProps) {
  const { companyName } = useSiteSettings()
  const [inputId, setInputId] = useState(initialId || "")
  const [loading, setLoading]   = useState(false)
  const [order,   setOrder]     = useState<OrderData | null>(null)
  const [error,   setError]     = useState<string | null>(null)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setInputId(initialId || "")
      setOrder(null)
      setError(null)
    }
  }, [isOpen, initialId])

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  const search = async () => {
    const id = inputId.trim().replace("#", "")
    if (!id || isNaN(Number(id))) {
      setError("أدخل رقم الطلب بشكل صحيح")
      return
    }
    setLoading(true)
    setError(null)
    setOrder(null)
    try {
      const res = await fetch(`${API_BASE}/api/service-requests/${id}`)
      if (res.status === 404) {
        setError("لم يُعثر على طلب بهذا الرقم. تأكد من الرقم وأعد المحاولة.")
        return
      }
      if (!res.ok) throw new Error()
      const data = await res.json()
      setOrder(data)
    } catch {
      setError("حدث خطأ في الاتصال. حاول مرة أخرى.")
    } finally {
      setLoading(false)
    }
  }

  const cfg = order ? (STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending) : null
  const isCancelled = order?.status === "cancelled"

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
          >
            {/* Header */}
            <div className="bg-primary text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                  <Search size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-base">تتبّع حالة الطلب</h2>
                  <p className="text-white/60 text-xs">{companyName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5">

              {/* Search box */}
              <div className="mb-5">
                <p className="text-sm text-gray-500 mb-3">
                  أدخل رقم الطلب الذي وصلك عند إرسال الطلب
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm select-none">#</span>
                    <Input
                      value={inputId}
                      onChange={(e) => { setInputId(e.target.value); setError(null) }}
                      onKeyDown={(e) => { if (e.key === "Enter") search() }}
                      placeholder="مثال: 42"
                      dir="ltr"
                      type="number"
                      min="1"
                      className="pr-7 h-12 bg-gray-50 border-gray-200 text-lg font-bold text-left"
                    />
                  </div>
                  <Button
                    onClick={search}
                    disabled={loading}
                    className="h-12 px-5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl"
                  >
                    {loading
                      ? <Loader2 size={18} className="animate-spin" />
                      : <Search size={18} />
                    }
                  </Button>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-red-500 text-xs mt-2"
                    >
                      <AlertCircle size={13} /> {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Result */}
              <AnimatePresence mode="wait">
                {order && cfg && (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {/* Order ID + status badge */}
                    <div className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">رقم الطلب</p>
                          <p className="text-3xl font-black text-primary">#{order.id}</p>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${cfg.bg} border ${cfg.border}`}>
                          <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
                          <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
                        </div>
                      </div>
                     <p className={`text-sm ${cfg.color} font-medium`}>{normalizeCompanyText(cfg.desc)}</p>
                    </div>

                    {/* Progress steps (not cancelled) */}
                    {!isCancelled && (
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-1">
                          {STEPS.map((step, i) => {
                            const Icon = step.icon
                            const done  = (cfg.step) > i
                            const active = cfg.step === i + 1
                            return (
                              <div key={step.key} className="flex-1 flex flex-col items-center gap-1.5">
                                {/* connector left */}
                                <div className="flex items-center w-full">
                                  {i > 0 && (
                                    <div className={`flex-1 h-0.5 ${done || active ? "bg-primary" : "bg-gray-200"}`} />
                                  )}
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                                    done   ? "bg-primary text-white shadow-md shadow-primary/30"
                                    : active ? "bg-primary text-white ring-4 ring-primary/20"
                                    : "bg-gray-200 text-gray-400"
                                  }`}>
                                    <Icon size={16} />
                                  </div>
                                  {i < STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 ${done ? "bg-primary" : "bg-gray-200"}`} />
                                  )}
                                </div>
                                <p className={`text-[10px] font-semibold text-center leading-tight ${
                                  done || active ? "text-primary" : "text-gray-400"
                                }`}>{step.label}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-50 overflow-hidden shadow-sm">
                      <DetailRow icon={<Package size={14} className="text-primary" />}
                        label="الخدمة" value={order.serviceType} />
                      {order.containerSize && (
                        <DetailRow icon={<Truck size={14} className="text-primary" />}
                          label="الباقة / نوع العقار" value={order.containerSize.split(" - ")[0]} />
                      )}
                      <DetailRow icon={<MapPin size={14} className="text-primary" />}
                        label="الموقع" value={order.location} />
                      <DetailRow
                        icon={order.appointmentType === "immediate"
                          ? <Zap size={14} className="text-primary" />
                          : <CalendarClock size={14} className="text-primary" />
                        }
                        label="الموعد"
                        value={order.appointmentType === "immediate"
                          ? "طلب فوري ⚡"
                          : order.scheduledAt
                            ? formatDate(order.scheduledAt)
                            : "موعد مسبق"
                        }
                      />
                      <DetailRow icon={<Phone size={14} className="text-primary" />}
                        label="الجوال" value={maskPhone(order.phone)} dir="ltr" />
                      <DetailRow icon={<Clock size={14} className="text-gray-400" />}
                        label="تاريخ الطلب" value={formatDate(order.createdAt)} />
                    </div>

                    {/* Admin notes (if any) */}
                    {order.adminNotes && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="bg-blue-50 border border-blue-200 rounded-2xl p-4"
                      >
                        <p className="text-xs font-bold text-blue-700 mb-1 flex items-center gap-1.5">
                          <FileText size={12} /> ملاحظة من الفريق
                        </p>
                        <p className="text-sm text-blue-800 leading-relaxed">{order.adminNotes}</p>
                      </motion.div>
                    )}

                    {/* Re-search button */}
                    <button
                      onClick={() => { setOrder(null); setInputId("") }}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors mx-auto"
                    >
                      <RefreshCw size={12} /> البحث عن طلب آخر
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty state */}
              {!order && !loading && !error && (
                <div className="text-center py-8 text-gray-300">
                  <Search size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">أدخل رقم طلبك للبدء</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function DetailRow({
  icon, label, value, dir,
}: {
  icon: React.ReactNode
  label: string
  value: string
  dir?: "ltr" | "rtl"
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400 leading-none mb-0.5">{label}</p>
        <p className={`text-sm font-semibold text-gray-800 truncate ${dir === "ltr" ? "text-left" : ""}`} dir={dir}>
          {value}
        </p>
      </div>
      <ChevronRight size={14} className="text-gray-200 shrink-0" />
    </div>
  )
}
