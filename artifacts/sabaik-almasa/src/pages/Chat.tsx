import { useState, useEffect, useRef } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCreateConversation, useGetContainers, useGetConversation, useGetMessages, useSendMessage } from "@workspace/api-client-react"
import { MessageSenderType, MessageInputSenderType } from "@workspace/api-client-react"
import { Send, User, Phone, Bot, ArrowRight, Paperclip, MapPin, Camera } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { Link } from "wouter"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { PackageFormMessage } from "@/components/chat/PackageFormMessage"

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.startsWith("00966")) return `0${digits.slice(5)}`
  if (digits.startsWith("966")) return `0${digits.slice(3)}`
  return digits
}

function isWhatsappNumber(phone: string, whatsappPhone: string) {
  const customerPhone = normalizePhone(phone)
  const configuredPhone = normalizePhone(whatsappPhone)
  return Boolean(customerPhone && configuredPhone) &&
    (customerPhone === configuredPhone || customerPhone.slice(-9) === configuredPhone.slice(-9))
}

function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, "")
  const international = digits.startsWith("00") ? digits.slice(2) : digits.startsWith("0") ? `966${digits.slice(1)}` : digits
  return `https://wa.me/${international}`
}

export default function Chat() {
  const { logoUrl, companyName, isLoaded, phones, phoneCall, phoneWhatsapp, supportHours } = useSiteSettings()
  const contactPhones = Array.from(new Set([...phones, phoneWhatsapp].filter(Boolean)))
  const callNumber = phoneCall || phones.find(number => !isWhatsappNumber(number, phoneWhatsapp)) || phones[0] || ""
  const [conversationId, setConversationId] = useState<number | null>(
    () => {
      const saved = localStorage.getItem("cleanflow_chat_id")
      return saved ? parseInt(saved) : null
    }
  )
  const [activePackageName, setActivePackageName] = useState(
    () => localStorage.getItem("cleanflow_chat_package_name") || ""
  )
  
  const [name, setName] = useState(() => localStorage.getItem("cleanflow_chat_name") || "")
  const [phone, setPhone] = useState(() => localStorage.getItem("cleanflow_chat_phone") || "")
  const [input, setInput] = useState("")
  const [packageId, setPackageId] = useState("")
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const { mutate: createConv, isPending: isCreating } = useCreateConversation()
  const { data: conversation } = useGetConversation(conversationId as number, {
    query: { enabled: !!conversationId } as any,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messages, refetch } = useGetMessages(conversationId as number, {
    query: { enabled: !!conversationId, refetchInterval: 5000 } as any,
  })
  const { mutate: sendMsg, isPending: isSending } = useSendMessage()
  const { data: packages = [] } = useGetContainers()

  useEffect(() => {
    if (!conversation) return
    setName(conversation.clientName)
    setPhone(conversation.phone)
    setActivePackageName(conversation.packageName || "")
    localStorage.setItem("cleanflow_chat_name", conversation.clientName)
    localStorage.setItem("cleanflow_chat_phone", conversation.phone)
    if (conversation.packageName) {
      localStorage.setItem("cleanflow_chat_package_name", conversation.packageName)
    }
  }, [conversation])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !phone) return

    const selectedPackage = packages.find(item => String(item.id) === packageId)
    createConv({ data: {
      clientName: name,
      phone,
      packageId: selectedPackage?.id ?? null,
      packageName: selectedPackage?.name ?? null,
    } }, {
      onSuccess: (res) => {
        setConversationId(res.id)
      localStorage.setItem("cleanflow_chat_id", res.id.toString())
      localStorage.setItem("cleanflow_chat_name", name)
      localStorage.setItem("cleanflow_chat_phone", phone)
        const selectedPackageName = selectedPackage?.name ?? ""
        setActivePackageName(selectedPackageName)
        if (selectedPackageName) {
          localStorage.setItem("cleanflow_chat_package_name", selectedPackageName)
        } else {
          localStorage.removeItem("cleanflow_chat_package_name")
        }
      }
    })
  }

  async function sendAttachment(file: File) {
    if (!conversationId || uploading) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const uploadResponse = await fetch(`${import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}/api/uploads`, { method: "POST", body: form })
      const uploaded = await uploadResponse.json()
      if (!uploadResponse.ok || !uploaded.url) throw new Error()
      sendMsg({ id: conversationId, data: {
        content: "أرسل صورة",
        senderType: MessageInputSenderType.client,
        attachmentUrl: uploaded.url,
         attachmentType: uploaded.contentType || "image/webp",
      } }, { onSuccess: () => refetch() })
    } finally {
      setUploading(false)
    }
  }

  function sendLocation() {
    if (!conversationId || uploading || !navigator.geolocation) return
    setUploading(true)
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const locationLabel = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`
      sendMsg({ id: conversationId, data: {
        content: "أرسل موقعي الحالي",
        senderType: MessageInputSenderType.client,
        locationLat: String(coords.latitude),
        locationLng: String(coords.longitude),
        locationLabel,
      } }, { onSuccess: () => { setUploading(false); refetch() }, onError: () => setUploading(false) })
    }, () => setUploading(false), { enableHighAccuracy: true, timeout: 10000 })
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !conversationId) return

    const text = input.trim()
    setInput("")

    sendMsg({ id: conversationId!, data: { content: text, senderType: MessageInputSenderType.client } }, {
      onSuccess: () => {
        refetch()
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
      <header className="bg-primary text-white py-4 shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white hover:text-secondary transition-colors">
            <ArrowRight size={20} />
            <span>العودة للرئيسية</span>
          </Link>
          <div className="flex items-center gap-2">
            {isLoaded && logoUrl && <img src={logoUrl} alt="شعار المؤسسة" className="h-8" onError={(e) => e.currentTarget.style.display='none'}/>}
            <span className="font-bold text-lg hidden sm:inline">الدعم المباشر</span>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl flex flex-col">
         <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
           <p className="text-xs text-gray-500">أوقات الدوام: {supportHours || "السبت — الجمعة 7ص–10م"}</p>
        </div>
        {!conversationId ? (
          <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-12 max-w-md mx-auto w-full mt-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">تواصل معنا</h1>
              <p className="text-gray-500 text-sm">الرجاء إدخال بياناتك لبدء المحادثة مع فريق الدعم الفني.</p>
            </div>

            {(callNumber || phoneWhatsapp) && (
              <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {callNumber && (
                  <a
                    href={`tel:${callNumber}`}
                    className="flex items-center justify-center gap-2 rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
                    aria-label="اتصل مباشرة"
                  >
                    <Phone size={16} />
                    اتصل مباشرة
                  </a>
                )}
                {phoneWhatsapp && (
                  <a
                    href={whatsappHref(phoneWhatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-700 transition-colors hover:bg-green-100"
                    title="فتح محادثة واتساب"
                    aria-label="واتساب"
                  >
                    <FaWhatsapp size={17} />
                    واتساب
                  </a>
                )}
              </div>
            )}

            <form onSubmit={handleStartChat} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكريم</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-3 pr-10"
                    placeholder="مثال: أحمد محمد"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">الباقة التي تريد الاستفسار عنها <span className="font-normal text-gray-400">(اختياري)</span></label>
                <select value={packageId} onChange={e => setPackageId(e.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-primary/40">
                  <option value="">اختر الباقة</option>
                  {packages.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}{item.size ? ` — ${item.size}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجوال</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input 
                    required 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-3 pr-10 text-right"
                    dir="ltr"
                    placeholder="05XXXXXXXX"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 text-lg mt-4 bg-secondary hover:bg-secondary/90 text-white"
                disabled={isCreating}
              >
                {isCreating ? "جاري الاتصال..." : "بدء المحادثة"}
              </Button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border flex flex-col h-[70vh]">
            <div className="p-4 border-b bg-gray-50/50 rounded-t-2xl flex items-center justify-between">
               <div>
                <h2 className="font-bold text-gray-900">فريق الدعم - {companyName}</h2>
                {activePackageName && (
                  <p className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
                    الباقة المختارة: {activePackageName}
                  </p>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  localStorage.removeItem("cleanflow_chat_id")
                   localStorage.removeItem("cleanflow_chat_name")
                   localStorage.removeItem("cleanflow_chat_phone")
                   localStorage.removeItem("cleanflow_chat_package_name")
                  setConversationId(null)
                   setActivePackageName("")
                }}
                className="text-gray-500 text-xs hover:text-destructive"
              >
                إنهاء المحادثة
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('/pattern.svg')] bg-repeat bg-opacity-5">
              <div className="text-center">
                <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">اليوم</span>
              </div>
              
              <div className="flex justify-start">
                <div className="bg-primary text-white max-w-[80%] p-3 rounded-2xl rounded-tr-sm text-sm">
                  مرحباً بك! كيف يمكننا مساعدتك اليوم؟
                </div>
              </div>

              {messages?.map((msg) => {
                const isClient = msg.senderType === MessageSenderType.client
                const isStructured = msg.messageType === "package_form" || msg.messageType === "order_confirmation"
                if (isStructured) {
                  return (
                    <div key={msg.id} className={`flex ${isClient ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[90%]">
                        <PackageFormMessage messageType={msg.messageType} metadata={msg.metadata} viewer="client" clientName={name} phone={phone} />
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      isClient 
                        ? 'bg-secondary text-secondary-foreground rounded-tl-sm' 
                        : 'bg-white border text-gray-800 rounded-tr-sm shadow-sm'
                    }`}>
                      {msg.content}
                      {msg.attachmentUrl && <img src={msg.attachmentUrl} alt="مرفق" className="mt-2 max-h-52 w-full rounded-xl object-cover" />}
                      {msg.locationLabel && <a href={msg.locationLabel} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-xs underline"><MapPin size={13} /> فتح الموقع المرسل</a>}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white rounded-b-2xl flex items-center gap-2">
               <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void sendAttachment(file); e.target.value = "" }} />
               <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void sendAttachment(file); e.target.value = "" }} />
               <button type="button" title="اختيار صورة من الجهاز" onClick={() => galleryRef.current?.click()} disabled={uploading} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-primary hover:text-primary disabled:opacity-40"><Paperclip size={16} /></button>
               <button type="button" title="تصوير صورة" onClick={() => cameraRef.current?.click()} disabled={uploading} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-primary hover:text-primary disabled:opacity-40"><Camera size={16} /></button>
              <button type="button" title="إرسال الموقع" onClick={sendLocation} disabled={uploading} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-primary hover:text-primary disabled:opacity-40"><MapPin size={16} /></button>
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب رسالتك..."
                className="flex-1 bg-gray-50 focus-visible:ring-secondary"
                autoFocus
              />
              <Button 
                type="submit" 
                disabled={!input.trim() || isSending}
                className="bg-primary hover:bg-primary/90 text-white shrink-0 px-8"
              >
                {isSending ? "..." : "إرسال"}
                <Send size={16} className="mr-2 rtl:-scale-x-100" />
              </Button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
