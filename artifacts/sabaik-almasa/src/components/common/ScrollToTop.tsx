import { ArrowUp } from "lucide-react"
import { useEffect, useState } from "react"
import { useLocation } from "wouter"

export function ScrollToTop() {
  const [location] = useLocation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior })
  }, [location])

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 420)
    updateVisibility()
    window.addEventListener("scroll", updateVisibility, { passive: true })
    return () => window.removeEventListener("scroll", updateVisibility)
  }, [])

  if (location.startsWith("/admin") || !visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, left: 0, behavior: "smooth" })}
      className="fixed bottom-24 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/10 bg-white text-primary shadow-xl shadow-primary/15 transition-all hover:-translate-y-1 hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 sm:left-6"
      aria-label="العودة إلى أعلى الصفحة"
      title="العودة إلى أعلى الصفحة"
      data-testid="button-scroll-to-top"
    >
      <ArrowUp size={20} strokeWidth={2.5} />
    </button>
  )
}
