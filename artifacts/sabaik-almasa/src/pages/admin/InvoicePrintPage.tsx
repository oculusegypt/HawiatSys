import { useMemo } from "react"
import { useLocation } from "wouter"
import { useGetContainerSystem } from "@workspace/api-client-react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Printer } from "lucide-react"

export default function InvoicePrintPage() {
  const [, navigate] = useLocation()
  const id = Number(window.location.pathname.split("/").filter(Boolean).at(-2))
  const query = useGetContainerSystem()
  const record = query.data?.records?.find(item => item.id === id && item.kind === "invoice")
  const p = (record?.payload ?? {}) as Record<string, unknown>
  const qrText = String(p.qrCodeData ?? JSON.stringify({ invoiceNumber: p.invoiceNumber ?? record?.reference, total: p.total ?? p.amount, date: p.date }))
  const qrUrl = useMemo(() => `https://quickchart.io/qr?size=180&margin=1&text=${encodeURIComponent(qrText)}`, [qrText])
  if (!record) return <div className="p-10 text-center" dir="rtl">جارٍ تحميل الفاتورة أو لم يتم العثور عليها.</div>
  return <div dir="rtl" className="min-h-screen bg-slate-100 p-4 sm:p-8">
    <style>{`@page{size:A4;margin:0}@media print{.print-hidden{display:none!important}.invoice-paper{box-shadow:none!important;margin:0!important}}.invoice-paper{width:210mm;min-height:297mm}`}</style>
    <div className="print-hidden mx-auto mb-4 flex max-w-[210mm] justify-between">
      <Button variant="ghost" onClick={() => navigate("/admin/container-system")} className="gap-2"><ArrowRight size={16}/> العودة</Button>
      <Button onClick={() => window.print()} className="gap-2 bg-cyan-800"><Printer size={15}/> طباعة الفاتورة</Button>
    </div>
    <article className="invoice-paper mx-auto bg-white px-[16mm] py-[14mm] text-slate-900 shadow-2xl">
      <header className="flex items-start justify-between border-b-2 border-cyan-800 pb-5">
        <div><p className="text-xs font-bold text-cyan-800">فاتورة إلكترونية</p><h1 className="mt-2 text-3xl font-black">فاتورة ضريبية</h1><p className="mt-2 text-xs text-slate-500">مستند رسمي صادر من نظام إدارة الخدمات</p></div>
        <div className="text-left text-xs leading-7"><p><b>رقم الفاتورة:</b> <span dir="ltr">{String(p.invoiceNumber ?? record.reference)}</span></p><p><b>التاريخ:</b> {String(p.date ?? "—")}</p><p><b>الحالة:</b> {String(record.status)}</p></div>
      </header>
      <section className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 p-5 text-sm">
        <div><p className="text-xs font-bold text-slate-400">العميل</p><p className="mt-1 font-black">{String(p.customerName ?? "—")}</p></div>
        <div><p className="text-xs font-bold text-slate-400">الرقم الضريبي</p><p className="mt-1 font-bold" dir="ltr">{String(p.customerTaxNumber ?? "—")}</p></div>
        <div className="col-span-2"><p className="text-xs font-bold text-slate-400">العنوان</p><p className="mt-1 font-bold">{String(p.serviceAddress ?? p.customerAddress ?? "—")}</p></div>
      </section>
      <table className="mt-8 w-full border-collapse text-sm"><thead><tr className="bg-cyan-50 text-right"><th className="border border-cyan-100 p-3">البيان</th><th className="border border-cyan-100 p-3">الكمية</th><th className="border border-cyan-100 p-3">السعر</th><th className="border border-cyan-100 p-3">الإجمالي</th></tr></thead><tbody><tr><td className="border border-slate-200 p-4 font-bold">{String(p.description ?? "خدمات حاويات")}</td><td className="border border-slate-200 p-4">{String(p.quantity ?? 1)}</td><td className="border border-slate-200 p-4">{Number(p.unitPrice ?? p.amount ?? 0).toLocaleString("ar-SA")} ر.س</td><td className="border border-slate-200 p-4 font-black">{Number(p.amount ?? 0).toLocaleString("ar-SA")} ر.س</td></tr></tbody></table>
      <div className="mt-6 ml-auto grid max-w-sm gap-2 text-sm"><div className="flex justify-between"><span>قبل الضريبة</span><b>{Number(p.amount ?? 0).toLocaleString("ar-SA")} ر.س</b></div><div className="flex justify-between"><span>ضريبة القيمة المضافة ({String(p.taxRate ?? 15)}%)</span><b>{Number(p.taxAmount ?? 0).toLocaleString("ar-SA")} ر.س</b></div><div className="flex justify-between border-t-2 border-cyan-800 pt-2 text-lg"><span>الإجمالي</span><b>{Number(p.total ?? p.amount ?? 0).toLocaleString("ar-SA")} ر.س</b></div></div>
      <footer className="mt-16 flex items-end justify-between border-t border-slate-200 pt-6 text-xs text-slate-500"><div><p>طريقة السداد: {String(p.paymentMethod ?? "—")}</p><p className="mt-2">العقد المرتبط: {String(p.contractNumber ?? "—")}</p></div><img src={qrUrl} alt="QR الفاتورة" className="h-28 w-28" /><div className="text-left">تم إنشاء الفاتورة إلكترونياً<br/>رقم السجل: {record.id}</div></footer>
    </article>
  </div>
}