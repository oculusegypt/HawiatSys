import { motion } from "framer-motion"
import { Quote } from "lucide-react"
import { useSiteSettings } from "@/context/SiteSettingsContext"

export function CEOMessage() {
  const { companyName, homepageContent } = useSiteSettings()
  const ceo = (homepageContent as any)?.ceo || (homepageContent?.sections as any)?.ceo || {}

  const resolvedName = companyName || "خدمات الحاويات"
  const title = ceo.title || "كلمة الإدارة العامة"
  const subtitle = ceo.subtitle || "نبني شراكات موثوقة في إدارة المخلفات والأنقاض"
  const p1 = ceo.message1 || `نعتبر أنفسنا شركاء نجاح حقيقيين لكافة المشاريع الإنشائية والتطويرية والتجارية في مدينة الرياض. التزامنا بتوفير حاويات متينة بمختلف المقاسات، وسرعة استجابة فائقة في التوصيل والسحب، ونقل آمن ومسؤول للأنقاض والمخلفات وفق أعلى الاشتراطات البيئية هو الأساس الذي بنينا عليه ريادتنا.`
  const p2 = ceo.message2 || `ندرك أن النهضة العمرانية المتسارعة التي تشهدها العاصمة تتطلب دعماً لوجستياً فعالاً وموثوقاً لإدارة المخلفات، ونحن مستمرون في تطوير أسطولنا وخدماتنا لنكون دائماً الخيار الأول والموثوق لكافة عملائنا من مقاولين ومطورين وأفراد.`
  const authorName = ceo.authorName || "الإدارة العامة"
  const authorTitle = companyName || "مؤسسة تقي جروب"
  const authorImage = ceo.authorImage || "/images/shareek-mawsouq.webp"

  return (
    <section className="py-24 bg-primary text-white relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-4 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative w-64 h-64 md:w-80 md:h-80"
            >
              <div className="absolute inset-0 rounded-full border-2 border-secondary/30 scale-105 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border border-secondary scale-110"></div>
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-2xl relative z-10 bg-white">
                <img 
                  src={authorImage} 
                  alt={`${authorName} — ${authorTitle}`}
                  className="w-full h-full object-cover"
                   width={320}
                   height={320}
                   loading="lazy"
                   decoding="async"
                  onError={(e) => {
                    e.currentTarget.src = "/images/shareek-mawsouq.webp"
                  }}
                />
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <Quote size={80} className="absolute -top-10 -right-8 text-white/10 transform rotate-180" />
              
              <h2 className="text-2xl font-bold text-secondary mb-2">{title}</h2>
              <h3 className="text-3xl font-bold mb-6">{subtitle}</h3>
              
              <div className="space-y-4 text-lg text-gray-300 leading-relaxed italic mb-8 relative z-10">
                <p>{p1}</p>
                {p2 && <p>{p2}</p>}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="h-0.5 w-12 bg-secondary"></div>
                <div>
                   <h4 className="font-bold text-xl text-white">{authorName}</h4>
                   <p className="text-secondary text-sm">{authorTitle}</p>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  )
}
