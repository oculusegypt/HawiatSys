import { useEffect, useState } from "react"
import { Link, useRoute } from "wouter"
import { useGetServices } from "@workspace/api-client-react"
import type { Service } from "@workspace/api-client-react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { useServiceRequest } from "@/context/ServiceRequestContext"
import { normalizeCompanyText, useSiteSettings } from "@/context/SiteSettingsContext"
import { entityPath } from "@/lib/friendlySlug"
import { seoImageAlt, seoImageForPath } from "@/lib/seoMedia"
import { getSiteUrl, sitePath, siteUrl } from "@/lib/siteUrl"
import { AREAS, ARABIC_AREA_SLUGS } from "@/pages/NeighborhoodPage"
import { breadcrumbSchema, pageSchema } from "@/lib/seoSchema"
import { pageSpecificSeoKeywords } from "@/lib/seoKeywords"
import { useDocumentSchema } from "@/hooks/useDocumentSchema"
import { readableSeoExcerpt } from "@/lib/seoText"
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  FileSearch,
  Clock3,
  MessageCircle,
  MapPin,
  Phone,
  ShieldCheck,
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
  const { data: services = [] } = useGetServices()
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
         const canonical = siteUrl(`/page/${entityPath({ slug: resolvedData.slug, title: resolvedData.title, id: resolvedData.id, fallback: "page" })}`)
        const image = toAbsoluteAsset(resolvedData.ogImage || resolvedData.coverImage) || siteUrl(seoImageForPath(`/page/${resolvedData.slug}`))
        const resolvedTitle = normalizeCompanyText(`${title} | ${companyName || "الشركة"}`)
        document.title = resolvedTitle
        setMeta("description", description)
         setMeta("keywords", pageSpecificSeoKeywords({
           keywords: resolvedData.seoKeywords,
           targetKeyword: resolvedData.targetKeyword,
           title: resolvedData.title,
         }))
        setMeta(
          "robots",
          typeof window !== "undefined" && window.location.pathname.startsWith("/page/")
            ? "index, follow"
            : "noindex, follow",
        )
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

      })
      .catch(() => {
        if (cancelled) return
        setMeta("robots", "noindex, follow")
        setPage(null)
        setNotFound(true)
        setLoading(false)
      })

    return () => {
      cancelled = true
      document.getElementById("seo-page-canonical")?.remove()
    }
  }, [slug, companyName, isLoaded])

  const pageCanonical = page
    ? siteUrl(`/page/${entityPath({ slug: page.slug, title: page.title, id: page.id, fallback: "page" })}`)
    : ""
  const pageImage = page
    ? toAbsoluteAsset(page.ogImage || page.coverImage) || siteUrl(seoImageForPath(`/page/${page.slug}`))
    : ""
  useDocumentSchema("seo-page-schema", page ? {
    "@graph": [
      pageSchema({
        id: "webpage",
        type: "WebPage",
        name: page.title,
        description: page.seoDescription || page.excerpt,
        url: pageCanonical,
        image: pageImage,
        companyName: companyName || "المنشأة",
        about: page.targetKeyword || page.title,
      }),
      breadcrumbSchema([
        { name: "الرئيسية", url: getSiteUrl() },
        { name: page.title, url: pageCanonical },
      ]),
    ],
  } : null, Boolean(page))

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
  const readableExcerpt = readableSeoExcerpt(page.excerpt)
  const activeServices = (services as Service[]).filter(service => service.isActive)
  const whatsappHref = phoneWhatsapp
    ? `https://wa.me/966${phoneWhatsapp.replace(/^0/, "")}?text=${encodeURIComponent(`مرحباً، أود الاستفسار عن ${page.title}`)}`
    : ""
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans" dir="rtl">
      <Navbar />

      <main className="flex-1">
        <section className="bg-gradient-to-l from-slate-950 via-primary to-slate-900 pb-16 pt-28 text-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-5 flex items-center gap-2 text-sm text-white/70" data-testid="breadcrumb-seo-page">
              <Link href="/" className="transition-colors hover:text-white">الرئيسية</Link>
              <ChevronLeft size={14} />
              <Link href="/pages" className="transition-colors hover:text-white">الصفحات</Link>
              <ChevronLeft size={14} />
              <span className="truncate font-semibold text-secondary">{page.title}</span>
            </div>

            <div className="max-w-4xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/20 px-3 py-1 text-xs font-bold text-secondary">
                  دليل عملي للموقع في الرياض
                </span>
              </div>
              <h1 className="mb-4 text-3xl font-black leading-tight text-white md:text-5xl" data-testid="heading-seo-page">{page.title}</h1>
              {readableExcerpt && (
                <p className="mb-6 max-w-3xl text-base leading-relaxed text-slate-200 md:text-lg" data-testid="text-seo-page-excerpt">
                  {readableExcerpt}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                {phoneCall && (
                  <a href={`tel:${phoneCall}`} className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-secondary hover:text-white">
                    <Phone size={16} />
                    اتصل بالعمليات
                  </a>
                )}
                {phoneWhatsapp && (
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-600">
                    <MessageCircle size={16} />
                    واتساب فوري
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
              <div className="space-y-10 lg:col-span-2">
                {image && (
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
                    <img src={image} alt={page.title} className="h-80 w-full object-cover md:h-96" width="1280" height="720" data-testid="img-seo-page-cover" />
                  </div>
                )}

                <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm" data-testid="article-seo-page">
                  <header className="border-b border-slate-100 p-8 md:p-10">
                    <h2 className="text-2xl font-bold text-slate-900">المعلومات العملية</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-500">تفاصيل مختصرة تساعدك على اختيار الحل المناسب لمشروعك في الرياض.</p>
                  </header>
                  <div
                    className="seo-page-content p-8 prose prose-lg max-w-none prose-headings:font-black prose-headings:text-gray-900 prose-p:leading-8 prose-p:text-gray-700 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-li:text-gray-700 prose-blockquote:rounded-xl prose-blockquote:border-secondary prose-blockquote:bg-secondary/5 md:p-10"
                    dir="rtl"
                    data-testid="content-seo-page"
                    dangerouslySetInnerHTML={{ __html: page.content || "<p>لا يوجد محتوى لهذه الصفحة بعد.</p>" }}
                  />
                </article>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <ShieldCheck className="shrink-0 text-primary" size={24} />
                    <span className="text-xs font-bold text-slate-800">معلومات واضحة حول الخدمة واحتياج المشروع</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <Clock3 className="shrink-0 text-secondary" size={24} />
                    <span className="text-xs font-bold text-slate-800">تنسيق التوصيل والسحب حسب موقعك</span>
                  </div>
                </div>

                <PublicCta onOpen={() => openModal({ serviceType: page.targetKeyword || page.title })} phoneCall={phoneCall} phoneWhatsapp={phoneWhatsapp} />

                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pb-8 text-xs text-gray-400" data-testid="seo-page-trust-row">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-secondary" /> فريق متخصص في تأجير الحاويات</span>
                  <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-secondary" /> نخدم أحياء الرياض</span>
                </div>
              </div>

              <aside className="space-y-6">
                <div className="space-y-4 rounded-3xl bg-gradient-to-br from-primary to-slate-900 p-6 text-white shadow-xl">
                  <h2 className="text-xl font-bold text-white">اطلب الخدمة فوراً</h2>
                  <p className="text-xs leading-relaxed text-slate-300">شاركنا نوع المخلفات وموقع المشروع لنساعدك في اختيار الحاوية المناسبة.</p>
                  <button onClick={() => openModal({ serviceType: page.targetKeyword || page.title })} className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-xs font-bold text-white shadow transition hover:bg-secondary/90" data-testid="button-seo-request-sidebar">
                    <Sparkles size={14} />
                    اطلب الحاوية
                  </button>
                  {phoneCall && (
                    <a href={`tel:${phoneCall}`} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-3 text-xs font-bold text-white transition hover:border-white/40">
                      <Phone size={14} />
                      {phoneCall}
                    </a>
                  )}
                  {phoneWhatsapp && (
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white transition hover:bg-emerald-700">
                      <MessageCircle size={14} />
                      تواصل عبر واتساب
                    </a>
                  )}
                </div>

                <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <FileSearch size={17} className="text-primary" />
                    بيانات الصفحة
                  </h2>
                  <dl className="space-y-3 text-xs leading-6">
                     <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                       <dt className="text-slate-500">نوع الدليل</dt>
                       <dd className="text-left font-bold text-primary">خدمة محلية</dd>
                     </div>
                    {page.publishedAt && (
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <dt className="text-slate-500">تاريخ النشر</dt>
                        <dd className="font-bold text-slate-700">{new Date(page.publishedAt).toLocaleDateString("ar-SA")}</dd>
                      </div>
                    )}
                    {page.updatedAt && (
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-slate-500">آخر تحديث</dt>
                        <dd className="font-bold text-slate-700">{new Date(page.updatedAt).toLocaleDateString("ar-SA")}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {activeServices.length > 0 && (
                  <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900">خدمات وحاويات أخرى</h2>
                    <div className="space-y-2">
                      {activeServices.slice(0, 5).map(service => (
                        <Link
                          key={service.id}
                          href={`/services/${entityPath({ slug: service.seoSlug, title: service.title, id: service.id, fallback: "service" })}`}
                          className="group flex items-center justify-between rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50"
                        >
                          <span className="text-xs font-bold text-slate-800 transition-colors group-hover:text-primary">{service.title}</span>
                          <ChevronLeft size={14} className="text-slate-400 transition-colors group-hover:text-primary" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-bold text-slate-900">تغطية أحياء الرياض</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(AREAS).slice(0, 12).map(([areaSlug, area]) => (
                      <Link
                        key={areaSlug}
                        href={`/areas/${ARABIC_AREA_SLUGS[areaSlug] || areaSlug}`}
                        className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] text-slate-700 transition hover:bg-primary hover:text-white"
                      >
                        {area.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}