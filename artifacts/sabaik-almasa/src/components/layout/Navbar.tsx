import * as React from "react"
import { Link, useLocation } from "wouter"
import { useServiceRequest } from "@/context/ServiceRequestContext"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { Menu, X, Search, ShieldCheck } from "lucide-react"
import { TrackOrderModal } from "@/components/home/TrackOrderModal"

const NAV_LINKS = [
  { href: "/", text: "الرئيسية" },
  { href: "/containers", text: "الحاويات" },
  { href: "/pricing", text: "الأسعار" },
  { href: "/blog", text: "المدونة" },
  { href: "/faq", text: "الأسئلة الشائعة" },
  { href: "/contact", text: "اتصل بنا" },
]

export function Navbar() {
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [trackingOpen, setTrackingOpen] = React.useState(false)
  const [trackingId, setTrackingId] = React.useState<string | undefined>()
  const { openModal } = useServiceRequest()
  const [location] = useLocation()
  const { logoUrl, isLoaded, orderTrackingEnabled, companyName } = useSiteSettings()

  const isInnerPage = location !== "/"
  const isSolid = isScrolled || isInnerPage

  React.useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  React.useEffect(() => {
    const handler = (event: Event) => {
      const id = (event as CustomEvent<{ id?: number | string }>).detail?.id
      setTrackingId(id !== undefined && id !== null && String(id).trim() ? String(id) : undefined)
      setTrackingOpen(true)
    }
    window.addEventListener("openTrackingModal", handler)
    return () => window.removeEventListener("openTrackingModal", handler)
  }, [])

  React.useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false) }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [menuOpen])

  React.useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [menuOpen])

  return (
    <>
      <header
        className={`home-navbar fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isSolid
            ? "is-solid border-b border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(15,23,42,0.10)] py-3"
            : "border-b border-transparent bg-transparent shadow-none backdrop-blur-0 py-5"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2">
              {isLoaded && logoUrl ? (
                <img src={logoUrl} alt={companyName || "تأجير حاويات بالرياض"} width={220} height={80} className="h-10 md:h-12 w-auto object-contain" />
              ) : (
                <span className="font-extrabold text-primary text-lg md:text-xl">
                  {companyName || "تأجير الحاويات"}
                </span>
              )}
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8">
              {NAV_LINKS.map(l => (
                <NavLink key={l.href} href={l.href} text={l.text} isScrolled={isSolid} location={location} />
              ))}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {isLoaded && orderTrackingEnabled && (
                <button
                  onClick={() => setTrackingOpen(true)}
                  className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                      isSolid
                      ? "border border-primary/15 text-primary hover:border-primary/35 hover:bg-primary/5"
                      : "border border-white/35 text-white hover:border-secondary hover:bg-white/10"
                  }`}
                >
                  <Search size={14} />
                  تتبع الطلب
                </button>
              )}

              <Link
                href="/admin/login"
                className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                    isSolid
                    ? "border border-primary/15 text-primary hover:border-primary/35 hover:bg-primary/5"
                    : "border border-white/35 text-white hover:border-secondary hover:bg-white/10"
                }`}
              >
                <ShieldCheck size={14} />
                دخول الإدارة
              </Link>

              {/* CTA */}
              <button
                onClick={() => openModal()}
                className="hidden sm:inline-flex items-center bg-secondary text-primary px-5 py-2.5 rounded-xl font-black text-sm hover:bg-primary hover:text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                اطلب الحاوية
              </button>

              {/* Burger button */}
              <button
                onClick={() => setMenuOpen(p => !p)}
                aria-label="القائمة الرئيسية"
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation"
                className={`md:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
                  isSolid
                    ? "text-primary hover:bg-primary/10 active:bg-primary/15"
                    : "text-white hover:bg-white/15 active:bg-white/20"
                }`}
              >
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>
      {/* Backdrop */}
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      {/* Track order modal */}
      {isLoaded && orderTrackingEnabled && (
        <TrackOrderModal isOpen={trackingOpen} onClose={() => { setTrackingOpen(false); setTrackingId(undefined) }} initialId={trackingId} />
      )}
      {/* Mobile menu drawer */}
      <div
        dir="rtl"
        id="mobile-navigation"
        aria-hidden={!menuOpen}
        className={`fixed top-0 right-0 z-[60] h-full w-72 bg-[#fffaf3] shadow-2xl flex flex-col md:hidden transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7dccb]">
          {isLoaded && logoUrl ? (
            <img src={logoUrl} alt={companyName || "تأجير حاويات بالرياض"} width={220} height={80} className="h-10 w-auto" />
          ) : (
            <span className="font-bold text-primary text-base">{companyName || "تأجير الحاويات"}</span>
          )}
          <button
            onClick={() => setMenuOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="أغلق القائمة"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex flex-col px-3 py-5 gap-0.5 flex-1 overflow-y-auto">
           {NAV_LINKS.map(l => (
             <Link
              key={l.href}
               href={l.href}
              onClick={() => setMenuOpen(false)}
               className={`flex items-center px-4 py-3.5 rounded-xl font-medium text-[1rem] transition-colors ${
                 (l.href === "/" ? location === "/" : location === l.href || location.startsWith(`${l.href}/`))
                   ? "bg-primary/10 text-primary"
                   : "text-primary/85 hover:text-primary hover:bg-primary/10"
               }`}
               data-testid={`link-mobile-nav-${l.text}`}
            >
              {l.text}
             </Link>
          ))}
        </nav>

        <div className="px-4 pb-8 pt-3 border-t border-[#e7dccb] space-y-2.5">
          <button
            onClick={() => { setMenuOpen(false); openModal() }}
            className="w-full bg-secondary text-white py-3.5 rounded-xl font-bold text-base shadow-lg hover:bg-secondary/90 transition-colors"
          >
            اطلب الحاوية الآن
          </button>
          {isLoaded && orderTrackingEnabled && (
            <button
              onClick={() => { setMenuOpen(false); setTrackingOpen(true) }}
              className="w-full flex items-center justify-center gap-2 border border-primary/20 text-primary/75 hover:text-primary hover:border-primary/45 py-3 rounded-xl font-medium text-sm transition-colors"
            >
              <Search size={15} />
              تتبع الطلب
            </button>
          )}
          <Link
            href="/admin/login"
            onClick={() => setMenuOpen(false)}
            className="w-full flex items-center justify-center gap-2 border border-secondary/60 text-secondary hover:bg-secondary hover:text-white py-3 rounded-xl font-bold text-sm transition-colors"
          >
            <ShieldCheck size={15} />
            دخول الإدارة
          </Link>
        </div>
      </div>
    </>
  );
}

function NavLink({ href, text, isScrolled, location }: { href: string; text: string; isScrolled: boolean; location: string }) {
  const isActive = href === "/" ? location === "/" : location === href || location.startsWith(`${href}/`)
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`group relative rounded-lg px-1 py-2 font-medium transition-colors hover:text-secondary focus:outline-none focus:ring-2 focus:ring-secondary ${
        isScrolled ? "text-primary/80" : "text-white drop-shadow-md"
      } ${isActive ? "text-secondary" : ""}`}
      data-testid={`link-nav-${text}`}
    >
      {text}
      <span className={`absolute inset-x-1 -bottom-0.5 h-0.5 origin-center rounded-full bg-secondary transition-transform duration-200 ${isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} aria-hidden="true" />
    </Link>
  )
}
