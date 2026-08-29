import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, BookOpen, Layers, Box } from "lucide-react"
import { entityPath } from "@/lib/friendlySlug"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

interface PublicSeoPage {
  id: number
  title: string
  slug: string
  targetKeyword: string
  seoKeywords: string
  status: "published"
  isActive: boolean
}

function primaryKeyword(page: PublicSeoPage): string {
  const value = page.targetKeyword || page.seoKeywords || ""
  return value.split(/[،,]/)[0]?.trim() || "تأجير الحاويات بالرياض"
}

export function SeoPagesLinksSection() {
  const [pages, setPages] = useState<PublicSeoPage[]>([])
  const [activeTab, setActiveTab] = useState<string>("all")

  useEffect(() => {
    let cancelled = false

    fetch(`${API_BASE}/api/pages`, { cache: "no-store" })
      .then(response => (response.ok ? response.json() : []))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return
        setPages(
          data.filter((page): page is PublicSeoPage => (
            Boolean(page)
            && typeof page === "object"
            && typeof (page as PublicSeoPage).id === "number"
            && Boolean((page as PublicSeoPage).slug)
            && Boolean((page as PublicSeoPage).title)
          )),
        )
      })
      .catch(() => {
        if (!cancelled) setPages([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    return [
      { id: "all", label: "جميع الصفحات والأدلة" },
      { id: "debris", label: "حاويات الأنقاض ومخلفات البناء" },
    ]
  }, [])

  const filteredPages = useMemo(() => {
    if (activeTab === "all") return pages
    return pages.filter(p => {
      const text = (p.title + " " + p.slug + " " + (p.targetKeyword || "")).toLowerCase()
      if (activeTab === "debris") return text.includes("أنقاض") || text.includes("هدم") || text.includes("بناء") || text.includes("مخلفات") || text.includes("ترميم")
      return true
    })
  }, [pages, activeTab])

  if (pages.length === 0) return null

  return (
    <section className="seo-links-section border-t border-slate-200/80 bg-slate-50 py-20" aria-labelledby="seo-directory-heading">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          className="mx-auto mb-10 max-w-3xl text-center"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs md:text-sm font-bold text-primary">
            <Layers size={15} />
            فهرس خدمات وأدلة تأجير الحاويات بالرياض
          </span>
          <h2 id="seo-directory-heading" className="mb-3 text-2xl font-black text-slate-900 md:text-4xl">
            دليل صفحات الحاويات وإدارة المخلفات بالرياض
          </h2>
          <p className="text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            فهرس شامل للأدلة والصفحات التخصصية لتأجير الحاويات ونقل الأنقاض والمخلفات وتجديد الرخص في مدينة الرياض.
          </p>

          {/* Category filter pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all shadow-sm ${
                  activeTab === cat.id
                    ? "bg-primary text-white shadow-md"
                    : "bg-white text-slate-700 border border-slate-200 hover:border-primary hover:text-primary"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </motion.div>

        <nav aria-label="دليل موضوعات الحاويات بالرياض" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPages.map(page => (
            <a
              key={page.id}
              href={`/page/${entityPath({ slug: page.slug, title: page.title, id: page.id, fallback: "page" })}`}
              className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-slate-50 hover:shadow-md"
            >
              <div className="min-w-0 flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Box size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold leading-snug transition-colors group-hover:text-primary">
                    {page.title}
                  </span>
                  <span className="mt-1 block truncate text-[11px] font-medium text-slate-500" title={primaryKeyword(page)}>
                    {primaryKeyword(page)}
                  </span>
                </span>
              </div>
              <ArrowLeft size={16} className="shrink-0 text-slate-400 transition-transform group-hover:-translate-x-1 group-hover:text-primary" />
            </a>
          ))}
        </nav>
      </div>
    </section>
  )
}