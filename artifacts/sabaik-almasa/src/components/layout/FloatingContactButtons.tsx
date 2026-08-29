import React, { lazy, Suspense, useEffect, useState } from "react"
import { useLocation } from "wouter"
import { Phone, MessageCircle } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { useSiteSettings, resolveContactNumbers } from "@/context/SiteSettingsContext"
const AIChatbotWidget = lazy(() =>
  import("@/components/chat/AIChatbotWidget").then(({ AIChatbotWidget: Widget }) => ({ default: Widget })),
)

function DeferredAIChatbot() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 2500)
    return () => window.clearTimeout(timer)
  }, [])

  if (!ready) return null
  return (
    <Suspense fallback={null}>
      <AIChatbotWidget />
    </Suspense>
  )
}

export function FloatingContactButtons() {
  const [location] = useLocation()
  const { phoneCall, phoneWhatsapp, phones, companyName } = useSiteSettings()

  if (location.startsWith("/admin")) {
    return null
  }

  const { call, whatsapp } = resolveContactNumbers(phoneCall, phoneWhatsapp, phones)

  const waDigits = whatsapp.replace(/\D/g, "")
  const waIntl = waDigits.startsWith("00")
    ? waDigits.slice(2)
    : waDigits.startsWith("0")
    ? `966${waDigits.slice(1)}`
    : waDigits
  const waHref = whatsapp
    ? `https://wa.me/${waIntl}?text=${encodeURIComponent(companyName ? `مرحباً ${companyName}، أود الاستفسار عن تأجير الحاويات والأسعار` : "مرحباً، أود الاستفسار عن تأجير الحاويات والأسعار")}`
    : ""

  const callDigits = call.replace(/[^\d+]/g, "")
  const callHref = `tel:${callDigits}`

  return (
    <>
      {/* Floating Call & WhatsApp on the Right side */}
      <div className="fixed bottom-6 right-4 sm:right-6 z-40 flex flex-col gap-3 items-end">
        {/* Call Button */}
        {call && <a
          href={callHref}
          style={{ animationDelay: "200ms" }}
          className="floating-contact-enter group relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 bg-primary text-white rounded-full shadow-2xl hover:bg-primary/90 hover:scale-110 active:scale-95 transition-all shadow-primary/30"
          title={`اتصال مباشر: ${call}`}
          aria-label="اتصال فوري"
        >
          <Phone className="w-6 h-6 animate-pulse" />
          <span className="hidden group-hover:block absolute right-16 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg transition-opacity pointer-events-none">
            اتصال هاتفي سريع
          </span>
        </a>}

        {/* WhatsApp Button */}
        {whatsapp && <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{ animationDelay: "100ms" }}
          className="floating-contact-enter group relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 bg-emerald-500 text-white rounded-full shadow-2xl hover:bg-emerald-600 hover:scale-110 active:scale-95 transition-all shadow-emerald-500/30"
          title={`تواصل عبر واتساب: ${whatsapp}`}
          aria-label="محادثة واتساب"
        >
          <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-30" />
          <FaWhatsapp className="w-7 h-7 relative z-10" />
          <span className="hidden group-hover:block absolute right-16 bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg transition-opacity pointer-events-none">
            تواصل عبر واتساب
          </span>
        </a>}
      </div>

      {/* AI Assistant & Live Chat Widget on the Left side */}
      <DeferredAIChatbot />
    </>
  )
}
