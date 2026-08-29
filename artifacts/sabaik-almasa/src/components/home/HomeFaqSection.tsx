import { ChevronDown, HelpCircle } from "lucide-react"
import { useSiteSettings } from "@/context/SiteSettingsContext"

const FAQS = [
  {
    q: "ما المقاس المناسب لحاوية مخلفات البناء في الرياض؟",
    a: "يعتمد المقاس على كمية المخلفات ومساحة المشروع ونوع العمل. نساعدك في اختيار الحاوية المناسبة لأعمال الترميم أو البناء أو الهدم قبل التوصيل.",
  },
  {
    q: "كيف يتم تحديد سعر تأجير الحاوية بالرياض؟",
    a: "يتحدد العرض حسب حجم الحاوية ونوع المخلفات وموقع المشروع ومدة التأجير، مع توضيح تكلفة التوصيل والسحب أو التبديل قبل تأكيد الطلب.",
  },
  {
    q: "هل تشمل الخدمة توصيل الحاوية وسحبها؟",
    a: "نعم، ننسق موعد توصيل الحاوية إلى موقعك ثم سحبها أو تبديلها عند الامتلاء أو انتهاء مدة التأجير حسب احتياج المشروع.",
  },
  {
    q: "هل توفرون حاويات أنقاض ونفايات لجميع أحياء الرياض؟",
    a: "نخدم شمال وشرق وغرب وجنوب ووسط الرياض، ونؤكد التغطية والموعد بعد استلام العنوان ونوع المخلفات والمقاس المطلوب.",
  },
]

export function HomeFaqSection() {
  const { companyName } = useSiteSettings()
  const resolvedCompany = companyName || "مؤسسة تقي جروب"
  const schemaItems = FAQS.map((faq, index) => ({
    "@type": "Question",
    name: index === 0
      ? `${faq.q} لدى ${resolvedCompany}`
      : faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  }))

  return (
    <section
      id="faq"
      className="border-t border-slate-200 bg-white py-20"
      aria-labelledby="home-faq-heading"
    >
      <div className="container mx-auto max-w-4xl px-4 md:px-6">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
            <HelpCircle size={16} aria-hidden="true" />
            إجابات قبل طلب الحاوية
          </span>
          <h2 id="home-faq-heading" className="mb-4 text-3xl font-black text-primary md:text-4xl">
            الأسئلة الشائعة حول تأجير الحاويات بالرياض
          </h2>
          <p className="text-base leading-8 text-slate-600">
            معلومات مباشرة تساعدك على اختيار المقاس ومعرفة طريقة التسعير والتوصيل والسحب.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              open
              className="group rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 marker:hidden">
                <span>{faq.q}</span>
                <ChevronDown
                  size={20}
                  aria-hidden="true"
                  className="shrink-0 text-primary transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 border-t border-slate-200 pt-3 text-sm leading-8 text-slate-600">
                {faq.a}
              </p>
            </details>
          ))}
        </div>

        <script
          id="home-visible-faq-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: schemaItems,
            }),
          }}
        />
      </div>
    </section>
  )
}