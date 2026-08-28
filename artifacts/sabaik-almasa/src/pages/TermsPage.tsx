import React from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { FileCheck, Sparkles, AlertCircle, Clock, CheckCircle } from "lucide-react"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { siteUrl } from "@/lib/siteUrl"
import { Link } from "wouter"

export default function TermsPage() {
  const siteSettings = useSiteSettings()

  useDocumentSEO({
    title: `الشروط والأحكام | ${siteSettings.companyName}`,
    description: "الشروط والأحكام والضوابط المنظمة لتأجير الحاويات وتوصيلها وسحبها ونقل مخلفات البناء وأنظمة السلامة بالرياض.",
    canonical: siteUrl("/terms"),
  })

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900" dir="rtl">
      <Navbar />

      {/* Hero */}
      <section className="bg-primary text-white py-14 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-secondary text-sm font-bold mb-4">
            <FileCheck size={16} /> الشروط والضوابط المنظمة
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4">
            الشروط والأحكام
          </h1>
          <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto">
            توضح هذه الاتفاقية ضوابط وشروط تقديم خدمات وباقات النظافة والتطهير المتخصصة لعملائنا في الرياض.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="container mx-auto max-w-4xl px-4 py-12 flex-1 space-y-8">
        <div className="bg-white rounded-3xl p-6 md:p-10 border border-gray-100 shadow-sm space-y-6 text-gray-700 leading-relaxed text-sm md:text-base">
          
          <div>
            <h2 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
              <Sparkles className="text-secondary" size={20} /> 1. نطاق الخدمة والتنفيذ
            </h2>
            <p>
              يقوم فريق عمل <strong>{siteSettings.companyName}</strong> بتنفيذ أعمال التنظيف والتطهير وفقاً للباقة المحددة والتفاصيل المتفق عليها مع العميل في نموذج الطلب أو محضر المعاينة الميدانية، باستخدام أحدث الأجهزة والمواد المصرحة.
            </p>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h2 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
              <Clock className="text-secondary" size={20} /> 2. المواعيد والحجوزات
            </h2>
            <p>
              يتم تأكيد موعد وصول الفريق مسبقاً مع العميل عبر الاتصال أو الواتساب. يُرجى من العميل التواجد أو تفويض من ينوب عنه في الموقع لتسهيل دخول الفريق واستلام الأعمال بعد الانتهاء.
            </p>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h2 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
              <CheckCircle className="text-secondary" size={20} /> 3. معاينة واستلام الأعمال والضمان
            </h2>
            <p>
              يقوم العميل أو من ينوب عنه بمعاينة الموقع فور انتهاء الفريق من أعمال التنظيف والتأكد من مطابقتها لأعلى معايير الجودة. في حال وجود أي ملاحظة، يقوم الفريق بمعالجتها فوراً قبل مغادرة الموقع.
            </p>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h2 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
              <AlertCircle className="text-secondary" size={20} /> 4. التعديل والإلغاء
            </h2>
            <p>
              يمكن للعميل تعديل موعد الخدمة أو إلغاء الطلب قبل الموعد المحدد بوقت كافٍ دون أي رسوم إضافية عبر التواصل مع فريق خدمة العملاء من خلال صفحة <Link href="/contact" className="text-primary font-bold underline">اتصل بنا</Link>.
            </p>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
