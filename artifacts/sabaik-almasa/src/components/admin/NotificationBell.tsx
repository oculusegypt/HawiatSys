import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, X, Package, MessageSquare, Info, CheckCheck, ExternalLink, Smartphone, Loader2, ShieldAlert } from "lucide-react"
import { Link } from "wouter"
import { fetchAdminMutation } from "@/lib/adminMutation"
import { playNotificationChime } from "@/lib/visitorAttribution"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
const SERVICE_WORKER_URL = `${API_BASE}/sw.js`
const SERVICE_WORKER_SCOPE = `${API_BASE}/`
const PUSH_KEY_STORAGE = "cleanflow_push_vapid_public_key"

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0))).buffer as ArrayBuffer
}

async function getPushRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
    scope: SERVICE_WORKER_SCOPE,
    updateViaCache: "none",
  })
  await navigator.serviceWorker.ready
  await registration.update()
  return registration
}

function notificationTarget(notification: Pick<Notification, "refId" | "refType">): string {
  if (localStorage.getItem("admin_role") === "driver") return "/admin/work-orders"
  if (notification.refType === "service_request" && notification.refId) {
    return `/admin/requests?open=${encodeURIComponent(notification.refId)}`
  }
  if (notification.refType === "conversation" && notification.refId) {
    return `/admin/conversations?open=${encodeURIComponent(notification.refId)}`
  }
  if (notification.refType === "whatsapp" && notification.refId) {
    return `/admin/whatsapp?open=${encodeURIComponent(notification.refId)}`
  }
  return "/admin/notifications"
}

async function savePushSubscription(
  subscription: PushSubscription,
  token: string,
): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/push/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(subscription),
  })
  return response.ok
}

type PushState = "unsupported" | "denied" | "enabled" | "disabled" | "loading" | "error"

function PushNotificationToggle() {
  const [state, setState] = useState<PushState>("loading")
  const [error, setError] = useState("")
  const token = localStorage.getItem("admin_token") || ""

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported")
        return
      }
      if (Notification.permission === "denied") {
        setState("denied")
        return
      }
      try {
        // The worker must live at the website root. Registering it below /api
        // prevents it from controlling the admin page on Hostinger.
        const registration = await getPushRegistration()
        let subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          // Re-save an existing browser subscription on every admin session.
          // This repairs subscriptions created before a reinstall, browser
          // restore, or admin-token change without requiring the user to
          // toggle notifications off and on again.
          const keyResponse = await fetch(`${API_BASE}/api/push/public-key`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!keyResponse.ok) throw new Error("تعذر التحقق من إعداد إشعارات الهاتف")
          const { publicKey } = await keyResponse.json() as { publicKey: string }
          const previousKey = localStorage.getItem(PUSH_KEY_STORAGE)
          if (previousKey && previousKey !== publicKey) {
            await fetch(`${API_BASE}/api/push/subscriptions`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            })
            await subscription.unsubscribe()
            subscription = null
          } else if (await savePushSubscription(subscription, token)) {
            localStorage.setItem(PUSH_KEY_STORAGE, publicKey)
          } else {
            throw new Error("تعذر مزامنة اشتراك الهاتف")
          }
        }
        if (!cancelled) setState(subscription ? "enabled" : "disabled")
      } catch (cause) {
        if (!cancelled) {
          setState("error")
          setError(cause instanceof Error ? cause.message : "تعذر تجهيز الإشعارات")
        }
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const enable = async () => {
    setState("loading")
    setError("")
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "disabled")
        return
      }
      const keyResponse = await fetch(`${API_BASE}/api/push/public-key`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!keyResponse.ok) throw new Error("تعذر تجهيز الإشعارات")
      const { publicKey } = await keyResponse.json() as { publicKey: string }
       const registration = await getPushRegistration()
       let subscription = await registration.pushManager.getSubscription()
       const previousKey = localStorage.getItem(PUSH_KEY_STORAGE)
       // A regenerated VAPID key invalidates old browser subscriptions. Remove
       // it before subscribing again, otherwise Chrome reports an opaque
       // InvalidStateError and the phone appears enabled but receives nothing.
       if (subscription && previousKey && previousKey !== publicKey) {
         await fetch(`${API_BASE}/api/push/subscriptions`, {
           method: "DELETE",
           headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
           body: JSON.stringify({ endpoint: subscription.endpoint }),
         })
         await subscription.unsubscribe()
         subscription = null
       }
       if (!subscription) {
         subscription = await registration.pushManager.subscribe({
           userVisibleOnly: true,
           applicationServerKey: urlBase64ToArrayBuffer(publicKey),
         })
       }
       if (!await savePushSubscription(subscription, token)) throw new Error("تعذر حفظ اشتراك الهاتف")
       localStorage.setItem(PUSH_KEY_STORAGE, publicKey)
      setState("enabled")
    } catch (cause) {
      setState("error")
      setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع")
    }
  }

  const disable = async () => {
    setState("loading")
    try {
       const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE)
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        await fetch(`${API_BASE}/api/push/subscriptions`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
       localStorage.removeItem(PUSH_KEY_STORAGE)
      setState("disabled")
    } catch {
      setState("error")
      setError("تعذر إيقاف إشعارات الهاتف")
    }
  }

  if (state === "unsupported") return <p className="px-4 py-2 text-[11px] text-gray-400">المتصفح لا يدعم إشعارات الهاتف</p>
  if (state === "denied") return <p className="flex gap-2 px-4 py-2 text-[11px] leading-5 text-amber-700"><ShieldAlert size={14} className="mt-0.5 shrink-0" />الإشعارات مرفوضة من إعدادات المتصفح</p>
  if (state === "error") return <p className="px-4 py-2 text-[11px] leading-5 text-red-600">{error || "تعذر تفعيل الإشعارات"}</p>
  if (state === "loading") return <div className="flex items-center gap-2 px-4 py-2 text-[11px] text-gray-400"><Loader2 size={13} className="animate-spin" />جاري تجهيز إشعارات الهاتف...</div>

  return (
    <button
      onClick={state === "enabled" ? disable : enable}
      className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-right text-[11px] font-semibold text-gray-600 hover:bg-primary/5"
    >
      <Smartphone size={14} className={state === "enabled" ? "text-green-600" : "text-primary"} />
      <span className="flex-1">{state === "enabled" ? "إشعارات الهاتف مفعّلة" : "تفعيل إشعارات الهاتف"}</span>
      {state === "enabled" && <span className="text-[10px] font-normal text-gray-400">إيقاف</span>}
    </button>
  )
}

interface Notification {
  id: number
  title: string
  message: string
  type: string
  isRead: boolean
  refId?: number | null
  refType?: string | null
  createdAt: string
}

function isMessageNotification(notification: Pick<Notification, "type" | "refType">): boolean {
  // Conversation notifications belong to the messages icon, not the bell.
  // Keep the legacy "message" value covered as well so older rows cannot
  // accidentally appear in the operational notification feed.
  return notification.type === "chat"
    || notification.type === "conversation"
    || notification.type === "message"
    || notification.refType === "conversation"
}

// ── Floating Toast ─────────────────────────────────────────────────────────────

interface ToastItem {
  id: string
  notification: Notification
}

function FloatingToast({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, x: -80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -80, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="flex items-start gap-3 bg-white border border-gray-200 shadow-2xl rounded-2xl p-4 w-80 pointer-events-auto"
    >
      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
        {toast.notification.type === "service_request" ? (
          <Package size={18} className="text-primary" />
        ) : toast.notification.type === "conversation" || toast.notification.type === "chat" ? (
          <MessageSquare size={18} className="text-blue-600" />
        ) : (
          <Info size={18} className="text-gray-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm leading-tight">{toast.notification.title}</p>
        <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{toast.notification.message}</p>
        <p className="text-[10px] text-gray-400 mt-1.5">الآن</p>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 -mt-0.5">
        <X size={14} />
      </button>
    </motion.div>
  )
}

// ── Toast Portal ───────────────────────────────────────────────────────────────

export function AdminToastPortal() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const shownNotificationIdsRef = useRef(new Set<number>())

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Listen for custom events from the notification bell
  useEffect(() => {
    const handler = (e: CustomEvent<Notification>) => {
      if (!e.detail?.id || shownNotificationIdsRef.current.has(e.detail.id)) return
      shownNotificationIdsRef.current.add(e.detail.id)
      setToasts(prev => [...prev.slice(-3), { id: String(e.detail.id), notification: e.detail }])
    }
    window.addEventListener("admin:new-notification" as any, handler)
    return () => window.removeEventListener("admin:new-notification" as any, handler)
  }, [])

  return (
    <div className="admin-toast-portal fixed left-1/2 top-4 z-[200] flex -translate-x-1/2 flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <FloatingToast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

export function NotificationStatusStrip() {
  const [latest, setLatest] = useState<Notification | null>(null)
  const token = localStorage.getItem("admin_token") || ""
  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (!response.ok) return
      const rows = await response.json() as Notification[]
      setLatest(rows[0] ?? null)
    } catch {}
  }, [token])

  useEffect(() => {
    void load()
    const timer = setInterval(load, 8000)
    return () => clearInterval(timer)
  }, [load])

  if (!latest) return null
  return (
    <div className="notification-status-strip border-b border-primary/10 bg-primary/[0.035] px-4 py-2 text-xs text-gray-600">
      <div className="mx-auto flex max-w-[1600px] items-center gap-2">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
        <span className="font-bold text-primary">آخر تحديث</span>
        <span className="truncate">{latest.title}: {latest.message}</span>
        <span className="mr-auto shrink-0 text-[10px] text-gray-400">{timeAgo(latest.createdAt)}</span>
      </div>
    </div>
  )
}

// ── Bell Component ────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "الآن"
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `منذ ${hrs} ساعة`
  return `منذ ${Math.floor(hrs / 24)} يوم`
}

function notifIcon(type: string) {
  if (type === "service_request") return <Package size={14} className="text-primary" />
  if (type === "conversation" || type === "chat" || type === "message") return <MessageSquare size={14} className="text-blue-600" />
  return <Info size={14} className="text-gray-500" />
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)
  const seenNotificationIdsRef = useRef(new Set<number>())
  const token = localStorage.getItem("admin_token") || ""

  const announceNotification = useCallback((notification: Notification) => {
    if (!notification.id || seenNotificationIdsRef.current.has(notification.id)) return
    seenNotificationIdsRef.current.add(notification.id)
    playNotificationChime()
    window.dispatchEvent(new CustomEvent(
      isMessageNotification(notification) ? "admin:new-message" : "admin:new-notification",
      { detail: notification },
    ))
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (!res.ok) return
      const data: Notification[] = await res.json()
      setNotifications(data)

      const ordered = [...data].sort((a, b) => a.id - b.id)
      if (!initializedRef.current) {
        ordered.forEach(n => seenNotificationIdsRef.current.add(n.id))
        initializedRef.current = true
      } else {
        ordered
          .filter(n => !seenNotificationIdsRef.current.has(n.id))
          .forEach(announceNotification)
        ordered.forEach(n => seenNotificationIdsRef.current.add(n.id))
      }
    } catch {}
  }, [token, announceNotification])

  // A visible admin tab receives the push through the service worker and
  // announces it here. The worker shows a native notification only when no
  // visible admin tab is available, preventing one event from firing twice.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== "admin:push-notification") return
      const incoming = event.data.notification as Notification | undefined
      if (!incoming?.id) return
      setNotifications(prev => [
        incoming,
        ...prev.filter(notification => notification.id !== incoming.id),
      ].sort((a, b) => b.id - a.id))
      announceNotification(incoming)
    }
    navigator.serviceWorker?.addEventListener("message", handler)
    return () => navigator.serviceWorker?.removeEventListener("message", handler)
  }, [announceNotification])

  // Initial fetch
  useEffect(() => {
    void fetchNotifications()
  }, [fetchNotifications])

  // Poll every 8 seconds
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 8000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const bellNotifications = notifications.filter(notification => !isMessageNotification(notification))
  const messageNotifications = notifications.filter(isMessageNotification)
  const unreadCount = bellNotifications.filter(n => !n.isRead).length

  const markAsRead = async (id: number) => {
    try {
      const res = await fetchAdminMutation(`${API_BASE}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        if (res.status === 404) await fetchNotifications()
        return
      }
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch {}
  }

  const markAllRead = async () => {
    setIsMarkingAll(true)
    try {
      const res = await fetchAdminMutation(`${API_BASE}/api/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch {} finally {
      setIsMarkingAll(false)
    }
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(v => !v)}
        className={`relative p-2 rounded-xl transition-all ${
          isOpen ? "bg-primary/10 text-primary" : "text-gray-500 hover:bg-gray-100 hover:text-primary"
        }`}
      >
        <Bell size={22} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse ring when unread */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-40" />
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              ref={dropdownRef}
              role="dialog"
              aria-label="الإشعارات"
              className="absolute left-0 right-auto top-full mt-2 w-[min(20rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[9999]"
              style={{ transformOrigin: "top right" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-primary" />
                  <span className="font-bold text-gray-900 text-sm">الإشعارات</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount} جديد
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    disabled={isMarkingAll}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <CheckCheck size={12} />
                    قراءة الكل
                  </button>
                )}
              </div>

              <PushNotificationToggle />

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {bellNotifications.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <Bell size={28} className="mx-auto mb-2 opacity-30" />
                    {messageNotifications.length > 0 ? (
                      <>
                        <p className="text-sm">لا توجد تنبيهات تشغيلية</p>
                        <p className="mt-1 px-5 text-[11px] leading-5 text-gray-400">
                          رسائل المحادثات تظهر في أيقونة الرسائل بجانب الجرس
                        </p>
                        <Link
                          href="/admin/conversations"
                          onClick={() => setIsOpen(false)}
                          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          فتح المحادثات
                          <MessageSquare size={13} />
                        </Link>
                      </>
                    ) : (
                      <p className="text-sm">لا توجد إشعارات</p>
                    )}
                  </div>
                ) : (
                  bellNotifications.slice(0, 15).map((n) => (
                    <div
                      key={n.id}
                      className={`flex gap-3 px-4 py-3 transition-colors cursor-pointer ${
                        !n.isRead ? "bg-primary/4 hover:bg-primary/8" : "hover:bg-gray-50"
                      }`}
                        onClick={() => {
                          if (!n.isRead) void markAsRead(n.id)
                          if (n.refId || n.refType) window.location.assign(notificationTarget(n))
                        }}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        n.type === "service_request" ? "bg-primary/10" :
                        n.type === "conversation" || n.type === "chat" ? "bg-blue-100" : "bg-gray-100"
                      }`}>
                        {notifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1">
                          <p className={`text-xs font-semibold leading-tight ${!n.isRead ? "text-gray-900" : "text-gray-600"}`}>
                            {n.title}
                          </p>
                          {!n.isRead && <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 mt-1" />}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-gray-300 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {n.refType === "service_request" && n.refId && (
                        <Link
                          href={notificationTarget(n)}
                          className="shrink-0 text-gray-300 hover:text-primary mt-1"
                          onClick={() => setIsOpen(false)}
                        >
                          <ExternalLink size={12} />
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 px-4 py-2.5 text-center">
                <Link href="/admin/notifications" onClick={() => setIsOpen(false)} className="text-xs text-primary hover:underline">
                  عرض جميع الإشعارات
                </Link>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
