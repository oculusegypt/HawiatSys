import { useMemo, useState } from "react"
import { CheckCircle2, KeyRound, ShieldCheck, Shield, Headphones, ClipboardList, Truck, Users } from "lucide-react"

const roleData = [
  { key: "admin", label: "مدير النظام", icon: ShieldCheck, color: "bg-purple-50 text-purple-700 border-purple-200", specialty: "إدارة كاملة للنظام والأمان والبيانات", permissions: ["كل أقسام النظام", "إدارة الموظفين والأدوار", "قاعدة البيانات", "التقارير المالية والتشغيلية"] },
  { key: "manager", label: "مدير", icon: Shield, color: "bg-blue-50 text-blue-700 border-blue-200", specialty: "إدارة التشغيل والفرق والمحتوى", permissions: ["لوحة القيادة", "الطلبات وأوامر العمل", "التقارير والتحليلات", "الخدمات والباقات والمحتوى"] },
  { key: "customer_service", label: "خدمة عملاء", icon: Headphones, color: "bg-green-50 text-green-700 border-green-200", specialty: "التواصل مع العملاء ومتابعة المحادثات", permissions: ["لوحة القيادة", "المحادثات", "واتساب", "الإشعارات"] },
  { key: "requests_officer", label: "مسؤول طلبات", icon: ClipboardList, color: "bg-amber-50 text-amber-700 border-amber-200", specialty: "استقبال الطلبات وتجهيزها للإسناد", permissions: ["لوحة القيادة", "الطلبات", "الإشعارات"] },
  { key: "driver", label: "سائق", icon: Truck, color: "bg-teal-50 text-teal-700 border-teal-200", specialty: "تنفيذ أوامر العمل الميدانية وتحديث حالتها", permissions: ["مهامي اليومية", "بيانات العميل والموقع", "الاتجاهات", "إثبات التنفيذ"] },
] as const

export default function RolesPermissions() {
  const [selected, setSelected] = useState("admin")
  const role = useMemo(() => roleData.find(item => item.key === selected) ?? roleData[0], [selected])
  const RoleIcon = role.icon
  return (
    <div dir="rtl" className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-3xl bg-gradient-to-l from-[#0b2a3f] to-[#164b5b] p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><KeyRound size={23} className="text-[#e0b84f]" /></div>
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#e0b84f]">دليل الوصول</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">الأدوار والتخصصات والصلاحيات</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">تعريف واضح لمسؤولية كل دور وما يستطيع الوصول إليه داخل المنصة. عدّل الصلاحيات التفصيلية من صفحة الموظفين.</p>
          </div>
        </div>
      </header>
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="space-y-3">
          {roleData.map(item => {
            const Icon = item.icon
            return <button key={item.key} type="button" onClick={() => setSelected(item.key)} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-right transition-all ${selected === item.key ? "border-[#0b2a3f] bg-[#0b2a3f] text-white shadow-md" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"}`}>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected === item.key ? "bg-white/10 text-[#e0b84f]" : item.color}`}><Icon size={19} /></span>
              <span className="min-w-0"><strong className="block text-sm">{item.label}</strong><small className={`mt-1 block truncate text-xs ${selected === item.key ? "text-white/60" : "text-slate-500"}`}>{item.specialty}</small></span>
            </button>
          })}
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${role.color}`}><RoleIcon size={25} /></div>
            <div><p className="text-xs font-bold text-slate-400">الدور المحدد</p><h2 className="mt-1 text-2xl font-black text-[#0b2a3f]">{role.label}</h2><p className="mt-1 text-sm text-slate-500">{role.specialty}</p></div>
          </div>
          <div className="mt-6">
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-800"><Users size={17} className="text-[#0b2a3f]" /> نطاق الصلاحيات</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {role.permissions.map(permission => <div key={permission} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />{permission}</div>)}
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-[#dce8ed] bg-[#f4f9fb] p-4 text-xs leading-6 text-slate-600">الصلاحيات الافتراضية تُطبّق تلقائياً عند إنشاء الموظف. يمكن لمدير النظام منح صلاحيات مخصصة من نموذج الموظف، مع بقاء حماية المسارات مطبقة من الخادم.</div>
        </section>
      </div>
    </div>
  )
}