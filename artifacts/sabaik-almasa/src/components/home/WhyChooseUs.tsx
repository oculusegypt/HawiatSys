import { motion } from "framer-motion"
import { CheckCircle } from "lucide-react"
import { useSiteSettings } from "@/context/SiteSettingsContext"

export function WhyChooseUs() {
  const { homepageContent, companyName } = useSiteSettings()
  const content = homepageContent.why || {}

  const titlePrefix = content.titlePrefix || "لماذا تختار"
  const titleHighlight = content.titleHighlight || (companyName ? `خدمات ${companyName} لتأجير الحاويات بالرياض؟` : "خدماتنا لتأجير الحاويات بالرياض؟")
  const description = content.description || "نوفر حلولاً لوجستية متطورة لإدارة مخلفات البناء والهدم والمشاريع الكبرى بأعلى درجات الالتزام والأمان والسلامة بالرياض."
  const imageUrl = content.imageUrl || "/images/Taqi-hero2.webp"
  const points = (content.points && content.points.length > 0) ? content.points.filter(Boolean) : [
    "سرعة الاستجابة والتوصيل الفوري 24/7",
    "تنوع مقاسات الحاويات (6، 10، 12، 15، 20، 30 ياردة)",
    "مكابس نفايات كهربائية وهيدروليكية للمنشآت",
    "عقود سنوية ودورية معتمدة من أمانة الرياض",
    "أسعار واضحة وتنافسية بدون أي رسوم خفية",
    "تفريغ قانوني وآمن في المرادم المعتمدة",
    "فريق دعم فني وسائقون محترفون على دراية بأحياء الرياض",
    "خصومات خاصة للمقاولين والمشاريع الكبرى",
  ]
  const badgeValue = content.badgeValue || "✓"
  const badgeTitle = content.badgeTitle || "شريك معتمد وموثوق"
  const badgeDescription = content.badgeDescription || "خدمة 24 ساعة بالرياض"

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1 relative"
          >
            <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl relative">
              <img
                src={imageUrl}
                alt={titleHighlight}
                className="w-full h-full object-cover"
                width={960}
                height={720}
                loading="lazy"
                decoding="async"
              />
              <div className="absolute top-8 right-8 bg-white p-4 rounded-xl shadow-xl flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center text-secondary">
                  <span className="font-bold text-xl">{badgeValue}</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">{badgeTitle}</p>
                  <p className="text-sm text-gray-500">{badgeDescription}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6 leading-tight">
                {titlePrefix} <span className="text-secondary">{titleHighlight}</span>
              </h2>
              <p className="text-gray-600 text-lg mb-8">{description}</p>
              {points.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {points.map((point, index) => (
                    <motion.div
                      key={`${point}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100"
                    >
                      <CheckCircle className="text-secondary shrink-0 mt-0.5" size={20} />
                      <span className="text-gray-800 text-sm font-medium">{point}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}