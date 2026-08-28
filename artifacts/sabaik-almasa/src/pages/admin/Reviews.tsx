import React, { useState, useEffect } from "react"
import {
  Star,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  Search,
  Filter,
  RefreshCw,
  MessageSquare,
  Clock,
  ThumbsUp,
  AlertTriangle,
} from "lucide-react"

interface Review {
  id: number
  serviceId: number
  customerName: string
  customerCity?: string | null
  rating: number
  comment: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
  approvedAt?: string | null
}

interface Service {
  id: number
  title: string
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [selectedService, setSelectedService] = useState<string>("all")
  const [selectedRating, setSelectedRating] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("admin_token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [revRes, svcRes] = await Promise.all([
        fetch("/api/admin/reviews", { headers: getAuthHeaders() }),
        fetch("/api/services"),
      ])
      if (revRes.ok) {
        const revData = await revRes.json()
        setReviews(revData)
      }
      if (svcRes.ok) {
        const svcData = await svcRes.json()
        setServices(svcData)
      }
    } catch (err) {
      console.error("Error loading reviews:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleStatusChange = async (id: number, status: "approved" | "rejected") => {
    try {
      setActionLoading(id)
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status, approvedAt: status === "approved" ? new Date().toISOString() : r.approvedAt } : r))
        )
      }
    } catch (err) {
      console.error("Status update error:", err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا التقييم نهائياً؟")) return
    try {
      setActionLoading(id)
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== id))
      }
    } catch (err) {
      console.error("Delete review error:", err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingReview) return
    try {
      setActionLoading(editingReview.id)
      const res = await fetch(`/api/admin/reviews/${editingReview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          customerName: editingReview.customerName,
          customerCity: editingReview.customerCity,
          rating: editingReview.rating,
          comment: editingReview.comment,
          status: editingReview.status,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
        setEditingReview(null)
      }
    } catch (err) {
      console.error("Save edit error:", err)
    } finally {
      setActionLoading(null)
    }
  }

  const getServiceName = (id: number) => {
    const s = services.find((srv) => srv.id === id)
    return s ? s.title : `خدمة #${id}`
  }

  // Filtered reviews
  const filteredReviews = reviews.filter((r) => {
    if (activeTab !== "all" && r.status !== activeTab) return false
    if (selectedService !== "all" && String(r.serviceId) !== selectedService) return false
    if (selectedRating !== "all" && String(r.rating) !== selectedRating) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = r.customerName.toLowerCase().includes(q)
      const matchCity = (r.customerCity || "").toLowerCase().includes(q)
      const matchComment = r.comment.toLowerCase().includes(q)
      if (!matchName && !matchCity && !matchComment) return false
    }
    return true
  })

  // Metrics
  const totalCount = reviews.length
  const pendingCount = reviews.filter((r) => r.status === "pending").length
  const approvedCount = reviews.filter((r) => r.status === "approved").length
  const rejectedCount = reviews.filter((r) => r.status === "rejected").length
  const approvedReviews = reviews.filter((r) => r.status === "approved")
  const avgRating =
    approvedReviews.length > 0
      ? (approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1)
      : "5.0"

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Star className="text-amber-500 fill-amber-500" size={26} /> إدارة تقييمات العملاء
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            مراجعة واعتماد التقييمات الواردة من صفحات الخدمات قبل نشرها للعامة.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl transition text-sm self-start sm:self-auto"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          تحديث البيانات
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500">إجمالي التقييمات</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
            <Clock size={14} /> بانتظار الاعتماد
          </span>
          <div className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 size={14} /> التقييمات المنشورة
          </span>
          <div className="text-2xl font-black text-emerald-900 mt-1">{approvedCount}</div>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
            <XCircle size={14} /> المرفوضة
          </span>
          <div className="text-2xl font-black text-rose-900 mt-1">{rejectedCount}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm col-span-2 md:col-span-1">
          <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
            <Star size={14} className="fill-blue-600 text-blue-600" /> متوسط التقييم العام
          </span>
          <div className="text-2xl font-black text-blue-900 mt-1">{avgRating} / 5</div>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2">
            {[
              { id: "all", label: "الكل", count: totalCount },
              { id: "pending", label: "قيد المراجعة", count: pendingCount },
              { id: "approved", label: "معتمدة ومنشورة", count: approvedCount },
              { id: "rejected", label: "مرفوضة", count: rejectedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="بحث باسم العميل أو التعليق..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">الخدمة:</span>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
            >
              <option value="all">جميع الخدمات</option>
              {services.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">التقييم:</span>
            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
            >
              <option value="all">جميع التقييمات</option>
              <option value="5">5 نجوم ★★★★★</option>
              <option value="4">4 نجوم ★★★★☆</option>
              <option value="3">3 نجوم ★★★☆☆</option>
              <option value="2">نجمتان ★★☆☆☆</option>
              <option value="1">نجمة واحدة ★☆☆☆☆</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400 font-bold">جارٍ تحميل التقييمات...</div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <MessageSquare className="mx-auto text-slate-300 mb-2" size={40} />
          <h3 className="text-base font-bold text-slate-700">لا توجد تقييمات مطابقة</h3>
          <p className="text-xs text-slate-400 mt-1">جرب تغيير معايير البحث أو اختيار تبويب آخر.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((r) => (
            <div
              key={r.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-slate-900 text-sm font-bold">{r.customerName}</strong>
                  {r.customerCity && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      📍 {r.customerCity}
                    </span>
                  )}
                  <span className="text-xs text-primary font-bold bg-primary/5 px-2 py-0.5 rounded-md">
                    {getServiceName(r.serviceId)}
                  </span>
                  <div className="flex items-center gap-0.5 mr-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        className={s <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-100"}
                      />
                    ))}
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      r.status === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : r.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {r.status === "approved" ? "معتمد ومنشور" : r.status === "pending" ? "بانتظار المراجعة" : "مرفوض"}
                  </span>
                </div>

                <p className="text-xs md:text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  "{r.comment}"
                </p>

                <div className="text-[11px] text-slate-400">
                  تاريخ الإرسال: {new Date(r.createdAt).toLocaleString("ar-SA")}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0">
                {r.status !== "approved" && (
                  <button
                    onClick={() => handleStatusChange(r.id, "approved")}
                    disabled={actionLoading === r.id}
                    className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} /> اعتماد
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button
                    onClick={() => handleStatusChange(r.id, "rejected")}
                    disabled={actionLoading === r.id}
                    className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    <XCircle size={14} /> رفض
                  </button>
                )}
                <button
                  onClick={() => setEditingReview(r)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                  title="تعديل"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={actionLoading === r.id}
                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                  title="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Review Modal */}
      {editingReview && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">تعديل بيانات التقييم</h3>
              <button
                type="button"
                onClick={() => setEditingReview(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل</label>
              <input
                type="text"
                required
                value={editingReview.customerName}
                onChange={(e) => setEditingReview({ ...editingReview, customerName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المنطقة / الحي</label>
              <input
                type="text"
                value={editingReview.customerCity || ""}
                onChange={(e) => setEditingReview({ ...editingReview, customerCity: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">التقييم (1 - 5)</label>
              <select
                value={editingReview.rating}
                onChange={(e) => setEditingReview({ ...editingReview, rating: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none bg-white"
              >
                {[5, 4, 3, 2, 1].map((s) => (
                  <option key={s} value={s}>
                    {s} نجوم
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نص التقييم</label>
              <textarea
                rows={4}
                required
                value={editingReview.comment}
                onChange={(e) => setEditingReview({ ...editingReview, comment: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الحالة</label>
              <select
                value={editingReview.status}
                onChange={(e) => setEditingReview({ ...editingReview, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none bg-white"
              >
                <option value="pending">قيد المراجعة (Pending)</option>
                <option value="approved">معتمد ومنشور (Approved)</option>
                <option value="rejected">مرفوض (Rejected)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingReview(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={actionLoading === editingReview.id}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50"
              >
                حفظ التعديلات
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
