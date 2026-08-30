import { useEffect, useState } from "react"
import { Link, useRoute } from "wouter"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import {
  Calendar, Clock, Eye, Tag, ChevronRight, Share2,
  Facebook, Twitter, Link2, BookOpen, ArrowRight, Loader2,
  Phone, MessageCircle, Truck, Package
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useServiceRequest } from "@/context/ServiceRequestContext"
import { getSiteUrl, sitePath, siteUrl } from "@/lib/siteUrl"
import { normalizeCompanyText, useSiteSettings } from "@/context/SiteSettingsContext"
import { useGetContainers } from "@workspace/api-client-react"
import type { Container } from "@workspace/api-client-react"
import { entityPath, entitySlug } from "@/lib/friendlySlug"
import { mergeGoldenSeoKeywords } from "@/lib/seoKeywords"
import { useDocumentSchema } from "@/hooks/useDocumentSchema"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
interface Post {
  id: number; title: string; slug: string; content: string; excerpt: string
  coverImage: string; author: string; category: string; tags: string
  publishedAt: string | null; updatedAt: string | null; readTime: number; viewCount: number
  seoTitle: string; seoDescription: string; seoKeywords: string
  ogImage: string; canonicalUrl: string
}

function formatDate(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })
}

function getTags(tagsJson: string): string[] {
  try { return JSON.parse(tagsJson) } catch { return [] }
}

function setMeta(name: string, content: string, attr = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.content = content
}

function normalizeArticleContent(html: string): string {
  return html
    .replace(/<!doctype\b[^>]*>/gi, "")
    .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<h1\b([^>]*)>/gi, "<h2$1>")
    .replace(/<\/h1>/gi, "</h2>")
}

function extractArticleFaqItems(html: string) {
  if (typeof document === "undefined") return []
  const tmpDiv = document.createElement("div")
  tmpDiv.innerHTML = html
  return Array.from(tmpDiv.querySelectorAll("h3")).map((h3) => {
    const nextEl = h3.nextElementSibling
    const answer = nextEl?.tagName === "P" ? nextEl.textContent?.trim() || "" : ""
    return {
      "@type": "Question",
      name: h3.textContent?.trim() || "",
      acceptedAnswer: { "@type": "Answer", text: answer },
    }
  }).filter((item) => item.name && item.acceptedAnswer.text)
}

// ─── CTA Block ─────────────────────────────────────────────────────────────────
function ArticleCTA({ onOpen, phoneCall, phoneWhatsapp, postTitle }: { onOpen: () => void; phoneCall: string; phoneWhatsapp: string; postTitle: string }) {
  const waHref = phoneWhatsapp
    ? `https://wa.me/966${phoneWhatsapp.replace(/^0/, "")}?text=${encodeURIComponent(`مرحباً، أود الاستفسار عن تأجير الحاويات من مقال: ${postTitle}`)}`
    : ""

  return (
    <div className="mx-6 md:mx-10 my-8 rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-l from-primary/5 to-secondary/5">
      <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
        {/* Icon */}
        <div className="shrink-0 w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <Truck size={30} className="text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 text-center md:text-right">
          <h3 className="text-xl font-black text-gray-900 mb-1">هل تحتاج حاوية لمشروعك أو عقارك بالرياض؟</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            توصيل وسحب فوري لجميع أحياء الرياض خلال ساعتين مع التفريغ النظامي في المرادم الرسمية.
          </p>
        </div>

        {/* Buttons */}
        <div className="shrink-0 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => onOpen()}
            className="inline-flex items-center gap-2 bg-secondary text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:bg-primary hover:text-white transition-all"
          >
            <Package size={16} />
            اطلب الحاوية الآن
          </button>
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all"
            >
              <MessageCircle size={16} />
              واتساب
            </a>
          )}
          {phoneCall && (
            <a
              href={`tel:${phoneCall}`}
              className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold text-sm shadow-sm hover:border-primary hover:text-primary transition-all"
            >
              <Phone size={16} />
              {phoneCall}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Container Packages CTA at article end ────────────────────────────────────────────
function ArticleContainers({ onOpen }: { onOpen: (size?: string) => void }) {
  const { data: apiContainers = [], isLoading, isError } = useGetContainers()
  const containers = apiContainers
    .filter(container => container.isActive)
    .sort((a, b) => a.order - b.order)

  return (
    <div className="px-6 md:px-10 pb-8">
      <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
        <Package size={18} className="text-primary" />
        مقاسات وأسعار الحاويات المتاحة في الرياض
      </h3>
       {isLoading && <p className="text-sm text-gray-500">جارٍ تحميل الحاويات المتاحة...</p>}
       {isError && <p className="text-sm text-red-600">تعذر تحميل الحاويات المتاحة حالياً.</p>}
       {!isLoading && !isError && containers.length === 0 && (
         <p className="text-sm text-gray-500">لا توجد حاويات منشورة حالياً.</p>
       )}
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         {containers.map((c: Container) => (
          <div key={c.size} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all group flex flex-col justify-between">
            <div className="h-36 overflow-hidden bg-gray-100">
              <img
                 src={c.imageUrl || "/images/Taqi-hero3.webp"}
                 alt={`${c.name} - ${c.size}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { e.currentTarget.src = "/images/Taqi-hero3.webp" }}
              />
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                   <span className="font-black text-gray-900 text-sm">{c.name}</span>
                  <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">{c.size}</span>
                </div>
                 <p className="text-xs text-gray-500 mb-3">{c.suitableFor || c.description || c.capacity}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                 <span className="text-secondary font-black text-sm">{c.priceText || (c.pricePerDay ? `${c.pricePerDay} ر.س` : "اطلب السعر")}</span>
                <button
                   onClick={() => onOpen(`${c.name}${c.size ? ` - ${c.size}` : ""}`)}
                  className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-bold hover:bg-primary/90 transition-colors"
                >
                  اطلب الآن
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Related Posts ─────────────────────────────────────────────────────────────
interface RelatedPost {
  id: number; title: string; slug: string; excerpt: string
  coverImage: string; category: string; publishedAt: string | null; readTime: number
}

function RelatedPosts({ category, currentSlug }: { category: string; currentSlug: string }) {
  const [posts, setPosts] = useState<RelatedPost[]>([])

  useEffect(() => {
    fetch(`${API_BASE}/api/posts?category=${encodeURIComponent(category)}&limit=4`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const items = (Array.isArray(d?.posts) ? d.posts : (Array.isArray(d) ? d : [])) as RelatedPost[]
        setPosts(items.filter(p => p && p.slug !== currentSlug).slice(0, 3))
      })
      .catch(() => {})
  }, [category, currentSlug])

  if (!posts.length) return null

  return (
    <div className="mt-10">
      <h2 className="text-xl font-black text-gray-900 mb-5 flex items-center gap-2">
        <BookOpen size={18} className="text-primary" />
        مقالات ذات صلة
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {posts.map(p => (
          <Link key={p.id} href={`/blog/${entityPath({ slug: p.slug, title: p.title, id: p.id, fallback: "post" })}`}>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all group cursor-pointer">
              {p.coverImage && (
                <div className="h-36 overflow-hidden">
                  <img
                    src={p.coverImage.startsWith("http") ? p.coverImage : `${API_BASE}${p.coverImage}`}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-4">
                <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full mb-2 inline-block">
                  {p.category}
                </span>
                <h3 className="font-black text-gray-900 text-sm leading-snug line-clamp-2 mb-1">{p.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">{p.excerpt}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <Clock size={11} />
                  <span>{p.readTime} دقائق</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function BlogPost() {
  const [, params1] = useRoute("/blog/:slug")
  const [, params2] = useRoute("/المدونة/:slug")
  const rawSlug = params1?.slug || params2?.slug || ""
  const slug = decodeURIComponent(rawSlug)
  const { toast } = useToast()
  const { openModal } = useServiceRequest()
  const { companyName, phoneCall, phoneWhatsapp, isLoaded } = useSiteSettings()

  const [post, setPost]     = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const blogSchema = post && isLoaded ? (() => {
    const canonical = siteUrl(`/blog/${entityPath({ slug: post.slug, title: post.title, id: post.id, fallback: "post" })}`)
    const ogImg = siteUrl(sitePath(post.ogImage || post.coverImage || "/logo.webp"))
    const title = post.seoTitle || post.title
    const description = post.seoDescription || post.excerpt
    const resolvedTitle = normalizeCompanyText(title)
    const resolvedDescription = normalizeCompanyText(description)
    const resolvedAuthor = normalizeCompanyText(post.author || companyName || "الشركة")
    const resolvedContent = normalizeArticleContent(normalizeCompanyText(post.content || ""))
    const faqItems = extractArticleFaqItems(resolvedContent)
    const schemas: object[] = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "@id": `${canonical}#article`,
        "headline": resolvedTitle,
        "description": resolvedDescription,
        "image": ogImg,
        "datePublished": post.publishedAt,
        "dateModified": post.updatedAt || post.publishedAt,
        "author": { "@type": "Organization", "name": resolvedAuthor, "url": getSiteUrl() },
        "publisher": {
          "@type": "Organization",
          "name": companyName,
          "logo": { "@type": "ImageObject", "url": siteUrl("/logo.webp") },
          "telephone": phoneCall ? `+966${phoneCall.replace(/^0/, "")}` : undefined,
          "areaServed": "الرياض",
        },
        "mainEntityOfPage": { "@type": "WebPage", "@id": canonical },
        "url": canonical,
        "articleSection": post.category,
        "keywords": getTags(post.tags).join(", "),
        "wordCount": resolvedContent.replace(/<[^>]*>/g, "").split(/\s+/).length,
        "inLanguage": "ar",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": getSiteUrl() },
          { "@type": "ListItem", "position": 2, "name": "المدونة", "item": siteUrl("/blog") },
          { "@type": "ListItem", "position": 3, "name": post.title, "item": canonical },
        ],
      },
    ]
    if (faqItems.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${canonical}#FAQPage`,
        "mainEntity": faqItems,
      })
    }
    return schemas
  })() : null

  useDocumentSchema("blog-post-schema", blogSchema, Boolean(post && isLoaded && !notFound))

  useEffect(() => {
    if (isLoaded && (!post || notFound)) setMeta("robots", "noindex, follow")
  }, [isLoaded, post, notFound])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`${API_BASE}/api/posts/${encodeURIComponent(slug)}`)
      .then(r => {
        if (!r.ok) { setMeta("robots", "noindex, follow"); setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(d => {
        if (!d) return
        setPost(d)
        setLoading(false)

        // ── Inject SEO meta tags ──────────────────────────────────────────
        const canonical = siteUrl(`/blog/${entityPath({ slug: d.slug, title: d.title, id: d.id, fallback: "post" })}`)
        const ogImg     = siteUrl(sitePath(d.ogImage || d.coverImage || "/logo.webp"))
        const title     = d.seoTitle || d.title
        const desc      = d.seoDescription || d.excerpt

        if (!isLoaded) return
        const resolvedTitle = normalizeCompanyText(`${title} | مدونة ${companyName || "الشركة"}`)
        const resolvedDescription = normalizeCompanyText(desc)
        const resolvedAuthor = normalizeCompanyText(d.author || companyName || "الشركة")
        document.title = resolvedTitle

        setMeta("description",        resolvedDescription)
        setMeta("keywords",           mergeGoldenSeoKeywords(normalizeCompanyText(d.seoKeywords)))
        setMeta(
          "robots",
          typeof window !== "undefined" && window.location.pathname.startsWith("/blog/")
            ? "index, follow"
            : "noindex, follow",
        )
        setMeta("og:type",            "article", "property")
        setMeta("og:title",           resolvedTitle, "property")
        setMeta("og:description",     resolvedDescription, "property")
        setMeta("og:image",           ogImg, "property")
        setMeta("og:url",             canonical, "property")
        setMeta("og:locale",          "ar_SA", "property")
        setMeta("twitter:card",       "summary_large_image")
        setMeta("twitter:title",      title)
        setMeta("twitter:description", desc)
        setMeta("twitter:image",      ogImg)
        setMeta("article:published_time", d.publishedAt || "", "property")
        setMeta("article:author",    resolvedAuthor, "property")
        setMeta("article:section",   d.category, "property")

        // Canonical
        let canonEl = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null
        if (!canonEl) { canonEl = document.createElement("link"); canonEl.rel = "canonical"; document.head.appendChild(canonEl) }
        canonEl.href = canonical

        // Article JSON-LD structured data
        const existing = document.getElementById("blog-post-schema")
        if (existing) existing.remove()

      })
      .catch(() => { setMeta("robots", "noindex, follow"); setNotFound(true); setLoading(false) })

  }, [slug, companyName, isLoaded])

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast({ title: "تم نسخ الرابط ✓" })
    })
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-primary" />
      </div>
      <Footer />
    </div>
  )

  if (notFound || !post) return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
        <BookOpen size={56} className="text-gray-300" />
        <h1 className="text-2xl font-black text-gray-800">المقال غير موجود</h1>
        <p className="text-gray-500">المقال الذي تبحث عنه غير موجود أو تم حذفه</p>
        <Link href="/blog">
          <span className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2">
            <ArrowRight size={16} /> العودة للمدونة
          </span>
        </Link>
      </div>
      <Footer />
    </div>
  )

  const postUrl = siteUrl(`/blog/${entityPath({ slug: post.slug, title: post.title, id: post.id, fallback: "post" })}`)
  const resolvedPost = {
    ...post,
    title: normalizeCompanyText(post.title),
    excerpt: normalizeCompanyText(post.excerpt),
    content: normalizeCompanyText(post.content),
    author: normalizeCompanyText(post.author),
  }
  const tags = getTags(post.tags).map(tag => normalizeCompanyText(tag))

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      <Navbar />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 mt-20 md:mt-24">
        <div className="container mx-auto flex items-center gap-2 text-sm text-gray-500">
          <Link href="/"><span className="hover:text-primary transition-colors">الرئيسية</span></Link>
          <ChevronRight size={14} className="rotate-180" />
          <Link href="/blog"><span className="hover:text-primary transition-colors">المدونة</span></Link>
          <ChevronRight size={14} className="rotate-180" />
          <span className="text-gray-900 font-medium line-clamp-1">{resolvedPost.title}</span>
        </div>
      </div>

      {/* Cover image */}
      {post.coverImage && (
        <div className="w-full max-h-[36rem] min-h-64 overflow-hidden bg-[#12384b] flex items-center justify-center">
          <img
            src={post.coverImage.startsWith("http") ? post.coverImage : `${API_BASE}${post.coverImage}`}
            alt={resolvedPost.title}
            className="w-full max-h-[36rem] object-contain"
          />
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 md:px-6 py-10 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Header */}
          <div className="p-6 md:p-10 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">
                {post.category}
              </span>
              {tags.map(tag => (
                <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight mb-4">
              {resolvedPost.title}
            </h1>

            <p className="text-gray-500 text-base md:text-lg leading-relaxed mb-6">
              {resolvedPost.excerpt}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 pt-4 border-t border-gray-100">
              <span className="font-semibold text-gray-700">{resolvedPost.author}</span>
              <span className="flex items-center gap-1"><Calendar size={13} />{formatDate(post.publishedAt)}</span>
              <span className="flex items-center gap-1"><Clock size={13} />{post.readTime} دقائق للقراءة</span>
              <span className="flex items-center gap-1"><Eye size={13} />{post.viewCount} مشاهدة</span>

              {/* Share */}
              <div className="flex items-center gap-2 mr-auto">
                <span className="text-gray-400 flex items-center gap-1 text-xs"><Share2 size={12} /> مشاركة:</span>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"
                >
                  <Facebook size={14} />
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(resolvedPost.title)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-sky-50 hover:bg-sky-100 flex items-center justify-center text-sky-500 transition-colors"
                >
                  <Twitter size={14} />
                </a>
                <button
                  onClick={copyLink}
                  className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                >
                  <Link2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div
            className="p-6 md:p-10 prose prose-lg max-w-none
              prose-headings:font-black prose-headings:text-gray-900
              prose-p:text-gray-700 prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900
              prose-ul:text-gray-700 prose-ol:text-gray-700
              prose-li:mb-1
              prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:rounded-xl prose-blockquote:p-4
              prose-img:rounded-2xl prose-img:shadow-sm
              prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              "
            dir="rtl"
            dangerouslySetInnerHTML={{ __html: resolvedPost.content || "<p>لا يوجد محتوى</p>" }}
          />

          {/* ── CTA Block ── */}
          <ArticleCTA onOpen={() => openModal()} phoneCall={phoneCall} phoneWhatsapp={phoneWhatsapp} postTitle={resolvedPost.title} />

          {/* ── Containers at end of article ── */}
          <ArticleContainers onOpen={(size) => openModal(size ? { containerSize: size } : undefined)} />

          {/* Footer of article */}
          <div className="p-6 md:p-10 bg-gray-50 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
                    <span className="bg-white border border-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-full hover:border-primary hover:text-primary transition-colors cursor-pointer flex items-center gap-1">
                      <Tag size={10} /> #{tag}
                    </span>
                  </Link>
                ))}
              </div>
              <Link href="/blog">
                <span className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:gap-3 transition-all">
                  <ArrowRight size={16} /> جميع المقالات
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── مقالات ذات صلة ── */}
        <RelatedPosts category={post.category} currentSlug={slug} />
      </main>

      <Footer />
    </div>
  )
}
