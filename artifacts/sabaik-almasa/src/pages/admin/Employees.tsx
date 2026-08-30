import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users, Plus, Edit2, Trash2, ShieldCheck, Shield, Headphones,
  ClipboardList, CheckCircle, XCircle, Eye, EyeOff, Search,
  Save, X, AlertTriangle, ToggleLeft, ToggleRight, Loader2,
  Lock, Mail, User, ChevronDown, ChevronUp, Truck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
const token = () => localStorage.getItem("admin_token") ?? ""
const myRole = () => localStorage.getItem("admin_role") ?? "admin"
const myId = () => parseInt(localStorage.getItem("admin_id") ?? "0")

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_SECTIONS: { key: string; label: string; group: string }[] = [
  { key: "dashboard",    label: "لوحة القيادة",   group: "رئيسية" },
  { key: "requests",     label: "الطلبات",         group: "رئيسية" },
  { key: "conversations",label: "المحادثات",       group: "رئيسية" },
  { key: "notifications",label: "الإشعارات",       group: "رئيسية" },
  { key: "analytics",    label: "التحليلات",       group: "محتوى" },
  { key: "ads",          label: "الإعلانات",       group: "محتوى" },
  { key: "blog",         label: "المدونة",         group: "محتوى" },
  { key: "services",     label: "الخدمات",         group: "محتوى" },
  { key: "packages",     label: "حاويات الأنقاض والنفايات", group: "محتوى" },
  { key: "slides",       label: "السلايدر",        group: "محتوى" },
  { key: "testimonials", label: "الشهادات",        group: "محتوى" },
  { key: "partners",     label: "الشركاء",         group: "محتوى" },
  { key: "settings",     label: "إعدادات الموقع",  group: "إعدادات" },
  { key: "seo",          label: "SEO",             group: "إعدادات" },
  { key: "structured_content", label: "Structured Content", group: "إعدادات" },
  { key: "whatsapp",     label: "واتساب",          group: "إعدادات" },
  { key: "employees",    label: "إدارة الموظفين",  group: "إعدادات" },
  { key: "work_orders",  label: "أوامر العمل",     group: "التشغيل" },
  { key: "container_system", label: "نظام الحاويات الكامل", group: "التشغيل" },
  { key: "container_system_customer", label: "الحاويات: العملاء", group: "سيستم الحاويات" },
  { key: "container_system_container", label: "الحاويات: الأصول", group: "سيستم الحاويات" },
  { key: "container_system_container_asset", label: "الحاويات: أصول الحاويات", group: "سيستم الحاويات" },
  { key: "container_system_container_type", label: "الحاويات: التصنيفات والأحجام", group: "سيستم الحاويات" },
  { key: "container_system_category", label: "الحاويات: الأصناف", group: "سيستم الحاويات" },
  { key: "container_system_category_size", label: "الحاويات: أحجام الأصناف", group: "سيستم الحاويات" },
  { key: "container_system_contract", label: "الحاويات: العقود والإيجارات", group: "سيستم الحاويات" },
  { key: "container_system_contract_line", label: "الحاويات: بنود العقود", group: "سيستم الحاويات" },
  { key: "container_system_container_movement", label: "الحاويات: التبديل والتفريغ", group: "سيستم الحاويات" },
  { key: "container_system_ledger_entry", label: "الحاويات: قيود وكشوف الحساب", group: "سيستم الحاويات" },
  { key: "container_system_receipt", label: "الحاويات: سندات القبض والصرف", group: "سيستم الحاويات" },
  { key: "container_system_payment", label: "الحاويات: سداد العملاء", group: "سيستم الحاويات" },
  { key: "container_system_deposit", label: "الحاويات: الإيداعات", group: "سيستم الحاويات" },
  { key: "container_system_bank_deposit", label: "الحاويات: الإيداعات البنكية", group: "سيستم الحاويات" },
  { key: "container_system_treasury", label: "الحاويات: الخزائن", group: "سيستم الحاويات" },
  { key: "container_system_transfer", label: "الحاويات: التحويلات", group: "سيستم الحاويات" },
  { key: "container_system_expense", label: "الحاويات: الإيرادات والمصروفات", group: "سيستم الحاويات" },
  { key: "container_system_reports", label: "الحاويات: التقارير", group: "سيستم الحاويات" },
  { key: "container_system_salary", label: "الحاويات: قسم الرواتب", group: "سيستم الحاويات" },
  { key: "container_system_salary_advance", label: "الحاويات: السلف", group: "سيستم الحاويات" },
  { key: "container_system_salary_payment", label: "الحاويات: صرف الرواتب", group: "سيستم الحاويات" },
  { key: "container_system_vehicle", label: "الحاويات: الشاحنات", group: "سيستم الحاويات" },
  { key: "container_system_driver", label: "الحاويات: السائقون", group: "سيستم الحاويات" },
  { key: "container_system_maintenance", label: "الحاويات: الصيانة", group: "سيستم الحاويات" },
  { key: "container_system_permit", label: "الحاويات: التصاريح", group: "سيستم الحاويات" },
  { key: "container_system_oil_change", label: "الحاويات: غيار الزيت والعدادات", group: "سيستم الحاويات" },
  { key: "container_system_fuel_expense", label: "الحاويات: مصروفات الوقود", group: "سيستم الحاويات" },
  { key: "container_system_daily_expense", label: "الحاويات: المصروفات اليومية", group: "سيستم الحاويات" },
  { key: "container_system_warehouse", label: "الحاويات: المستودعات والمخازن", group: "سيستم الحاويات" },
  { key: "container_system_appointment", label: "الحاويات: المواعيد والحجوزات", group: "سيستم الحاويات" },
  { key: "container_system_branch", label: "الحاويات: الفروع", group: "سيستم الحاويات" },
  { key: "container_system_employee", label: "الحاويات: الموظفون والسائقون", group: "سيستم الحاويات" },
  { key: "container_system_invoice", label: "الحاويات: الفواتير", group: "سيستم الحاويات" },
  { key: "container_system_invoice_return", label: "الحاويات: مرتجعات الفواتير", group: "سيستم الحاويات" },
  { key: "container_system_tax", label: "الحاويات: الضرائب", group: "سيستم الحاويات" },
  { key: "container_system_commission", label: "الحاويات: العمولات", group: "سيستم الحاويات" },
  { key: "container_system_alert", label: "الحاويات: التنبيهات", group: "سيستم الحاويات" },
  { key: "container_system_settings", label: "الحاويات: الإعدادات", group: "سيستم الحاويات" },
  { key: "container_system_audit", label: "الحاويات: سجل التدقيق", group: "سيستم الحاويات" },
]

const ROLE_DEFAULT_PERMS: Record<string, string[]> = {
  admin:            ALL_SECTIONS.map(s => s.key),
  manager:          ALL_SECTIONS.map(s => s.key),
  customer_service: ["dashboard", "conversations", "whatsapp", "notifications"],
  requests_officer: ["dashboard", "requests", "notifications"],
  driver:           ["dashboard", "work_orders"],
}

const ROLES = [
  { value: "manager",          label: "مدير",             icon: Shield,      color: "text-blue-600 bg-blue-50 border-blue-200" },
  { value: "customer_service", label: "خدمة عملاء",       icon: Headphones,  color: "text-green-600 bg-green-50 border-green-200" },
  { value: "requests_officer", label: "مسؤول طلبات",      icon: ClipboardList, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { value: "driver",           label: "سائق",             icon: Truck,          color: "text-teal-600 bg-teal-50 border-teal-200" },
]
// Admin can also see admin role
const ROLES_ADMIN = [
  { value: "admin",            label: "مدير النظام",       icon: ShieldCheck, color: "text-purple-600 bg-purple-50 border-purple-200" },
  ...ROLES,
]

function getRoleInfo(role: string) {
  return ROLES_ADMIN.find(r => r.value === role) ?? ROLES_ADMIN[0]
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Employee {
  id: number
  username: string
  name: string
  email: string | null
  role: string
  roleLabel: string
  permissions: string[] | null
  isActive: number
  createdAt: string
}

function normalizeEmployee(raw: Partial<Employee>): Employee {
  const role = typeof raw.role === "string" ? raw.role : "customer_service"
  return {
    id: Number(raw.id) || 0,
    username: typeof raw.username === "string" ? raw.username : "",
    name: typeof raw.name === "string" ? raw.name : "",
    email: typeof raw.email === "string" ? raw.email : null,
    role,
    roleLabel: typeof raw.roleLabel === "string" ? raw.roleLabel : role,
    permissions: Array.isArray(raw.permissions)
      ? raw.permissions.filter((permission): permission is string => typeof permission === "string")
      : null,
    isActive: Number(raw.isActive) === 1 ? 1 : 0,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
  }
}

interface FormData {
  username: string
  name: string
  email: string
  password: string
  role: string
  permissions: string[]
  useCustomPerms: boolean
}

const emptyForm = (): FormData => ({
  username: "", name: "", email: "", password: "",
  role: "customer_service",
  permissions: ROLE_DEFAULT_PERMS["customer_service"],
  useCustomPerms: false,
})

// ── Permission Groups Component ───────────────────────────────────────────────

function PermissionGroups({ perms, onChange }: {
  perms: string[]
  onChange: (perms: string[]) => void
}) {
  const groups = [...new Set(ALL_SECTIONS.map(s => s.group))]
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "رئيسية": true, "محتوى": false, "إعدادات": false
  })

  const toggle = (key: string) => {
    const next = perms.includes(key) ? perms.filter(p => p !== key) : [...perms, key]
    onChange(next)
  }
  const toggleGroup = (group: string) => {
    const groupKeys = ALL_SECTIONS.filter(s => s.group === group).map(s => s.key)
    const allOn = groupKeys.every(k => perms.includes(k))
    const next = allOn
      ? perms.filter(p => !groupKeys.includes(p))
      : [...new Set([...perms, ...groupKeys])]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {groups.map(group => {
        const groupSections = ALL_SECTIONS.filter(s => s.group === group)
        const allOn = groupSections.every(s => perms.includes(s.key))
        const someOn = groupSections.some(s => perms.includes(s.key))
        const isOpen = openGroups[group]
        return (
          <div key={group} className="border border-gray-200 rounded-xl overflow-hidden">
            <button type="button"
              onClick={() => setOpenGroups(g => ({ ...g, [group]: !g[group] }))}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <button type="button" onClick={e => { e.stopPropagation(); toggleGroup(group) }}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    allOn ? "bg-primary border-primary" : someOn ? "bg-primary/30 border-primary/50" : "border-gray-300"
                  }`}>
                  {allOn && <CheckCircle size={12} className="text-white" />}
                </button>
                <span className="text-sm font-bold text-gray-800">{group}</span>
                <span className="text-xs text-gray-400">
                  ({groupSections.filter(s => perms.includes(s.key)).length}/{groupSections.length})
                </span>
              </div>
              {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>
            {isOpen && (
              <div className="p-3 grid grid-cols-2 gap-2">
                {groupSections.map(s => (
                  <button key={s.key} type="button" onClick={() => toggle(s.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-right ${
                      perms.includes(s.key)
                        ? "bg-primary/5 border-primary/30 text-primary"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    {perms.includes(s.key)
                      ? <CheckCircle size={13} className="text-primary shrink-0" />
                      : <div className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />}
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function EmployeeModal({ employee, onClose, onSaved }: {
  employee: Employee | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState<FormData>(() => {
    if (employee) {
      return {
        username: employee.username,
        name: employee.name,
        email: employee.email ?? "",
        password: "",
        role: employee.role,
        permissions: employee.permissions ?? ROLE_DEFAULT_PERMS[employee.role] ?? [],
        useCustomPerms: !!employee.permissions,
      }
    }
    return emptyForm()
  })
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const isEdit = !!employee

  const isMe = employee?.id === myId()

  function setField<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleRoleChange(role: string) {
    setForm(f => ({
      ...f, role,
      permissions: f.useCustomPerms ? f.permissions : ROLE_DEFAULT_PERMS[role] ?? [],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast({ variant: "destructive", title: "الاسم مطلوب" }); return }
    if (!isEdit && !form.username.trim()) { toast({ variant: "destructive", title: "اسم المستخدم مطلوب" }); return }
    if (!isEdit && form.password.length < 6) { toast({ variant: "destructive", title: "كلمة المرور 6 أحرف على الأقل" }); return }

    setSaving(true)
    try {
      const body = {
        name: form.name,
        email: form.email,
        role: form.role,
        permissions: form.useCustomPerms ? form.permissions : null,
        ...(isEdit ? {} : { username: form.username }),
        ...(form.password ? { password: form.password } : {}),
      }

      const url = isEdit
        ? `${API_BASE}/api/admin/employees/${employee.id}`
        : `${API_BASE}/api/admin/employees`
      const method = isEdit ? "PUT" : "POST"
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body),
      })
      const data = await r.json() as { message?: string; error?: string }
      if (!r.ok) throw new Error(data.error ?? "فشل الحفظ")
      toast({ title: data.message ?? "تم الحفظ ✅" })
      onSaved()
      onClose()
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: String(e) })
    } finally {
      setSaving(false)
    }
  }

  const availableRoles = myRole() === "admin" ? ROLES_ADMIN : ROLES

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-2xl z-10">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users size={20} className="text-primary" />
            {isEdit ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
          </h3>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name + Username */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                <User size={12} /> الاسم الكامل *
              </label>
              <Input value={form.name} onChange={e => setField("name", e.target.value)}
                placeholder="مثال: أحمد محمد" className="h-10" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                <User size={12} /> اسم المستخدم *
              </label>
              <Input value={form.username}
                onChange={e => setField("username", e.target.value)}
                placeholder="ahmed123" className="h-10" dir="ltr"
                disabled={isEdit} required={!isEdit} />
              {isEdit && <p className="text-xs text-gray-400 mt-1">لا يمكن تغيير اسم المستخدم</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
              <Mail size={12} /> البريد الإلكتروني
            </label>
            <Input value={form.email} onChange={e => setField("email", e.target.value)}
              type="email" placeholder="ahmed@example.com" className="h-10" dir="ltr" />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
              <Lock size={12} /> {isEdit ? "كلمة مرور جديدة (اتركه فارغاً للإبقاء)" : "كلمة المرور *"}
            </label>
            <div className="relative">
              <Input
                value={form.password}
                onChange={e => setField("password", e.target.value)}
                type={showPass ? "text" : "password"}
                placeholder={isEdit ? "••••••••" : "6 أحرف على الأقل"}
                className="h-10 pl-10" dir="ltr"
                required={!isEdit}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Role */}
          {!isMe && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">الدور الوظيفي *</label>
              <div className="grid grid-cols-2 gap-2">
                {availableRoles.map(r => {
                  const RIcon = r.icon
                  return (
                    <button key={r.value} type="button" onClick={() => handleRoleChange(r.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.role === r.value ? r.color + " border-current" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}>
                      <RIcon size={16} className="shrink-0" />
                      {r.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Custom Permissions */}
          {!isMe && form.role !== "admin" && (
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-800">صلاحيات مخصصة</p>
                  <p className="text-xs text-gray-500">تجاوز الصلاحيات الافتراضية للدور</p>
                </div>
                <button type="button" onClick={() => {
                  const next = !form.useCustomPerms
                  setForm(f => ({
                    ...f,
                    useCustomPerms: next,
                    permissions: next ? f.permissions : ROLE_DEFAULT_PERMS[f.role] ?? [],
                  }))
                }}>
                  {form.useCustomPerms
                    ? <ToggleRight size={28} className="text-primary" />
                    : <ToggleLeft size={28} className="text-gray-400" />}
                </button>
              </div>

              {form.useCustomPerms ? (
                <PermissionGroups perms={form.permissions} onChange={p => setField("permissions", p)} />
              ) : (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-2 font-medium">الصلاحيات الافتراضية لهذا الدور:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(ROLE_DEFAULT_PERMS[form.role] ?? []).map(k => (
                      <span key={k} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        {ALL_SECTIONS.find(s => s.key === k)?.label ?? k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEdit ? "حفظ التغييرات" : "إضافة الموظف"}
            </Button>
            <Button type="button" onClick={onClose} variant="outline"
              className="h-11 px-5 rounded-xl font-medium">
              إلغاء
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({ employee, onClose, onDeleted }: {
  employee: Employee
  onClose: () => void
  onDeleted: () => void
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/employees/${employee.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      })
      const data = await r.json() as { message?: string; error?: string }
      if (!r.ok) throw new Error(data.error ?? "فشل الحذف")
      toast({ title: "تم حذف الموظف ✅" })
      onDeleted()
      onClose()
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: String(e) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">حذف الموظف</h3>
            <p className="text-sm text-gray-500">هذا الإجراء لا يمكن التراجع عنه</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-5">
          هل أنت متأكد من حذف <span className="font-bold text-gray-900">{employee.name}</span>؟
        </p>
        <div className="flex gap-3">
          <Button onClick={handleDelete} disabled={loading}
            className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            تأكيد الحذف
          </Button>
          <Button onClick={onClose} variant="outline" className="h-11 px-5 rounded-xl font-medium">
            إلغاء
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Employees() {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [modal, setModal] = useState<"add" | Employee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!r.ok) throw new Error("فشل تحميل البيانات")
       const data = await r.json() as unknown
       if (!Array.isArray(data)) throw new Error("استجابة غير صالحة")
       setEmployees(data.map(item => normalizeEmployee(item as Partial<Employee>)))
    } catch {
      toast({ variant: "destructive", title: "فشل تحميل قائمة الموظفين" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  async function toggleActive(emp: Employee) {
    try {
      const r = await fetch(`${API_BASE}/api/admin/employees/${emp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ isActive: emp.isActive === 1 ? 0 : 1 }),
      })
      const data = await r.json() as { error?: string }
      if (!r.ok) throw new Error(data.error ?? "فشل التعديل")
      toast({ title: emp.isActive === 1 ? "تم إيقاف الحساب" : "تم تفعيل الحساب" })
      load()
    } catch (e) {
      toast({ variant: "destructive", title: String(e) })
    }
  }

  const filtered = employees.filter(e =>
    ([e.name, e.username, e.roleLabel, e.email ?? ""].some(value => value.includes(search))) &&
    (roleFilter === "all" || e.role === roleFilter) &&
    (statusFilter === "all" || (statusFilter === "active" ? e.isActive === 1 : e.isActive !== 1))
  )

  const roleGroups = ROLES_ADMIN.map(r => ({
    ...r, count: employees.filter(e => e.role === r.value).length
  }))

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Users size={24} className="text-primary" /> إدارة الموظفين
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">إضافة وتعديل صلاحيات فريق العمل</p>
        </div>
        <Button onClick={() => setModal("add")}
          className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-10">
          <Plus size={16} /> إضافة موظف
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {roleGroups.map(r => {
          const RIcon = r.icon
          return (
            <div key={r.value} className={`rounded-2xl border p-4 ${r.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <RIcon size={16} />
                <span className="text-xs font-bold">{r.label}</span>
              </div>
              <p className="text-2xl font-black">{r.count}</p>
            </div>
          )
        })}
      </div>

       {/* Search + filters */}
       <div className="flex flex-col gap-2 sm:flex-row">
         <div className="relative flex-1">
           <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
           <Input value={search} onChange={e => setSearch(e.target.value)}
             placeholder="بحث بالاسم أو المستخدم أو البريد..." className="h-10 pr-10" />
         </div>
         <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
           aria-label="تصفية حسب الدور"
           className="h-10 rounded-md border border-input bg-background px-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary/20">
           <option value="all">كل الأدوار</option>
           {ROLES_ADMIN.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
         </select>
         <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
           aria-label="تصفية حسب الحالة"
           className="h-10 rounded-md border border-input bg-background px-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary/20">
           <option value="all">كل الحالات</option>
           <option value="active">نشطون فقط</option>
           <option value="inactive">موقوفون فقط</option>
         </select>
         {(search || roleFilter !== "all" || statusFilter !== "all") && (
           <Button type="button" variant="outline" onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all") }}
             className="h-10 shrink-0 gap-2">
             <X size={14} /> مسح
           </Button>
         )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={28} className="animate-spin text-primary/40" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
             <p className="font-medium">{search || roleFilter !== "all" || statusFilter !== "all" ? "لا توجد نتائج بهذه التصفية" : "لا يوجد موظفون بعد"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-bold border-b border-gray-100">
                  <th className="px-5 py-3 text-right">الموظف</th>
                  <th className="px-4 py-3 text-center">الدور</th>
                  <th className="px-4 py-3 text-center hidden md:table-cell">الصلاحيات</th>
                  <th className="px-4 py-3 text-center">الحالة</th>
                  <th className="px-4 py-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => {
                  const roleInfo = getRoleInfo(emp.role)
                  const RIcon = roleInfo.icon
                  const isMe = emp.id === myId()
                  const resolvedPerms = emp.permissions ?? ROLE_DEFAULT_PERMS[emp.role] ?? []
                  return (
                    <tr key={emp.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${roleInfo.color}`}>
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                              {emp.name}
                              {isMe && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">أنت</span>}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">{emp.username}</p>
                            {emp.email && <p className="text-xs text-gray-400">{emp.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${roleInfo.color}`}>
                          <RIcon size={12} />
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center hidden md:table-cell">
                        <div className="flex flex-wrap gap-1 justify-center max-w-48 mx-auto">
                          {resolvedPerms.slice(0, 3).map(k => (
                            <span key={k} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                              {ALL_SECTIONS.find(s => s.key === k)?.label ?? k}
                            </span>
                          ))}
                          {resolvedPerms.length > 3 && (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                              +{resolvedPerms.length - 3}
                            </span>
                          )}
                        </div>
                        {emp.permissions && (
                          <p className="text-[10px] text-amber-600 mt-1 font-medium">✎ مخصصة</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button onClick={() => !isMe && toggleActive(emp)}
                          disabled={isMe}
                          title={isMe ? "لا يمكنك إيقاف حسابك" : ""}
                          className="flex items-center gap-1.5 mx-auto disabled:opacity-50 disabled:cursor-not-allowed">
                          {emp.isActive === 1
                            ? <><ToggleRight size={22} className="text-green-500" /><span className="text-xs text-green-600 font-medium">نشط</span></>
                            : <><ToggleLeft size={22} className="text-gray-400" /><span className="text-xs text-gray-500 font-medium">موقوف</span></>}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setModal(emp)}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                            title="تعديل">
                            <Edit2 size={14} />
                          </button>
                          {!isMe && (
                            <button onClick={() => setDeleteTarget(emp)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="حذف">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal !== null && (
          <EmployeeModal
            employee={modal === "add" ? null : modal}
            onClose={() => setModal(null)}
            onSaved={load}
          />
        )}
        {deleteTarget && (
          <DeleteConfirm
            employee={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onDeleted={load}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
