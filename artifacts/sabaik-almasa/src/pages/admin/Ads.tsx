import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Pencil, Trash2, Eye, EyeOff, X, Check, Megaphone, ExternalLink, Upload, Loader2, Link2 } from "lucide-react"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

interface Ad {
  id: number; title: string; content: string; imageUrl: string
  linkUrl: string; buttonText: string; position: string; type: string
  bgColor: string; isActive: boolean; order: number
}

type AdForm = Omit<Ad, "id">

const emptyForm = (): AdForm => ({
  title: "", content: "", imageUrl: "", linkUrl: "", buttonText: "",
  position: "after_hero", type: "banner", bgColor: "#eff6ff", isActive: true, order: 0,
})

const POSITIONS = [
  { value: "after_hero",          label: "بعد الصور الرئيسية", desc: "أسفل الشرائح الرئيسية مباشرةً" },
  { value: "after_stats",         label: "بعد الإحصائيات",     desc: "بعد شريط الإحصائيات" },
  { value: "after_about",         label: "بعد من نحن",         desc: "بين من نحن والخدمات" },
  { value: "after_services",      label: "بعد الخدمات",        desc: "بين الخدمات والحاويات" },
  { value: "after_containers",    label: "بعد الحاويات",       desc: "بين الحاويات وطريقة العمل" },
  { value: "after_how_it_works",  label: "بعد طريقة العمل",    desc: "بين طريقة العمل والقيم" },
  { value: "after_values",        label: "بعد قيمنا",          desc: "بين القيم ولماذا نحن" },
  { value: "after_why_choose_us", label: "بعد لماذا نحن",      desc: "بين لماذا نحن وآراء العملاء" },
  { value: "middle",              label: "وسط الصفحة",         desc: "موضع قديم محفوظ للتوافق مع الإعلانات السابقة" },
  { value: "after_testimonials",  label: "بعد آراء العملاء",   desc: "بين آراء العملاء والشركاء" },
  { value: "after_partners",      label: "بعد شركائنا",        desc: "بين الشركاء ورسالة المدير" },
  { value: "after_ceo",           label: "بعد رسالة المدير",   desc: "بين رسالة المدير ونموذج الطلب" },
  { value: "before_footer",       label: "قبل التذييل",        desc: "فوق قسم التواصل مباشرةً" },
]
const TYPES = [
  { value: "banner", label: "صورة كاملة", desc: "تظهر الصورة كاملة بدون عنوان أو أزرار" },
  { value: "card",   label: "صورة كاملة", desc: "تظهر الصورة كاملة بدون عنوان أو أزرار" },
]

const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : "") || ""

export default function AdminAds() {
  const { toast } = useToast()
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [form, setForm] = useState<AdForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  const load = () => {
    fetch(`${API_BASE}/api/admin/ads`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(async r => {
        if (r.status === 401) {
          localStorage.removeItem("admin_token")
          localStorage.removeItem("admin_role")
          localStorage.removeItem("admin_id")
          localStorage.removeItem("admin_name")
          window.location.assign(`${API_BASE}/admin/login`)
          return
        }
        const data = await r.json().catch(() => null)
        if (!r.ok) throw new Error(data?.error || "تعذر تحميل الإعلانات")
        setAds(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(error => {
        setLoading(false)
        toast({ variant: "destructive", title: error instanceof Error ? error.message : "تعذر تحميل الإعلانات" })
      })
  }
  useEffect(load, [])

  const openNew = () => { setForm({ ...emptyForm(), order: ads.length }); setUploadError(""); setEditing("new") }
  const openEdit = (a: Ad) => {
    setForm({ title: a.title, content: a.content, imageUrl: a.imageUrl, linkUrl: a.linkUrl,
      buttonText: a.buttonText, position: a.position, type: a.type, bgColor: a.bgColor,
      isActive: a.isActive, order: a.order })
    setUploadError("")
    setEditing(a.id)
  }

  const pickAndUpload = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setUploading(true)
      setUploadError("")
      try {
        const fd = new FormData()
        fd.append("file", file)
        const res = await fetch(`${API_BASE}/api/admin/uploads`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token()}` },
          body: fd,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "فشل رفع الصورة")
        setForm(f => ({ ...f, imageUrl: `${API_BASE}${data.url}` }))
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "فشل رفع الصورة")
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const url = editing === "new" ? `${API_BASE}/api/admin/ads` : `${API_BASE}/api/admin/ads/${editing}`
      const method = editing === "new" ? "POST" : "PATCH"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      toast({ title: editing === "new" ? "تم إنشاء الإعلان ✅" : "تم التعديل ✅" })
      setEditing(null); load()
    } catch { toast({ variant: "destructive", title: "فشل في الحفظ" }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الإعلان؟")) return
    await fetch(`${API_BASE}/api/admin/ads/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } })
    toast({ title: "تم الحذف" }); load()
  }

  const toggleActive = async (a: Ad) => {
    await fetch(`${API_BASE}/api/admin/ads/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, body: JSON.stringify({ isActive: !a.isActive }) })
    load()
  }

  const posLabel = (v: string) => POSITIONS.find(p => p.value === v)?.label ?? v

  if (loading) return <div className="text-center p-12 text-gray-400">جاري التحميل...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">الإعلانات</h2>
          <p className="text-sm text-gray-500 mt-0.5">أضف إعلانات تظهر في مواضع محددة من الصفحة</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus size={16} /> إضافة إعلان
        </Button>
      </div>

      {/* ── Form ── */}
      {editing !== null && (
        <Card className="border-primary/30 shadow-sm">
          <CardContent className="p-6 space-y-5">
            <h3 className="font-bold text-lg">{editing === "new" ? "إعلان جديد" : "تعديل الإعلان"}</h3>

            {/* Position & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">موقع الإعلان</label>
                <div className="space-y-2">
                  {POSITIONS.map(p => (
                    <label key={p.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${form.position === p.value ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/40"}`}>
                      <input type="radio" name="position" value={p.value} checked={form.position === p.value} onChange={() => setForm(f => ({ ...f, position: p.value }))} className="accent-primary" />
                      <div>
                        <p className="font-medium text-sm">{p.label}</p>
                        <p className="text-xs text-gray-500">{p.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">نوع الإعلان</label>
                <div className="space-y-2">
                  {TYPES.map(t => (
                    <label key={t.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${form.type === t.value ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/40"}`}>
                      <input type="radio" name="type" value={t.value} checked={form.type === t.value} onChange={() => setForm(f => ({ ...f, type: t.value }))} className="accent-primary" />
                      <div>
                        <p className="font-medium text-sm">{t.label}</p>
                        <p className="text-xs text-gray-500">{t.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* بيانات إدارية اختيارية */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">اسم داخلي للإعلان (اختياري)</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="للاستخدام داخل لوحة التحكم فقط" dir="rtl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">نص الزر</label>
                <Input value={form.buttonText} placeholder="لن يظهر في الموقع" dir="rtl" disabled />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">المحتوى / الوصف</label>
              <Input value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="لن يظهر في الموقع — ملاحظات داخلية فقط" dir="rtl" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">صورة الإعلان</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={pickAndUpload}
                    disabled={uploading}
                    className="h-9 shrink-0 gap-1.5 px-3"
                    title="رفع صورة من جهازك"
                  >
                    {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                    <span className="text-xs">{uploading ? "جاري الرفع" : "رفع صورة"}</span>
                  </Button>
                  <div className="relative min-w-0 flex-1">
                    <Link2 size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={form.imageUrl}
                      onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                      placeholder="أو ألصق رابط الصورة هنا"
                      dir="ltr"
                      className="pr-8"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400">JPEG أو PNG أو WebP أو GIF أو AVIF — بحد أقصى 10MB</p>
                {uploadError && <p className="text-xs font-medium text-red-500">{uploadError}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">رابط الإعلان (URL)</label>
                <Input value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} placeholder="https://..." dir="ltr" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">لون الخلفية</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.bgColor} onChange={e => setForm(f => ({ ...f, bgColor: e.target.value }))} className="w-10 h-9 rounded border border-gray-200 cursor-pointer p-0.5" />
                  <Input value={form.bgColor} onChange={e => setForm(f => ({ ...f, bgColor: e.target.value }))} className="font-mono text-xs" dir="ltr" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">الترتيب</label>
                <Input type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-primary" />
                  <span className="text-sm font-medium">نشط (ظاهر في الموقع)</span>
                </label>
              </div>
            </div>

            {/* Preview */}
            {form.imageUrl && (
              <div className="rounded-xl overflow-hidden bg-gray-100">
                <img src={form.imageUrl} alt="preview" className="block w-full h-auto object-contain" />
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Button onClick={handleSave} disabled={saving || !form.imageUrl.trim()} className="gap-2">
                <Check size={16} /> {saving ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)} className="gap-2">
                <X size={16} /> إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Ads List ── */}
      <div className="space-y-3">
        {POSITIONS.map(pos => {
          const group = ads.filter(a => a.position === pos.value)
          return (
            <div key={pos.value}>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                {pos.label} — {pos.desc}
                <span className="text-xs font-normal text-gray-400">({group.length} إعلان)</span>
              </h3>
              {group.length === 0 ? (
                <div className="text-xs text-gray-400 px-3 py-2 bg-gray-50 rounded-lg mb-3">لا توجد إعلانات في هذا الموضع</div>
              ) : (
                <div className="space-y-2 mb-4">
                  {group.map(ad => (
                    <Card key={ad.id} className={`transition-opacity ${!ad.isActive ? "opacity-50" : ""}`}>
                      <CardContent className="p-4 flex items-center gap-4">
                        {ad.imageUrl && (
                          <div className="w-16 h-12 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                            <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        {!ad.imageUrl && (
                          <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center" style={{ background: ad.bgColor }}>
                            <Megaphone size={18} className="text-primary/60" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900 text-sm">{ad.title}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ad.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {ad.isActive ? "نشط" : "مخفي"}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">
                              {TYPES.find(t => t.value === ad.type)?.label}
                            </span>
                          </div>
                          {ad.content && <p className="text-xs text-gray-500 truncate mt-0.5">{ad.content}</p>}
                          {ad.linkUrl && (
                            <a href={ad.linkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline mt-0.5">
                              <ExternalLink size={10} /> {ad.linkUrl}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => toggleActive(ad)} className="h-8 w-8 text-gray-400">
                            {ad.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(ad)} className="h-8 w-8 text-blue-500 hover:bg-blue-50">
                            <Pencil size={15} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(ad.id)} className="h-8 w-8 text-red-400 hover:bg-red-50">
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {ads.length === 0 && (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <Megaphone size={48} strokeWidth={1} />
              <p className="text-lg font-medium">لا توجد إعلانات بعد</p>
              <Button onClick={openNew} variant="outline" className="gap-2 mt-2"><Plus size={16} /> أضف أول إعلان</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
