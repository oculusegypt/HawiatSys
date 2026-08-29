import { useEffect, useState } from "react"
import { Link } from "wouter"
import { ArrowLeft, Calendar, Clock, BookOpen, Tag } from "lucide-react"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { entityPath } from "@/lib/friendlySlug"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

interface Post {
  id: number
  title: string
  slug: string
  excerpt: string
  coverImage: string
  author: string
  category: string
  tags: string
  publishedAt: string | null
  readTime: number
}

function formatDate(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })
}

export function BlogSection() {
  const { homepageContent } = useSiteSettings()
  const copy = homepageContent.sections?.blog
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/posts?limit=3`)
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d?.posts) ? d.posts : (Array.isArray(d) ? d : [])
        setPosts(list)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (!loading && posts.length === 0) return null

  return (
    <section id="blog" className="py-20 bg-gray-50" dir="rtl">
      <div className="container mx-auto px-4 md:px-6">

        {/* Header */}
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-primary font-bold text-sm mb-3 bg-primary/10 px-4 py-1.5 rounded-full">
              <BookOpen size={15} />
               {copy?.eyebrow}
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
              {copy?.title}
            </h2>
            <p className="text-gray-500 mt-2 text-base max-w-xl">
              {copy?.description}
            </p>
          </div>
           <Link href="/blog">
            <span className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all text-sm border border-primary/30 hover:border-primary px-4 py-2 rounded-xl hover:bg-primary/5">
               {copy?.allArticles}
              <ArrowLeft size={16} />
            </span>
          </Link>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
                <div className="aspect-[16/10] min-h-56 bg-gray-200" />
                <div className="p-6 space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {posts.map((post, i) => (
              <Link key={post.id} href={`/blog/${entityPath({ slug: post.slug, title: post.title, id: post.id, fallback: "post" })}`}>
                <article className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group ${i === 0 ? "md:col-span-1" : ""}`}>
                  {/* Cover */}
                  <div className="relative aspect-[16/10] min-h-56 bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage.startsWith("http") ? post.coverImage : `${API_BASE}${post.coverImage}`}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        width={960}
                        height={600}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen size={40} className="text-primary/30" />
                      </div>
                    )}
                    <span className="absolute top-3 right-3 bg-white/90 backdrop-blur text-primary text-xs font-bold px-3 py-1 rounded-full">
                      {post.category}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(post.publishedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {post.readTime} دقائق
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">
                      {post.excerpt}
                    </p>
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
        )}
      </div>
    </section>
  )
}
