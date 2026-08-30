import { useEffect, useState } from "react"
import { Link } from "wouter"
import { ArrowLeft, BookOpen, FileText, Loader2 } from "lucide-react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { entityPath } from "@/lib/friendlySlug"
import { getSiteUrl } from "@/lib/siteUrl"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

type SeoDirectoryPage = {
  id: number
  title: string
  slug: string
  excerpt?: string
  category?: string
  publishedAt?: string | null
}

export default function SeoPagesIndexPage() {
  const { companyName } = useSiteSettings()
  const [pages, setPages] = useState<SeoDirectoryPage[]>([])
  const [loading, setLoading] = useState(true)

  useDocumentSEO({
    title: `فهرس الأدلة والصفحات | ${companyName || "المنشأة"}`,
    description: "فهرس الأدلة التخصصية من {{company_name}} لاختيار الحاوية المناسبة وتنظيم رفع ونقل مخلفات البناء والأنقاض من المنازل والمشاريع داخل مدينة الرياض.",
    canonical: `${getSiteUrl().replace(/\/$/, "")}/pages`,
    ogImage: "/images/seo/taqi-containers.jpg",
    ogImageAlt: "أدلة تأجير الحاويات ونقل المخلفات في الرياض",
  })

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/api/pages`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : [])
      .then((data: unknown) => {
        if (cancelled) return
        setPages(Array.isArray(data) ? data.filter((page): page is SeoDirectoryPage => (
          Boolean(page)
          && typeof page === "object"
          && typeof (page as SeoDirectoryPage).id === "number"
          && Boolean((page as SeoDirectoryPage).title)
          && Boolean((page as SeoDirectoryPage).slug)
        )) : [])
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setPages([])
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      <Navbar />
      <main>
        <section className="bg-gradient-to-l from-slate-950 via-primary to-slate-900 px-4 pb-16 pt-32 text-center text-white">
          <div className="mx-auto max-w-4xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/15 px-4 py-2 text-sm font-bold text-secondary">
              <BookOpen size={16} />
              مركز الأدلة
            </span>
            <h1 className="text-3xl font-black leading-tight md:text-5xl">أدلة تأجير الحاويات ونقل المخلفات</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/75 md:text-lg">
              تصفح الصفحات التخصصية التي تساعدك على اختيار الحاوية وتنظيم نقل المخلفات لمشروعك في الرياض.
            </p>
          </div>
        </section>

        <section className="px-4 py-14 md:py-20">
          <div className="mx-auto max-w-6xl">
            {loading ? (
              <div className="flex min-h-48 items-center justify-center text-primary" aria-label="جاري تحميل الأدلة">
                <Loader2 className="animate-spin" size={30} />
              </div>
            ) : pages.length === 0 ? (
              <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <FileText className="mx-auto mb-4 text-slate-400" size={34} />
                <h2 className="text-xl font-black text-slate-900">لا توجد أدلة منشورة حاليًا</h2>
                <p className="mt-2 text-sm leading-7 text-slate-500">يمكنك العودة إلى الرئيسية لاستعراض الخدمات والحاويات المتاحة.</p>
                <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">
                  العودة للرئيسية
                  <ArrowLeft size={16} />
                </Link>
              </div>
            ) : (
              <nav aria-label="فهرس الأدلة المنشورة" className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {pages.map((page) => (
                  <Link
                    key={page.id}
                    href={`/page/${entityPath({ slug: page.slug, title: page.title, id: page.id, fallback: "page" })}`}
                    className="group rounded-3xl border border-slate-200 bg-white p-6 text-right shadow-sm transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                  >
                    <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                      <FileText size={20} />
                    </span>
                    <h2 className="text-lg font-black leading-8 text-slate-900 group-hover:text-primary">{page.title}</h2>
                    {page.excerpt && <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-500">{page.excerpt}</p>}
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-secondary">
                      قراءة الدليل
                      <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                    </span>
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}