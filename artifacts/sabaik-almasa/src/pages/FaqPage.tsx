import React, { useState } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { ChevronDown, HelpCircle, Phone, MessageCircle, Search, Box } from "lucide-react"
import { useSiteSettings, resolveContactNumbers } from "@/context/SiteSettingsContext"
import { siteUrl } from "@/lib/siteUrl"
import { Link } from "wouter"

interface FAQItem {
  q: string
  a: string
  category: string
}

const FAQS: FAQItem[] = [
  {
    category: "عام والتسعير",
    q: "ما هي مقاسات وأسعار حاويات الأنقاض في الرياض؟",
    a: "نوفر 4 مقاسات رئيسية لحاويات الأنقاض: حاوية صغيرة 12 ياردة (400 ريال)، حاوية متوسطة 15 ياردة (450 ريال)، حاوية كبيرة 20 ياردة (600 ريال)، وحاوية جامبو 30 ياردة (700 ريال). السعر يشمل التوصيل، مدة بقاء 10 أيام، والنقل والتفريغ في المرادم الرسمية."
  },
  {
    category: "عام والتسعير",
    q: "كم مدة بقاء الحاوية في الموقع للرد الواحد؟",
    a: "مدة بقاء الحاوية المعتمدة هي 10 أيام للرد الواحد. يمكن للعميل طلب سحب الحاوية وتفريغها مبكراً بمجرد امتلائها أو تمديد المدة بالتنسيق مع قسم العمليات."
  },
  {
    category: "عام والتسعير",
    q: "ما هي الأحياء والمناطق التي تغطونها في الرياض؟",
    a: "نغطي كافة أحياء الرياض بالكامل: شمال الرياض (الملقا، النرجس، الياسمين، حطين، العارض، الصحافة)، شرق الرياض (اليرموك، الرمال، القادسية، النسيم)، غرب الرياض (ظهرة لبن، السويدي، العريجاء)، جنوب الرياض (الشفا، العزيزية، بدر)، ووسط العاصمة."
  },
  {
    category: "حاويات الأنقاض ومخلفات البناء",
    q: "ما هي المواد المسموح بوضعها داخل حاوية الأنقاض؟",
    a: "يسمح بوضع مخلفات الهدم والترميم، الخرسانة، كتل البلوك، الرمل، الجبس بورد، البلاط والسيراميك، والقطع الحديدية الناتجة عن أعمال البناء."
  },
  {
    category: "حاويات الأنقاض ومخلفات البناء",
    q: "كيف أختار المقاس المناسب لمشروعي؟",
    a: "مشاريع الترميم وتعديل الشقق والفلل الصغيرة تناسبها حاويات 12 أو 15 ياردة. أما مشاريع بناء الفلل، الهدم والإنشاءات الكبرى فينصح باختيار حاويات 20 أو 30 ياردة لتقليل عدد الردود والتكلفة."
  },
  {
    category: "عقود النظافة ورخص بلدي",
    q: "هل عقود النظافة معتمدة ومربوطة مع منصة بلدي؟",
    a: "نعم، عقود النظافة لدينا إلكترونية ورسمية وموثقة لدى أمانة منطقة الرياض ومنصة بلدي، وتستخدم مباشرة في إصدار وتجديد رخص الأنشطة التجارية والمطاعم والشركات."
  },
  {
    category: "عقود النظافة ورخص بلدي",
    q: "كم يستغرق إصدار وتفعيل عقد النظافة الإلكتروني؟",
    a: "يتم إصدار العقد وربطه بحساب المنشأة في منصة بلدي خلال دقائق معدودة من إرسال السجل التجاري ورقم الرخصة."
  },
  {
    category: "حاويات النفايات والمكابس",
    q: "ما هي استخدامات مكابس النفايات الهيدروليكية (2 ياردة)؟",
    a: "تستخدم مكابس النفايات الكهربائية في المجمعات التجارية، الفنادق، المستشفيات، والمطاعم الكبرى لضغط النفايات بنسبة تصل إلى 80%، مما يمنع انتشار الروائح ويوفر مساحات التخزين ويقلل من عدد مرات التفريغ."
  },
  {
    category: "التوصيل والسلامة",
    q: "كم يستغرق توصيل الحاوية لموقعي في الرياض؟",
    a: "نوفر خدمة التوصيل الفوري خلال ساعتين من تأكيد الطلب، مع إمكانية حجز مواعيد مسبقة تناسب خطة العمل في موقعك."
  },
  {
    category: "التوصيل والسلامة",
    q: "كيف تضمنون سلامة الأرصفة والشارع أثناء تنزيل وسحب الحاوية؟",
    a: "شاحناتنا مجهزة بأنظمة هيدروليكية دقيقة، ويقوم سائقونا بوضع الحاوية بعناية فائقة في المكان المخصص دون الإضرار بالبلاط أو الأرصفة أو إعاقة حركة المرور."
  }
]

function normalizeArabicSearch(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const withoutArticle = token.replace(/^ال/, "")
      if (/^(?:حاويه|حاويه|حاويات|حاويه)$/.test(withoutArticle) || withoutArticle === "حاويه") return "حاويه"
      if (/^(?:اختار|اختيار|اختيارات|اختيارا)$/.test(withoutArticle)) return "اختيار"
      if (/^(?:مقاس|مقاسات)$/.test(withoutArticle)) return "مقاس"
      return withoutArticle
    })
    .join(" ")
}

function matchesArabicSearch(item: FAQItem, query: string): boolean {
  const normalizedQuery = normalizeArabicSearch(query)
  if (!normalizedQuery) return true
  const searchableText = normalizeArabicSearch(`${item.q} ${item.a} ${item.category}`)
  const queryTokens = normalizedQuery.split(" ").filter(Boolean)
  const matchedTokens = queryTokens.filter((token) => searchableText.includes(token))
  // Natural Arabic questions often vary word order and inflection. Require the
  // meaningful terms to overlap rather than relying on a literal full-string match.
  return matchedTokens.length >= Math.min(2, queryTokens.length)
}

export default function FaqPage() {
  const siteSettings = useSiteSettings()
  const [activeCategory, setActiveCategory] = useState("الكل")
  const [searchQuery, setSearchQuery] = useState("")
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const categories = ["الكل", "عام والتسعير", "حاويات الأنقاض ومخلفات البناء", "عقود النظافة ورخص بلدي", "حاويات النفايات والمكابس", "التوصيل والسلامة"]

  const filteredFaqs = FAQS.filter(item => {
    const matchCat = activeCategory === "الكل" || item.category === activeCategory
    const matchQuery = matchesArabicSearch(item, searchQuery)
    return matchCat && matchQuery
  })

  const { phoneCall, phoneWhatsapp, phones, companyName } = siteSettings
  const resolvedCompany = companyName || ""
  const { call: callNumber, whatsapp: whatsappNumber } = resolveContactNumbers(phoneCall, phoneWhatsapp, phones)

  useDocumentSEO({
    title: companyName ? `الأسئلة الشائعة حول تأجير الحاويات بالرياض | ${companyName}` : "الأسئلة الشائعة حول تأجير الحاويات وعقود بلدي بالرياض",
    description: "إجابات شاملة ومفصلة لكافة الأسئلة الشائعة حول مقاسات وأسعار تأجير حاويات الأنقاض والنفايات وعقود النظافة الإلكترونية المعتمدة بالرياض.",
    canonical: siteUrl("/faq"),
  })

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900" dir="rtl">
      <Navbar />

      {/* Hero */}
      <section className="bg-primary text-white py-16 px-4 relative overflow-hidden">
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-secondary text-sm font-bold mb-4">
            <HelpCircle size={16} /> مركز المساعدة وإجابات استفسارات الحاويات
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
            الأسئلة الأكثر شيوعاً
          </h1>
          <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto mb-8">
            كل ما تود معرفته عن مقاسات الحاويات، الأسعار، مدة البقاء، عقود النظافة البلدية، وسرعة التوصيل في الرياض.
          </p>

          {/* Search bar */}
          <div className="relative max-w-xl mx-auto">
            <input
              type="text"
              placeholder="ابحث عن سؤالك هنا (مثال: مقاس 20 ياردة، الأسعار، عقد بلدي، مدة البقاء)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-gray-800 rounded-2xl py-3.5 pr-12 pl-4 text-sm md:text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-secondary"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="container mx-auto max-w-4xl px-4 py-12 flex-1">
        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                activeCategory === cat
                  ? "bg-primary text-white shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQs Accordion */}
        <div className="space-y-4">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => {
              const isOpen = openIndex === index
              return (
                <div
                  key={index}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm transition-all"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full text-right p-5 flex items-center justify-between gap-4 font-bold text-gray-800 hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-3 text-base md:text-lg">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                        {index + 1}
                      </span>
                      {faq.q}
                    </span>
                    <ChevronDown
                      size={20}
                      className={`text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180 text-primary" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-gray-600 text-sm md:text-base leading-relaxed border-t border-gray-50 bg-gray-50/50">
                      <p className="mt-2">{faq.a}</p>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <HelpCircle className="mx-auto text-gray-300 mb-3" size={48} />
              <p className="text-gray-500 font-bold">لم نجد نتائج مطابقة لبحثك</p>
              <button
                onClick={() => { setActiveCategory("الكل"); setSearchQuery("") }}
                className="mt-3 text-primary text-sm font-bold underline"
              >
                إعادة ضبط البحث
              </button>
            </div>
          )}
        </div>

        {/* CTA Card */}
        <div className="mt-16 bg-gradient-to-br from-primary to-primary/95 text-white rounded-3xl p-8 md:p-10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-right">
            <h3 className="text-2xl font-black">لديك استفسار خاص بمشروعك؟</h3>
            <p className="text-white/80 text-sm md:text-base">
              فريق عمليات {resolvedCompany} جاهز للتنسيق وتحديد المقاس الأنسب وتوصيل الحاوية لموقعك فوراً.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            {callNumber && (
              <a
                href={`tel:${callNumber}`}
                className="inline-flex items-center gap-2 bg-secondary text-primary font-black px-6 py-3.5 rounded-xl text-sm shadow hover:scale-105 transition-all"
              >
                <Phone size={18} /> اتصل بالعمليات
              </a>
            )}
            {whatsappNumber && (
              <a
                href={`https://wa.me/966${whatsappNumber.replace(/^0/, "")}?text=${encodeURIComponent("مرحباً، لدي استفسار بخصوص تأجير الحاويات بالرياض")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 text-white font-bold px-6 py-3.5 rounded-xl text-sm shadow hover:bg-green-600 transition-all"
              >
                <MessageCircle size={18} /> واتساب مباشر
              </a>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
