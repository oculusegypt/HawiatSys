import { useState, useRef, useEffect, useCallback } from "react"
import { useGetConversations, useGetMessages, useSendMessage, useUpdateConversation, useGetContainers } from "@workspace/api-client-react"
import { MessageSenderType, MessageInputSenderType, MessageInputMessageType, ConversationUpdateStatus } from "@workspace/api-client-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, User, CheckCircle2, Clock, MessageSquare, Trash2, AlertTriangle, Package, MapPin, Phone, Users, RefreshCw } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { useToast } from "@/hooks/use-toast"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { PackageFormMessage } from "@/components/chat/PackageFormMessage"
import { getContainerValue } from "@/lib/packageOptions"
import { resolveServiceTypeFromContainer } from "@/components/home/packages/PackageCard"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

type AdminMessage = {
  id: number
  senderType: string
  messageType?: string
  metadata?: string | null
  content: string
  attachmentUrl?: string | null
  locationLabel?: string | null
  locationLat?: string | null
  locationLng?: string | null
}

type ActiveVisitor = {
  sessionId: string
  page: string
  deviceType: string
  clientName?: string | null
  phone?: string | null
  conversationId?: number | null
  lastSeen: string
  hasPendingInvitation: boolean
}

function LocationMessagePreview({
  message,
  isAdmin,
}: {
  message: AdminMessage
  isAdmin: boolean
}) {
  const latitude = Number(message.locationLat)
  const longitude = Number(message.locationLng)
  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  const coordinates = hasCoordinates ? `${latitude},${longitude}` : ""
  const mapHref = message.locationLabel?.startsWith("http")
    ? message.locationLabel
    : hasCoordinates
      ? `https://www.google.com/maps?q=${encodeURIComponent(coordinates)}`
      : null
  const embedHref = hasCoordinates
    ? `https://www.google.com/maps?q=${encodeURIComponent(coordinates)}&output=embed`
    : null

  return (
    <div className={`mt-2 overflow-hidden rounded-xl border ${
      isAdmin ? "border-white/20 bg-white/10" : "border-primary/15 bg-primary/5"
    }`}>
      {embedHref && (
        <iframe
          src={embedHref}
          title="موقع العميل على الخريطة"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-44 w-full border-0"
        />
      )}
      <div className="space-y-1.5 p-2.5">
        <div className={`flex items-center gap-1.5 text-xs font-bold ${
          isAdmin ? "text-white" : "text-primary"
        }`}>
          <MapPin size={14} />
          موقع العميل الفعلي
        </div>
        {hasCoordinates && (
          <p className={`text-[10px] ${isAdmin ? "text-white/70" : "text-gray-500"}`} dir="ltr">
            {coordinates}
          </p>
        )}
        {mapHref && (
          <a
            href={mapHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-xs font-semibold underline ${
              isAdmin ? "text-white" : "text-primary"
            }`}
          >
            <MapPin size={13} />
            فتح الموقع في خرائط Google
          </a>
        )}
      </div>
    </div>
  )
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.startsWith("00966")) return `0${digits.slice(5)}`
  if (digits.startsWith("966")) return `0${digits.slice(3)}`
  return digits
}

function isConfiguredWhatsappNumber(phone: string, whatsappPhone: string) {
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

export default function AdminConversations() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [reply, setReply] = useState("")
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState("")
  const [showClosed, setShowClosed] = useState(false)
  const [activeVisitors, setActiveVisitors] = useState<ActiveVisitor[]>([])
  const [visitorMessage, setVisitorMessage] = useState("مرحباً، فريق الدعم متاح لمساعدتك. سجّل بياناتك لنبدأ المحادثة.")
  const [invitingVisitor, setInvitingVisitor] = useState<string | null>(null)
  const visitorAuthFailedRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { phoneWhatsapp } = useSiteSettings()

  const { data: conversations, refetch: refetchConvs } = useGetConversations()
  const { data: containers = [] } = useGetContainers()
  const activeConversations = conversations?.filter(conversation => conversation.status !== "closed") ?? []
  const closedConversations = conversations?.filter(conversation => conversation.status === "closed") ?? []
  const visibleConversations = showClosed ? closedConversations : activeConversations
  const newVisitors = activeVisitors.filter(visitor => !visitor.conversationId)
  const visitorsWithConversations = activeVisitors.length - newVisitors.length

  const loadActiveVisitors = useCallback(async () => {
    const token = localStorage.getItem("admin_token")
    if (!token || visitorAuthFailedRef.current) return
    try {
      const response = await fetch(`${API_BASE}/api/admin/active-visitors`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (response.status === 401 || response.status === 403) {
        visitorAuthFailedRef.current = true
        return
      }
      if (response.ok) setActiveVisitors(await response.json() as ActiveVisitor[])
    } catch {}
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messages, refetch: refetchMsgs } = useGetMessages(selectedId as number, {
    query: { enabled: !!selectedId, refetchInterval: 3000 } as any,
  })
  const messageList: AdminMessage[] = Array.isArray(messages)
    ? messages as AdminMessage[]
    : (Array.isArray((messages as any)?.messages) ? (messages as any).messages as AdminMessage[] : [])

  const { mutate: sendMsg } = useSendMessage()
  const { mutate: updateConv } = useUpdateConversation()
  const selectedConversation = conversations?.find(conversation => conversation.id === selectedId)
  const activePackages = containers.filter(container => container.isActive).sort((a, b) => a.order - b.order)
  const selectedIsWhatsapp = selectedConversation
    ? isConfiguredWhatsappNumber(selectedConversation.phone, phoneWhatsapp)
    : false

  const lastTypingSentRef = useRef<number>(0)
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sendTypingState = useCallback((id: number, isTyping: boolean) => {
    fetch(`${API_BASE}/api/conversations/${id}/typing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderType: "admin", isTyping }),
    }).catch(() => {})
  }, [])

  const sendTypingPing = useCallback((id: number) => {
    const now = Date.now()
    if (now - lastTypingSentRef.current >= 2500) {
      lastTypingSentRef.current = now
      sendTypingState(id, true)
    }
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current)
    typingStopTimerRef.current = setTimeout(() => {
      sendTypingState(id, false)
      typingStopTimerRef.current = null
    }, 4500)
  }, [sendTypingState])

  useEffect(() => () => {
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current)
    if (selectedId) sendTypingState(selectedId, false)
  }, [selectedId, sendTypingState])

  // Auto poll conversations list to keep online and typing states fresh
  useEffect(() => {
    const timer = setInterval(() => {
      refetchConvs()
    }, 3000)
    return () => clearInterval(timer)
  }, [refetchConvs])

  useEffect(() => {
    void loadActiveVisitors()
    const timer = setInterval(() => void loadActiveVisitors(), 8000)
    return () => clearInterval(timer)
  }, [loadActiveVisitors])

  async function inviteVisitor(sessionId: string) {
    if (!visitorMessage.trim()) return
    setInvitingVisitor(sessionId)
    try {
      const response = await fetch(`${API_BASE}/api/admin/active-visitors/${encodeURIComponent(sessionId)}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token") || ""}`,
        },
        body: JSON.stringify({ message: visitorMessage.trim() }),
      })
      if (!response.ok) throw new Error()
      toast({ title: "تم إرسال الدعوة للزائر" })
      await loadActiveVisitors()
    } catch {
      toast({ variant: "destructive", title: "تعذر إرسال الدعوة، ربما غادر الزائر" })
    } finally {
      setInvitingVisitor(null)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView()
  }, [messageList])

  useEffect(() => {
    const openId = Number(new URLSearchParams(window.location.search).get("open"))
    if (openId && conversations?.some(conversation => conversation.id === openId)) {
      setSelectedId(openId)
    }
  }, [conversations])

  useEffect(() => {
    if (selectedId && conversations && !conversations.some(conversation => conversation.id === selectedId)) {
      setSelectedId(null)
    }
  }, [conversations, selectedId])

  useEffect(() => {
    if (selectedId) {
      const token = localStorage.getItem("admin_token")
      fetch(`${API_BASE}/api/conversations/${selectedId}/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      }).then(() => {
        refetchConvs()
      }).catch(() => {})
    }
  }, [selectedId, refetchConvs])

  useEffect(() => {
    setSelectedPackageId(selectedConversation?.packageId ? String(selectedConversation.packageId) : "")
  }, [selectedConversation?.packageId, selectedId])

  const handleReplyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReply(e.target.value)
    if (selectedId) {
      sendTypingPing(selectedId)
    }
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim() || !selectedId) return
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current)
    sendTypingState(selectedId, false)
    sendMsg({ id: selectedId!, data: { content: reply, senderType: MessageInputSenderType.admin } }, {
      onSuccess: () => { setReply(""); refetchMsgs(); refetchConvs() }
    })
  }

  const handleSendPackageForm = () => {
    if (!selectedId || !selectedPackageId) return
    const selectedPackage = activePackages.find(packageItem => String(packageItem.id) === selectedPackageId)
    if (!selectedPackage) return
    const serviceType = resolveServiceTypeFromContainer(selectedPackage)
    sendMsg({
      id: selectedId,
      data: {
        content: `نموذج طلب الباقة: ${selectedPackage.name}`,
        senderType: MessageInputSenderType.admin,
        messageType: MessageInputMessageType.package_form,
        metadata: JSON.stringify({
          containerId: selectedPackage.id,
          containerName: selectedPackage.name,
          serviceType,
          conversationId: selectedId,
        }),
      },
    }, {
      onSuccess: () => {
        refetchMsgs()
        refetchConvs()
        toast({ title: "تم إرسال نموذج الباقة للعميل" })
      },
      onError: () => toast({ variant: "destructive", title: "تعذر إرسال نموذج الباقة" }),
    })
  }

  const handleToggleClosed = () => {
    if (!selectedId) return
    const nextStatus = selectedConversation?.status === "closed" ? ConversationUpdateStatus.open : ConversationUpdateStatus.closed
    updateConv({ id: selectedId, data: { status: nextStatus } }, {
      onSuccess: () => { refetchConvs(); setSelectedId(null); toast({ title: nextStatus === ConversationUpdateStatus.closed ? "تم إنهاء وإغلاق المحادثة" : "تم إعادة فتح المحادثة" }) }
    })
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      const res = await fetch(`${API_BASE}/api/admin/conversations/${id}`, {
        method: "DELETE",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          "Cache-Control": "no-cache",
        },
      })
      if (!res.ok) throw new Error("فشل الحذف")
      if (selectedId === id) setSelectedId(null)
      const refreshed = await refetchConvs()
      if (refreshed.data?.some(conversation => conversation.id === id)) {
        throw new Error("لم تختفِ المحادثة من القائمة بعد الحذف")
      }
      toast({ title: "تم حذف المحادثة ✅" })
    } catch {
      toast({ variant: "destructive", title: "فشل الحذف" })
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDeleteAll() {
    setDeletingAll(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/conversations`, {
        method: "DELETE",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          "Cache-Control": "no-cache",
        },
      })
      if (!res.ok) throw new Error("فشل الحذف")
      setSelectedId(null)
      setConfirmDeleteAll(false)
      const refreshed = await refetchConvs()
      if ((refreshed.data?.length ?? 0) > 0) {
        throw new Error("لم تختفِ المحادثات من القائمة بعد الحذف")
      }
      toast({ title: "تم حذف جميع المحادثات ✅" })
    } catch {
      toast({ variant: "destructive", title: "فشل الحذف" })
    } finally {
      setDeletingAll(false)
    }
  }

  return (
    <div className="min-h-[calc(100dvh-8rem)] lg:h-[calc(100vh-8rem)] flex gap-4 lg:gap-6 flex-col">

      {/* Delete All confirmation banner */}
      {confirmDeleteAll && (
        <div className="flex flex-wrap items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <p className="flex-1 text-red-700 font-medium">هل أنت متأكد من حذف جميع المحادثات والرسائل؟ لا يمكن التراجع.</p>
          <Button size="sm" variant="destructive" onClick={handleDeleteAll} disabled={deletingAll} className="rounded-xl">
            {deletingAll ? "جارٍ الحذف..." : "نعم، احذف الكل"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmDeleteAll(false)} className="rounded-xl">إلغاء</Button>
        </div>
      )}

      <Card className="overflow-hidden border-emerald-100 bg-emerald-50/40">
        <div className="flex flex-wrap items-center gap-3 border-b border-emerald-100 px-4 py-3">
          <Users size={19} className="text-emerald-700" />
          <div className="flex-1">
            <h2 className="font-bold text-emerald-950">الزوار الموجودون الآن</h2>
            <p className="text-xs text-emerald-800/70">يظهر الزائر هنا ما دام يتصفح الموقع خلال آخر خمس دقائق.</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">{activeVisitors.length} زائر نشط</span>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-800">{visitorsWithConversations} في محادثة</span>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">{newVisitors.length} بدون محادثة</span>
          </div>
          <button onClick={() => void loadActiveVisitors()} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-100" title="تحديث القائمة" aria-label="تحديث القائمة"><RefreshCw size={15} /></button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-emerald-100 px-4 py-3">
          <Input value={visitorMessage} onChange={event => setVisitorMessage(event.target.value)} className="min-w-[18rem] flex-1 bg-white text-xs" placeholder="رسالة الدعوة للزائر" />
        </div>
        <div className="flex gap-2 overflow-x-auto p-3">
          {activeVisitors.map(visitor => (
            <div key={visitor.sessionId} className="min-w-[14rem] rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-gray-800">{visitor.clientName || "زائر مجهول"}</p>
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              </div>
              <p className="mt-1 truncate text-[11px] text-gray-500" dir="ltr">{visitor.phone || "لم يسجل بياناته"} · {visitor.page || "/"}</p>
              {visitor.conversationId ? (
                <Button size="sm" variant="outline" onClick={() => setSelectedId(visitor.conversationId ?? null)} className="mt-3 h-8 w-full gap-1.5 rounded-lg border-blue-200 text-xs text-blue-700 hover:bg-blue-50">
                  <MessageSquare size={13} /> مرتبط بمحادثة — فتح
                </Button>
              ) : (
                <Button size="sm" onClick={() => void inviteVisitor(visitor.sessionId)} disabled={invitingVisitor === visitor.sessionId || visitor.hasPendingInvitation} className="mt-3 h-8 w-full gap-1.5 rounded-lg bg-emerald-600 text-xs hover:bg-emerald-700">
                  <Send size={13} /> {visitor.hasPendingInvitation ? "تم إرسال الدعوة" : invitingVisitor === visitor.sessionId ? "جارٍ الإرسال..." : "دعوة للمحادثة"}
                </Button>
              )}
            </div>
          ))}
          {activeVisitors.length === 0 && (
            <p className="px-2 py-3 text-xs text-emerald-900/60">
              لا يوجد زوار نشطون حالياً.
            </p>
          )}
        </div>
      </Card>

      <div className="flex flex-1 min-h-0 flex-col gap-4 lg:flex-row lg:gap-6">
        {/* List */}
        <Card className="flex h-64 w-full shrink-0 flex-col overflow-hidden lg:h-auto lg:w-1/3">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <span className="font-bold text-lg text-primary">المحادثات النشطة</span>
            {conversations && conversations.length > 0 && (
              <button
                onClick={() => setConfirmDeleteAll(true)}
                title="حذف الكل"
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="sticky top-0 z-10 flex gap-1 border-b bg-white p-2">
              <button onClick={() => setShowClosed(false)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold ${!showClosed ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                المفتوحة ({activeConversations.length})
              </button>
              <button onClick={() => setShowClosed(true)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold ${showClosed ? "bg-gray-700 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                المغلقة ({closedConversations.length})
              </button>
            </div>
            {visibleConversations.map(conv => (
              <div key={conv.id} className={`group relative border-b transition-colors ${
                selectedId === conv.id ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-gray-50"
              }`}>
                <button
                  onClick={() => setSelectedId(conv.id)}
                  className="w-full text-right p-4 pr-3"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-900">{conv.clientName}</span>
                      {(conv as any).isOnline && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="متصل الآن" />
                      )}
                    </div>
                    {conv.status === "open" && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1" />}
                  </div>
                  <div className="mb-1 flex items-center gap-1 text-xs text-gray-500" dir="ltr">
                    <span>{conv.phone}</span>
                    {isConfiguredWhatsappNumber(conv.phone, phoneWhatsapp) && (
                      <FaWhatsapp
                        size={14}
                        className="text-green-500"
                        title="هذا الرقم محدد للواتساب في إعدادات الموقع"
                        aria-label="رقم واتساب"
                      />
                    )}
                  </div>
                   {conv.packageName && (
                     <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-primary">
                       <Package size={12} />
                       <span className="truncate">{conv.packageName}</span>
                     </div>
                   )}
                  <p className="text-sm text-gray-600 truncate">{conv.lastMessage || "محادثة جديدة"}</p>
                </button>
                {/* Delete button — appears on hover */}
                <button
                  onClick={() => handleDelete(conv.id)}
                  disabled={deletingId === conv.id}
                  title="حذف المحادثة"
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  {deletingId === conv.id
                    ? <span className="text-xs text-red-400">...</span>
                    : <Trash2 size={13} />}
                </button>
              </div>
            ))}
            {visibleConversations.length === 0 && (
              <div className="p-8 text-center text-gray-500">{showClosed ? "لا توجد محادثات مغلقة" : "لا توجد محادثات مفتوحة"}</div>
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="flex min-h-[28rem] w-full min-w-0 flex-col overflow-hidden bg-gray-50/50 lg:min-h-0 lg:w-2/3">
          {selectedId ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-xs">
                    <User size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-base text-gray-900">
                        {selectedConversation?.clientName || `محادثة #${selectedId}`}
                      </h3>
                      {selectedConversation?.phone && (
                        <a
                          href={`tel:${selectedConversation.phone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          title={`اتصال مباشر بالعميل: ${selectedConversation.phone}`}
                        >
                          <Phone size={13} className="animate-pulse" />
                          <span dir="ltr">{selectedConversation.phone}</span>
                        </a>
                      )}
                      {selectedConversation?.phone && (
                        <a
                          href={whatsappHref(selectedConversation.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl text-xs font-bold transition-all"
                          title="فتح محادثة واتساب"
                        >
                          <FaWhatsapp size={14} className="text-green-600" />
                          واتساب
                        </a>
                      )}
                    </div>

                    {selectedConversation?.packageName && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary">
                        <Package size={12} />
                        الباقة: {selectedConversation.packageName}
                      </p>
                    )}

                    {(selectedConversation as any)?.isOnline ? (
                      <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                        متصل الآن بالموقع {(selectedConversation as any)?.activePage ? `(يتصفح: ${(selectedConversation as any).activePage})` : ""}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">غير متصل حالياً</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(selectedId)}
                    disabled={deletingId === selectedId}
                    className="text-red-500 border-red-200 hover:bg-red-50 gap-1.5"
                  >
                    <Trash2 size={14} />
                    {deletingId === selectedId ? "جارٍ الحذف..." : "حذف"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleToggleClosed} className="text-gray-600">
                    <CheckCircle2 size={16} className="mr-2" /> {selectedConversation?.status === "closed" ? "إعادة فتح" : "إنهاء وإغلاق"}
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messageList.map(msg => {
                  const isAdmin = msg.senderType === MessageSenderType.admin || msg.senderType === MessageSenderType.ai
                   const isStructured = msg.messageType === "package_form" || msg.messageType === "order_confirmation"
                   if (isStructured) {
                     return (
                       <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                         <div className="max-w-[88%]">
                           <PackageFormMessage messageType={msg.messageType} metadata={msg.metadata} viewer="admin" />
                         </div>
                       </div>
                     )
                   }
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                        isAdmin
                          ? "bg-primary text-white rounded-tr-sm"
                          : "bg-white border shadow-sm text-gray-800 rounded-tl-sm"
                      }`}>
                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                        {msg.attachmentUrl && (
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 block overflow-hidden rounded-xl border border-black/10 bg-black/5"
                            title="فتح الصورة بالحجم الكامل"
                          >
                            <img
                              src={msg.attachmentUrl}
                              alt="صورة مرفقة من العميل"
                              className="max-h-64 w-full object-contain"
                            />
                          </a>
                        )}
                        {(msg.locationLabel || (msg.locationLat && msg.locationLng)) && (
                          <LocationMessagePreview message={msg} isAdmin={isAdmin} />
                        )}
                        {msg.senderType === MessageSenderType.ai && (
                          <div className="text-[10px] text-white/50 mt-1 flex items-center gap-1">
                            <Clock size={10} /> رد آلي
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {Boolean((selectedConversation as any)?.isClientTyping) && (
                  <div className="flex justify-start mb-2 animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-gray-100 text-gray-700 rounded-2xl rounded-tr-none px-4 py-2 text-xs flex items-center gap-2 border border-gray-200 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold text-gray-800">العميل يكتب الآن</span>
                      <span className="inline-flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t bg-white px-4 pt-3">
                <div className="flex flex-col gap-2 rounded-xl border border-primary/10 bg-primary/5 p-2 sm:flex-row">
                  <select
                    data-testid="select-conversation-package-form"
                    value={selectedPackageId}
                    onChange={event => setSelectedPackageId(event.target.value)}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-xs outline-none focus:border-primary/40"
                  >
                    <option value="">اختر باقة لإرسال نموذجها للعميل</option>
                    {activePackages.map(packageItem => (
                      <option key={packageItem.id} value={packageItem.id}>
                        {packageItem.name}{packageItem.size ? ` — ${packageItem.size}` : ""}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    data-testid="button-send-package-form"
                    onClick={handleSendPackageForm}
                    disabled={!selectedPackageId}
                    className="h-10 shrink-0 gap-1.5 rounded-lg bg-secondary px-4 text-xs font-bold text-white hover:bg-secondary/90"
                  >
                    <Package size={14} />
                    إرسال نموذج الباقة
                  </Button>
                </div>
              </div>
              <form onSubmit={handleSend} className="flex gap-2 border-t bg-white p-4">
                <Input
                  value={reply}
                  onChange={handleReplyChange}
                  placeholder="اكتب ردك هنا..."
                  className="flex-1 bg-gray-50 focus-visible:ring-primary"
                />
                <Button type="submit" className="bg-primary text-white shrink-0 px-6">
                  إرسال <Send size={16} className="mr-2 rtl:-scale-x-100" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                <p>اختر محادثة لعرض التفاصيل</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
