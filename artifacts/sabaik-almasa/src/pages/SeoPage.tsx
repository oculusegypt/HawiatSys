import { useEffect, useState } from "react"
import { Link, useRoute } from "wouter"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { useServiceRequest } from "@/context/ServiceRequestContext"
import { normalizeCompanyText, useSiteSettings } from "@/context/SiteSettingsContext"
import { seoImageAlt, seoImageForPath } from "@/lib/seoMedia"
import { getSiteUrl, sitePath, siteUrl } from "@/lib/siteUrl"
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Loader2,
  MapPin,
  Phone,
  Search,
  Sparkles,
} from "lucide-react"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

interface SeoPageData {
  id: number
  title: string
  slug: string
  targetKeyword: string
  content: string
  excerpt: string
  coverImage: string
  status: "draft" | "published"
  publishedAt: string | null
  updatedAt: string | null
  viewCount: number
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  ogImage: string
  canonicalUrl: string
}

function setMeta(name: string, content: string, attribute = "name") {
  if (!content) return
  let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null
  if (!element) {
    element = document.createElement("meta")
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }
  element.content = content
}

function toAbsoluteAsset(value: string): string {
  if (!value) return ""
  if (/^https?:\/\//i.test(value)) return value
  return siteUrl(sitePath(value))
}

function removeSeoArtifacts() {
  document.getElementById("seo-page-schema")?.remove()
}

function PublicCta({
  onOpen,
  phoneCall,
  phoneWhatsapp,
}: {
  onOpen: () => void
  phoneCall: string
  phoneWhatsapp: string
}) {
  const whatsappHref = phoneWhatsapp
    ? `https://wa.me/966${phoneWhatsapp.replace(/^0/, "")}?text=${encodeURIComponent("مرحباً، أريد طلب تأجير حاوية أو نقل مخلفات في الرياض")}`
    : ""
  return (
    <section className="relative mt-10 overflow-hidden rounded-3xl bg-primary px-6 py-8 text-white shadow-xl md:px-10 md:py-10" data-testid="section-seo-request-cta">
      <div className="absolute -left-14 -top-16 h-48 w-48 rounded-full border border-white/10" />
      <div className="absolute -bottom-20 right-12 h-56 w-56 rounded-full border border-secondary/25" />
      <div className="relative flex flex-col items-start justify-between gap-7 md:flex-row md:items-center">
        <div className="max-w-xl">
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-secondary">
            <Sparkles size={14} />
            خدمة موثوقة في الرياض
          </div>
          <h2 className="text-2xl font-black leading-tight md:text-3xl">هل تبحث عن فريق يبدأ معك اليوم؟</h2>
          <p className="mt-2 text-sm leading-7 text-white/70">شاركنا نوع المخلفات وموقع المشروع، وسنساعدك في اختيار الحاوية المناسبة والحصول على عرض واضح.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button onClick={onOpen} className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 font-black text-white transition-transform hover:-translate-y-0.5" data-testid="button-seo-request">
            اطلب الحاوية
            <ArrowRight size={16} className="rotate-180" />
          </button>
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white/85 transition-colors hover:border-white/50 hover:text-white" data-testid="link-seo-whatsapp">
              واتساب
            </a>
          )}
        </div>
      </div>
      {phoneCall && (
        <a href={`tel:${phoneCall}`} className="relative mt-5 inline-flex items-center gap-2 text-xs text-white/60 hover:text-white" dir="ltr" data-testid="link-seo-phone">
          <Phone size={13} />
          {phoneCall}
        </a>
      )}
    </section>
  )
}

export default function SeoPage() {
  const [, params1] = useRoute("/page/:slug")
  const [, params2] = useRoute("/pages/:slug")
  const [, params3] = useRoute("/صفحة/:slug")
  const [, params4] = useRoute("/صفحات/:slug")
  const rawSlug = params1?.slug || params2?.slug || params3?.slug || params4?.slug || ""
  const slug = decodeURIComponent(rawSlug)
  const { openModal } = useServiceRequest()
  const { companyName, phoneCall, phoneWhatsapp, isLoaded } = useSiteSettings()
  const [page, setPage] = useState<SeoPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!slug) {
      setNotFound(true)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    fetch(`${API_BASE}/api/pages/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async response => {
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.error || "not-found")
        return data as SeoPageData
      })
      .then(data => {
        if (cancelled) return
        const resolvedData = {
          ...data,
          title: normalizeCompanyText(data.title),
          excerpt: normalizeCompanyText(data.excerpt),
          content: normalizeCompanyText(data.content),
          seoTitle: normalizeCompanyText(data.seoTitle),
          seoDescription: normalizeCompanyText(data.seoDescription),
          seoKeywords: normalizeCompanyText(data.seoKeywords),
        }
        setPage(resolvedData)
        setLoading(false)

        const title = resolvedData.seoTitle || resolvedData.title
        const description = resolvedData.seoDescription || resolvedData.excerpt
        const canonical = siteUrl(sitePath(resolvedData.canonicalUrl || window.location.pathname))
        const image = toAbsoluteAsset(resolvedData.ogImage || resolvedData.coverImage) || siteUrl(seoImageForPath(`/page/${resolvedData.slug}`))
        const resolvedTitle = normalizeCompanyText(`${title} | ${companyName || "الشركة"}`)
        document.title = resolvedTitle
        setMeta("description", description)
        setMeta("keywords", resolvedData.seoKeywords || resolvedData.targetKeyword)
        setMeta("robots", "index, follow")
        setMeta("og:type", "website", "property")
        setMeta("og:title", title, "property")
        setMeta("og:description", description, "property")
        setMeta("og:url", canonical, "property")
        setMeta("og:locale", "ar_SA", "property")
        if (image) setMeta("og:image", image, "property")
        if (image) {
           setMeta("og:image:secure_url", image, "property")
           setMeta("og:image:type", "image/jpeg", "property")
           setMeta("og:image:width", "1200", "property")
           setMeta("og:image:height", "675", "property")
          setMeta("og:image:alt", seoImageAlt(title), "property")
        }
        setMeta("twitter:card", image ? "summary_large_image" : "summary")
        setMeta("twitter:title", title)
        setMeta("twitter:description", description)
        if (image) {
           setMeta("twitter:image", image)
           setMeta("twitter:image:alt", seoImageAlt(title))
         }

        document.querySelector("link[rel='canonical']")?.remove()
        const canonicalLink = document.createElement("link")
        canonicalLink.rel = "canonical"
        canonicalLink.href = canonical
        canonicalLink.id = "seo-page-canonical"
        document.head.appendChild(canonicalLink)

        removeSeoArtifacts()
        const schema = [
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: title,
            description,
            url: canonical,
            headline: title,
            inLanguage: "ar",
            isPartOf: { "@type": "WebSite", name: companyName || "الشركة", url: getSiteUrl() },
            about: { "@type": "Thing", name: resolvedData.targetKeyword || title },
            ...(image ? { image } : {}),
            datePublished: data.publishedAt || undefined,
            dateModified: data.updatedAt || data.publishedAt || undefined,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "الرئيسية", item: getSiteUrl() },
              { "@type": "ListItem", position: 2, name: title, item: canonical },
            ],
          },
        ]
        const script = document.createElement("script")
        script.id = "seo-page-schema"
        script.type = "application/ld+json"
        script.textContent = JSON.stringify(schema)
        document.head.appendChild(script)
      })
      .catch(() => {
        if (cancelled) return
        setPage(null)
        setNotFound(true)
        setLoading(false)
      })

    return () => {
      cancelled = true
      removeSeoArtifacts()
      document.getElementById("seo-page-canonical")?.remove()
    }
  }, [slug, companyName, isLoaded])

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-gray-50" dir="rtl">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 pt-20" data-testid="state-seo-page-loading">
          <div className="w-full max-w-3xl space-y-5">
            <div className="h-5 w-32 animate-pulse rounded-full bg-primary/10" />
            <div className="h-14 w-4/5 animate-pulse rounded-2xl bg-primary/10" />
            <div className="h-5 w-full animate-pulse rounded-full bg-primary/10" />
            <div className="h-5 w-11/12 animate-pulse rounded-full bg-primary/10" />
            <div className="h-64 animate-pulse rounded-3xl bg-white shadow-sm" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (notFound || !page) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-gray-50" dir="rtl">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 pt-20" data-testid="state-seo-page-not-found">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileSearch size={30} /></div>
            <h1 className="mt-5 text-2xl font-black text-gray-900">الصفحة غير موجودة</h1>
            <p className="mt-2 text-sm leading-7 text-gray-500">قد يكون الرابط غير صحيح أو لم تعد الصفحة منشورة حالياً.</p>
            <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90" data-testid="link-seo-not-found-home">
              <ArrowRight size={16} className="rotate-180" />
              العودة للرئيسية
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const image = toAbsoluteAsset(page.ogImage || page.coverImage) || siteUrl(seoImageForPath(`/page/${page.slug}`))
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f2f8f8]" dir="rtl">
      <Navbar />
      <main className="flex-1 pt-20">
        <div className="border-b border-primary/10 bg-white">
          <div className="container mx-auto px-4 py-4 md:px-6">
            <div className="flex items-center gap-2 text-xs text-gray-400" data-testid="breadcrumb-seo-page">
              <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
              <span>/</span>
              <span className="truncate font-semibold text-gray-700">{page.title}</span>
            </div>
          </div>
        </div>

        {image && (
          <div className="flex min-h-64 max-h-[36rem] w-full items-center justify-center overflow-hidden bg-slate-100 px-2 md:px-6">
            <img src={image} alt={page.title} className="block h-auto max-h-[36rem] max-w-full object-contain" width="1200" height="675" data-testid="img-seo-page-cover" />
          </div>
        )}

        <div className="container mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
          <article className="overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-sm" data-testid="article-seo-page">
            <header className="border-b border-gray-100 px-6 py-8 md:px-12 md:py-11">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-black text-secondary">
                  <Search size={12} />
                  دليل {page.targetKeyword || "خدمات التنظيف"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary">
                  <MapPin size={12} />
                  الرياض
                </span>
              </div>
              <h1 className="max-w-4xl text-3xl font-black leading-[1.35] tracking-tight text-gray-900 md:text-5xl" data-testid="heading-seo-page">{page.title}</h1>
              {page.excerpt && <p className="mt-5 max-w-3xl text-base leading-8 text-gray-500 md:text-lg" data-testid="text-seo-page-excerpt">{page.excerpt}</p>}
               {(page.targetKeyword || page.seoKeywords) && (
                 <div className="mt-5 rounded-2xl border border-secondary/20 bg-secondary/5 px-4 py-3" data-testid="seo-page-keywords">
                   <div className="text-xs font-black text-secondary">الكلمات الرئيسية</div>
                   <div className="mt-1 text-sm leading-7 text-gray-700">{page.seoKeywords || page.targetKeyword}</div>
                 </div>
               )}
            </header>
            <div className="seo-page-content px-6 py-8 md:px-12 md:py-11 prose prose-lg max-w-none prose-headings:font-black prose-headings:text-gray-900 prose-p:leading-8 prose-p:text-gray-700 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-li:text-gray-700 prose-blockquote:rounded-xl prose-blockquote:border-secondary prose-blockquote:bg-secondary/5" dir="rtl" data-testid="content-seo-page" dangerouslySetInnerHTML={{ __html: page.content || "<p>لا يوجد محتوى لهذه الصفحة بعد.</p>" }} />
          </article>

          <PublicCta onOpen={() => openModal({ serviceType: page.targetKeyword || page.title })} phoneCall={phoneCall} phoneWhatsapp={phoneWhatsapp} />

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pb-8 text-xs text-gray-400" data-testid="seo-page-trust-row">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-secondary" /> فريق متخصص في خدمات التنظيف</span>
            <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-secondary" /> نخدم أحياء الرياض</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}