import { useRef, useState } from "react"
import { useGetSlides, useCreateSlide, useUpdateSlide, useDeleteSlide } from "@workspace/api-client-react"
import type { HeroSlide } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Pencil, Trash2, Image, GripVertical, Eye, EyeOff, X, Check } from "lucide-react"

type SlideForm = {
  title: string
  subtitle: string
  imageUrl: string
  ctaText: string
  order: number
  isActive: boolean
}

const emptyForm = (): SlideForm => ({
  title: "",
  subtitle: "",
  imageUrl: "",
  ctaText: "اطلب خدمتك الآن",
  order: 0,
  isActive: true,
})

export default function AdminSlides() {
  const { data: slides = [], refetch } = useGetSlides()
  const { mutate: createSlide, isPending: creating } = useCreateSlide()
  const { mutate: updateSlide, isPending: updating } = useUpdateSlide()
  const { mutate: deleteSlide } = useDeleteSlide()

  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [form, setForm] = useState<SlideForm>(emptyForm())
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openNew = () => {
    setForm({ ...emptyForm(), order: slides.length })
    setEditing("new")
  }

  const openEdit = (slide: HeroSlide) => {
    setForm({
      title: slide.title,
      subtitle: slide.subtitle,
      imageUrl: slide.imageUrl,
      ctaText: slide.ctaText ?? "",
      order: slide.order,
      isActive: slide.isActive,
    })
    setEditing(slide.id)
  }

  const handleSave = () => {
    if (editing === "new") {
      createSlide({ data: form }, { onSuccess: () => { refetch(); setEditing(null) } })
    } else if (typeof editing === "number") {
      updateSlide({ id: editing, data: form }, { onSuccess: () => { refetch(); setEditing(null) } })
    }
  }

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try {
      const token = localStorage.getItem("admin_token") ?? ""
      const body = new FormData()
      body.append("file", file)
      const response = await fetch("/api/admin/slides/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "فشل رفع الصورة")
      setForm(current => ({ ...current, imageUrl: result.url }))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "فشل رفع الصورة")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذه الشريحة؟")) {
      deleteSlide({ id }, { onSuccess: () => refetch() })
    }
  }

  const toggleActive = (slide: HeroSlide) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateSlide({ id: slide.id, data: { isActive: !slide.isActive } as any }, { onSuccess: () => refetch() })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">شرائح الهيرو</h2>
        <Button onClick={openNew} className="gap-2">
          <Plus size={16} />
          إضافة شريحة
        </Button>
      </div>

      {/* New/Edit Form */}
      {editing !== null && (
        <Card className="border-primary/30 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold text-lg text-gray-800 mb-4">
              {editing === "new" ? "إضافة شريحة جديدة" : "تعديل الشريحة"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">العنوان *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="عنوان الشريحة"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">نص الزر</label>
                <Input
                  value={form.ctaText}
                  onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                  placeholder="اطلب خدمتك الآن"
                  dir="rtl"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">النص التوضيحي *</label>
              <Input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="وصف مختصر"
                dir="rtl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">صورة الخلفية *</label>
              <div className="flex gap-2">
                <Input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="رابط الصورة أو ارفع ملفاً"
                  dir="ltr"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleImageUpload(file)
                    e.currentTarget.value = ""
                  }}
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="shrink-0">
                  {uploading ? "جاري الضغط..." : "رفع صورة"}
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">سيتم ضغط الصورة وتحويلها تلقائياً إلى WebP مع الحفاظ على الجودة.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">الترتيب</label>
                <Input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">نشط</span>
                </label>
              </div>
            </div>
            {form.imageUrl && (
              <div className="rounded-xl overflow-hidden h-32 bg-gray-100">
                <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={creating || updating} className="gap-2">
                <Check size={16} />
                {creating || updating ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)} className="gap-2">
                <X size={16} />
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slides List */}
      <div className="grid gap-4">
        {slides.map((slide) => (
          <Card key={slide.id} className="overflow-hidden">
            <div className="flex items-stretch">
              <div className="w-48 shrink-0 bg-gray-100 relative overflow-hidden">
                {slide.imageUrl ? (
                  <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Image size={32} />
                  </div>
                )}
              </div>
              <CardContent className="flex-1 p-5 flex items-center gap-4">
                <GripVertical size={20} className="text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 truncate">{slide.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      slide.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {slide.isActive ? "نشط" : "مخفي"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{slide.subtitle}</p>
                  {slide.ctaText && (
                    <span className="mt-1 inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      زر: {slide.ctaText}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleActive(slide)}
                    className="text-gray-400 hover:text-gray-700"
                    title={slide.isActive ? "إخفاء" : "إظهار"}
                  >
                    {slide.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(slide)}
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(slide.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
        {slides.length === 0 && (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <Image size={48} strokeWidth={1} />
              <p className="text-lg font-medium">لا توجد شرائح بعد</p>
              <Button onClick={openNew} variant="outline" className="gap-2 mt-2">
                <Plus size={16} /> أضف أول شريحة
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
