import { useState, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { normalizeCompanyText, useSiteSettings } from "@/context/SiteSettingsContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Plus, Pencil, Trash2, Eye, EyeOff, X, BookOpen, Calendar,
  Clock, Tag, Globe, Save, Loader2, Upload, Search, FileText,
  Sparkles, Wand2, ChevronRight
} from "lucide-react"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
const token = () => localStorage.getItem("admin_token") || ""

interface Post {
  id: number; title: string; slug: string; content: string; excerpt: string
  coverImage: string; author: string; category: string; tags: string
  status: "draft" | "published"; publishedAt: string | null
  readTime: number; viewCount: number; isActive: boolean; order: number
  seoTitle: string; seoDescription: string; seoKeywords: string
  seoSlug: string; ogImage: string; canonicalUrl: string
  createdAt: string; updatedAt: string
}

type PostForm = Omit<Post, "id" | "viewCount" | "createdAt" | "updatedAt">

const EMPTY: PostForm = {
  title: "", slug: "", content: "", excerpt: "", coverImage: "", author: "",
  category: "عام", tags: "[]", status: "draft", publishedAt: null,
  readTime: 3, isActive: true, order: 0,
  seoTitle: "", seoDescription: "", seoKeywords: "", seoSlug: "", ogImage: "", canonicalUrl: "",
}

const CATEGORIES = ["عام", "دليل الحاويات", "نقل المخلفات", "أسعار", "المقاولون", "المنشآت", "أحياء الرياض", "أخبار"]

function slugify(title: string): string {
  // Arabic-first slug: keep Arabic chars, numbers, hyphens — no transliteration
  return title
    .replace(/[\s_]+/g, "-")
    .replace(/[^\u0600-\u06FF0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-|-$/g, "") || `مقالة-${Date.now()}`
}

function getTags(json: string): string[] {
  try { return JSON.parse(json) } catch { return [] }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })
}

type Section = "basic" | "content" | "seo"

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function extractPostRows(data: unknown): Post[] | null {
  const candidates: unknown[] = [data]

  if (isRecord(data)) {
    for (const key of ["posts", "items", "rows", "results", "data", "result"]) {
      candidates.push(data[key])
    }
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as Post[]

    // A few PHP JSON serializers return a numerically keyed object instead of
    // a JSON array. Convert only objects that clearly look like post rows so
    // error/status objects are never displayed as articles.
    if (isRecord(candidate)) {
      const values = Object.values(candidate)
      if (
        values.length > 0 &&
        values.every((value) => isRecord(value) && ("id" in value || "title" in value))
      ) {
        return values as Post[]
      }
    }
  }

  return null
}

function extractReportedTotal(data: unknown): number | null {
  const candidates: unknown[] = []
  if (isRecord(data)) {
    candidates.push(data.total, data.count)
    for (const key of ["data", "result"]) {
      const nested = data[key]
      if (isRecord(nested)) candidates.push(nested.total, nested.count)
    }
  }

  for (const candidate of candidates) {
    const total = Number(candidate)
    if (Number.isFinite(total)) return total
  }
  return null
}

export default function AdminBlog() {
  const { toast } = useToast()
  const { companyName } = useSiteSettings()
  const [posts, setPosts]     = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [totalAvailable, setTotalAvailable] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [form, setForm]       = useState<PostForm>(() => ({ ...EMPTY, author: companyName }))
  const [saving, setSaving]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [section, setSection] = useState<Section>("basic")
  const [search, setSearch]   = useState("")
  const [tagInput, setTagInput] = useState("")
  const contentRef = useRef<HTMLTextAreaElement>(null)

  // ── AI states ──────────────────────────────────────────────────────────────
  const [topic, setTopic]           = useState("")
  const [showTopicBox, setShowTopicBox] = useState(false)
  const [genBasics, setGenBasics]   = useState(false)
  const [genContent, setGenContent] = useState(false)
  const [genSeo, setGenSeo]         = useState(false)
  const [genAll, setGenAll]         = useState(false)

  const load = async () => {
    setLoading(true)
    setLoadError("")
    try {
      const response = await fetch(`${API_BASE}/api/admin/posts`, {
        headers: { Authorization: `Bearer ${token()}` },
        cache: "no-store",
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || `تعذر تحميل المقالات (${response.status})`)
      }

      // Hostinger runs the PHP API. Accept its array response plus the
      // envelopes used by older PHP/API proxy deployments.
      const rows = extractPostRows(data)
      if (!rows) throw new Error("استجابة المقالات غير صالحة")

      setPosts(rows)
      setTotalAvailable(extractReportedTotal(data) ?? rows.length)
    } catch (error: any) {
      setPosts([])
      setTotalAvailable(null)
      setLoadError(error?.message || "تعذر تحميل المقالات")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  function openNew() {
    setForm({ ...EMPTY, order: posts.length })
    setSection("basic")
    setTagInput("")
    setTopic("")
    setShowTopicBox(true)
    setEditing("new")
  }

  function openEdit(p: Post) {
    setForm({
      title: p.title, slug: p.slug, content: p.content, excerpt: p.excerpt,
      coverImage: p.coverImage, author: p.author, category: p.category,
      tags: p.tags, status: p.status, publishedAt: p.publishedAt,
      readTime: p.readTime, isActive: p.isActive, order: p.order,
      seoTitle: p.seoTitle, seoDescription: p.seoDescription, seoKeywords: p.seoKeywords,
      seoSlug: p.seoSlug || p.slug, ogImage: p.ogImage, canonicalUrl: p.canonicalUrl,
    })
    setSection("basic")
    setTagInput("")
    setTopic("")
    setShowTopicBox(false)
    setEditing(p.id)
  }

  function closeEditor() {
    setEditing(null)
    setUploading(false)
    setShowTopicBox(false)
    setTopic("")
  }

  function set(k: keyof PostForm, v: any) {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === "title" && editing === "new" && !f.seoSlug) {
        next.seoSlug = slugify(v)
        next.slug    = slugify(v)
      }
      return next
    })
  }

  function addTag() {
    const t = tagInput.trim()
    if (!t) return
    const existing = getTags(form.tags)
    if (existing.includes(t)) { setTagInput(""); return }
    set("tags", JSON.stringify([...existing, t]))
    setTagInput("")
  }

  function removeTag(tag: string) {
    set("tags", JSON.stringify(getTags(form.tags).filter(t => t !== tag)))
  }

  async function uploadImage() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append("file", file)
        const r = await fetch(`${API_BASE}/api/admin/uploads`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token()}` },
          body: fd,
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || "فشل الرفع")
        set("coverImage", d.url || d.path || "")
        toast({ title: "تم رفع الصورة ✅" })
      } catch (e: any) {
        toast({ title: "فشل الرفع", description: e.message, variant: "destructive" })
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  // ── AI: توليد المعلومات الأساسية ──────────────────────────────────────────
  async function aiGenerateBasics() {
    const t = topic.trim() || form.title.trim()
    if (!t) { toast({ title: "أدخل موضوع المقالة أولاً", variant: "destructive" }); return }
    setGenBasics(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/ai/generate-blog-basics`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ topic: t }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "فشل التوليد")
      setForm(f => ({
        ...f,
        title:    d.title    || f.title,
        excerpt:  d.excerpt  || f.excerpt,
        category: d.category || f.category,
        tags:     Array.isArray(d.tags) ? JSON.stringify(d.tags) : (d.tags || f.tags),
        readTime: d.readTime || f.readTime,
        author:   d.author   || f.author,
        seoSlug:  f.seoSlug || slugify(d.title || f.title),
        slug:     f.slug    || slugify(d.title || f.title),
      }))
      toast({ title: "✅ تم توليد المعلومات الأساسية" })
    } catch (e: any) {
      toast({ title: "فشل التوليد", description: e.message, variant: "destructive" })
    } finally {
      setGenBasics(false)
    }
  }

  // ── AI: توليد المحتوى ────────────────────────────────────────────────────
  async function aiGenerateContent() {
    if (!form.title.trim()) {
      toast({ title: "العنوان مطلوب. يرجى توليد المعلومات الأساسية أولاً", variant: "destructive" })
      return
    }
    setGenContent(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/ai/generate-blog-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          title:    form.title,
          excerpt:  form.excerpt,
          category: form.category,
          tags:     getTags(form.tags),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "فشل التوليد")
      set("content", d.content || "")
      toast({ title: "✅ تم توليد محتوى المقالة" })
    } catch (e: any) {
      toast({ title: "فشل التوليد", description: e.message, variant: "destructive" })
    } finally {
      setGenContent(false)
    }
  }

  // ── AI: توليد SEO ────────────────────────────────────────────────────────
  async function aiGenerateSeo() {
    if (!form.title.trim()) {
      toast({ title: "العنوان مطلوب. يرجى توليد المعلومات الأساسية أولاً", variant: "destructive" })
      return
    }
    setGenSeo(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/ai/generate-blog-seo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          title:    form.title,
          excerpt:  form.excerpt,
          category: form.category,
          tags:     getTags(form.tags),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "فشل التوليد")
      setForm(f => ({
        ...f,
        seoTitle:       d.seoTitle       || f.seoTitle,
        seoDescription: d.seoDescription || f.seoDescription,
        seoKeywords:    d.seoKeywords    || f.seoKeywords,
        seoSlug:        d.seoSlug        || f.seoSlug,
        slug:           d.seoSlug        || f.slug,
        canonicalUrl:   d.canonicalUrl   || f.canonicalUrl,
      }))
      toast({ title: "✅ تم توليد بيانات SEO" })
    } catch (e: any) {
      toast({ title: "فشل التوليد", description: e.message, variant: "destructive" })
    } finally {
      setGenSeo(false)
    }
  }

  // ── AI: توليد المدونة كاملة (الأساسيات → المحتوى → SEO) ──────────────────
  async function aiGenerateAll() {
    const t = topic.trim()
    if (!t) { toast({ title: "أدخل موضوع المقالة أولاً", variant: "destructive" }); return }
    setGenAll(true)
    try {
      // 1. Basics
      toast({ title: "⏳ توليد المعلومات الأساسية..." })
      const rb = await fetch(`${API_BASE}/api/admin/ai/generate-blog-basics`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ topic: t }),
      })
      const db = await rb.json()
      if (!rb.ok) throw new Error(db.error || "فشل توليد الأساسيات")

      const title    = db.title    || ""
      const excerpt  = db.excerpt  || ""
      const category = db.category || "عام"
      const tagsArr  = Array.isArray(db.tags) ? db.tags : []
      const readTime = db.readTime || 5

      setForm(f => ({
        ...f,
        title, excerpt, category,
        tags:     JSON.stringify(tagsArr),
        readTime, author: normalizeCompanyText(db.author || companyName),
        seoSlug: slugify(title), slug: slugify(title),
      }))

      // 2. Content
      toast({ title: "⏳ توليد محتوى المقالة..." })
      const rc = await fetch(`${API_BASE}/api/admin/ai/generate-blog-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ title, excerpt, category, tags: tagsArr }),
      })
      const dc = await rc.json()
      if (!rc.ok) throw new Error(dc.error || "فشل توليد المحتوى")

      // 3. SEO
      toast({ title: "⏳ توليد بيانات SEO..." })
      const rs = await fetch(`${API_BASE}/api/admin/ai/generate-blog-seo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ title, excerpt, category, tags: tagsArr }),
      })
      const ds = await rs.json()
      if (!rs.ok) throw new Error(ds.error || "فشل توليد SEO")

      // Apply everything
      setForm(f => ({
        ...f,
        title, excerpt, category,
        tags: JSON.stringify(tagsArr), readTime,
        author: normalizeCompanyText(db.author || companyName),
        content:        dc.content       || f.content,
        seoTitle:       ds.seoTitle      || "",
        seoDescription: ds.seoDescription || "",
        seoKeywords:    ds.seoKeywords   || "",
        seoSlug:        ds.seoSlug       || slugify(title),
        slug:           ds.seoSlug       || slugify(title),
        canonicalUrl:   ds.canonicalUrl  || "",
      }))

      setShowTopicBox(false)
      toast({ title: "🎉 تم توليد المدونة كاملة بالذكاء الاصطناعي!" })
    } catch (e: any) {
      toast({ title: "فشل التوليد", description: e.message, variant: "destructive" })
    } finally {
      setGenAll(false)
    }
  }

  async function save() {
    if (!form.title.trim()) { toast({ title: "العنوان مطلوب", variant: "destructive" }); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        slug:    form.seoSlug || slugify(form.title),
        seoSlug: form.seoSlug || slugify(form.title),
      }
      const isNew = editing === "new"
      const url   = isNew ? `${API_BASE}/api/admin/posts` : `${API_BASE}/api/admin/posts/${editing}`
      const r = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "فشل الحفظ")
      toast({ title: isNew ? "تم إنشاء المقالة ✅" : "تم حفظ التغييرات ✅" })
      closeEditor()
      load()
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(p: Post) {
    const newStatus = p.status === "published" ? "draft" : "published"
    try {
      await fetch(`${API_BASE}/api/admin/posts/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status: newStatus }),
      })
      load()
      toast({ title: newStatus === "published" ? "تم النشر ✅" : "تم سحب النشر" })
    } catch {
      toast({ title: "فشل تغيير الحالة", variant: "destructive" })
    }
  }

  async function deletePost(id: number) {
    if (!confirm("هل أنت متأكد من حذف هذه المقالة؟")) return
    try {
      await fetch(`${API_BASE}/api/admin/posts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      })
      toast({ title: "تم الحذف" })
      load()
    } catch {
      toast({ title: "فشل الحذف", variant: "destructive" })
    }
  }

  const filtered = posts.filter(p =>
    !search || p.title.includes(search) || p.category.includes(search) || p.excerpt.includes(search)
  )

  const published  = posts.filter(p => p.status === "published").length
  const drafts     = posts.filter(p => p.status === "draft").length
  const totalViews = posts.reduce((a, p) => a + (p.viewCount || 0), 0)

  const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: "basic",   label: "المعلومات الأساسية", icon: FileText },
    { id: "content", label: "المحتوى",             icon: BookOpen },
    { id: "seo",     label: "محركات البحث",        icon: Globe },
  ]

  return (
    <div className="space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <BookOpen size={24} className="text-primary" /> إدارة المدونة
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">أنشئ وعدّل مقالات المدونة مع إعدادات SEO الكاملة</p>
        </div>
        <Button onClick={openNew} className="flex items-center gap-2 rounded-xl">
          <Plus size={16} /> مقالة جديدة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المقالات",  value: totalAvailable ?? posts.length,  icon: BookOpen, color: "text-primary",   bg: "bg-primary/10" },
          { label: "منشورة",           value: published,     icon: Globe,    color: "text-green-600", bg: "bg-green-50" },
          { label: "مسودة",            value: drafts,        icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "إجمالي المشاهدات", value: totalViews,    icon: Eye,      color: "text-blue-600",  bg: "bg-blue-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ابحث في المقالات..."
          className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        />
      </div>

      {/* Posts list */}
      {loadError ? (
        <div className="text-center py-12 text-red-500 bg-white rounded-2xl border border-red-100">
          <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-semibold">تعذر تحميل المقالات</p>
          <p className="text-sm mt-1 text-gray-500">{loadError}</p>
          <Button variant="outline" onClick={load} className="mt-4 rounded-xl">
            إعادة المحاولة
          </Button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">لا توجد مقالات بعد</p>
          <p className="text-sm mt-1">ابدأ بإنشاء أول مقالة في مدونتك</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map(post => (
              <div key={post.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/60 transition-colors">
                {/* Cover thumb */}
                <div className="w-16 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden shrink-0">
                  {post.coverImage ? (
                    <img
                      src={post.coverImage.startsWith("http") ? post.coverImage : `${API_BASE}${post.coverImage}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={20} className="text-primary/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      post.status === "published" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {post.status === "published" ? "منشور" : "مسودة"}
                    </span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{post.category}</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm truncate">{post.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Calendar size={10} />{formatDate(post.publishedAt || post.createdAt)}</span>
                    <span className="flex items-center gap-1"><Clock size={10} />{post.readTime} د</span>
                    <span className="flex items-center gap-1"><Eye size={10} />{post.viewCount}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => window.open(`/blog/${encodeURIComponent(post.slug)}`, "_blank")}
                    title="معاينة"
                    className="w-8 h-8 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 flex items-center justify-center transition-colors"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    onClick={() => toggleStatus(post)}
                    title={post.status === "published" ? "سحب النشر" : "نشر"}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      post.status === "published"
                        ? "hover:bg-amber-50 text-green-500 hover:text-amber-500"
                        : "hover:bg-green-50 text-gray-400 hover:text-green-600"
                    }`}
                  >
                    {post.status === "published" ? <EyeOff size={15} /> : <Globe size={15} />}
                  </button>
                  <button
                    onClick={() => openEdit(post)}
                    className="w-8 h-8 rounded-lg hover:bg-primary/10 text-gray-400 hover:text-primary flex items-center justify-center transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="w-8 h-8 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ Editor Drawer ══════════════════════════════════════════════════════ */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex" dir="rtl">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeEditor} />
          <div className="relative mr-auto w-full max-w-3xl bg-white h-full flex flex-col shadow-2xl overflow-hidden">

            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                <BookOpen size={20} className="text-primary" />
                {editing === "new" ? "مقالة جديدة" : "تعديل المقالة"}
              </h3>
              <button onClick={closeEditor} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">
                <X size={18} />
              </button>
            </div>

            {/* ── AI Topic Box ─────────────────────────────────────────────── */}
            <div className={`shrink-0 border-b border-gray-100 transition-all duration-300 overflow-hidden ${showTopicBox ? "max-h-40" : "max-h-0 border-0"}`}>
              <div className="px-6 py-4 bg-gradient-to-l from-purple-50 to-indigo-50">
                <p className="text-xs font-bold text-purple-700 mb-2 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-purple-500" />
                  توليد المدونة كاملة بالذكاء الاصطناعي
                </p>
                <div className="flex gap-2">
                  <Input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && aiGenerateAll()}
                      placeholder="مثال: أسعار تأجير الحاويات بالرياض 2026..."
                    className="rounded-xl text-sm flex-1 border-purple-200 focus-visible:ring-purple-300"
                  />
                  <Button
                    onClick={aiGenerateAll}
                    disabled={genAll || !topic.trim()}
                    className="rounded-xl bg-gradient-to-l from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shrink-0 gap-2"
                  >
                    {genAll
                      ? <><Loader2 size={15} className="animate-spin" /> جاري التوليد...</>
                      : <><Wand2 size={15} /> توليد الكل</>
                    }
                  </Button>
                  <button
                    onClick={() => setShowTopicBox(false)}
                    className="w-8 h-8 rounded-lg hover:bg-purple-100 text-purple-400 flex items-center justify-center shrink-0"
                  >
                    <X size={15} />
                  </button>
                </div>
                <p className="text-[11px] text-purple-500 mt-1.5">
                  سيولّد: العنوان · الملخص · التصنيف · الوسوم · المحتوى كاملاً · بيانات SEO
                </p>
              </div>
            </div>

            {/* Toggle topic box button (when hidden) */}
            {!showTopicBox && (
              <div className="shrink-0 px-6 py-2 border-b border-gray-100 bg-gradient-to-l from-purple-50/50 to-indigo-50/50">
                <button
                  onClick={() => setShowTopicBox(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                >
                  <Sparkles size={12} className="text-purple-500" />
                  توليد المدونة كاملة بالذكاء الاصطناعي
                  <ChevronRight size={12} className="rotate-90" />
                </button>
              </div>
            )}

            {/* Section tabs */}
            <div className="flex border-b border-gray-100 shrink-0 bg-gray-50">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 ${
                    section === s.id
                      ? "border-primary text-primary bg-white"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <s.icon size={15} /> {s.label}
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* ── BASIC ─────────────────────────────────────────────────── */}
              {section === "basic" && (
                <div className="space-y-5">

                  {/* AI generate basics button */}
                  <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3">
                    <Sparkles size={15} className="text-purple-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-purple-700">توليد المعلومات الأساسية بالذكاء الاصطناعي</p>
                      <p className="text-[11px] text-purple-500">يولّد: العنوان، الملخص، التصنيف، الوسوم، وقت القراءة</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={aiGenerateBasics}
                      disabled={genBasics}
                      className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white shrink-0 gap-1.5"
                    >
                      {genBasics
                        ? <><Loader2 size={13} className="animate-spin" /> جاري...</>
                        : <><Sparkles size={13} /> توليد</>
                      }
                    </Button>
                  </div>

                  {/* Topic for basics generation */}
                  {!showTopicBox && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        موضوع التوليد (اختياري — يُستخدم عند الضغط على "توليد" أعلاه)
                      </label>
                      <Input
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="أدخل موضوع المقالة لاستخدامه في التوليد..."
                        className="rounded-xl text-sm border-purple-200 focus-visible:ring-purple-300"
                      />
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">عنوان المقالة *</label>
                    <Input
                      value={form.title}
                      onChange={e => set("title", e.target.value)}
                      placeholder="مثال: أفضل حاويات أنقاض لمشاريع البناء بالرياض"
                      className="rounded-xl"
                    />
                  </div>

                  {/* Excerpt */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      الملخص
                      <span className="text-xs font-normal text-gray-400 mr-1">({form.excerpt.length}/160)</span>
                    </label>
                    <textarea
                      value={form.excerpt}
                      onChange={e => set("excerpt", e.target.value)}
                      rows={3}
                      maxLength={300}
                      placeholder="ملخص قصير يظهر في قائمة المقالات ومحركات البحث..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>

                  {/* Category + Author */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">التصنيف</label>
                      <select
                        value={form.category}
                        onChange={e => set("category", e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">الكاتب</label>
                      <Input value={form.author} onChange={e => set("author", e.target.value)} className="rounded-xl" />
                    </div>
                  </div>

                  {/* Read time + Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">وقت القراءة (دقائق)</label>
                      <Input
                        type="number" min={1} max={60}
                        value={form.readTime}
                        onChange={e => set("readTime", parseInt(e.target.value) || 3)}
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">الحالة</label>
                      <select
                        value={form.status}
                        onChange={e => set("status", e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="draft">مسودة</option>
                        <option value="published">منشور</option>
                      </select>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">الوسوم (Tags)</label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                        placeholder="أضف وسمًا واضغط Enter..."
                        className="rounded-xl flex-1"
                      />
                      <Button variant="outline" size="sm" onClick={addTag} className="rounded-xl shrink-0">
                        <Plus size={14} />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getTags(form.tags).map(tag => (
                        <span key={tag} className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                          #{tag}
                          <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Cover image */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">صورة الغلاف</label>
                    <div className="flex gap-3 items-start">
                      <Input
                        value={form.coverImage}
                        onChange={e => set("coverImage", e.target.value)}
                        placeholder="https://... أو ارفع صورة"
                        className="rounded-xl flex-1"
                      />
                      <Button variant="outline" size="sm" onClick={uploadImage} disabled={uploading} className="rounded-xl shrink-0">
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      </Button>
                    </div>
                    {form.coverImage && (
                      <img
                        src={form.coverImage.startsWith("http") ? form.coverImage : `${API_BASE}${form.coverImage}`}
                        alt=""
                        className="mt-3 h-28 w-full object-cover rounded-xl border border-gray-200"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ── CONTENT ───────────────────────────────────────────────── */}
              {section === "content" && (
                <div className="space-y-4">

                  {/* AI generate content button */}
                  <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3">
                    <Sparkles size={15} className="text-purple-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-purple-700">توليد المحتوى بالذكاء الاصطناعي</p>
                      <p className="text-[11px] text-purple-500">
                        {form.title
                          ? `يولّد مقالة كاملة (600-900 كلمة) بناءً على: "${form.title.slice(0, 40)}..."`
                          : "يتطلب وجود عنوان — ولّد المعلومات الأساسية أولاً"
                        }
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={aiGenerateContent}
                      disabled={genContent || !form.title.trim()}
                      className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white shrink-0 gap-1.5"
                    >
                      {genContent
                        ? <><Loader2 size={13} className="animate-spin" /> جاري...</>
                        : <><Sparkles size={13} /> توليد</>
                      }
                    </Button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-gray-700">محتوى المقالة</label>
                      <span className="text-xs text-gray-400">يدعم HTML</span>
                    </div>
                    <textarea
                      ref={contentRef}
                      value={form.content}
                      onChange={e => set("content", e.target.value)}
                      rows={22}
                      placeholder={`<h2>مقدمة</h2>\n<p>اكتب محتوى المقالة هنا بصيغة HTML...</p>`}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-mono leading-relaxed"
                      dir="rtl"
                    />
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                    <strong>نصيحة:</strong> استخدم وسوم HTML كـ &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;strong&gt; لتنسيق المحتوى. يمكن تعديل المحتوى المولّد بالذكاء الاصطناعي مباشرة.
                  </div>
                </div>
              )}

              {/* ── SEO ───────────────────────────────────────────────────── */}
              {section === "seo" && (
                <div className="space-y-5">

                  {/* AI generate SEO button */}
                  <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3">
                    <Sparkles size={15} className="text-purple-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-purple-700">توليد بيانات SEO بالذكاء الاصطناعي</p>
                      <p className="text-[11px] text-purple-500">
                        {form.title
                          ? "يولّد: العنوان، الوصف، الكلمات المفتاحية، الرابط"
                          : "يتطلب وجود عنوان — ولّد المعلومات الأساسية أولاً"
                        }
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={aiGenerateSeo}
                      disabled={genSeo || !form.title.trim()}
                      className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white shrink-0 gap-1.5"
                    >
                      {genSeo
                        ? <><Loader2 size={13} className="animate-spin" /> جاري...</>
                        : <><Sparkles size={13} /> توليد</>
                      }
                    </Button>
                  </div>

                  {/* SEO Slug */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      الرابط (Slug)
                      <span className="text-xs font-normal text-gray-400 mr-1">
                        سيظهر في: /blog/<strong>{form.seoSlug || "..."}</strong>
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={form.seoSlug}
                        onChange={e => { set("seoSlug", e.target.value); set("slug", e.target.value) }}
                         placeholder="مثال: اسعار-تأجير-الحاويات-بالرياض"
                        className="rounded-xl font-mono text-sm"
                         dir="rtl"
                      />
                      <Button
                        variant="outline" size="sm" className="rounded-xl shrink-0"
                        onClick={() => { const s = slugify(form.title); set("seoSlug", s); set("slug", s) }}
                      >
                        توليد
                      </Button>
                    </div>
                  </div>

                  {/* SEO Title */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      عنوان SEO
                      <span className={`text-xs mr-1 ${form.seoTitle.length > 60 ? "text-red-500" : form.seoTitle.length > 50 ? "text-amber-500" : "text-gray-400"}`}>
                        ({form.seoTitle.length}/60)
                      </span>
                    </label>
                    <Input
                      value={form.seoTitle}
                      onChange={e => set("seoTitle", e.target.value)}
                      placeholder="العنوان الذي يظهر في Google (اتركه فارغاً لاستخدام عنوان المقالة)"
                      className="rounded-xl"
                    />
                  </div>

                  {/* SEO Description */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      وصف SEO
                      <span className={`text-xs mr-1 ${form.seoDescription.length > 160 ? "text-red-500" : form.seoDescription.length > 140 ? "text-amber-500" : "text-gray-400"}`}>
                        ({form.seoDescription.length}/160)
                      </span>
                    </label>
                    <textarea
                      value={form.seoDescription}
                      onChange={e => set("seoDescription", e.target.value)}
                      rows={3}
                      maxLength={200}
                      placeholder="وصف يظهر في نتائج البحث"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>

                  {/* SEO Keywords */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">الكلمات المفتاحية</label>
                    <textarea
                      value={form.seoKeywords}
                      onChange={e => set("seoKeywords", e.target.value)}
                      rows={2}
                      placeholder="تأجير حاويات بالرياض, حاويات أنقاض, نقل مخلفات البناء..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">افصل الكلمات بفاصلة</p>
                  </div>

                  {/* OG Image */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">صورة Open Graph</label>
                    <Input
                      value={form.ogImage}
                      onChange={e => set("ogImage", e.target.value)}
                      placeholder="اتركه فارغاً لاستخدام صورة الغلاف"
                      className="rounded-xl"
                    />
                  </div>

                  {/* Canonical */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">الرابط الأساسي (Canonical)</label>
                    <Input
                      value={form.canonicalUrl}
                      onChange={e => set("canonicalUrl", e.target.value)}
                      placeholder="اتركه فارغاً لتوليده تلقائياً"
                      className="rounded-xl"
                      dir="ltr"
                    />
                  </div>

                  {/* Google Preview */}
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1.5">
                      <Globe size={12} /> معاينة في Google
                    </p>
                    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-1">
                      <p className="text-blue-700 font-semibold text-sm leading-tight line-clamp-1">
                        {form.seoTitle || form.title || "عنوان المقالة"}
                      </p>
                      <p className="text-green-700 text-xs">
                        /blog/{form.seoSlug || form.slug || "..."}
                      </p>
                      <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
                        {form.seoDescription || form.excerpt || "وصف المقالة سيظهر هنا في نتائج Google..."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0 bg-white">
              <Button variant="outline" onClick={closeEditor} className="rounded-xl">
                إلغاء
              </Button>
              <div className="flex gap-2">
                {section !== "seo" && (
                  <Button
                    variant="outline"
                    onClick={() => setSection(section === "basic" ? "content" : "seo")}
                    className="rounded-xl"
                  >
                    التالي
                  </Button>
                )}
                <Button onClick={save} disabled={saving} className="rounded-xl flex items-center gap-2">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  حفظ المقالة
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
