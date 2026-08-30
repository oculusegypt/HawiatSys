import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, ChevronRight, ChevronLeft, MapPin, Navigation, CheckCircle,
  Phone, User, Loader2, AlertCircle, Box, Truck, FileText,
  Calendar, Clock, Zap, CalendarClock, HelpCircle, Search
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useServiceRequest } from "@/context/ServiceRequestContext"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { DraggableMapPicker } from "@/components/ui/DraggableMapPicker"
import { useGetContainers } from "@workspace/api-client-react"
import { getVisitorTracking, sendVisitorHeartbeat } from "@/lib/visitorAttribution"
import { getHighAccuracyPosition } from "@/lib/reverseGeocode"
import { getActiveContainers, getContainerValue } from "@/lib/packageOptions"
import { MAX_CONTAINER_RENTAL_DURATION } from "./serviceRequestConstants"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

function getTodayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getTomorrowString() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const year = tomorrow.getFullYear()
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0")
  const day = String(tomorrow.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatScheduledAppointment(date: string, time: string) {
  if (!date) return ""
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(`${date}T${time || "10:00"}:00`))
  } catch {
    return `${date} ${time || "10:00"}`
  }
}

function normalizePhone(value: string) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩"
  return value
    .replace(/[٠-٩]/g, digit => String(arabicDigits.indexOf(digit)))
    .replace(/[^\d+]/g, "")
}

function isValidSaudiPhone(value: string) {
  const digits = normalizePhone(value).replace(/^\+966/, "").replace(/^966/, "")
  return /^05\d{8}$/.test(digits) || /^5\d{8}$/.test(digits)
}

function LocationPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "map" | "error">("idle")
  const [initCoords, setInitCoords] = useState<{ lat: number; lng: number } | null>(null)

  const getGPS = async () => {
    setGpsState("loading")
    try {
      const pos = await getHighAccuracyPosition()
      const lat = +pos.coords.latitude.toFixed(6)
      const lng = +pos.coords.longitude.toFixed(6)
      setInitCoords({ lat, lng })
    } catch {
      setInitCoords({ lat: 24.7136, lng: 46.6753 })
    } finally {
      setGpsState("map")
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin size={16} className="absolute right-3 top-3.5 text-gray-400" />
          <Input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="مثال: الرياض - حي الملقا - شارع أنس بن مالك"
            className="pr-9 rounded-xl h-11 text-sm border-gray-200"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={getGPS}
          disabled={gpsState === "loading"}
          className="shrink-0 rounded-xl h-11 px-3 border-gray-200 text-xs font-bold text-primary hover:bg-primary/5 flex items-center gap-1.5"
        >
          {gpsState === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
          <span className="hidden sm:inline">الخريطة</span>
        </Button>
      </div>

      {gpsState === "map" && initCoords && (
        <div className="mt-3 border rounded-2xl overflow-hidden shadow-inner bg-gray-50 p-2">
          <DraggableMapPicker
            initialLat={initCoords.lat}
            initialLng={initCoords.lng}
            onConfirm={(addr, lat, lng) => {
              if (addr) onChange(`${addr} (إحداثيات GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)})`)
              setGpsState("idle")
            }}
            onSelectLocation={(lat, lng, address) => {
              if (address) onChange(`${address} (إحداثيات GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)})`)
              setGpsState("idle")
            }}
          />
        </div>
      )}
    </div>
  )
}

export function ServiceRequestModal() {
  const { isOpen, preselect, preselectedService, preselectedContainerSize, preselectedContainerName, closeModal } = useServiceRequest()
  const { companyName, phoneWhatsapp, phoneCall, orderTrackingEnabled } = useSiteSettings()
  const { data: apiContainers } = useGetContainers()

  const [step, setStep] = useState<"service" | "container" | "details" | "success">("service")
  const [serviceType, setServiceType] = useState("")
  const [containerSize, setContainerSize] = useState("")
  const [appointmentType, setAppointmentType] = useState<"immediate" | "scheduled">("immediate")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("10:00")
  const [duration] = useState(MAX_CONTAINER_RENTAL_DURATION)
  const [location, setLocation] = useState("")
  const [clientName, setClientName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [notes, setNotes] = useState("")

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  // Sync preselected options when modal opens
  useEffect(() => {
    if (isOpen) {
      const initService = preselect?.serviceType || preselectedService || "حاويات الأنقاض"
      const initContainer = preselect?.containerSize || preselect?.containerName || preselectedContainerSize || preselectedContainerName || ""
      setServiceType(initService)
      setContainerSize(initContainer)
      setAppointmentType("immediate")
      setScheduledDate(getTomorrowString())
      setScheduledTime("10:00")
      setLocation("")
      setClientName(preselect?.clientName || "")
      setPhone(preselect?.phone || "")
      setEmail("")
      setNotes("")
      setErrors({})
      setOrderId(null)

      if (initContainer || preselect?.serviceType || preselectedService) {
        setStep("details")
      } else {
        setStep("service")
      }
    }
  }, [isOpen, preselect, preselectedService, preselectedContainerSize, preselectedContainerName])

  if (!isOpen) return null

  const handleSelectPackage = (pkg: NonNullable<typeof apiContainers>[number]) => {
    setServiceType(pkg.name)
    setContainerSize(getContainerValue(pkg))
    setStep("details")
  }

  const validateDetails = () => {
    const errs: Record<string, string> = {}
    if (!clientName.trim() || clientName.trim().length < 2) {
      errs.clientName = "الرجاء كتابة الاسم بشكل صحيح (حرفين على الأقل)"
    }
    if (!isValidSaudiPhone(phone)) {
      errs.phone = "الرجاء إدخال رقم جوال سعودي صحيح (مثال: 05xxxxxxxx)"
    }
    if (!location.trim() || location.trim().length < 3) {
      errs.location = "الرجاء تحديد موقع المشروع أو الحي بالرياض"
    }
    if (appointmentType === "scheduled" && !scheduledDate) {
      errs.scheduledDate = "الرجاء تحديد تاريخ الموعد المطلوب"
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateDetails()) return

    setIsSubmitting(true)
    try {
      const scheduledAt = appointmentType === "scheduled" && scheduledDate
        ? `${scheduledDate}T${scheduledTime || "10:00"}:00`
        : undefined

      const payload = {
        clientName: clientName.trim(),
        phone: normalizePhone(phone),
        email: email.trim() || undefined,
        serviceType: serviceType || "حاويات الأنقاض",
        containerSize: containerSize || undefined,
        location: location.trim(),
        duration: MAX_CONTAINER_RENTAL_DURATION,
        notes: notes.trim() || undefined,
        appointmentType,
        scheduledAt,
        tracking: getVisitorTracking(),
      }

      const res = await fetch(`${API_BASE}/api/service-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "فشل إرسال الطلب")

      const newOrderId = String(data.id || "")
      setOrderId(newOrderId)
      setStep("success")

      // Save customer info and order ID for presence tracking & chat sync
      try {
        sessionStorage.setItem("customer_name", clientName.trim())
        sessionStorage.setItem("customer_phone", normalizePhone(phone))
        sessionStorage.setItem("last_order_id", newOrderId)
      } catch {}

      // Notify visitor heartbeat
      sendVisitorHeartbeat({
        clientName: clientName.trim(),
        phone: normalizePhone(phone),
        lastOrderId: Number(newOrderId)
      })

      // Send order summary into support conversation if active or preselected
      const convId = preselect?.conversationId || Number(sessionStorage.getItem("support_conversation_id") || "0")
      if (convId) {
        try {
          await fetch(`${API_BASE}/api/conversations/${convId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `📋 تأكيد طلب الحاوية #${newOrderId} - ${serviceType} ${containerSize}`,
              senderType: "client",
              messageType: "order_confirmation",
              metadata: JSON.stringify({
                requestId: Number(newOrderId),
                orderId: Number(newOrderId),
                clientName: clientName.trim(),
                phone: normalizePhone(phone),
                serviceType: serviceType || "حاويات الأنقاض",
                containerSize: containerSize || "",
                location: location.trim(),
                duration: MAX_CONTAINER_RENTAL_DURATION,
                appointmentType,
                scheduledAt
              }),
            }),
          })
        } catch {}
      }
    } catch (err: any) {
      setErrors({ submit: err.message || "حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const minDateStr = getTodayString()
  const availablePackages = getActiveContainers(apiContainers)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
              <Box size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm md:text-base">
                {step === "success" ? "تم استلام طلب الحاوية" : "طلب تأجير حاوية"}
              </h3>
              <p className="text-[11px] text-gray-500">
                {companyName ? `${companyName} — الرياض` : "خدمة تأجير الحاويات — الرياض"}
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-gray-200/60 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">

            {/* STEP 1: Select Service */}
            {step === "service" && (
              <motion.div
                key="step-service"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-xs text-gray-500 font-medium">اختر إحدى الباقات المتاحة من الكتالوج:</p>
                <div className="space-y-2.5">
                  {availablePackages.map((pkg) => {
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => handleSelectPackage(pkg)}
                        className="w-full text-right p-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 hover:border-secondary/60 hover:shadow-md transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-secondary/10 shadow-sm flex items-center justify-center text-secondary shrink-0 group-hover:scale-110 transition-transform">
                            <Box size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm group-hover:text-primary transition-colors">
                              {pkg.name}
                            </h4>
                            <p className="text-xs text-gray-500 leading-tight line-clamp-1 mt-0.5">
                              {pkg.size || pkg.description}
                            </p>
                          </div>
                        </div>
                        <ChevronLeft size={18} className="text-gray-400 shrink-0" />
                      </button>
                    )
                  })}
                  {availablePackages.length === 0 && (
                    <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-center text-sm text-amber-700">
                      لا توجد باقات متاحة للحجز حالياً.
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Details & Contact Info */}
            {step === "details" && (
              <motion.form
                key="step-details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Selected Summary Tag */}
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-gray-400 block">الخدمة المختارة:</span>
                    <span className="text-xs font-bold text-primary">
                      {serviceType} {containerSize ? `— ${containerSize}` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("service")}
                    className="text-xs text-secondary font-bold hover:underline"
                  >
                    تغيير
                  </button>
                </div>

                {/* Appointment Type Toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAppointmentType("immediate")}
                    className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      appointmentType === "immediate" ? "bg-white text-primary shadow-sm" : "text-gray-500"
                    }`}
                  >
                    <Zap size={14} className={appointmentType === "immediate" ? "text-secondary" : ""} />
                    طلب فوري (خلال ساعتين)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppointmentType("scheduled")}
                    className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      appointmentType === "scheduled" ? "bg-white text-primary shadow-sm" : "text-gray-500"
                    }`}
                  >
                    <CalendarClock size={14} className={appointmentType === "scheduled" ? "text-secondary" : ""} />
                    موعد محدد مسبقاً
                  </button>
                </div>

                {/* Scheduled Date/Time if selected */}
                {appointmentType === "scheduled" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">تاريخ التوصيل *</label>
                      <Input
                        type="date"
                        min={minDateStr}
                        value={scheduledDate}
                        onChange={e => setScheduledDate(e.target.value)}
                        className="rounded-xl h-11 text-xs"
                      />
                      {errors.scheduledDate && <p className="text-red-500 text-[11px] mt-1">{errors.scheduledDate}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">وقت التوصيل</label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={e => setScheduledTime(e.target.value)}
                        className="rounded-xl h-11 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Location Picker */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">موقع المشروع / الحي بالرياض *</label>
                  <LocationPicker value={location} onChange={setLocation} />
                  {errors.location && <p className="text-red-500 text-[11px] mt-1">{errors.location}</p>}
                </div>

                {/* Duration */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">مدة الإيجار</label>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold leading-5 text-amber-900">
                    {MAX_CONTAINER_RENTAL_DURATION}
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">تُسحب الحاوية عند امتلائها أو بعد 10 أيام كحد أقصى.</p>
                </div>

                {/* Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">الاسم / اسم الشركة *</label>
                    <Input
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder="أدخل الاسم"
                      className="rounded-xl h-11 text-xs"
                    />
                    {errors.clientName && <p className="text-red-500 text-[11px] mt-1">{errors.clientName}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">رقم الجوال *</label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="05xxxxxxxx"
                      dir="ltr"
                      className="rounded-xl h-11 text-xs text-left"
                    />
                    {errors.phone && <p className="text-red-500 text-[11px] mt-1">{errors.phone}</p>}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">ملاحظات إضافية (اختياري)</label>
                  <Input
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="أي ملاحظة عن نوع المخلفات أو موقع التوصيل..."
                    className="rounded-xl h-11 text-xs"
                  />
                </div>

                {errors.submit && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                    {errors.submit}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-secondary text-white font-bold h-12 rounded-xl text-sm mt-2 shadow-md"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span>جاري إرسال الطلب...</span>
                    </div>
                  ) : (
                    "تأكيد وإرسال الطلب الآن ←"
                  )}
                </Button>
              </motion.form>
            )}

            {/* STEP 4: Success Screen */}
            {step === "success" && (
              <motion.div
                key="step-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-4"
              >
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle size={36} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">تم إرسال طلبك بنجاح!</h3>
                  {orderId && (
                    <span className="inline-block bg-primary/10 text-primary font-mono font-bold text-sm px-3 py-1 rounded-full mt-1">
                      رقم الطلب: #{orderId}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
                  شكراً لاختيارك {companyName || "خدماتنا"}. سيقوم مندوبنا بالتواصل معك هاتفياً أو عبر واتساب لتأكيد وصول الحاوية.
                </p>

                 <div className="mx-auto w-full max-w-sm rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-right text-xs text-gray-700 space-y-2" data-testid="order-confirmation-summary">
                   <p className="font-bold text-emerald-900">ملخص البيانات المرسلة</p>
                   <p><span className="font-bold">الخدمة:</span> {serviceType || "حاويات الأنقاض"}{containerSize ? ` — ${containerSize}` : ""}</p>
                   {clientName && <p><span className="font-bold">الاسم:</span> {clientName}</p>}
                   {phone && <p><span className="font-bold">الجوال:</span> {phone}</p>}
                   {location && <p><span className="font-bold">الموقع:</span> {location}</p>}
                   <p>
                     <span className="font-bold">الموعد:</span>{" "}
                     {appointmentType === "scheduled"
                       ? formatScheduledAppointment(scheduledDate, scheduledTime)
                       : "فوري خلال ساعتين"}
                   </p>
                   {duration && <p><span className="font-bold">المدة:</span> {duration}</p>}
                   {notes && <p><span className="font-bold">الملاحظات:</span> {notes}</p>}
                 </div>

                <div className="pt-4 flex flex-col gap-2">
                  {orderTrackingEnabled ? (
                    <Button
                      onClick={() => {
                        closeModal()
                        window.dispatchEvent(new CustomEvent("openTrackingModal", { detail: orderId }))
                      }}
                      className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow"
                    >
                      <Search size={14} /> تتبع حالة الطلب المباشر
                    </Button>
                  ) : (
                    phoneWhatsapp && (
                      <a
                        href={`https://wa.me/966${phoneWhatsapp.replace(/^0/, "")}?text=${encodeURIComponent([
                          `*طلب حاوية جديد من الموقع*`,
                          orderId ? `🔢 *رقم الطلب:* #${orderId}` : "",
                          clientName ? `👤 *الاسم:* ${clientName}` : "",
                          phone ? `📱 *الجوال:* ${phone}` : "",
                          serviceType ? `🏗️ *نوع الخدمة:* ${serviceType}` : "",
                          containerSize ? `📦 *المقاس:* ${containerSize}` : "",
                          duration ? `⏱️ *المدة:* ${duration}` : "",
                          location ? `📍 *الموقع:* ${location}` : "",
                          appointmentType === "scheduled" && scheduledDate ? `📅 *الموعد:* ${scheduledDate} ${scheduledTime}` : `⚡ *التوصيل:* فوري خلال ساعتين`,
                          notes ? `📝 *ملاحظات:* ${notes}` : "",
                        ].filter(Boolean).join("\n"))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow"
                      >
                        <Phone size={14} /> متابعة الطلب عبر واتساب
                      </a>
                    )
                  )}
                  <Button
                    variant="outline"
                    onClick={closeModal}
                    className="w-full rounded-xl text-xs font-bold border-gray-200"
                  >
                    إغلاق النافذة
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
