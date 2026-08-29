import { useEffect, useMemo, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertCircle,
  BarChart3,
  Check,
  ChevronLeft,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Globe2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
const getToken = () => localStorage.getItem("admin_token") || ""

interface SeoPage {
  id: number
  title: string
  slug: string
  targetKeyword: string
  content: string
  excerpt: string
  coverImage: string
  category: string
  tags: string
  status: "draft" | "published"
  publishedAt: string | null
  viewCount: number
  isActive: boolean
  order: number
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  seoSlug: string
  ogImage: string
  canonicalUrl: string
  createdAt: string
  updatedAt: string
}

type PageForm = Pick<
  SeoPage,
  | "title"
  | "slug"
  | "targetKeyword"
  | "content"
  | "excerpt"
  | "status"
  | "seoTitle"
  | "seoDescription"
  | "seoKeywords"
  | "seoSlug"
  | "ogImage"
  | "canonicalUrl"
>

type EditorSection = "basics" | "content" | "seo"
type StatusFilter = "all" | "published" | "draft"

const EMPTY_FORM: PageForm = {
  title: "",
  slug: "",
  targetKeyword: "",
  content: "",
  excerpt: "",
  status: "draft",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  seoSlug: "",
  ogImage: "",
  canonicalUrl: "",
}

function slugify(value: string): string {
  return value
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100) || `صفحة-seo-${Date.now()}`
}

function formatDate(value: string | null): string {
  if (!value) return "لم تُنشر بعد"
  return new Date(value).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return data.error
  }
  return fallback
}

function fieldValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  note: string
  icon: LucideIcon
  tone: "navy" | "teal" | "gold" | "slate"
}) {
  const tones = {
    navy: "bg-primary/10 text-primary",
    teal: "bg-secondary/12 text-secondary",
    gold: "bg-amber-100 text-amber-700",
    slate: "bg-slate-100 text-slate-600",
  }
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm" data-testid={`stat-${label}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-gray-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-3 text-[11px] text-gray-400">{note}</p>
    </div>
  )
}

export default function SeoPages() {
  const { toast } = useToast()
  const { companyName } = useSiteSettings()
  const [pages, setPages] = useState<SeoPage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [form, setForm] = useState<PageForm>(EMPTY_FORM)
  const [section, setSection] = useState<EditorSection>("basics")
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)
  const [aiAction, setAiAction] = useState<"basics" | "content" | "seo" | null>(null)

  async function loadPages() {
    setLoading(true)
    setLoadError("")
    try {
      const response = await fetch(`${API_BASE}/api/admin/seo-pages`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await response.json().catch(() => [])
      if (!response.ok) throw new Error(errorMessage(data, "تعذر تحميل الصفحات"))
      setPages(Array.isArray(data) ? data : [])
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "تعذر تحميل الصفحات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPages()
  }, [])

  const filteredPages = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar")
    return pages.filter(page => {
      const matchesStatus = statusFilter === "all" || page.status === statusFilter
      const matchesQuery =
        !query ||
        [page.title, page.targetKeyword, page.excerpt, page.seoDescription]
          .filter(Boolean)
          .some(value => value.toLocaleLowerCase("ar").includes(query))
      return matchesStatus && matchesQuery
    })
  }, [pages, search, statusFilter])

  const publishedCount = pages.filter(page => page.status === "published").length
  const draftCount = pages.filter(page => page.status === "draft").length
  const totalViews = pages.reduce((sum, page) => sum + (page.viewCount || 0), 0)

  function updateField<Key extends keyof PageForm>(key: Key, value: PageForm[Key]) {
    setForm(current => {
      const next = { ...current, [key]: value }
      if (key === "title" && editing === "new" && !current.slug) {
        next.slug = slugify(String(value))
        next.seoSlug = slugify(String(value))
      }
      return next
    })
  }

  function openNew() {
    setForm({ ...EMPTY_FORM })
    setSection("basics")
    setEditing("new")
  }

  function openEdit(page: SeoPage) {
    setForm({
      title: fieldValue(page.title),
      slug: fieldValue(page.slug),
      targetKeyword: fieldValue(page.targetKeyword),
      content: fieldValue(page.content),
      excerpt: fieldValue(page.excerpt),
      status: page.status === "published" ? "published" : "draft",
      seoTitle: fieldValue(page.seoTitle),
      seoDescription: fieldValue(page.seoDescription),
      seoKeywords: fieldValue(page.seoKeywords),
      seoSlug: fieldValue(page.seoSlug || page.slug),
      ogImage: fieldValue(page.ogImage),
      canonicalUrl: fieldValue(page.canonicalUrl),
    })
    setSection("basics")
    setEditing(page.id)
  }

  function closeEditor() {
    if (saving || aiAction) return
    setEditing(null)
    setSection("basics")
  }

  async function runAi(
    kind: "basics" | "content" | "seo",
    endpoint: string,
    body: Record<string, unknown>,
  ) {
    setAiAction(kind)
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(errorMessage(data, "تعذر إتمام التوليد"))

      if (kind === "basics") {
        setForm(current => ({
          ...current,
          title: fieldValue(data.title) || current.title,
          excerpt: fieldValue(data.excerpt) || current.excerpt,
          slug: current.slug || slugify(fieldValue(data.title) || current.title),
          seoSlug: current.seoSlug || slugify(fieldValue(data.title) || current.title),
        }))
        setSection("basics")
        toast({ title: "تم توليد المعلومات الأساسية" })
      } else if (kind === "content") {
        updateField("content", fieldValue(data.content))
        setSection("content")
        toast({ title: "تم توليد محتوى الصفحة" })
      } else {
        setForm(current => ({
          ...current,
          seoTitle: fieldValue(data.seoTitle) || current.seoTitle,
          seoDescription: fieldValue(data.seoDescription) || current.seoDescription,
          seoKeywords: fieldValue(data.seoKeywords) || current.seoKeywords,
          seoSlug: fieldValue(data.seoSlug) || current.seoSlug,
          slug: fieldValue(data.seoSlug) || current.slug,
          canonicalUrl: fieldValue(data.canonicalUrl) || current.canonicalUrl,
        }))
        setSection("seo")
        toast({ title: "تم توليد بيانات SEO" })
      }
    } catch (error) {
      toast({
        title: "تعذر التوليد",
        description: error instanceof Error ? error.message : "حاول مرة أخرى",
        variant: "destructive",
      })
    } finally {
      setAiAction(null)
    }
  }

  function generateBasics() {
    if (!form.targetKeyword.trim()) {
      toast({ title: "أدخل الكلمة المفتاحية أولاً", variant: "destructive" })
      return
    }
    void runAi("basics", "/api/admin/ai/generate-page-basics", { keyword: form.targetKeyword })
  }

  function generateContent() {
    if (!form.title.trim()) {
      toast({ title: "العنوان مطلوب لتوليد المحتوى", variant: "destructive" })
      return
    }
    void runAi("content", "/api/admin/ai/generate-page-content", {
      title: form.title,
      keyword: form.targetKeyword,
      excerpt: form.excerpt,
    })
  }

  function generateSeo() {
    if (!form.title.trim()) {
      toast({ title: "العنوان مطلوب لتوليد بيانات SEO", variant: "destructive" })
      return
    }
    void runAi("seo", "/api/admin/ai/generate-page-seo", {
      title: form.title,
      keyword: form.targetKeyword,
      excerpt: form.excerpt,
    })
  }

  async function savePage() {
    if (!form.title.trim()) {
      toast({ title: "عنوان الصفحة مطلوب", variant: "destructive" })
      setSection("basics")
      return
    }
    if (!form.targetKeyword.trim()) {
      toast({ title: "الكلمة المفتاحية مطلوبة", variant: "destructive" })
      setSection("basics")
      return
    }

    setSaving(true)
    try {
      const slug = form.seoSlug.trim() || form.slug.trim() || slugify(form.title)
      const payload = { ...form, slug, seoSlug: slug }
      const isNew = editing === "new"
      const response = await fetch(
        isNew ? `${API_BASE}/api/admin/seo-pages` : `${API_BASE}/api/admin/seo-pages/${editing}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(payload),
        },
      )
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(errorMessage(data, "تعذر حفظ الصفحة"))
      toast({ title: isNew ? "تم إنشاء صفحة SEO" : "تم حفظ التغييرات" })
      closeEditor()
      await loadPages()
    } catch (error) {
      toast({
        title: "تعذر الحفظ",
        description: error instanceof Error ? error.message : "حاول مرة أخرى",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(page: SeoPage) {
    const nextStatus = page.status === "published" ? "draft" : "published"
    setActionId(page.id)
    try {
      const response = await fetch(`${API_BASE}/api/admin/seo-pages/${page.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(errorMessage(data, "تعذر تغيير حالة الصفحة"))
      setPages(current => current.map(item => item.id === page.id ? { ...item, status: nextStatus } : item))
      toast({ title: nextStatus === "published" ? "تم نشر الصفحة" : "تم إلغاء نشر الصفحة" })
    } catch (error) {
      toast({
        title: "تعذر تغيير الحالة",
        description: error instanceof Error ? error.message : "حاول مرة أخرى",
        variant: "destructive",
      })
    } finally {
      setActionId(null)
    }
  }

  async function deletePage(page: SeoPage) {
    if (!window.confirm(`هل أنت متأكد من حذف صفحة «${page.title}»؟`)) return
    setActionId(page.id)
    try {
      const response = await fetch(`${API_BASE}/api/admin/seo-pages/${page.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(errorMessage(data, "تعذر حذف الصفحة"))
      setPages(current => current.filter(item => item.id !== page.id))
      toast({ title: "تم حذف الصفحة" })
    } catch (error) {
      toast({
        title: "تعذر الحذف",
        description: error instanceof Error ? error.message : "حاول مرة أخرى",
        variant: "destructive",
      })
    } finally {
      setActionId(null)
    }
  }

  const editorTabs: Array<{ id: EditorSection; label: string; icon: LucideIcon }> = [
    { id: "basics", label: "الأساسيات", icon: FileText },
    { id: "content", label: "المحتوى", icon: Globe2 },
    { id: "seo", label: "بيانات البحث", icon: Search },
  ]

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary">
            <Sparkles size={13} />
            مساحة نمو البحث
          </div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">الصفحات</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            حوّل كلمات البحث إلى صفحات مفيدة تحمل نية العميل وتدعم حضور {companyName || "الشركة"} في الرياض.
          </p>
        </div>
        <Button onClick={openNew} className="rounded-xl px-5" data-testid="button-new-seo-page">
          <Plus size={17} />
          صفحة جديدة
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="إجمالي الصفحات" value={pages.length} note="كل صفحات مساحة البحث" icon={FileText} tone="navy" />
        <StatCard label="منشورة" value={publishedCount} note="صفحات ظاهرة للزوار" icon={Globe2} tone="teal" />
        <StatCard label="مسودات" value={draftCount} note="تحتاج إلى مراجعة أو محتوى" icon={Clock3} tone="gold" />
        <StatCard label="إجمالي المشاهدات" value={totalViews} note="تفاعل الزوار مع الصفحات" icon={BarChart3} tone="slate" />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="ابحث بالعنوان أو الكلمة المفتاحية..."
              className="h-11 rounded-xl border-gray-200 bg-gray-50 pr-10"
              data-testid="input-search-seo-pages"
            />
          </div>
          <div className="flex gap-1 rounded-xl bg-gray-50 p-1">
            {([
              ["all", "الكل"],
              ["published", "منشورة"],
              ["draft", "مسودات"],
            ] as Array<[StatusFilter, string]>).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${statusFilter === value ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                data-testid={`button-filter-${value}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void loadPages()}
            disabled={loading}
            className="h-10 w-10 rounded-xl text-gray-500"
            title="تحديث القائمة"
            data-testid="button-refresh-seo-pages"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center" data-testid="state-seo-pages-error">
          <AlertCircle size={34} className="mx-auto mb-3 text-red-500" />
          <h3 className="font-black text-red-900">تعذر تحميل الصفحات</h3>
          <p className="mt-1 text-sm text-red-700">{loadError}</p>
          <Button onClick={() => void loadPages()} variant="outline" className="mt-5 rounded-xl border-red-200 bg-white text-red-700" data-testid="button-retry-seo-pages">
            إعادة المحاولة
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-3" aria-label="جاري تحميل الصفحات" data-testid="state-seo-pages-loading">
          {[1, 2, 3].map(index => (
            <div key={index} className="h-24 animate-pulse rounded-2xl border border-gray-100 bg-white" />
          ))}
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center" data-testid="state-seo-pages-empty">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
            <Search size={25} />
          </div>
          <h3 className="mt-4 font-black text-gray-900">{pages.length ? "لا توجد نتائج مطابقة" : "ابدأ أول صفحة بحث"}</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-gray-500">
            {pages.length ? "جرّب كلمة أخرى أو غيّر حالة العرض." : "أنشئ صفحة تستهدف سؤالاً حقيقياً يبحث عنه عملاء الحاويات ونقل المخلفات في الرياض."}
          </p>
          {!pages.length && (
            <Button onClick={openNew} className="mt-5 rounded-xl" data-testid="button-empty-new-seo-page">
              <Plus size={16} />
              إنشاء صفحة SEO
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm" data-testid="list-seo-pages">
          <div className="hidden grid-cols-[minmax(0,1fr)_9rem_8rem_8rem] gap-4 border-b border-gray-100 bg-gray-50/80 px-5 py-3 text-[11px] font-bold text-gray-400 md:grid">
            <span>الصفحة والكلمة المستهدفة</span>
            <span>الحالة</span>
            <span>آخر تحديث</span>
            <span>الإجراءات</span>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredPages.map(page => (
              <div key={page.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-gray-50/70 sm:p-5 md:grid md:grid-cols-[minmax(0,1fr)_9rem_8rem_8rem] md:items-center md:gap-4" data-testid={`row-seo-page-${page.id}`}>
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${page.status === "published" ? "bg-secondary/12 text-secondary" : "bg-amber-100 text-amber-700"}`} data-testid={`status-seo-page-${page.id}`}>
                      {page.status === "published" ? "منشورة" : "مسودة"}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Eye size={11} />
                      {page.viewCount || 0} مشاهدة
                    </span>
                  </div>
                  <h3 className="truncate font-black text-gray-900" data-testid={`text-seo-page-title-${page.id}`}>{page.title || "بدون عنوان"}</h3>
                  <p className="mt-1 truncate text-xs text-secondary" data-testid={`text-seo-page-keyword-${page.id}`}>الهدف: {page.targetKeyword || "لم تُحدد كلمة مفتاحية"}</p>
                </div>
                <div className="hidden md:block">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${page.status === "published" ? "text-secondary" : "text-amber-600"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${page.status === "published" ? "bg-secondary" : "bg-amber-500"}`} />
                    {page.status === "published" ? "منشورة" : "مسودة"}
                  </span>
                </div>
                <p className="hidden text-xs text-gray-500 md:block">{formatDate(page.updatedAt || page.publishedAt)}</p>
                <div className="flex items-center justify-end gap-1 border-t border-gray-100 pt-3 md:border-0 md:pt-0">
                  {page.status === "published" && (
                    <button
                      onClick={() => window.open(`/pages/${encodeURIComponent(page.slug)}`, "_blank", "noopener,noreferrer")}
                      className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-gray-500 transition-colors hover:bg-secondary/10 hover:text-secondary"
                      title="معاينة الصفحة"
                      data-testid={`button-preview-seo-page-${page.id}`}
                    >
                      <Eye size={15} />
                      <span className="hidden lg:inline">معاينة</span>
                    </button>
                  )}
                  <button
                    onClick={() => void toggleStatus(page)}
                    disabled={actionId === page.id}
                    className={`flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-colors ${page.status === "published" ? "text-amber-600 hover:bg-amber-50" : "text-secondary hover:bg-secondary/10"}`}
                    title={page.status === "published" ? "إلغاء النشر" : "نشر الصفحة"}
                    data-testid={`button-toggle-seo-page-${page.id}`}
                  >
                    {actionId === page.id ? <Loader2 size={15} className="animate-spin" /> : page.status === "published" ? <EyeOff size={15} /> : <Check size={15} />}
                    <span className="hidden lg:inline">{page.status === "published" ? "إلغاء النشر" : "نشر"}</span>
                  </button>
                  <button onClick={() => openEdit(page)} className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-gray-500 transition-colors hover:bg-primary/10 hover:text-primary" data-testid={`button-edit-seo-page-${page.id}`}>
                    <Pencil size={15} />
                    <span className="hidden lg:inline">تعديل</span>
                  </button>
                  <button onClick={() => void deletePage(page)} disabled={actionId === page.id} className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600" data-testid={`button-delete-seo-page-${page.id}`}>
                    <Trash2 size={15} />
                    <span className="hidden lg:inline">حذف</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing !== null && (
        <div className="fixed inset-0 z-50 flex" dir="rtl" data-testid="drawer-seo-page-editor">
          <button className="absolute inset-0 cursor-default bg-primary/35 backdrop-blur-sm" onClick={closeEditor} aria-label="إغلاق المحرر" data-testid="button-close-seo-editor-overlay" />
          <aside className="relative mr-auto flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-7">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">صفحة هبوط بحثية</p>
                <h3 className="mt-1 text-lg font-black text-gray-900">{editing === "new" ? "إنشاء صفحة SEO" : "تعديل صفحة SEO"}</h3>
              </div>
              <button onClick={closeEditor} disabled={saving || Boolean(aiAction)} className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700" data-testid="button-close-seo-editor">
                <X size={19} />
              </button>
            </div>

            <div className="border-b border-gray-100 bg-gradient-to-l from-primary/[0.04] to-secondary/[0.07] px-5 py-4 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Sparkles size={18} /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-gray-900">ابدأ من نية البحث</p>
                  <p className="truncate text-xs text-gray-500">أدخل الكلمة المفتاحية ثم دع أدوات الذكاء الاصطناعي تقترح أساس الصفحة.</p>
                </div>
                <Button onClick={generateBasics} disabled={Boolean(aiAction) || !form.targetKeyword.trim()} variant="outline" className="shrink-0 rounded-xl border-secondary/30 text-secondary hover:bg-secondary/10" data-testid="button-ai-page-basics">
                  {aiAction === "basics" ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                  <span className="hidden sm:inline">توليد الأساسيات</span>
                </Button>
              </div>
            </div>

            <div className="flex border-b border-gray-100 bg-gray-50">
              {editorTabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button key={tab.id} onClick={() => setSection(tab.id)} className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-bold transition-colors ${section === tab.id ? "border-primary bg-white text-primary" : "border-transparent text-gray-400 hover:text-gray-700"}`} data-testid={`button-editor-section-${tab.id}`}>
                    <Icon size={15} />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
              {section === "basics" && (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-800" htmlFor="seo-target-keyword">الكلمة المفتاحية المستهدفة <span className="text-secondary">*</span></label>
                    <Input id="seo-target-keyword" value={form.targetKeyword} onChange={event => updateField("targetKeyword", event.target.value)} placeholder="مثال: تأجير حاويات أنقاض بالرياض" className="h-11 rounded-xl" data-testid="input-target-keyword" />
                    <p className="mt-1.5 text-[11px] text-gray-400">اكتب العبارة التي يستخدمها العميل عند البحث عن الخدمة.</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-800" htmlFor="seo-page-title">عنوان الصفحة <span className="text-secondary">*</span></label>
                    <Input id="seo-page-title" value={form.title} onChange={event => updateField("title", event.target.value)} placeholder="عنوان واضح يجيب عن نية البحث" className="h-11 rounded-xl" data-testid="input-seo-page-title" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-800" htmlFor="seo-page-excerpt">الملخص</label>
                    <textarea id="seo-page-excerpt" value={form.excerpt} onChange={event => updateField("excerpt", event.target.value)} rows={4} placeholder="وصف قصير يظهر في مقدمة الصفحة ونتائج البحث..." className="w-full resize-y rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm leading-7 outline-none transition focus:ring-2 focus:ring-secondary/25" data-testid="textarea-seo-page-excerpt" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-gray-800" htmlFor="seo-page-slug">المسار</label>
                       <Input id="seo-page-slug" dir="ltr" value={form.seoSlug} onChange={event => updateField("seoSlug", event.target.value)} placeholder="تأجير-حاويات-بالرياض" className="h-11 rounded-xl text-left" data-testid="input-seo-page-slug" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-gray-800" htmlFor="seo-page-status">الحالة</label>
                      <select id="seo-page-status" value={form.status} onChange={event => updateField("status", event.target.value as PageForm["status"])} className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-secondary/25" data-testid="select-seo-page-status">
                        <option value="draft">مسودة</option>
                        <option value="published">منشورة</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {section === "content" && (
                <div className="space-y-4">
                  <div className="flex flex-col justify-between gap-3 rounded-2xl border border-secondary/15 bg-secondary/[0.06] p-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-black text-primary"><Wand2 size={15} className="text-secondary" /> محرر محتوى مساعد</p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">ينتج HTML عربي منظماً حول الكلمة المفتاحية والعنوان.</p>
                    </div>
                    <Button onClick={generateContent} disabled={Boolean(aiAction) || !form.title.trim()} variant="outline" className="rounded-xl border-secondary/25 bg-white text-secondary hover:bg-secondary/10" data-testid="button-ai-page-content">
                      {aiAction === "content" ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                      توليد المحتوى
                    </Button>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-800" htmlFor="seo-page-content">محتوى الصفحة</label>
                    <textarea id="seo-page-content" value={form.content} onChange={event => updateField("content", event.target.value)} rows={20} dir="rtl" placeholder="اكتب محتوى الصفحة بصيغة HTML أو ولّده بالذكاء الاصطناعي..." className="w-full resize-y rounded-xl border border-input bg-transparent px-4 py-3 text-sm leading-8 outline-none transition focus:ring-2 focus:ring-secondary/25" data-testid="textarea-seo-page-content" />
                    <p className="mt-2 text-[11px] text-gray-400">يمكن استخدام العناوين والفقرات والقوائم ووسوم الروابط داخل HTML.</p>
                  </div>
                </div>
              )}

              {section === "seo" && (
                <div className="space-y-5">
                  <div className="flex flex-col justify-between gap-3 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-black text-primary"><Search size={15} /> أساسيات الظهور</p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">حسّن العنوان والوصف قبل النشر.</p>
                    </div>
                    <Button onClick={generateSeo} disabled={Boolean(aiAction) || !form.title.trim()} variant="outline" className="rounded-xl border-primary/25 bg-white text-primary hover:bg-primary/5" data-testid="button-ai-page-seo">
                      {aiAction === "seo" ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                      توليد بيانات SEO
                    </Button>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-800" htmlFor="seo-title">عنوان SEO</label>
                    <Input id="seo-title" value={form.seoTitle} onChange={event => updateField("seoTitle", event.target.value)} placeholder="العنوان الذي يظهر في محرك البحث" className="h-11 rounded-xl" data-testid="input-seo-title" />
                    <p className="mt-1 text-[11px] text-gray-400">{form.seoTitle.length} حرفاً</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-800" htmlFor="seo-description">وصف SEO</label>
                    <textarea id="seo-description" value={form.seoDescription} onChange={event => updateField("seoDescription", event.target.value)} rows={4} placeholder="وصف موجز ومقنع للنتيجة..." className="w-full resize-y rounded-xl border border-input px-3 py-2.5 text-sm leading-7 outline-none focus:ring-2 focus:ring-secondary/25" data-testid="textarea-seo-description" />
                    <p className="mt-1 text-[11px] text-gray-400">{form.seoDescription.length} حرفاً</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-800" htmlFor="seo-keywords">كلمات SEO الإضافية</label>
                    <Input id="seo-keywords" value={form.seoKeywords} onChange={event => updateField("seoKeywords", event.target.value)} placeholder="حاويات، أنقاض، مخلفات، الرياض" className="h-11 rounded-xl" data-testid="input-seo-keywords" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-800" htmlFor="seo-canonical">الرابط الأساسي</label>
                    <Input id="seo-canonical" dir="ltr" value={form.canonicalUrl} onChange={event => updateField("canonicalUrl", event.target.value)} placeholder="يُترك فارغاً لاستخدام رابط الصفحة" className="h-11 rounded-xl text-left" data-testid="input-seo-canonical" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-800" htmlFor="seo-og-image">رابط صورة المشاركة</label>
                    <Input id="seo-og-image" dir="ltr" value={form.ogImage} onChange={event => updateField("ogImage", event.target.value)} placeholder="https://..." className="h-11 rounded-xl text-left" data-testid="input-seo-og-image" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:px-7">
              <button onClick={closeEditor} disabled={saving || Boolean(aiAction)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100" data-testid="button-cancel-seo-page">إلغاء</button>
              <Button onClick={() => void savePage()} disabled={saving || Boolean(aiAction)} className="rounded-xl px-6" data-testid="button-save-seo-page">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? "جاري الحفظ..." : "حفظ الصفحة"}
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}