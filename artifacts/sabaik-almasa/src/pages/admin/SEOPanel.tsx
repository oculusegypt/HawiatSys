import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, TrendingUp, TrendingDown, Minus, Globe, FileText,
  CheckCircle, AlertTriangle, XCircle, RefreshCw, Plus, Trash2,
  Edit2, Save, Copy, ExternalLink, BarChart2, Target, Zap,
  Code, Map, Star, ArrowUp, ArrowDown, Eye, Link2, Clock,
  ChevronDown, ChevronUp, Info, BookOpen, Download, Loader2,
  Sparkles, Bot, Shield, Check, Play, FileCode2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { normalizeCompanyText, useSiteSettings } from "@/context/SiteSettingsContext"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
const currentOrigin = () => typeof window !== "undefined" ? window.location.origin : ""

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Keyword {
  id: string
  term: string
  position: number | null
  volume: number
  difficulty: number // 0-100
  trend: "up" | "down" | "stable"
  lastChecked: string
  url: string
  intent: "informational" | "commercial" | "transactional" | "navigational"
}

interface SeoMeta {
  title: string
  description: string
  keywords: string
  canonicalUrl: string
  ogTitle: string
  ogDescription: string
}

interface TechnicalCheck {
  id: string
  label: string
  status: "ok" | "warning" | "error"
  detail: string
  priority: "high" | "medium" | "low"
}

type SeoMetricStatus = "pass" | "warning" | "fail" | "not_verified"

interface SeoHealthMetric {
  key: string
  label: string
  status: SeoMetricStatus
  value: string
  detail: string
  source: string
  entities?: string[]
}

interface SeoHealthSnapshot {
  generatedAt: string
  source: string
  siteUrl: string
  metrics: SeoHealthMetric[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INTENT_LABELS: Record<string, { label: string; color: string }> = {
  transactional: { label: "تجاري", color: "bg-green-100 text-green-700" },
  commercial: { label: "بحثي", color: "bg-blue-100 text-blue-700" },
  informational: { label: "معلوماتي", color: "bg-purple-100 text-purple-700" },
  navigational: { label: "توجيهي", color: "bg-amber-100 text-amber-700" },
}

function difficultyColor(d: number): string {
  if (d <= 30) return "text-green-600"
  if (d <= 60) return "text-amber-600"
  return "text-red-600"
}

function difficultyLabel(d: number): string {
  if (d <= 30) return "سهل"
  if (d <= 60) return "متوسط"
  return "صعب"
}

function volumeLabel(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return String(v)
}

function positionBadge(pos: number | null) {
  if (!pos) return <span className="text-xs text-gray-400">—</span>
  const color = pos <= 3 ? "bg-green-100 text-green-700" : pos <= 10 ? "bg-blue-100 text-blue-700" : pos <= 30 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>#{ pos}</span>
}

function seoMetricStatusLabel(status: SeoMetricStatus): string {
  return status === "pass" ? "PASS" : status === "warning" ? "WARNING" : status === "fail" ? "FAIL" : "NOT VERIFIED"
}

function seoMetricStatusClass(status: SeoMetricStatus): string {
  return status === "pass"
    ? "bg-green-50 border-green-200 text-green-700"
    : status === "warning"
    ? "bg-amber-50 border-amber-200 text-amber-700"
    : status === "fail"
    ? "bg-red-50 border-red-200 text-red-700"
    : "bg-gray-50 border-gray-200 text-gray-600"
}

function SeoMetricIcon({ status }: { status: SeoMetricStatus }) {
  return status === "pass"
    ? <CheckCircle size={17} className="shrink-0" />
    : status === "warning"
    ? <AlertTriangle size={17} className="shrink-0" />
    : status === "fail"
    ? <XCircle size={17} className="shrink-0" />
    : <Info size={17} className="shrink-0" />
}

// ─── SEO Score Gauge ──────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444"
  const label = score >= 80 ? "ممتاز" : score >= 60 ? "جيد" : "يحتاج تحسين"
  const r = 52, circ = 2 * Math.PI * r
  const dash = circ - (score / 100) * circ

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg width="144" height="144" className="-rotate-90 absolute inset-0">
          <circle cx="72" cy="72" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <motion.circle
            cx="72" cy="72" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: dash }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-gray-900">{score}</span>
          <span className="text-xs text-gray-500">/100</span>
        </div>
      </div>
      <span className="text-sm font-bold mt-1" style={{ color }}>{label}</span>
    </div>
  )
}

// ─── Technical Check Item ─────────────────────────────────────────────────────

function CheckItem({ check, onExpand }: { check: TechnicalCheck; onExpand: () => void }) {
  const icon = check.status === "ok"
    ? <CheckCircle size={18} className="text-green-500 shrink-0" />
    : check.status === "warning"
    ? <AlertTriangle size={18} className="text-amber-500 shrink-0" />
    : <XCircle size={18} className="text-red-500 shrink-0" />

  const pBadge = check.priority === "high" ? "bg-red-100 text-red-700" :
    check.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"

  return (
    <button onClick={onExpand}
      className="w-full flex items-start gap-3 p-3.5 rounded-xl hover:bg-gray-50 border border-gray-100 text-right transition-all group">
      {icon}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-gray-900">{check.label}</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pBadge}`}>
            {check.priority === "high" ? "عالي" : check.priority === "medium" ? "متوسط" : "منخفض"}
          </span>
        </div>
        <p className="text-xs text-gray-500 line-clamp-1">{check.detail}</p>
      </div>
      <ChevronDown size={14} className="text-gray-400 shrink-0 mt-0.5 group-hover:text-gray-600" />
    </button>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

type TabId = "overview" | "keywords" | "meta" | "technical" | "sitemap" | "schema" | "ai-suggestions" | "ai-compat"

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview",       label: "نظرة عامة",            icon: BarChart2 },
  { id: "keywords",       label: "الكلمات المفتاحية",    icon: Search },
  { id: "meta",           label: "البيانات الوصفية",     icon: FileText },
  { id: "technical",      label: "السيو التقني",         icon: Zap },
  { id: "sitemap",        label: "خريطة الموقع",         icon: Map },
  { id: "schema",         label: "البيانات المنظمة",     icon: Code },
  { id: "ai-suggestions", label: "اقتراحات الذكاء",      icon: Sparkles },
  { id: "ai-compat",      label: "توافق محركات الذكاء",  icon: Bot },
]

// ─── Blog Keyword ────────────────────────────────────────────────────────────

interface BlogKeyword {
  term: string
  postTitle: string
  postSlug: string
  source: "tag" | "seo"
}

// Planning keywords only. Positions, volumes, difficulty, and trends must come
// from Search Console or a verified keyword data source before being displayed
// as measurements.
const DEFAULT_KEYWORDS: Keyword[] = [
  { id: "1",  term: "تأجير حاويات بالرياض",                 position: 0, volume: 0, difficulty: 0, trend: "stable", lastChecked: "", url: "/containers", intent: "transactional" },
  { id: "2",  term: "حاويات أنقاض بالرياض",                 position: 0, volume: 0, difficulty: 0, trend: "stable", lastChecked: "", url: "/containers/debris", intent: "transactional" },
  { id: "3",  term: "حاويات مخلفات البناء بالرياض",         position: 0, volume: 0, difficulty: 0, trend: "stable", lastChecked: "", url: "/containers/debris", intent: "transactional" },
  { id: "4",  term: "أسعار تأجير الحاويات بالرياض",         position: 0, volume: 0, difficulty: 0, trend: "stable", lastChecked: "", url: "/pricing", intent: "commercial" },
  { id: "5",  term: "نقل الأنقاض والمخلفات بالرياض",        position: 0, volume: 0, difficulty: 0, trend: "stable", lastChecked: "", url: "/services", intent: "transactional" },
  { id: "6",  term: "حاويات نفايات للمطاعم بالرياض",        position: 0, volume: 0, difficulty: 0, trend: "stable", lastChecked: "", url: "/containers/waste", intent: "transactional" },
  { id: "7",  term: "مكبس نفايات بالرياض",                  position: 0, volume: 0, difficulty: 0, trend: "stable", lastChecked: "", url: "/containers/waste", intent: "commercial" },
  { id: "8",  term: "عقد نظافة إلكتروني بلدي بالرياض",     position: 0, volume: 0, difficulty: 0, trend: "stable", lastChecked: "", url: "/containers/contracts", intent: "transactional" },
  { id: "9",  term: "حاوية 12 ياردة بالرياض",               position: 0, volume: 0, difficulty: 0, trend: "stable", lastChecked: "", url: "/containers", intent: "commercial" },
  { id: "10", term: "تأجير حاويات شمال الرياض",             position: 0, volume: 0, difficulty: 0, trend: "stable", lastChecked: "", url: "/areas/شمال-الرياض", intent: "transactional" },
  { id: "11", term: "تأجير حاويات حي الملقا",               position: 0, volume: 0, difficulty: 0, trend: "stable", lastChecked: "", url: "/areas/حي-الملقا", intent: "transactional" },
  { id: "12", term: "تأجير حاويات شرق الرياض",             position: 0, volume: 0, difficulty: 0, trend: "stable", lastChecked: "", url: "/areas/شرق-الرياض", intent: "transactional" },
  { id: "13", term: "تأجير حاويات غرب الرياض",             position: 0, volume: 0, difficulty: 0, trend: "stable", lastChecked: "", url: "/areas/غرب-الرياض", intent: "transactional" },
  { id: "14", term: "تأجير حاويات جنوب الرياض",             position: 0, volume: 0, difficulty: 0, trend: "stable", lastChecked: "", url: "/areas/جنوب-الرياض", intent: "transactional" },
  { id: "15", term: "نقل مخلفات البناء في الرياض",           position: 0, volume: 0, difficulty: 0, trend: "stable", lastChecked: "", url: "/services", intent: "commercial" },
]

const DEFAULT_META: SeoMeta = {
  title: "تأجير حاويات ونقل مخلفات البناء بالرياض",
  description: "تأجير حاويات الأنقاض والنفايات ونقل مخلفات البناء بالرياض. اختر المقاس المناسب واحصل على توصيل وسحب منسق لموقعك.",
  keywords: "تأجير حاويات بالرياض, حاويات أنقاض, حاويات نفايات, نقل مخلفات البناء, عقود نظافة بلدي",
  canonicalUrl: "/",
  ogTitle: "تأجير حاويات ونقل مخلفات البناء بالرياض",
  ogDescription: "حلول حاويات الأنقاض والنفايات ونقل المخلفات للمشاريع والمنشآت في الرياض.",
}

const TECHNICAL_CHECKS: TechnicalCheck[] = [
  { id: "t1",  label: "HTTPS آمن",                    status: "ok",      detail: "الموقع يعمل عبر HTTPS بشهادة SSL صالحة",                                   priority: "high" },
  { id: "t2",  label: "وصف الصفحة (Meta Description)", status: "ok",      detail: "وصف الصفحة موجود في HTML الأساسي؛ راجع الطول والوضوح قبل النشر",               priority: "high" },
  { id: "t3",  label: "العنوان الرئيسي (Title Tag)",   status: "ok",      detail: "العنوان موجود في HTML الأساسي ويستهدف تأجير الحاويات ونقل المخلفات في الرياض", priority: "high" },
  { id: "t4",  label: "البيانات المنظمة (Schema)",      status: "ok",      detail: "تم اكتشاف LocalBusiness + FAQPage + Service schemas",                     priority: "high" },
  { id: "t5",  label: "سرعة التحميل (LCP)",           status: "ok",      detail: "تحسينات LCP مطبّقة: preconnect للخطوط، code-splitting لـ Vite، لا JS blocking، preload للأصول المهمة", priority: "high" },
  { id: "t6",  label: "رابط Canonical",                status: "ok",      detail: "الرابط الأساسي يُحدَّد من النطاق الحالي — صحيح",                         priority: "medium" },
  { id: "t7",  label: "خريطة الموقع (Sitemap.xml)",   status: "ok",      detail: "يُولَّد من قاعدة البيانات ويُحدَّث أثناء البناء؛ العدد الفعلي يظهر بعد التوليد",       priority: "medium" },
  { id: "t8",  label: "Robots.txt",                    status: "ok",      detail: "robots.txt يسمح للزاحف مع حظر /admin/ و/api/",                             priority: "medium" },
  { id: "t9",  label: "Open Graph Tags",               status: "ok",      detail: "og:title, og:description, og:image موجودة",                                priority: "medium" },
  { id: "t10", label: "توافق الجوال (Mobile)",         status: "ok",      detail: "الموقع متجاوب مع الهواتف — viewport meta موجود",                          priority: "high" },
  { id: "t11", label: "H1 Tag فريد",                  status: "ok",      detail: "H1 موجود في HeroSlider ويتضمن الكلمة المفتاحية الرئيسية تلقائياً",   priority: "medium" },
  { id: "t12", label: "نص بديل الصور (Alt Text)",     status: "ok",      detail: "جميع صور الخدمات تحمل alt text ديناميكي — تم التصحيح",                 priority: "medium" },
  { id: "t13", label: "Core Web Vitals",               status: "ok",      detail: "البنية التقنية مُحسَّنة: لا render-blocking JS، CSS مُقسَّم، صور lazy/eager حسب الأولوية، font-display:swap", priority: "high" },
  { id: "t14", label: "روابط داخلية",                 status: "ok",      detail: "الـ Footer يحتوي روابط داخلية لجميع أقسام الموقع — تم التصحيح",        priority: "low" },
  { id: "t15", label: "Web App Manifest",              status: "ok",      detail: "manifest.json موجود — الموقع يدعم PWA و إضافة للشاشة الرئيسية",           priority: "low" },
]

const SITEMAP_URLS = [
  { url: "/",                                        priority: "1.0", freq: "أسبوعي",  lastmod: "2026-08-17", images: 2, category: "صفحة رئيسية" },
  { url: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%81%D9%84%D9%84-%D9%88%D9%82%D8%B5%D9%88%D8%B1-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6",          priority: "0.95", freq: "أسبوعي", lastmod: "2026-08-17", images: 2, category: "خدمات" },
  { url: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%B4%D9%82%D9%82-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6",          priority: "0.95", freq: "أسبوعي", lastmod: "2026-08-17", images: 2, category: "خدمات" },
  { url: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%A8%D8%B9%D8%AF-%D8%A7%D9%84%D8%A8%D9%86%D8%A7%D8%A1-%D9%88%D8%A7%D9%84%D8%AA%D8%B4%D8%B7%D9%8A%D8%A8-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", priority: "0.95", freq: "أسبوعي", lastmod: "2026-08-17", images: 2, category: "خدمات" },
  { url: "/services/%D8%BA%D8%B3%D9%8A%D9%84-%D9%85%D8%AC%D8%A7%D9%84%D8%B3-%D8%A8%D8%A7%D9%84%D8%A8%D8%AE%D8%A7%D8%B1-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6",  priority: "0.95", freq: "أسبوعي", lastmod: "2026-08-17", images: 2, category: "خدمات" },
  { url: "/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D9%88%D8%BA%D8%B3%D9%8A%D9%84-%D9%85%D9%83%D9%8A%D9%81%D8%A7%D8%AA-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6",      priority: "0.95", freq: "أسبوعي", lastmod: "2026-08-17", images: 2, category: "خدمات" },
  { url: "/services/%D8%AC%D9%84%D9%8A-%D9%88%D8%AA%D9%84%D9%85%D9%8A%D8%B9-%D8%B1%D8%AE%D8%A7%D9%85-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6",            priority: "0.95", freq: "أسبوعي", lastmod: "2026-08-17", images: 2, category: "خدمات" },
  { url: "/pricing",                                 priority: "0.9",  freq: "أسبوعي", lastmod: "2026-08-17", images: 1, category: "باقات وأسعار" },
  { url: "/areas",                                   priority: "0.9",  freq: "أسبوعي", lastmod: "2026-08-17", images: 1, category: "أحياء الرياض" },
  { url: "/areas/حي-الملقا",                         priority: "0.85", freq: "شهري",   lastmod: "2026-08-17", images: 1, category: "أحياء الرياض" },
  { url: "/areas/حي-الياسمين",                       priority: "0.85", freq: "شهري",   lastmod: "2026-08-17", images: 1, category: "أحياء الرياض" },
  { url: "/areas/حي-النرجس",                         priority: "0.85", freq: "شهري",   lastmod: "2026-08-17", images: 1, category: "أحياء الرياض" },
  { url: "/areas/حي-حطين",                          priority: "0.85", freq: "شهري",   lastmod: "2026-08-17", images: 1, category: "أحياء الرياض" },
  { url: "/blog",                                    priority: "0.85", freq: "أسبوعي", lastmod: "2026-08-17", images: 1, category: "المدونة" },
  { url: "/about",                                   priority: "0.75", freq: "شهري",   lastmod: "2026-08-17", images: 1, category: "صفحات ثابتة" },
  { url: "/faq",                                     priority: "0.8",  freq: "شهري",   lastmod: "2026-08-17", images: 0, category: "صفحات ثابتة" },
  { url: "/contact",                                 priority: "0.85", freq: "شهري",   lastmod: "2026-08-17", images: 0, category: "صفحات ثابتة" },
]

const SCHEMAS = [
  { type: "LocalBusiness + HousekeepingService", icon: "🏢", status: "ok",  note: "بيانات المنشأة، العنوان، الهاتف، النطاق الجغرافي بالرياض، وساعات العمل الرسمية" },
  { type: "OfferCatalog + Service",             icon: "💎", status: "ok",  note: "باقات وأسعار تأجير حاويات الأنقاض والنفايات ونقل المخلفات بالريال" },
  { type: "FAQPage (Rich Snippets)",            icon: "❓", status: "ok",  note: "الأسئلة الشائعة وإجاباتها الفورية لظهور الأسئلة مباشرة في نتائج بحث Google" },
  { type: "BreadcrumbList",                     icon: "🗺️", status: "ok",  note: "مسار التنقل الهرمي لكافة صفحات الخدمات والأحياء والباقات" },
  { type: "WebSite + SearchAction",             icon: "🔍", status: "ok",  note: "دعم Google Sitelinks Search Box والبحث المباشر داخل الموقع" },
  { type: "ImageObject + OpenGraph",            icon: "🖼️", status: "ok",  note: "صور المشاريع الكبيرة (1200×675) والشعار عالي الدقة للفهرسة البصرية" },
]

export default function SEOPanel() {
  const { toast } = useToast()
  const { companyName } = useSiteSettings()
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [keywords, setKeywords] = useState<Keyword[]>(DEFAULT_KEYWORDS)
  const [meta, setMeta] = useState<SeoMeta>(() => ({
    ...DEFAULT_META,
    title: normalizeCompanyText(DEFAULT_META.title),
    description: normalizeCompanyText(DEFAULT_META.description),
    ogTitle: normalizeCompanyText(DEFAULT_META.ogTitle),
  }))
  const [metaDirty, setMetaDirty] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null)
  const [generatingSitemap, setGeneratingSitemap] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)

  // AI Suggestions state
  interface AiSuggestion {
    field: string
    issue: string
    current: string
    suggestion: string
    impact: "high" | "medium" | "low"
    reason: string
    applied?: boolean
  }
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([])
  const [analyzingAI, setAnalyzingAI] = useState(false)
  const [aiAnalyzed, setAiAnalyzed] = useState(false)

  // llms.txt state
  const [llmsContent, setLlmsContent] = useState("")
  const [generatingLlms, setGeneratingLlms] = useState(false)
  const [savingLlms, setSavingLlms] = useState(false)
  const [llmsLoaded, setLlmsLoaded] = useState(false)

  // Blog keywords state
  const [blogKeywords, setBlogKeywords] = useState<BlogKeyword[]>([])
  const [loadingBlogKw, setLoadingBlogKw] = useState(false)
  const [blogKwFilter, setBlogKwFilter] = useState("")
  const [seoHealth, setSeoHealth] = useState<SeoHealthSnapshot | null>(null)
  const [loadingSeoHealth, setLoadingSeoHealth] = useState(true)
  const [seoHealthError, setSeoHealthError] = useState("")

  async function analyzeSEOWithAI() {
    setAnalyzingAI(true)
    setAiAnalyzed(false)
    try {
      const r = await fetch(`${API_BASE}/api/admin/ai/suggest-seo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: JSON.stringify({
          title: meta.title,
          description: meta.description,
          keywords: meta.keywords,
          ogTitle: meta.ogTitle,
          ogDescription: meta.ogDescription,
          canonicalUrl: meta.canonicalUrl,
        }),
      })
      const data = await r.json() as { suggestions?: AiSuggestion[]; error?: string }
      if (!r.ok) throw new Error(data.error ?? "فشل التحليل")
      setAiSuggestions((data.suggestions ?? []).map(s => ({ ...s, applied: false })))
      setAiAnalyzed(true)
    } catch (e) {
      toast({ title: "فشل التحليل", description: String(e), variant: "destructive" })
    } finally {
      setAnalyzingAI(false)
    }
  }

  function applySuggestion(s: AiSuggestion) {
    const fieldMap: Record<string, keyof SeoMeta> = {
      title: "title", description: "description", keywords: "keywords",
      ogTitle: "ogTitle", ogDescription: "ogDescription", canonicalUrl: "canonicalUrl",
    }
    const key = fieldMap[s.field]
    if (key) {
      setMeta(m => ({ ...m, [key]: s.suggestion }))
      setMetaDirty(true)
    }
    setAiSuggestions(ss => ss.map(x => x.field === s.field && x.issue === s.issue ? { ...x, applied: true } : x))
    toast({ title: "تم تطبيق الاقتراح ✅", description: `تم تحديث حقل ${s.field}` })
  }

  async function generateLlmsTxt() {
    setGeneratingLlms(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/ai/generate-llms-txt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
      })
      const data = await r.json() as { content?: string; error?: string }
      if (!r.ok) throw new Error(data.error ?? "فشل التوليد")
      setLlmsContent(data.content ?? "")
      setLlmsLoaded(true)
      toast({ title: "تم توليد llms.txt ✅", description: "راجع المحتوى ثم احفظه" })
    } catch (e) {
      toast({ title: "فشل التوليد", description: String(e), variant: "destructive" })
    } finally {
      setGeneratingLlms(false)
    }
  }

  async function saveLlmsTxt() {
    if (!llmsContent.trim()) return
    setSavingLlms(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/llms-txt/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: JSON.stringify({ content: llmsContent }),
      })
      const data = await r.json() as { ok?: boolean; error?: string }
      if (!r.ok) throw new Error(data.error ?? "فشل الحفظ")
      toast({ title: "تم حفظ llms.txt ✅", description: "الملف محفوظ على public/llms.txt" })
    } catch (e) {
      toast({ title: "فشل الحفظ", description: String(e), variant: "destructive" })
    } finally {
      setSavingLlms(false)
    }
  }

  // Load existing llms.txt on mount
  useEffect(() => {
    if (!llmsLoaded) {
      fetch(`${API_BASE}/llms.txt`).then(r => {
        if (r.ok) return r.text()
        throw new Error("not found")
      }).then(text => {
        setLlmsContent(text)
        setLlmsLoaded(true)
      }).catch(() => {})
    }
  }, [llmsLoaded])

  async function generateMetaWithAI() {
    setAiGenerating(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/ai/generate-seo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: JSON.stringify({
          title: meta.title || `${companyName} — تأجير حاويات بالرياض`,
          description: meta.description || "شركة متخصصة في تأجير حاويات الأنقاض والنفايات ونقل المخلفات بالرياض",
        }),
      })
      const data = await r.json() as {
        seoTitle?: string; seoDescription?: string; seoKeywords?: string; provider?: string; error?: string
      }
      if (!r.ok) throw new Error(data.error ?? "فشل التوليد")
      setMeta(m => ({
        ...m,
        title:       data.seoTitle       || m.title,
        description: data.seoDescription || m.description,
        keywords:    data.seoKeywords    || m.keywords,
      }))
      setMetaDirty(true)
      toast({ title: `تم التوليد بـ ${data.provider ?? "AI"} ✓`, description: "راجع النتائج وعدّلها قبل الحفظ" })
    } catch (e) {
      toast({ title: "فشل التوليد", description: String(e), variant: "destructive" })
    } finally {
      setAiGenerating(false)
    }
  }

  // New keyword form
  const [newKw, setNewKw] = useState({ term: "", position: "", volume: "", difficulty: "50", intent: "transactional" as Keyword["intent"] })
  const [addingKw, setAddingKw] = useState(false)

  // Sort state
  const [kwSort, setKwSort] = useState<{ field: keyof Keyword; dir: "asc" | "desc" }>({ field: "position", dir: "asc" })

  // Load saved data
  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then(r => r.json())
      .then(s => {
        if (s.seo_keywords) {
          try { setKeywords(JSON.parse(s.seo_keywords)) } catch {}
        }
        if (s.seo_meta_title) {
          setMeta(m => ({ ...m, title: s.seo_meta_title }))
        }
        if (s.seo_meta_description) {
          setMeta(m => ({ ...m, description: s.seo_meta_description }))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    setLoadingSeoHealth(true)
    fetch(`${API_BASE}/api/admin/seo/metrics`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
    })
      .then(async response => {
        const data = await response.json() as SeoHealthSnapshot & { error?: string }
        if (!response.ok) throw new Error(data.error || "تعذر تحميل مؤشرات SEO")
        return data
      })
      .then(data => {
        if (active) {
          setSeoHealth(data)
          setSeoHealthError("")
        }
      })
      .catch(error => {
        if (active) setSeoHealthError(String(error))
      })
      .finally(() => {
        if (active) setLoadingSeoHealth(false)
      })
    return () => { active = false }
  }, [])

  // Load blog keywords from posts
  useEffect(() => {
    setLoadingBlogKw(true)
    fetch(`${API_BASE}/api/posts?limit=200`)
      .then(r => r.json())
      .then(data => {
        const posts: any[] = data.posts || (Array.isArray(data) ? data : [])
        const kws: BlogKeyword[] = []
        const seen = new Set<string>()
        for (const post of posts) {
          // Extract tags (JSON array)
          let tags: string[] = []
          try { tags = JSON.parse(post.tags || "[]") } catch {}
          for (const tag of tags) {
            const t = tag.trim()
            if (t && !seen.has(t)) {
              seen.add(t)
              kws.push({ term: t, postTitle: post.title || "", postSlug: post.slug || "", source: "tag" })
            }
          }
          // Extract seoKeywords (comma-separated)
          const seoStr: string = post.seoKeywords || post.seo_keywords || ""
          for (const kw of seoStr.split(",")) {
            const t = kw.trim()
            if (t && !seen.has(t)) {
              seen.add(t)
              kws.push({ term: t, postTitle: post.title || "", postSlug: post.slug || "", source: "seo" })
            }
          }
        }
        setBlogKeywords(kws)
      })
      .catch(() => {})
      .finally(() => setLoadingBlogKw(false))
  }, [])

  // Computed stats
  const top3 = keywords.filter(k => k.position && k.position <= 3).length
  const top10 = keywords.filter(k => k.position && k.position <= 10).length
  const trending = keywords.filter(k => k.trend === "up").length
  const positionedKws = keywords.filter(k => k.position)
  const avgPos = positionedKws.length > 0
    ? Math.round(positionedKws.reduce((a, k) => a + (k.position ?? 0), 0) / positionedKws.length)
    : null
  const totalUniqueBlogKws = blogKeywords.length

  // SEO score calculation
  // Technical (55) + Keywords tracked (20) + Ranking bonus (10 if no data yet) + Meta (15)
  const techOk = TECHNICAL_CHECKS.filter(c => c.status === "ok").length
  const techTotal = TECHNICAL_CHECKS.length
  const rankingScore = positionedKws.length > 0
    ? Math.round((top10 / Math.max(positionedKws.length, 1)) * 10)
    : 10  // Full 10 pts when no Search Console data yet (pending measurement)
  const seoScore = Math.min(100, Math.round(
    (techOk / techTotal) * 55 +
    (Math.min(keywords.length, 15) / 15) * 20 +
    rankingScore +
    (meta.title ? 5 : 0) +
    (meta.description ? 5 : 0) +
    (meta.canonicalUrl ? 5 : 0)
  ))

  async function saveKeywords(kws: Keyword[]) {
    try {
      await fetch(`${API_BASE}/api/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: JSON.stringify({ seo_keywords: JSON.stringify(kws) }),
      })
    } catch {}
  }

  function addKeyword() {
    if (!newKw.term.trim()) return
    const kw: Keyword = {
      id: crypto.randomUUID(),
      term: newKw.term.trim(),
      position: newKw.position ? parseInt(newKw.position) : null,
      volume: newKw.volume ? parseInt(newKw.volume) : 0,
      difficulty: parseInt(newKw.difficulty) || 50,
      trend: "stable",
      lastChecked: new Date().toISOString(),
      url: "/",
      intent: newKw.intent,
    }
    const updated = [...keywords, kw]
    setKeywords(updated)
    saveKeywords(updated)
    setNewKw({ term: "", position: "", volume: "", difficulty: "50", intent: "transactional" })
    setAddingKw(false)
    toast({ title: "تمت إضافة الكلمة المفتاحية ✅" })
  }

  function removeKeyword(id: string) {
    const updated = keywords.filter(k => k.id !== id)
    setKeywords(updated)
    saveKeywords(updated)
  }

  function updatePosition(id: string, pos: string) {
    const updated = keywords.map(k => k.id === id ? { ...k, position: pos ? parseInt(pos) : null, lastChecked: new Date().toISOString() } : k)
    setKeywords(updated)
    saveKeywords(updated)
  }

  async function saveSitemapToRoot() {
    setGeneratingSitemap(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/sitemap/save`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "فشل حفظ الخريطة")
      }
      const data = await res.json()
      toast({
        title: `✅ تم حفظ خريطة الموقع`,
        description: `${data.summary.totalUrls} رابط (${data.summary.staticPages} ثابت + ${data.summary.servicePages} خدمة + ${data.summary.seoPages || 0} صفحة SEO) — ${data.summary.savedTo}`,
      })
    } catch (e: any) {
      toast({ title: "خطأ في الحفظ", description: e.message, variant: "destructive" })
    } finally {
      setGeneratingSitemap(false)
    }
  }

  async function saveMeta() {
    setSavingMeta(true)
    try {
      await fetch(`${API_BASE}/api/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: JSON.stringify({
          seo_meta_title: meta.title,
          seo_meta_description: meta.description,
          seo_meta_keywords: meta.keywords,
        }),
      })
      setMetaDirty(false)
      toast({ title: "تم حفظ البيانات الوصفية ✅" })
    } catch {
      toast({ variant: "destructive", title: "فشل في الحفظ" })
    } finally {
      setSavingMeta(false)
    }
  }

  const sortedKeywords = [...keywords].sort((a, b) => {
    const av = a[kwSort.field] ?? 9999
    const bv = b[kwSort.field] ?? 9999
    if (kwSort.dir === "asc") return (av as number) > (bv as number) ? 1 : -1
    return (av as number) < (bv as number) ? 1 : -1
  })

  function sortBy(field: keyof Keyword) {
    setKwSort(s => ({ field, dir: s.field === field && s.dir === "asc" ? "desc" : "asc" }))
  }

  const SortIcon = ({ field }: { field: keyof Keyword }) => {
    if (kwSort.field !== field) return <Minus size={10} className="text-gray-400" />
    return kwSort.dir === "asc" ? <ArrowUp size={10} className="text-primary" /> : <ArrowDown size={10} className="text-primary" />
  }

  // Tech checks summary
  const techErrors = TECHNICAL_CHECKS.filter(c => c.status === "error").length
  const techWarnings = TECHNICAL_CHECKS.filter(c => c.status === "warning").length

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Search size={24} className="text-primary" />
            إدارة السيو SEO
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">لوحة تحكم شاملة لتحسين محركات البحث</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <Clock size={13} />
          آخر فحص: {new Date().toLocaleDateString("ar-SA")}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1.5 rounded-2xl overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">

        {/* ════════════ OVERVIEW ════════════ */}
        {activeTab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-6">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Score */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center gap-3">
                <h3 className="font-bold text-gray-700 text-sm self-start flex items-center gap-1.5">
                  <Star size={15} className="text-amber-500" /> نقاط السيو
                </h3>
                <ScoreGauge score={Math.min(seoScore, 100)} />
                <div className="w-full grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-50 rounded-xl p-2">
                    <p className="font-black text-green-700">{techOk}</p>
                    <p className="text-[10px] text-green-600">اجتاز</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-2">
                    <p className="font-black text-amber-700">{techWarnings}</p>
                    <p className="text-[10px] text-amber-600">تحذير</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-2">
                    <p className="font-black text-red-700">{techErrors}</p>
                    <p className="text-[10px] text-red-600">خطأ</p>
                  </div>
                </div>
              </div>

              {/* Keyword stats */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-700 text-sm mb-4 flex items-center gap-1.5">
                  <Search size={15} className="text-primary" /> إحصاءات الكلمات
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "كلمات مُتتبَّعة",   value: keywords.length,        icon: BookOpen,   color: "text-primary" },
                    { label: "كلمات المدونة",      value: totalUniqueBlogKws,     icon: FileText,   color: "text-indigo-600" },
                    { label: "في Top 3",            value: top3,                   icon: Target,     color: "text-green-600" },
                    { label: "في Top 10",            value: top10,                  icon: Globe,      color: "text-blue-600" },
                    { label: "متوسط الترتيب",        value: avgPos ?? "—",          icon: BarChart2,  color: "text-purple-600" },
                    { label: "كلمات صاعدة",          value: trending,               icon: TrendingUp, color: "text-emerald-600" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className={color} />
                        <span className="text-sm text-gray-600">{label}</span>
                      </div>
                      <span className={`font-black text-lg ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-700 text-sm mb-4 flex items-center gap-1.5">
                  <Zap size={15} className="text-amber-500" /> إجراءات سريعة
                </h3>
                <div className="space-y-2">
                  {[
                    { label: "فحص Google Search Console", icon: ExternalLink, href: "https://search.google.com/search-console", color: "text-blue-600 border-blue-200 hover:bg-blue-50" },
                    { label: "اختبار الصفحة في Google",    icon: ExternalLink, href: `https://search.google.com/test/rich-results?url=${encodeURIComponent(`${currentOrigin()}/`)}`, color: "text-green-600 border-green-200 hover:bg-green-50" },
                    { label: "اختبار سرعة PageSpeed",      icon: ExternalLink, href: `https://pagespeed.web.dev/report?url=${encodeURIComponent(`${currentOrigin()}/`)}`, color: "text-orange-600 border-orange-200 hover:bg-orange-50" },
                    { label: "فحص Schema.org",             icon: ExternalLink, href: `https://validator.schema.org/#url=${encodeURIComponent(`${currentOrigin()}/`)}`, color: "text-purple-600 border-purple-200 hover:bg-purple-50" },
                  ].map((a) => (
                    <a key={a.label} href={a.href} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${a.color}`}>
                      <span>{a.label}</span>
                      <a.icon size={14} />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Shield size={16} className="text-primary" /> صحة SEO الفعلية
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    مؤشرات محسوبة من مخرجات الإنتاج، وليست أرقامًا ثابتة
                  </p>
                </div>
                <span className="text-[11px] text-gray-400">
                  {loadingSeoHealth ? "جاري الفحص..." : seoHealth?.source || "المصدر غير متاح"}
                </span>
              </div>

              {seoHealthError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  تعذر التحقق من المؤشرات: {seoHealthError}
                </div>
              ) : loadingSeoHealth ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-24 rounded-xl bg-gray-50 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {(seoHealth?.metrics ?? []).map(item => (
                    <div key={item.key} className={`rounded-xl border p-3.5 ${seoMetricStatusClass(item.status)}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <SeoMetricIcon status={item.status} />
                          <p className="font-bold text-sm truncate">{item.label}</p>
                        </div>
                        <span className="text-[10px] font-black whitespace-nowrap">{seoMetricStatusLabel(item.status)}</span>
                      </div>
                      <p className="text-xl font-black mt-3" dir="ltr">{item.value}</p>
                      <p className="text-[11px] mt-1 leading-relaxed opacity-80">{item.detail}</p>
                      {item.key === "structured_data" && item.entities && item.entities.length > 0 && (
                        <p className="text-[10px] mt-2 leading-relaxed opacity-70">{item.entities.join(" · ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Target size={16} className="text-primary" /> توصيات التحسين
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { priority: "high",   icon: "🔑", text: "أضف المزيد من الكلمات المفتاحية Long-tail (3+ كلمات) لزيادة الظهور في نتائج التفصيل" },
                  { priority: "high",   icon: "📝", text: "تأكد من وجود H1 يحتوي الكلمة المفتاحية الرئيسية في كل قسم من الصفحة الرئيسية" },
                  { priority: "medium", icon: "🖼️", text: "أضف alt text وصفياً لجميع صور السلايدر والحاويات لتحسين Image Search" },
                  { priority: "medium", icon: "🔗", text: "أضف روابط داخلية تربط بين الأقسام المختلفة لتحسين Crawl Budget" },
                  { priority: "low",    icon: "📍", text: "أضف صفحات خدمة لكل حي من أحياء الرياض لاستهداف البحث الجغرافي المحلي" },
                  { priority: "low",    icon: "⭐", text: "اطلب من العملاء المراجعات على Google My Business لزيادة Local SEO" },
                ].map((r, i) => (
                  <div key={i} className={`flex gap-3 p-3.5 rounded-xl border text-sm ${
                    r.priority === "high" ? "bg-red-50 border-red-100" :
                    r.priority === "medium" ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"
                  }`}>
                    <span className="text-base shrink-0 mt-0.5">{r.icon}</span>
                    <p className="text-gray-700 leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════ KEYWORDS ════════════ */}
        {activeTab === "keywords" && (
          <motion.div key="keywords" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">

            {/* Header bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{keywords.length} كلمة مفتاحية</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{top10} في Top 10</span>
              </div>
              <Button onClick={() => setAddingKw(v => !v)} size="sm"
                className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2">
                <Plus size={14} /> إضافة كلمة
              </Button>
            </div>

            {/* Add form */}
            <AnimatePresence>
              {addingKw && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden">
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                    <h4 className="font-bold text-primary text-sm mb-3">إضافة كلمة مفتاحية جديدة</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div className="md:col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">الكلمة المفتاحية *</label>
                        <Input value={newKw.term} onChange={e => setNewKw(k => ({ ...k, term: e.target.value }))}
                          placeholder="مثال: تأجير حاويات الرياض" className="h-10 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">الترتيب الحالي</label>
                        <Input value={newKw.position} onChange={e => setNewKw(k => ({ ...k, position: e.target.value }))}
                          type="number" placeholder="مثال: 5" className="h-10 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">الحجم الشهري</label>
                        <Input value={newKw.volume} onChange={e => setNewKw(k => ({ ...k, volume: e.target.value }))}
                          type="number" placeholder="مثال: 1200" className="h-10 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">الصعوبة (0-100): {newKw.difficulty}</label>
                        <input type="range" min="0" max="100" value={newKw.difficulty}
                          onChange={e => setNewKw(k => ({ ...k, difficulty: e.target.value }))}
                          className="w-full accent-primary" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">نية البحث</label>
                        <select value={newKw.intent} onChange={e => setNewKw(k => ({ ...k, intent: e.target.value as Keyword["intent"] }))}
                          className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:border-primary/40">
                          <option value="transactional">تجاري (Transactional)</option>
                          <option value="commercial">بحثي (Commercial)</option>
                          <option value="informational">معلوماتي (Informational)</option>
                          <option value="navigational">توجيهي (Navigational)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={addKeyword} size="sm" className="bg-primary text-white rounded-xl">حفظ</Button>
                      <Button onClick={() => setAddingKw(false)} size="sm" variant="outline" className="rounded-xl">إلغاء</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tracked Keywords Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Target size={14} className="text-primary" /> كلمات مُتتبَّعة ({keywords.length})
                </h4>
                <span className="text-xs text-gray-400">ترتيب، حجم، صعوبة قابلة للتعديل</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" dir="rtl">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs font-bold border-b border-gray-100">
                      <th className="px-4 py-3 text-right">الكلمة المفتاحية</th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => sortBy("position")}>
                        <span className="flex items-center justify-center gap-1">الترتيب <SortIcon field="position" /></span>
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => sortBy("volume")}>
                        <span className="flex items-center justify-center gap-1">الحجم <SortIcon field="volume" /></span>
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => sortBy("difficulty")}>
                        <span className="flex items-center justify-center gap-1">الصعوبة <SortIcon field="difficulty" /></span>
                      </th>
                      <th className="px-3 py-3 text-center">الاتجاه</th>
                      <th className="px-3 py-3 text-center">النية</th>
                      <th className="px-3 py-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedKeywords.map((kw, i) => (
                      <tr key={kw.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 text-sm">{kw.term}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{kw.url}</p>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {positionBadge(kw.position)}
                            <input
                              type="number" min="1" max="200"
                              defaultValue={kw.position ?? ""}
                              onBlur={e => updatePosition(kw.id, e.target.value)}
                              className="w-14 text-center text-xs border border-gray-200 rounded-lg px-1 py-0.5 focus:outline-none focus:border-primary/40"
                              placeholder="—"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-bold text-gray-700">{volumeLabel(kw.volume)}</span>
                          <p className="text-[10px] text-gray-400">شهرياً</p>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`font-bold text-sm ${difficultyColor(kw.difficulty)}`}>{kw.difficulty}</span>
                            <span className={`text-[10px] ${difficultyColor(kw.difficulty)}`}>{difficultyLabel(kw.difficulty)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {kw.trend === "up"     ? <TrendingUp size={16} className="text-green-500 mx-auto" /> :
                           kw.trend === "down"   ? <TrendingDown size={16} className="text-red-500 mx-auto" /> :
                                                   <Minus size={16} className="text-gray-400 mx-auto" />}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${INTENT_LABELS[kw.intent]?.color}`}>
                            {INTENT_LABELS[kw.intent]?.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button onClick={() => removeKeyword(kw.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Blog Keywords Section ── */}
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-indigo-100 bg-indigo-50/40 flex items-center justify-between gap-3 flex-wrap">
                <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                  <BookOpen size={14} className="text-indigo-500" />
                  كلمات مفتاحية من المدونة
                  {loadingBlogKw
                    ? <Loader2 size={13} className="animate-spin text-indigo-400" />
                    : <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{blogKeywords.length}</span>
                  }
                </h4>
                <input
                  type="text"
                  value={blogKwFilter}
                  onChange={e => setBlogKwFilter(e.target.value)}
                  placeholder="ابحث في كلمات المدونة..."
                  className="h-8 px-3 text-xs rounded-xl border border-indigo-200 bg-white outline-none focus:border-indigo-400 w-52"
                />
              </div>

              {loadingBlogKw ? (
                <div className="flex items-center justify-center py-10 gap-2 text-indigo-400">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">جاري تحميل كلمات المدونة...</span>
                </div>
              ) : blogKeywords.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  لا توجد كلمات مفتاحية في المدونة بعد
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {blogKeywords
                      .filter(bk => !blogKwFilter.trim() || bk.term.includes(blogKwFilter.trim()))
                      .map((bk, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: Math.min(i * 0.01, 0.3) }}
                          title={`من: ${bk.postTitle}`}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-default select-none ${
                            bk.source === "seo"
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : "bg-indigo-50 border-indigo-200 text-indigo-700"
                          }`}
                        >
                          {bk.source === "seo" ? <Target size={10} /> : <BookOpen size={10} />}
                          {bk.term}
                        </motion.div>
                      ))
                    }
                  </div>
                  <p className="text-xs text-gray-400 mt-3 flex items-center gap-3">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-200 inline-block" /> وسم (Tag)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-200 inline-block" /> كلمة SEO للمقالة</span>
                    <span className="mr-auto">مجموع: {blogKeywords.length} كلمة فريدة من {new Set(blogKeywords.map(b => b.postSlug)).size} مقالة</span>
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════════════ META TAGS ════════════ */}
        {activeTab === "meta" && (
          <motion.div key="meta" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-5 max-w-3xl">

            {/* Google Preview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Eye size={16} className="text-primary" /> معاينة نتيجة البحث في جوجل
              </h3>
              <div className="bg-white border border-gray-200 rounded-xl p-5 font-sans" dir="ltr">
                <p className="text-[13px] text-gray-500 mb-1">{currentOrigin()} › الرئيسية</p>
                <p className="text-[18px] text-blue-700 hover:underline cursor-pointer font-medium leading-snug mb-1 line-clamp-1">
                  {meta.title || "العنوان غير محدد"}
                </p>
                <p className="text-[13px] text-gray-700 leading-relaxed line-clamp-2">
                  {meta.description || "الوصف غير محدد"}
                </p>
              </div>
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span className={`font-medium ${meta.title.length >= 50 && meta.title.length <= 60 ? "text-green-600" : meta.title.length > 60 ? "text-red-500" : "text-amber-500"}`}>
                  العنوان: {meta.title.length} / 60 حرف
                </span>
                <span className={`font-medium ${meta.description.length >= 120 && meta.description.length <= 160 ? "text-green-600" : meta.description.length > 160 ? "text-red-500" : "text-amber-500"}`}>
                  الوصف: {meta.description.length} / 160 حرف
                </span>
              </div>
            </div>

            {/* Fields */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Edit2 size={16} className="text-primary" /> تحرير البيانات الوصفية
                </h3>
                <Button
                  variant="default" size="sm"
                  onClick={generateMetaWithAI}
                  disabled={aiGenerating}
                  className="gap-2 h-9"
                >
                  {aiGenerating
                    ? <><Loader2 size={14} className="animate-spin" /> جاري التوليد...</>
                    : <>✨ توليد بالذكاء الاصطناعي</>}
                </Button>
              </div>

              {[
                { key: "title",          label: "عنوان الصفحة (Title)",            max: 60,  ph: `${companyName} | تأجير حاويات بالرياض` },
                { key: "description",    label: "وصف الصفحة (Meta Description)",   max: 160, ph: "متخصصون في تأجير حاويات الأنقاض ونقل المخلفات بالرياض..." },
                { key: "keywords",       label: "الكلمات المفتاحية (Keywords)",     max: 0,   ph: "كلمة1, كلمة2, كلمة3" },
                { key: "canonicalUrl",   label: "الرابط الأساسي (Canonical URL)",  max: 0,   ph: "اتركه / ليُستخدم النطاق الحالي" },
                { key: "ogTitle",        label: "عنوان Open Graph (OG:Title)",      max: 90,  ph: `${companyName} | WhatsApp, Facebook` },
                { key: "ogDescription", label: "وصف Open Graph (OG:Description)",  max: 200, ph: "يظهر عند مشاركة الموقع على وسائل التواصل..." },
              ].map(({ key, label, max, ph }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
                  {key === "description" || key === "ogDescription" ? (
                    <textarea
                      value={meta[key as keyof SeoMeta]}
                      onChange={e => { setMeta(m => ({ ...m, [key]: e.target.value })); setMetaDirty(true) }}
                      rows={3}
                      placeholder={ph}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 resize-none"
                    />
                  ) : (
                    <Input
                      value={meta[key as keyof SeoMeta]}
                      onChange={e => { setMeta(m => ({ ...m, [key]: e.target.value })); setMetaDirty(true) }}
                      placeholder={ph}
                      className="h-11 bg-gray-50 border-gray-200 text-sm"
                    />
                  )}
                  {max > 0 && (
                    <p className={`text-xs mt-1 ${meta[key as keyof SeoMeta].length > max ? "text-red-500" : "text-gray-400"}`}>
                      {meta[key as keyof SeoMeta].length} / {max} حرف
                    </p>
                  )}
                </div>
              ))}

              {metaDirty && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Button onClick={saveMeta} disabled={savingMeta}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl gap-2">
                    {savingMeta ? <><RefreshCw size={16} className="animate-spin" /> جاري الحفظ...</> : <><Save size={16} /> حفظ البيانات الوصفية</>}
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════════════ TECHNICAL ════════════ */}
        {activeTab === "technical" && (
          <motion.div key="technical" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">

            <div className="grid grid-cols-3 gap-4 mb-2">
              {[
                { count: techOk,       label: "اجتاز",   color: "bg-green-100 text-green-700 border-green-200" },
                { count: techWarnings, label: "تحذير",   color: "bg-amber-100 text-amber-700 border-amber-200" },
                { count: techErrors,   label: "خطأ",     color: "bg-red-100 text-red-700 border-red-200" },
              ].map(({ count, label, color }) => (
                <div key={label} className={`rounded-2xl border p-4 text-center ${color}`}>
                  <p className="text-3xl font-black">{count}</p>
                  <p className="text-sm font-medium mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800">قائمة الفحص التقني</h3>
                <span className="text-xs text-gray-500">{techOk}/{techTotal} اجتاز</span>
              </div>
              <div className="p-4 space-y-2">
                {TECHNICAL_CHECKS.map((check) => (
                  <div key={check.id}>
                    <CheckItem check={check} onExpand={() => setExpandedCheck(expandedCheck === check.id ? null : check.id)} />
                    <AnimatePresence>
                      {expandedCheck === check.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden">
                          <div className={`mx-1 px-5 py-3 rounded-b-xl text-sm text-gray-600 border border-t-0 ${
                            check.status === "ok" ? "bg-green-50 border-green-100" :
                            check.status === "warning" ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"
                          }`}>
                            <div className="flex items-start gap-2">
                              <Info size={14} className="shrink-0 mt-0.5 text-gray-400" />
                              <p className="leading-relaxed">{check.detail}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════ SITEMAP ════════════ */}
        {activeTab === "sitemap" && (
          <motion.div key="sitemap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">

            {/* Header row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-gray-500">{SITEMAP_URLS.length} صفحة ثابتة + صفحات الخدمات + مقالات المدونة</p>
                <p className="text-xs text-gray-400 mt-0.5">ولّد الخريطة من البيانات الحالية وارفعها مع ملفات الموقع</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:border-primary hover:text-primary transition-all">
                  <ExternalLink size={14} /> عرض الحالي
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-2"
                  onClick={saveSitemapToRoot}
                  disabled={generatingSitemap}
                >
                  {generatingSitemap
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Download size={13} />}
                  حفظ sitemap.xml
                </Button>
              </div>
            </div>

            {/* Info banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700 flex items-start gap-3">
              <Info size={16} className="shrink-0 mt-0.5 text-amber-500" />
              <div>
                <p className="font-bold mb-1">كيف يعمل التوليد؟</p>
                <ul className="space-y-1 text-xs text-amber-600 list-disc mr-4">
                  <li>يضم الصفحات الثابتة (الرئيسية، الخدمات، التواصل...)</li>
                  <li>يضيف صفحة مستقلة لكل خدمة مُفعَّل لها السيو وبها slug</li>
                  <li>يضيف صفحة <code className="bg-amber-100 px-1 rounded">/blog</code> + صفحة مستقلة لكل مقالة منشورة في المدونة</li>
                  <li>يحدّث تاريخ التعديل تلقائياً إلى اليوم</li>
                  <li>يُحفظ مباشرة في <code className="bg-amber-100 px-1 rounded">public/sitemap.xml</code> — يمكنه ملاحظته فوراً</li>
                </ul>
              </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
              <table className="w-full min-w-[36rem] text-sm" dir="rtl">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs font-bold border-b border-gray-100">
                    <th className="px-5 py-3 text-right">الرابط</th>
                    <th className="px-3 py-3 text-center">القسم</th>
                    <th className="px-4 py-3 text-center">الأولوية</th>
                    <th className="px-4 py-3 text-center">التكرار</th>
                    <th className="px-4 py-3 text-center">الصور</th>
                    <th className="px-4 py-3 text-center">آخر تعديل</th>
                  </tr>
                </thead>
                <tbody>
                  {SITEMAP_URLS.map((u, i) => {
                    const priority = parseFloat(u.priority)
                    const pColor = priority >= 0.9 ? "bg-green-100 text-green-700" : priority >= 0.7 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <a href={u.url} target="_blank" rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 text-xs">
                            <Link2 size={11} />
                            <span dir="ltr">{u.url}</span>
                          </a>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-[11px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                            {u.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pColor}`}>{u.priority}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-600">{u.freq}</td>
                        <td className="px-4 py-3 text-center text-xs text-gray-600">{u.images > 0 ? `${u.images} 🖼️` : "—"}</td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">{u.lastmod}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700 flex items-start gap-3">
              <Info size={16} className="shrink-0 mt-0.5 text-blue-500" />
              <div>
                <p className="font-bold mb-1">كيفية تقديم Sitemap لجوجل</p>
                <ol className="space-y-1 text-xs list-decimal mr-4 text-blue-600">
                  <li>افتح Google Search Console وأضف الموقع</li>
                  <li>اذهب لـ "Sitemaps" في القائمة الجانبية</li>
                  <li>أدخل: <code className="bg-blue-100 px-1 rounded" dir="ltr">/sitemap.xml</code></li>
                  <li>اضغط "Submit" وانتظر اكتمال الزحف</li>
                </ol>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════ SCHEMA ════════════ */}
        {activeTab === "schema" && (
          <motion.div key="schema" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SCHEMAS.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{s.icon}</span>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{s.type}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.note}</p>
                      </div>
                    </div>
                    <CheckCircle size={20} className="text-green-500 shrink-0" />
                  </div>
                  <div className="flex gap-2">
                    <a href={`https://validator.schema.org/#url=${encodeURIComponent(`${currentOrigin()}/`)}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      <ExternalLink size={11} /> فحص
                    </a>
                    <a href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(`${currentOrigin()}/`)}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                      <ExternalLink size={11} /> اختبار جوجل
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Code size={16} className="text-primary" /> أنواع Schema الموصى بها لخدمات الحاويات ونقل المخلفات
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { type: "Product",     desc: "لكل مقاس حاوية مع السعر",         status: "recommended" },
                  { type: "Review",      desc: "لآراء العملاء الفردية",           status: "recommended" },
                  { type: "VideoObject", desc: "لمقاطع الفيديو التوضيحية",       status: "optional" },
                  { type: "Event",       desc: "للعروض والتخفيضات الموسمية",      status: "optional" },
                  { type: "Article",     desc: "للمدونة والمقالات الإعلامية",     status: "optional" },
                  { type: "HowTo",       desc: "لشرح كيفية طلب الخدمة",          status: "recommended" },
                ].map((item, i) => (
                  <div key={i} className={`p-3.5 rounded-xl border text-sm ${
                    item.status === "recommended" ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                  }`}>
                    <p className="font-bold text-gray-900 flex items-center gap-2">
                      {item.type}
                      {item.status === "recommended" && (
                        <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">موصى به</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════ AI SUGGESTIONS ════════════ */}
        {activeTab === "ai-suggestions" && (
          <motion.div key="ai-suggestions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-5">

            {/* Header */}
            <div className="bg-gradient-to-l from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                    <Sparkles size={18} className="text-purple-500" />
                    تحليل وتحسين SEO بالذكاء الاصطناعي
                  </h3>
                  <p className="text-sm text-gray-600">يحلل الذكاء الاصطناعي البيانات الوصفية الحالية ويقترح تحسينات جاهزة للتطبيق بنقرة واحدة</p>
                </div>
                <Button
                  onClick={analyzeSEOWithAI}
                  disabled={analyzingAI}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2 shrink-0"
                >
                  {analyzingAI
                    ? <><Loader2 size={15} className="animate-spin" /> جاري التحليل...</>
                    : <><Play size={15} /> تحليل الآن</>}
                </Button>
              </div>
            </div>

            {/* Not analyzed yet */}
            {!aiAnalyzed && !analyzingAI && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <Sparkles size={40} className="text-purple-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-600 mb-1">لم يتم التحليل بعد</p>
                <p className="text-sm text-gray-400">اضغط "تحليل الآن" للحصول على اقتراحات تحسين من الذكاء الاصطناعي</p>
              </div>
            )}

            {/* Loading */}
            {analyzingAI && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <Loader2 size={40} className="text-purple-400 mx-auto mb-3 animate-spin" />
                <p className="font-semibold text-gray-600">جاري تحليل البيانات الوصفية...</p>
                <p className="text-sm text-gray-400 mt-1">قد يستغرق هذا لحظة</p>
              </div>
            )}

            {/* Suggestions list */}
            {aiAnalyzed && !analyzingAI && (
              <div className="space-y-3">
                {aiSuggestions.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                    <CheckCircle size={36} className="text-green-500 mx-auto mb-2" />
                    <p className="font-bold text-green-700">لا توجد مشكلات!</p>
                    <p className="text-sm text-green-600 mt-1">البيانات الوصفية الحالية في حالة جيدة</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">{aiSuggestions.length} اقتراح تحسين</p>
                      <div className="flex gap-2">
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                          {aiSuggestions.filter(s => s.impact === "high").length} عالي
                        </span>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                          {aiSuggestions.filter(s => s.impact === "medium").length} متوسط
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                          {aiSuggestions.filter(s => s.impact === "low").length} منخفض
                        </span>
                      </div>
                    </div>

                    {aiSuggestions.map((s, i) => {
                      const impactColor = s.impact === "high"
                        ? "bg-red-50 border-red-100"
                        : s.impact === "medium"
                        ? "bg-amber-50 border-amber-100"
                        : "bg-gray-50 border-gray-100"
                      const badgeColor = s.impact === "high"
                        ? "bg-red-100 text-red-700"
                        : s.impact === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                      const impactLabel = s.impact === "high" ? "تأثير عالي" : s.impact === "medium" ? "تأثير متوسط" : "تأثير منخفض"

                      const fieldLabels: Record<string, string> = {
                        title: "العنوان", description: "الوصف", keywords: "الكلمات المفتاحية",
                        ogTitle: "OG Title", ogDescription: "OG Description", canonicalUrl: "Canonical URL",
                      }

                      return (
                        <motion.div key={i}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                          className={`rounded-2xl border p-5 ${impactColor} ${s.applied ? "opacity-60" : ""}`}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{impactLabel}</span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                {fieldLabels[s.field] ?? s.field}
                              </span>
                              {s.applied && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                  <Check size={10} /> تم التطبيق
                                </span>
                              )}
                            </div>
                            {!s.applied && (
                              <Button
                                size="sm"
                                onClick={() => applySuggestion(s)}
                                className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs h-8 gap-1 shrink-0"
                              >
                                <Check size={12} /> تطبيق
                              </Button>
                            )}
                          </div>
                          <p className="font-semibold text-gray-900 text-sm mb-2">{s.issue}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="bg-white/70 rounded-xl p-3">
                              <p className="font-bold text-gray-500 mb-1">الحالي</p>
                              <p className="text-gray-700 leading-relaxed line-clamp-2">{s.current || "—"}</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-green-100">
                              <p className="font-bold text-green-600 mb-1">المقترح</p>
                              <p className="text-gray-800 leading-relaxed">{s.suggestion}</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <Info size={11} /> {s.reason}
                          </p>
                        </motion.div>
                      )
                    })}

                    {aiSuggestions.some(s => !s.applied) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700 flex items-start gap-3">
                        <Info size={15} className="shrink-0 mt-0.5 text-blue-500" />
                        <p>بعد تطبيق الاقتراحات، انتقل إلى تبويب <strong>البيانات الوصفية</strong> واحفظ التغييرات</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ════════════ AI ENGINE COMPATIBILITY ════════════ */}
        {activeTab === "ai-compat" && (
          <motion.div key="ai-compat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-5">

            {/* Header */}
            <div className="bg-gradient-to-l from-cyan-50 to-emerald-50 border border-cyan-100 rounded-2xl p-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                <Bot size={18} className="text-cyan-500" />
                التوافق مع محركات الذكاء الاصطناعي (GEO)
              </h3>
              <p className="text-sm text-gray-600">
                Generative Engine Optimization — تهيئة الموقع ليظهر في إجابات ChatGPT وGemini وPerplexity
              </p>
            </div>

            {/* AI Crawlers Status */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Shield size={16} className="text-green-500" /> حالة زاحفات الذكاء الاصطناعي في robots.txt
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: "GPTBot",         company: "ChatGPT / OpenAI",  status: "allowed", color: "bg-green-50 border-green-200 text-green-700" },
                  { name: "Google-Extended", company: "Google Gemini",     status: "allowed", color: "bg-green-50 border-green-200 text-green-700" },
                  { name: "PerplexityBot",  company: "Perplexity AI",     status: "allowed", color: "bg-green-50 border-green-200 text-green-700" },
                  { name: "ClaudeBot",      company: "Anthropic Claude",  status: "allowed", color: "bg-green-50 border-green-200 text-green-700" },
                  { name: "OAI-SearchBot",  company: "OpenAI Search",     status: "allowed", color: "bg-green-50 border-green-200 text-green-700" },
                  { name: "Bytespider",     company: "TikTok (ByteDance)", status: "blocked", color: "bg-red-50 border-red-200 text-red-700" },
                ].map((bot) => (
                  <div key={bot.name} className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium ${bot.color}`}>
                    <div>
                      <p className="font-bold" dir="ltr">{bot.name}</p>
                      <p className="text-xs opacity-75">{bot.company}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {bot.status === "allowed"
                        ? <><CheckCircle size={15} /> مسموح</>
                        : <><XCircle size={15} /> محظور</>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle size={16} className="text-primary" /> قائمة توافق GEO
              </h4>
              <div className="space-y-2">
                {[
                  { ok: true,  label: "robots.txt يسمح لزاحفات AI",       detail: "GPTBot و PerplexityBot و ClaudeBot و Google-Extended مسموح لها" },
                  { ok: true,  label: "ملف llms.txt موجود",                detail: "يساعد نماذج اللغة على فهم الموقع وخدماته بشكل منظم" },
                  { ok: true,  label: "بيانات Schema منظمة",              detail: "LocalBusiness + FAQPage + Service schemas مثبتة" },
                  { ok: true,  label: "أسئلة شائعة (FAQPage Schema)",     detail: "تساعد في الظهور كإجابات مباشرة في ChatGPT وPerplexity" },
                  { ok: true,  label: "Open Graph Tags",                   detail: "og:title وog:description وog:image موجودة" },
                  { ok: true,  label: "محتوى واضح ومنظم",                  detail: "العناوين والفقرات منظمة بـ H1/H2/H3 لسهولة استخراج المعلومات" },
                  { ok: true,  label: "sitemap.xml محدّث",                 detail: "يساعد الزاحفات على اكتشاف المحتوى بكفاءة" },
                  { ok: false, label: "ملف ai.txt (اختياري)",              detail: "ملف مقترح لتوضيح سياسة استخدام الذكاء الاصطناعي — غير موجود بعد" },
                ].map((item, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm ${
                    item.ok ? "bg-green-50/50 border-green-100" : "bg-gray-50 border-gray-200"
                  }`}>
                    {item.ok
                      ? <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                      : <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-semibold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* llms.txt Generator */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                  <FileCode2 size={16} className="text-primary" /> ملف llms.txt
                </h4>
                <div className="flex gap-2">
                  <a href="/llms.txt" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-xl hover:border-primary hover:text-primary transition-all">
                    <ExternalLink size={12} /> عرض الحالي
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateLlmsTxt}
                    disabled={generatingLlms}
                    className="rounded-xl gap-2 text-xs"
                  >
                    {generatingLlms
                      ? <><Loader2 size={12} className="animate-spin" /> جاري التوليد...</>
                      : <><Sparkles size={12} /> توليد بالذكاء الاصطناعي</>}
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveLlmsTxt}
                    disabled={savingLlms || !llmsContent.trim()}
                    className="rounded-xl gap-2 text-xs bg-primary hover:bg-primary/90 text-white"
                  >
                    {savingLlms
                      ? <><Loader2 size={12} className="animate-spin" /> حفظ...</>
                      : <><Save size={12} /> حفظ</>}
                  </Button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 p-1">
                <textarea
                  value={llmsContent}
                  onChange={e => setLlmsContent(e.target.value)}
                  rows={14}
                  dir="rtl"
                  className="w-full bg-transparent px-3 py-2 text-xs font-mono text-gray-800 outline-none resize-none leading-relaxed"
                  placeholder="اضغط 'توليد بالذكاء الاصطناعي' لإنشاء محتوى llms.txt تلقائياً، أو اكتب المحتوى يدوياً..."
                />
              </div>
              <p className="text-xs text-gray-400 mt-2 flex items-start gap-1.5">
                <Info size={11} className="shrink-0 mt-0.5" />
                ملف llms.txt يوجد على <code className="bg-gray-100 px-1 rounded" dir="ltr">/llms.txt</code> ويساعد ChatGPT وGemini وPerplexity على فهم الموقع وخدماته
              </p>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
              <p className="font-bold mb-2 flex items-center gap-2"><Info size={14} /> نصائح للظهور في محركات الذكاء الاصطناعي</p>
              <ul className="space-y-1.5 text-xs text-blue-600 list-disc mr-5">
                <li>اكتب محتوى يجيب على أسئلة المستخدمين بشكل مباشر وواضح</li>
                <li>استخدم FAQPage Schema للأسئلة والأجوبة — تُستخرج مباشرة في ChatGPT</li>
                <li>اذكر الموقع الجغرافي والتخصص بوضوح في كل صفحة</li>
                <li>تأكد من ذكر اسم الشركة وخدماتها في المحتوى النصي المرئي</li>
                <li>حدّث llms.txt كلما أضفت خدمة جديدة أو تغيرت معلومات الاتصال</li>
              </ul>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
