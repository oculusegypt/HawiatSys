import { useEffect, useMemo, useState } from "react"
import { Code2, Eye, FileJson, Loader2, Plus, Save, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
const token = () => localStorage.getItem("admin_token") || ""
const SCHEMA_TYPES = [
  "FAQPage", "Article", "LocalBusiness", "Service", "BreadcrumbList",
  "WebPage", "Organization", "ImageObject", "JobPosting", "Product",
  "Review", "AggregateRating",
] as const
type SchemaType = typeof SCHEMA_TYPES[number]
type FaqItem = { question: string; answer: string; enabled: boolean }
type RecordItem = {
  id: number; scopePath: string; schemaType: SchemaType; title: string;
  description: string; payload: Record<string, any>; isActive: boolean; sortOrder: number
}

const EMPTY: Omit<RecordItem, "id"> = {
  scopePath: "/", schemaType: "FAQPage", title: "الأسئلة الشائعة",
  description: "", payload: { items: [{ question: "", answer: "", enabled: true }] },
  isActive: true, sortOrder: 0,
}

function message(data: any, fallback: string) {
  return typeof data?.error === "string" ? data.error : fallback
}

function parseJson(value: string) {
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error()
    return parsed
  } catch {
    return null
  }
}

export default function StructuredContent() {
  const { toast } = useToast()
  const [records, setRecords] = useState<RecordItem[]>([])
  const [editing, setEditing] = useState<RecordItem | "new" | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [jsonPayload, setJsonPayload] = useState("{}")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [debugPath, setDebugPath] = useState("/")
  const [debug, setDebug] = useState<any>(null)

  async function load() {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/admin/structured-content`, { headers: { Authorization: `Bearer ${token()}` } })
      const data = await response.json()
      if (!response.ok) throw new Error(message(data, "تعذر تحميل المحتوى المنظم"))
      setRecords(Array.isArray(data) ? data : [])
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "تعذر تحميل المحتوى", variant: "destructive" })
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const faqItems = useMemo<FaqItem[]>(() => Array.isArray(form.payload.items) ? form.payload.items : [], [form.payload])
  function openNew() {
    setEditing("new"); setForm({ ...EMPTY, payload: { items: [{ question: "", answer: "", enabled: true }] } }); setJsonPayload("{}")
  }
  function openEdit(item: RecordItem) {
    setEditing(item); setForm({ ...item, payload: item.payload || {} }); setJsonPayload(JSON.stringify(item.payload || {}, null, 2))
  }
  function close() { if (!saving) setEditing(null) }
  function updateFaq(index: number, key: keyof FaqItem, value: string | boolean) {
    const items = faqItems.map((item, i) => i === index ? { ...item, [key]: value } : item)
    setForm((current) => ({ ...current, payload: { ...current.payload, items } }))
  }
  function addFaq() {
    setForm((current) => ({ ...current, payload: { ...current.payload, items: [...faqItems, { question: "", answer: "", enabled: true }] } }))
  }
  function removeFaq(index: number) {
    setForm((current) => ({ ...current, payload: { ...current.payload, items: faqItems.filter((_, i) => i !== index) } }))
  }
  async function save() {
    let payload = form.payload
    if (form.schemaType !== "FAQPage") {
      const parsed = parseJson(jsonPayload)
      if (!parsed) { toast({ title: "حمولة JSON غير صالحة", variant: "destructive" }); return }
      payload = parsed
    } else {
      const items = faqItems.filter((item) => item.enabled !== false && item.question.trim() && item.answer.trim())
      if (!items.length) { toast({ title: "أضف سؤالاً وإجابة صالحة واحدة على الأقل", variant: "destructive" }); return }
      const duplicates = new Set<string>()
      for (const item of items) {
        const key = item.question.trim().toLocaleLowerCase("ar")
        if (duplicates.has(key)) { toast({ title: "لا يمكن تكرار السؤال نفسه", variant: "destructive" }); return }
        duplicates.add(key)
      }
      payload = { ...form.payload, items }
    }
    setSaving(true)
    try {
      const isNew = editing === "new"
      const url = `${API_BASE}/api/admin/structured-content${isNew ? "" : `/${(editing as RecordItem).id}`}`
      const response = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, payload }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(message(data, "تعذر حفظ العنصر"))
      toast({ title: "تم حفظ Structured Content" }); setEditing(null); await load()
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "تعذر الحفظ", variant: "destructive" })
    } finally { setSaving(false) }
  }
  async function remove(item: RecordItem) {
    if (!window.confirm(`حذف ${item.schemaType} من ${item.scopePath}؟`)) return
    await fetch(`${API_BASE}/api/admin/structured-content/${item.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } })
    await load()
  }
  async function runDebug() {
    const response = await fetch(`${API_BASE}/api/admin/structured-content/debug?path=${encodeURIComponent(debugPath)}`, { headers: { Authorization: `Bearer ${token()}` } })
    const data = await response.json()
    setDebug(data)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-l from-primary to-slate-900 p-6 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/60">SEO control center</p>
          <h1 className="text-2xl font-black">Structured Content</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/75">مصدر مركزي للـFAQ والـSchema، مع منع التكرار والتحقق قبل النشر.</p>
        </div>
        <Button onClick={openNew} className="gap-2 bg-white text-primary hover:bg-white/90"><Plus size={17} /> إضافة Schema</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[["العناصر", records.length], ["النشطة", records.filter((r) => r.isActive).length], ["FAQ", records.filter((r) => r.schemaType === "FAQPage").length]].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-primary">{value}</p></div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="font-black text-slate-900">فحص الصفحة</h2><p className="mt-1 text-xs text-slate-500">اعرض المصادر، العناصر المقبولة، وأسباب الحجب.</p></div>
          <div className="flex gap-2"><Input value={debugPath} onChange={(e) => setDebugPath(e.target.value)} className="w-48" placeholder="/services/..." /><Button variant="outline" onClick={() => void runDebug()} className="gap-2"><Eye size={15} /> Debug</Button></div>
        </div>
        {debug && <div className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">المهيأ: <b>{debug.totals.configured}</b></div><div className="rounded-xl bg-emerald-50 p-3 text-emerald-800">المضمّن: <b>{debug.totals.included}</b></div><div className={`rounded-xl p-3 ${debug.totals.issues ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>الملاحظات: <b>{debug.totals.issues}</b></div>
          <div className="md:col-span-3 space-y-2">{debug.debug.map((item: any) => <div key={item.source} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 p-3"><span><b>{item.schemaType}</b> <span className="text-xs text-slate-400">{item.source}</span></span><span className={item.included ? "text-emerald-600" : "text-amber-600"}>{item.included ? "مضمّن" : "محجوب"} {item.issues?.join("، ")}</span></div>)}</div>
        </div>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div> : records.length === 0 ? <div className="p-12 text-center text-slate-500"><FileJson className="mx-auto mb-3 text-slate-300" size={38} /><p className="font-bold">لا توجد عناصر مُدارة بعد</p><p className="mt-1 text-sm">ابدأ بإضافة FAQ مرتبطة بمسار الصفحة.</p></div> : <div className="divide-y divide-slate-100">{records.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="flex items-center gap-3"><div className={`rounded-xl p-3 ${item.isActive ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"}`}><Code2 size={18} /></div><div><div className="flex flex-wrap items-center gap-2"><b className="text-slate-900">{item.schemaType}</b><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{item.scopePath}</span>{!item.isActive && <span className="text-xs text-amber-600">معطّل</span>}</div><p className="mt-1 text-sm text-slate-500">{item.title || "بدون عنوان"} · ترتيب {item.sortOrder}</p></div></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => openEdit(item)}>تعديل</Button><Button variant="ghost" size="icon" onClick={() => void remove(item)} className="text-red-500"><Trash2 size={16} /></Button></div></div>)}</div>}
      </div>

      {editing && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 md:p-10"><div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl" dir="rtl"><div className="flex items-center justify-between border-b p-6"><div><h2 className="text-xl font-black">تحرير Structured Content</h2><p className="mt-1 text-xs text-slate-500">لا يُسمح بحقن @context أو تغيير هوية العقدة.</p></div><Button variant="ghost" size="icon" onClick={close}><X /></Button></div><div className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2"><label className="space-y-2 text-sm font-bold">مسار الصفحة<Input value={form.scopePath} onChange={(e) => setForm({ ...form, scopePath: e.target.value })} placeholder="/ أو /services/slug أو *" /></label><label className="space-y-2 text-sm font-bold">نوع Schema<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.schemaType} onChange={(e) => { const schemaType = e.target.value as SchemaType; setForm({ ...form, schemaType }); setJsonPayload("{}") }}>{SCHEMA_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label></div>
        <div className="grid gap-4 md:grid-cols-[1fr_140px]"><label className="space-y-2 text-sm font-bold">العنوان<Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label className="space-y-2 text-sm font-bold">الترتيب<Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })} /></label></div>
        <label className="space-y-2 text-sm font-bold">الوصف (اختياري)<Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        {form.schemaType === "FAQPage" ? <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-black">أسئلة الصفحة وإجاباتها</h3><Button type="button" variant="outline" size="sm" onClick={addFaq}><Plus size={14} /> سؤال جديد</Button></div>{faqItems.map((item, index) => <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold text-slate-500">السؤال {index + 1}</span><Button type="button" variant="ghost" size="sm" onClick={() => removeFaq(index)} className="text-red-500">حذف</Button></div><Input value={item.question} onChange={(e) => updateFaq(index, "question", e.target.value)} placeholder="اكتب السؤال الظاهر للزائر" className="mb-3 bg-white" /><textarea value={item.answer} onChange={(e) => updateFaq(index, "answer", e.target.value)} placeholder="الإجابة الظاهرة للزائر" className="min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" /><label className="mt-3 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={item.enabled !== false} onChange={(e) => updateFaq(index, "enabled", e.target.checked)} /> منشور ضمن الصفحة</label></div>)}</div> : <label className="space-y-2 text-sm font-bold">خصائص Schema بصيغة JSON<textarea value={jsonPayload} onChange={(e) => setJsonPayload(e.target.value)} className="min-h-48 w-full rounded-md border border-input px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-primary" placeholder={'{"name":"..."}'} /></label>}
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> تفعيل العنصر</label>
        <div className="flex justify-end gap-3 border-t pt-5"><Button variant="outline" onClick={close}>إلغاء</Button><Button onClick={() => void save()} disabled={saving} className="gap-2">{saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} حفظ ونشر</Button></div>
      </div></div></div>}
    </div>
  )
}