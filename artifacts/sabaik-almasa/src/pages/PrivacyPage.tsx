import React from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { ShieldCheck, Lock, Eye, FileText, CheckCircle2 } from "lucide-react"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { siteUrl } from "@/lib/siteUrl"
import { Link } from "wouter"

export default function PrivacyPage() {
  const siteSettings = useSiteSettings()

  useDocumentSEO({
    title: `سياسة الخصوصية وحماية البيانات | ${siteSettings.companyName}`,
    description: "سياسة الخصوصية وحماية البيانات الشخصية لعملاء تأجير الحاويات ونقل مخلفات البناء وفق الأنظمة واللوائح المعمول بها في المملكة العربية السعودية.",
    canonical: siteUrl("/privacy"),
  })

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900" dir="rtl">
      <Navbar />

      {/* Hero */}
      <section className="bg-primary text-white py-14 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-secondary text-sm font-bold mb-4">
            <ShieldCheck size={16} /> حماية وخصوصية البيانات
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4">
            سياسة الخصوصية
          </h1>
          <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto">
            نلتزم بحماية خصوصية بياناتك ومعلوماتك الشخصية وفقاً لنظام حماية البيانات الشخصية بالمملكة العربية السعودية.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="container mx-auto max-w-4xl px-4 py-12 flex-1 space-y-8">
        <div className="bg-white rounded-3xl p-6 md:p-10 border border-gray-100 shadow-sm space-y-6 text-gray-700 leading-relaxed text-sm md:text-base">
          
          <div>
            <h2 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
              <Lock className="text-secondary" size={20} /> 1. مقدمة والتزام
            </h2>
            <p>
              نحن في <strong>{siteSettings.companyName}</strong> نضع خصوصية وأمان بيانات عملائنا على رأس أولوياتنا. توضح هذه السياسة كيفية جمع واستخدام وحماية البيانات الشخصية التي تقدمها لنا عند استخدامك لموقعنا الإلكتروني أو طلب تأجير حاوية أو نقل مخلفات البناء.
            </p>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h2 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
              <Eye className="text-secondary" size={20} /> 2. البيانات التي نجمعها
            </h2>
            <p className="mb-2">نقوم بجمع البيانات الضرورية فقط لتنفيذ الخدمة بكفاءة عالية، وتشمل:</p>
            <ul className="space-y-2 pr-5 list-disc text-gray-600">
              <li><strong>معلومات الاتصال:</strong> الاسم، رقم الجوال، والبريد الإلكتروني (إن وجد).</li>
              <li><strong>بيانات الموقع:</strong> المدينة (الرياض)، الحي السكني، ونوع العقار (شقة، فيلا، قصر، منشأة).</li>
              <li><strong>تفاصيل الطلب:</strong> أعداد الغرف، مساحة الرخام، أعداد المكيفات، ونوع الخدمات الإضافية المختارة.</li>
            </ul>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h2 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
              <FileText className="text-secondary" size={20} /> 3. الغرض من استخدام البيانات
            </h2>
            <ul className="space-y-2 pr-5 list-disc text-gray-600">
              <li>التواصل المباشر معك لتقديم عروض الأسعار المجانية وتأكيد مواعيد المعاينة والخدمة.</li>
              <li>توجيه فرق العمل والسيارات المجهزة بدقة إلى موقع العقار المحدد بالرياض.</li>
              <li>متابعة مستوى جودة الخدمة وضمان رضا العملاء بعد انتهاء أعمال التنظيف.</li>
              <li>الامتثال للأنظمة والتعليمات الرسمية المعمول بها في المملكة العربية السعودية.</li>
            </ul>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h2 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
              <ShieldCheck className="text-secondary" size={20} /> 4. أمن البيانات وسريتها
            </h2>
            <p>
              نطبق أعلى المعايير التقنية والتنظيمية لتأمين بياناتك ومنع الوصول غير المصرح به أو التعديل أو الإفصاح عنها. نؤكد أننا <strong>لا نقوم ببيع أو تأجير أو مشاركة بياناتك الشخصية مع أي أطراف ثالثة لأغراض تجارية</strong>.
            </p>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h2 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
              <CheckCircle2 className="text-secondary" size={20} /> 5. حقوقك والتواصل معنا
            </h2>
            <p>
              يحق لك في أي وقت طلب مراجعة أو تعديل أو حذف بياناتك الشخصية المسجلة لدينا عبر التواصل معنا من خلال صفحة <Link href="/contact" className="text-primary font-bold underline">اتصل بنا</Link> أو عبر قنوات الدعم المعتمدة.
            </p>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
