import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { User, Mail, Lock, Save, Eye, EyeOff, ShieldCheck, Shield, Headphones, ClipboardList, Truck, Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
const token = () => localStorage.getItem("admin_token") ?? ""

const ROLE_INFO: Record<string, { label: string; icon: React.ElementType; color: string; desc: string }> = {
  admin:            { label: "مدير النظام",    icon: ShieldCheck,   color: "text-purple-600 bg-purple-50",   desc: "صلاحيات كاملة على جميع أقسام لوحة التحكم" },
  manager:          { label: "مدير",           icon: Shield,        color: "text-blue-600 bg-blue-50",       desc: "صلاحيات واسعة عدا إدارة حسابات المدير الرئيسي" },
  customer_service: { label: "خدمة عملاء",    icon: Headphones,    color: "text-green-600 bg-green-50",     desc: "الوصول للمحادثات وواتساب والإشعارات" },
  requests_officer: { label: "مسؤول طلبات",   icon: ClipboardList, color: "text-amber-600 bg-amber-50",     desc: "الوصول للطلبات والإشعارات فقط" },
  driver:           { label: "سائق",           icon: Truck,          color: "text-teal-600 bg-teal-50",       desc: "تنفيذ أوامر العمل وتحديث حالتها وإثبات التسليم" },
}

interface MeData {
  id: number
  username: string
  name: string
  email: string
  role: string
  permissions: string[]
}

export default function AdminProfile() {
  const { toast } = useToast()
  const [me, setMe] = useState<MeData | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile form
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)

  // Password form
  const [currentPass, setCurrentPass] = useState("")
  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [savingPass, setSavingPass] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then((data: MeData) => {
        setMe(data)
        setName(data.name)
        setEmail(data.email ?? "")
        // Persist role/id for permission checks in other pages
        localStorage.setItem("admin_role", data.role)
        localStorage.setItem("admin_id", String(data.id))
        localStorage.setItem("admin_name", data.name)
      })
      .catch(() => toast({ variant: "destructive", title: "فشل تحميل البيانات" }))
      .finally(() => setLoading(false))
  }, [toast])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast({ variant: "destructive", title: "الاسم مطلوب" }); return }
    setSavingProfile(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/employees/me/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      const data = await r.json() as { message?: string; error?: string }
      if (!r.ok) throw new Error(data.error)
      localStorage.setItem("admin_name", name.trim())
      toast({ title: "تم حفظ البيانات الشخصية ✅" })
      setMe(m => m ? { ...m, name: name.trim(), email: email.trim() } : m)
    } catch (e) {
      toast({ variant: "destructive", title: "فشل الحفظ", description: String(e) })
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPass || !newPass || !confirmPass) {
      toast({ variant: "destructive", title: "جميع حقول كلمة المرور مطلوبة" }); return
    }
    if (newPass.length < 6) {
      toast({ variant: "destructive", title: "كلمة المرور الجديدة 6 أحرف على الأقل" }); return
    }
    if (newPass !== confirmPass) {
      toast({ variant: "destructive", title: "كلمة المرور الجديدة وتأكيدها غير متطابقتين" }); return
    }
    setSavingPass(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/employees/me/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      })
      const data = await r.json() as { message?: string; error?: string }
      if (!r.ok) throw new Error(data.error)
      toast({ title: "تم تغيير كلمة المرور ✅" })
      setCurrentPass(""); setNewPass(""); setConfirmPass("")
    } catch (e) {
      toast({ variant: "destructive", title: "فشل تغيير كلمة المرور", description: String(e) })
    } finally {
      setSavingPass(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary/40" />
      </div>
    )
  }

  const roleInfo = me ? (ROLE_INFO[me.role] ?? ROLE_INFO.admin) : ROLE_INFO.admin
  const RIcon = roleInfo.icon

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <User size={24} className="text-primary" /> بياناتي الشخصية
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">تعديل معلوماتك وكلمة مرورك</p>
      </div>

      {/* Profile Card */}
      {me && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${roleInfo.color}`}>
              {me.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-gray-900">{me.name}</h3>
              <p className="text-gray-500 text-sm font-mono">{me.username}</p>
              <div className={`inline-flex items-center gap-1.5 text-xs font-bold mt-1.5 px-2.5 py-1 rounded-full ${roleInfo.color}`}>
                <RIcon size={12} />
                {roleInfo.label}
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500"><span className="font-semibold">الصلاحيات:</span> {roleInfo.desc}</p>
          </div>
        </motion.div>
      )}

      {/* Edit Profile */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
          <User size={16} className="text-primary" /> المعلومات الشخصية
        </h3>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">الاسم الكامل</label>
            <Input value={name} onChange={e => setName(e.target.value)}
              placeholder="اسمك الكامل" className="h-11" required />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Mail size={14} /> البريد الإلكتروني
            </label>
            <Input value={email} onChange={e => setEmail(e.target.value)}
              type="email" placeholder="name@example.com" className="h-11" dir="ltr" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">اسم المستخدم</label>
            <Input value={me?.username ?? ""} disabled className="h-11 bg-gray-50 text-gray-400" dir="ltr" />
            <p className="text-xs text-gray-400 mt-1">اسم المستخدم لا يمكن تغييره</p>
          </div>
          <Button type="submit" disabled={savingProfile}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl gap-2">
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            حفظ المعلومات الشخصية
          </Button>
        </form>
      </motion.div>

      {/* Change Password */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
          <Lock size={16} className="text-primary" /> تغيير كلمة المرور
        </h3>
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">كلمة المرور الحالية</label>
            <div className="relative">
              <Input value={currentPass} onChange={e => setCurrentPass(e.target.value)}
                type={showCurrent ? "text" : "password"} placeholder="••••••••"
                className="h-11 pl-10" dir="ltr" required />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">كلمة المرور الجديدة</label>
            <div className="relative">
              <Input value={newPass} onChange={e => setNewPass(e.target.value)}
                type={showNew ? "text" : "password"} placeholder="6 أحرف على الأقل"
                className="h-11 pl-10" dir="ltr" required />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {newPass && (
              <div className="mt-1.5 flex items-center gap-2">
                {newPass.length >= 6
                  ? <CheckCircle size={13} className="text-green-500" />
                  : <div className="w-3 h-3 rounded-full border-2 border-amber-400" />}
                <span className={`text-xs ${newPass.length >= 6 ? "text-green-600" : "text-amber-600"}`}>
                  {newPass.length}/6 أحرف
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">تأكيد كلمة المرور الجديدة</label>
            <Input value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
              type="password" placeholder="••••••••"
              className={`h-11 ${confirmPass && confirmPass !== newPass ? "border-red-300 focus:border-red-400" : ""}`}
              dir="ltr" required />
            {confirmPass && confirmPass !== newPass && (
              <p className="text-xs text-red-500 mt-1">كلمتا المرور غير متطابقتين</p>
            )}
          </div>
          <Button type="submit" disabled={savingPass}
            className="w-full h-11 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl gap-2">
            {savingPass ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            تغيير كلمة المرور
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
