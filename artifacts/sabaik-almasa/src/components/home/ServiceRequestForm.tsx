import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { useGetContainers, useSubmitServiceRequest } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Lock, CalendarClock, Zap, FileText, Phone, CheckCircle, Loader2, Box, Truck, MapPin, Navigation } from "lucide-react"
import { DraggableMapPicker } from "@/components/ui/DraggableMapPicker"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { getContainerValue, getContainersForService } from "@/lib/packageOptions"
import { getVisitorTracking } from "@/lib/visitorAttribution"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

const formSchema = z.object({
  clientName: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(9, "رقم الجوال غير صحيح"),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal('')),
  serviceType: z.string().min(1, "الرجاء اختيار نوع الخدمة"),
  containerSize: z.string().optional(),
  location: z.string().min(3, "موقع المشروع مطلوب"),
  duration: z.string().optional(),
  notes: z.string().optional(),
  appointmentType: z.enum(["immediate", "scheduled"]).default("immediate"),
  scheduledAt: z.string().optional(),
})

const PUBLIC_SERVICES = [
  { value: "حاويات الأنقاض", label: "حاويات الأنقاض ومخلفات الهدم", category: "debris" },
  { value: "حاويات النفايات", label: "حاويات النفايات والمكابس", category: "waste" },
  { value: "عقود النظافة", label: "عقود النظافة للمنشآت وتجديد الرخص", category: "contract" },
  { value: "نقل الأنقاض والمخلفات", label: "نقل الأنقاض والمخلفات بالأسطول", category: "debris" },
  { value: "طلب أي خدمة", label: "طلب خدمة مخصصة / استشارة", category: "all" },
]

export function ServiceRequestForm() {
  const { companyName, phoneCall, phoneWhatsapp } = useSiteSettings()
  const { toast } = useToast()
  const { mutate: submitRequest, isPending } = useSubmitServiceRequest()
  const { data: apiContainers, isLoading: containersLoading } = useGetContainers()
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [lockedMessage, setLockedMessage] = useState("")
  const [appointmentType, setAppointmentType] = useState<"immediate" | "scheduled">("immediate")

  // Quote request state
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [quoteForm, setQuoteForm] = useState({ name: "", phone: "", serviceType: "", containerSize: "", location: "", notes: "", activityType: "", monthlyEvacuations: "" })
  const [quoteErrors, setQuoteErrors] = useState<{ name?: string; phone?: string }>({})
  const [isQuoteSubmitting, setIsQuoteSubmitting] = useState(false)
  const [quoteSuccess, setQuoteSuccess] = useState(false)
  const [quoteOrderId, setQuoteOrderId] = useState<number | null>(null)
  const [quoteMapOpen, setQuoteMapOpen] = useState(false)
  const [mainMapOpen, setMainMapOpen] = useState(false)

  // Load site settings (lock status)
  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then(r => r.json())
      .then(data => {
        setIsLocked(data.requests_locked === "true")
        setLockedMessage(data.requests_locked_message || "الطلبات مغلقة مؤقتاً")
      })
      .catch(() => {})
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      phone: "",
      email: "",
      serviceType: "",
      containerSize: "",
      location: "",
      duration: "",
      notes: "",
      appointmentType: "immediate",
      scheduledAt: "",
    },
  })

  const selectedServiceType = form.watch("serviceType")
  const containerOptions = getContainersForService(apiContainers, selectedServiceType)
  const isContainerService =
    selectedServiceType === "حاويات الأنقاض" ||
    selectedServiceType === "حاويات النفايات" ||
    selectedServiceType === "نقل الأنقاض والمخلفات" ||
    selectedServiceType === "عقود النظافة"

  // Tomorrow as minimum date for scheduling
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().slice(0, 16)
  const quoteContainerOptions = getContainersForService(apiContainers, quoteForm.serviceType)

  async function handleQuoteSubmit() {
    const errs: { name?: string; phone?: string } = {}
    if (!quoteForm.name.trim()) errs.name = "الاسم مطلوب"
    if (quoteForm.phone.trim().length < 9) errs.phone = "رقم الجوال غير صحيح"
    if (Object.keys(errs).length) { setQuoteErrors(errs); return }

    setIsQuoteSubmitting(true)
    try {
      const notesText = [
        quoteForm.activityType ? `نوع النشاط: ${quoteForm.activityType}` : "",
        quoteForm.monthlyEvacuations ? `عدد التفريغات الشهرية: ${quoteForm.monthlyEvacuations}` : "",
        quoteForm.notes ? `ملاحظات: ${quoteForm.notes}` : "",
        "طلب عرض سعر عبر الموقع",
      ].filter(Boolean).join(" | ")

      const res = await fetch(`${API_BASE}/api/service-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isQuoteRequest: true,
          clientName: quoteForm.name,
          phone: quoteForm.phone,
          serviceType: quoteForm.serviceType || "طلب عرض سعر حاويات",
          containerSize: quoteForm.containerSize || null,
          location: quoteForm.location || "غير محدد",
          notes: notesText,
          appointmentType: "immediate",
          tracking: getVisitorTracking(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "فشل الإرسال")
      setQuoteOrderId(data.id)
      setQuoteSuccess(true)
      setShowQuoteForm(false)
    } catch {
      setQuoteErrors({ phone: "حدث خطأ في الإرسال. حاول مرة أخرى." })
    } finally {
      setIsQuoteSubmitting(false)
    }
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (isLocked) {
      toast({
        title: "الطلبات مغلقة",
        description: lockedMessage || "نعتذر، استقبال الطلبات مغلق مؤقتاً.",
        variant: "destructive",
      })
      return
    }

    const payload = {
      ...values,
      appointmentType,
      scheduledAt: appointmentType === "scheduled" ? values.scheduledAt : undefined,
      tracking: getVisitorTracking(),
    }

    submitRequest({ data: payload as any }, {
      onSuccess: () => {
        setIsSuccess(true)
        form.reset()
        toast({
          title: "تم استلام طلبك بنجاح",
          description: companyName ? `سيتواصل معك فريق ${companyName} لتأكيد التفاصيل وموعد التوصيل.` : "سيتواصل معك فريق العمل لتأكيد التفاصيل وموعد التوصيل.",
        })
      },
      onError: (err: any) => {
        toast({
          title: "خطأ في الإرسال",
          description: err.message || "يرجى التحقق من صحة البيانات والمحاولة مجدداً.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <section id="service-request" className="py-24 bg-gradient-to-br from-primary/5 via-white to-secondary/5 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="text-secondary font-bold text-sm tracking-wider uppercase bg-secondary/10 px-4 py-1.5 rounded-full inline-block mb-3">
            حجز وتأجير الحاويات
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            اطلب حاويتك <span className="text-secondary">الآن فورياً أو بموعد</span>
          </h2>
          <div className="w-24 h-1.5 bg-secondary mx-auto rounded-full mb-6"></div>
          <p className="text-gray-600 text-lg">
            حدد حجم الحاوية وموقع مشروعك في الرياض وسيتولى فريقنا التوصيل في أسرع وقت.
          </p>
        </div>

        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10">

          {/* Locked State Banner */}
          {isLocked && (
            <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                  <Lock size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900 text-base mb-1">الطلبات الفورية متوقفة مؤقتاً</h3>
                  <p className="text-amber-800 text-sm leading-relaxed mb-4">{lockedMessage}</p>
                  <div className="flex gap-3 flex-wrap">
                    {phoneWhatsapp && (
                      <a href={`https://wa.me/966${phoneWhatsapp.replace(/^0/, "")}`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-sm">
                        <Phone size={13} /> واتساب مباشر
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowQuoteForm(true)}
                      className="inline-flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
                    >
                      <FileText size={13} /> طلب عرض سعر
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quote Success Banner */}
          {quoteSuccess && (
            <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-2xl text-center">
              <CheckCircle size={48} className="text-green-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-green-900 mb-1">تم إرسال طلب عرض السعر بنجاح</h3>
              {quoteOrderId && <p className="text-green-800 text-sm font-semibold mb-2">رقم الطلب: #{quoteOrderId}</p>}
              <p className="text-green-700 text-sm">سيتواصل معك فريق التسعير في أقرب وقت عبر رقم الجوال المسجل.</p>
              <button
                type="button"
                onClick={() => setQuoteSuccess(false)}
                className="mt-4 text-xs font-bold text-green-800 hover:underline"
              >
                إرسال طلب آخر
              </button>
            </div>
          )}

          {/* Quote Request Form Modal / Accordion */}
          {showQuoteForm && !quoteSuccess && (
            <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-gray-900 text-base">نموذج طلب عرض السعر</h3>
                <button type="button" onClick={() => setShowQuoteForm(false)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">✕ إغلاق</button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">نوع الخدمة المطلوب لها عرض سعر</label>
                  <select
                    value={quoteForm.serviceType}
                    onChange={e => setQuoteForm(prev => ({ ...prev, serviceType: e.target.value, containerSize: "" }))}
                    className="w-full text-sm border rounded-xl p-2.5 bg-white"
                  >
                    <option value="">اختر الخدمة...</option>
                    {PUBLIC_SERVICES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {quoteContainerOptions.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">حجم الحاوية التقريبي</label>
                    <select
                      value={quoteForm.containerSize}
                      onChange={e => setQuoteForm(prev => ({ ...prev, containerSize: e.target.value }))}
                      className="w-full text-sm border rounded-xl p-2.5 bg-white"
                    >
                      <option value="">اختر الحجم إن وجد...</option>
                      {quoteContainerOptions.map(c => (
                        <option key={c.id} value={getContainerValue(c)}>{getContainerValue(c)}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">الاسم / اسم المنشأة *</label>
                  <input
                    type="text"
                    value={quoteForm.name}
                    onChange={e => setQuoteForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="أدخل الاسم"
                    className="w-full text-sm border rounded-xl p-2.5 bg-white"
                  />
                  {quoteErrors.name && <p className="text-red-500 text-xs mt-1">{quoteErrors.name}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">رقم الجوال *</label>
                  <input
                    type="tel"
                    value={quoteForm.phone}
                    onChange={e => setQuoteForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="05xxxxxxxx"
                    className="w-full text-sm border rounded-xl p-2.5 bg-white text-left"
                    dir="ltr"
                  />
                  {quoteErrors.phone && <p className="text-red-500 text-xs mt-1">{quoteErrors.phone}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">الموقع / الحي بالرياض</label>
                  <input
                    type="text"
                    value={quoteForm.location}
                    onChange={e => setQuoteForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="مثال: الرياض - حي الملقا"
                    className="w-full text-sm border rounded-xl p-2.5 bg-white"
                  />
                  <button type="button" onClick={() => setQuoteMapOpen(value => !value)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                    <Navigation size={13} /> {quoteMapOpen ? "إخفاء الخريطة" : "تحديد الموقع من الخريطة"}
                  </button>
                  {quoteMapOpen && (
                    <div className="mt-2 rounded-xl border border-gray-200 bg-white p-2">
                      <DraggableMapPicker
                        initialLat={24.7136}
                        initialLng={46.6753}
                        onConfirm={(address, lat, lng) => {
                          if (address) setQuoteForm(prev => ({ ...prev, location: `${address} (إحداثيات GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)})` }))
                          setQuoteMapOpen(false)
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">ملاحظات إضافية</label>
                  <textarea
                    rows={2}
                    value={quoteForm.notes}
                    onChange={e => setQuoteForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="أي تفاصيل خاصة بمشروعك..."
                    className="w-full text-sm border rounded-xl p-2.5 bg-white"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleQuoteSubmit}
                  disabled={isQuoteSubmitting}
                  className="w-full bg-secondary hover:bg-secondary/90 text-white font-bold py-2.5 rounded-xl text-sm mt-2"
                >
                  {isQuoteSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : "إرسال طلب عرض السعر"}
                </Button>
              </div>
            </div>
          )}

          {/* Standard Form Success */}
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle size={40} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">تم تسجيل طلبك بنجاح!</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                شكراً لاختيارك {companyName || "خدماتنا"}. سيقوم مندوبنا بالتواصل معك لتأكيد وصول الحاوية.
              </p>
              <Button
                onClick={() => setIsSuccess(false)}
                variant="outline"
                className="rounded-xl px-8 border-primary text-primary hover:bg-primary/5 font-bold"
              >
                طلب حاوية أخرى
              </Button>
            </motion.div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* Appointment Type Toggle */}
                <div className="grid grid-cols-2 gap-3 p-1.5 bg-gray-100/80 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setAppointmentType("immediate")}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                      appointmentType === "immediate"
                        ? "bg-white text-primary shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <Zap size={16} className={appointmentType === "immediate" ? "text-secondary" : ""} />
                    طلب فوري (خلال ساعتين)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppointmentType("scheduled")}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                      appointmentType === "scheduled"
                        ? "bg-white text-primary shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <CalendarClock size={16} className={appointmentType === "scheduled" ? "text-secondary" : ""} />
                    حجز موعد مسبق
                  </button>
                </div>

                {/* Scheduled DateTime */}
                {appointmentType === "scheduled" && (
                  <FormField
                    control={form.control}
                    name="scheduledAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-gray-700">تاريخ ووقت الموعد المطلوب</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            min={minDateStr}
                            className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary h-12"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                )}

                {/* Service Type */}
                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold text-gray-700">نوع الخدمة المطلوب *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary h-12">
                            <SelectValue placeholder="اختر نوع الخدمة أو الحاوية" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {PUBLIC_SERVICES.map((s) => (
                            <SelectItem key={s.value} value={s.value} className="py-2.5">
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Dynamic Container Size */}
                {isContainerService && containerOptions.length > 0 && (
                  <FormField
                    control={form.control}
                    name="containerSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-gray-700">حجم ومقاس الحاوية</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary h-12">
                              <SelectValue placeholder="اختر حجم الحاوية المناسب" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            {containerOptions.map((c) => (
                              <SelectItem key={c.id} value={getContainerValue(c)} className="py-2.5">
                                {getContainerValue(c)} {c.priceText ? `— (${c.priceText})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                )}

                {/* Duration */}
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold text-gray-700">مدة الإيجار المتوقعة</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary h-12">
                            <SelectValue placeholder="اختر مدة الإيجار" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="يومي (رد واحد)">يومي (رد واحد / 10 أيام حد أقصى)</SelectItem>
                          <SelectItem value="أسبوعي">أسبوعي</SelectItem>
                          <SelectItem value="شهري">شهري</SelectItem>
                          <SelectItem value="عقد سنوي">عقد سنوي (للمنشآت والمطاعم)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Name & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-gray-700">الاسم / اسم الشركة *</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل اسمك أو اسم المؤسسة" className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary h-12" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-gray-700">رقم الجوال *</FormLabel>
                        <FormControl>
                          <Input placeholder="05xxxxxxxx" dir="ltr" className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary h-12 text-left" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Location */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold text-gray-700">موقع المشروع / الحي في الرياض *</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: الرياض - حي الملقا - شارع أنس بن مالك" className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary h-12" {...field} />
                      </FormControl>
                      <button type="button" onClick={() => setMainMapOpen(value => !value)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                        <Navigation size={13} /> {mainMapOpen ? "إخفاء الخريطة" : "تحديد الموقع من الخريطة"}
                      </button>
                      {mainMapOpen && (
                        <div className="mt-2 rounded-xl border border-gray-200 bg-white p-2">
                          <DraggableMapPicker
                            initialLat={24.7136}
                            initialLng={46.6753}
                            onConfirm={(address, lat, lng) => {
                              if (address) form.setValue("location", `${address} (إحداثيات GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)})`, { shouldValidate: true })
                              setMainMapOpen(false)
                            }}
                          />
                        </div>
                      )}
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold text-gray-700">ملاحظات إضافية (اختياري)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="أي تفاصيل تخص نوع الأنقاض، طريقة الوصول، أو وقت التوصيل المفضل..."
                          className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isPending || isLocked}
                  className="w-full bg-primary hover:bg-secondary text-white font-bold text-lg h-14 rounded-2xl shadow-lg transition-all duration-300 transform active:scale-98"
                >
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin" />
                      <span>جاري إرسال الطلب...</span>
                    </div>
                  ) : (
                    "تأكيد وإرسال طلب الحاوية"
                  )}
                </Button>

              </form>
            </Form>
          )}

        </div>

      </div>
    </section>
  )
}
