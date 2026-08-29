import { useEffect, useState, useCallback } from "react"
import { Link } from "wouter"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { BookOpen, Calendar, Clock, Search, ChevronRight, ChevronLeft, ArrowLeft, Loader2 } from "lucide-react"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { entityPath } from "@/lib/friendlySlug"
import { siteUrl } from "@/lib/siteUrl"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

interface Post {
  id: number; title: string; slug: string; excerpt: string
  coverImage: string; author: string; category: string; tags: string
  publishedAt: string | null; readTime: number; viewCount: number
}

interface PostsResponse {
  posts: Post[]; total: number; page: number; limit: number
}

function formatDate(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })
}

export default function Blog() {
  useDocumentSEO({
    title: "مدونة تأجير الحاويات | دليل إدارة مخلفات البناء والأنقاض بالرياض",
    description: "اقرأ أحدث المقالات والأدلة الفنية حول مقاسات تأجير حاويات الأنقاض والنفايات وعقود النظافة الإلكترونية ورخص بلدي بالرياض.",
    keywords: "مدونة تأجير الحاويات بالرياض, حاويات أنقاض الرياض, عقد نظافة بلدي, نقل مخلفات البناء بالرياض",
    canonical: siteUrl("/blog"),
    ogImage: "/images/seo/taqi-blog.jpg",
    ogImageAlt: "مدونة تأجير الحاويات وإدارة مخلفات البناء بالرياض",
  })

  const [data, setData]           = useState<PostsResponse>({ posts: [], total: 0, page: 1, limit: 9 })
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState("")
  const [activeCategory, setActiveCat] = useState("")
  const [categories, setCategories]   = useState<string[]>([])

  const load = useCallback(() => {
    setLoading(true)
    fetch(`${API_BASE}/api/posts?page=${page}&limit=9${activeCategory ? `&category=${encodeURIComponent(activeCategory)}` : ""}`)
      .then(r => r.json())
      .then((d: any) => {
        if (d && Array.isArray(d.posts)) {
          setData({
            posts: d.posts,
            total: typeof d.total === "number" ? d.total : d.posts.length,
            page: typeof d.page === "number" ? d.page : page,
            limit: typeof d.limit === "number" ? d.limit : 9,
          })
        } else if (Array.isArray(d)) {
          setData({
            posts: d,
            total: d.length,
            page: 1,
            limit: 9,
          })
        } else {
          setData({ posts: [], total: 0, page: 1, limit: 9 })
        }
        setLoading(false)
      })
      .catch(() => {
        setData({ posts: [], total: 0, page: 1, limit: 9 })
        setLoading(false)
      })
  }, [page, activeCategory])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch(`${API_BASE}/api/posts/categories`)
      .then(r => r.json())
      .then(d => setCategories(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  const postsList = Array.isArray(data?.posts) ? data.posts : []
  const filtered = search.trim()
    ? postsList.filter(p =>
        (p?.title || "").includes(search) ||
        (p?.excerpt || "").includes(search) ||
        (p?.category || "").includes(search)
      )
    : postsList

  const totalPages = data?.limit ? Math.ceil((data.total || 0) / data.limit) : 1

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      <Navbar />

      {/* Hero */}
      <div className="bg-primary text-white pb-16 pt-40 md:pt-44 px-4">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-semibold mb-4 text-secondary">
            <BookOpen size={15} />
            المدونة والمقالات التخصصية
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
            دليل الحاويات وإدارة المخلفات
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            كل ما تحتاج معرفته عن مقاسات الحاويات، عقود النظافة المعتمدة، واشتراطات أمانة منطقة الرياض
          </p>
          {/* Search */}
          <div className="mt-8 max-w-md mx-auto relative">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث في المقالات والمقاسات..."
              className="w-full bg-white text-gray-900 rounded-2xl pr-11 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary shadow-lg"
            />
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 md:px-6 py-12">

        {/* Categories filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-8">
            <button
              onClick={() => { setActiveCat(""); setPage(1) }}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${!activeCategory ? "bg-primary text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary"}`}
            >
              الكل
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCat(cat); setPage(1) }}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${activeCategory === cat ? "bg-primary text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Posts grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold">لا توجد مقالات حتى الآن</p>
            <p className="text-sm mt-1">تابعونا لمعرفة أحدث المقالات والنصائح</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {filtered.map(post => (
                <Link key={post.id} href={`/blog/${entityPath({ slug: post.slug, title: post.title, id: post.id, fallback: "post" })}`}>
                  <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group h-full flex flex-col">
                    {/* Cover */}
                    <div className="aspect-[16/10] min-h-56 bg-gradient-to-br from-primary/10 to-secondary/10 relative overflow-hidden shrink-0">
                      {post.coverImage ? (
                        <img
                          src={post.coverImage.startsWith("http") ? post.coverImage : `${API_BASE}${post.coverImage}`}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { e.currentTarget.src = "/images/Taqi-hero3.webp" }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen size={36} className="text-primary/30" />
                        </div>
                      )}
                      <span className="absolute top-3 right-3 bg-white/90 backdrop-blur text-primary text-xs font-bold px-3 py-1 rounded-full">
                        {post.category}
                      </span>
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                        <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(post.publishedAt)}</span>
                        <span className="flex items-center gap-1"><Clock size={11} />{post.readTime} دقائق</span>
                      </div>
                      <h2 className="font-bold text-gray-900 text-base leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed flex-1">{post.excerpt}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-gray-400">{post.author}</span>
                        <span className="text-primary text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                          اقرأ المزيد <ArrowLeft size={12} />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={16} /> السابق
                </button>
                <span className="text-sm text-gray-500">
                  صفحة {page} من {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  التالي <ChevronLeft size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
