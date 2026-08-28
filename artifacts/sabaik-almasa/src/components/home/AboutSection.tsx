import { motion } from "framer-motion"
import { CheckCircle2, ShieldCheck, Target } from "lucide-react"
import { useSiteSettings } from "@/context/SiteSettingsContext"

export function AboutSection() {
  const { homepageContent, companyName } = useSiteSettings()
  const content = homepageContent.about || {}
  const resolvedCompany = companyName || ""

  const title = content.title || "شريكك الرائد في"
  const highlight = content.highlight || "تأجير الحاويات وإدارة المخلفات"
  const eyebrow = content.eyebrow || "عن المنشأة"
  const description = content.description || (resolvedCompany ? `${resolvedCompany} خيارك الأمثل في عالم تأجير الحاويات ونقل الأنقاض ومخلفات البناء والهدم والنفايات بالرياض. نقدم خدماتنا بأسطول حديث ومعايير سلامة بيئية صارمة وسرعة استجابة فائقة.` : "الخيار الأمثل في عالم تأجير الحاويات ونقل الأنقاض ومخلفات البناء والهدم والنفايات بالرياض. نقدم خدماتنا بأسطول حديث ومعايير سلامة بيئية صارمة وسرعة استجابة فائقة.")
  const imageUrl = content.imageUrl || "/images/Taqi-hero1.webp"
  const points = (content.points && content.points.length > 0) ? content.points.filter(Boolean) : [
    "أسطول شاحنات وحاويات بمقاسات متنوعة من 6 إلى 30 ياردة",
    "توصيل وسحب سريع خلال 2 إلى 4 ساعات على مدار الساعة",
    "عقود نظافة معتمدة وموثقة لتجديد الرخص التجارية",
    "تغطية شاملة لكافة أحياء ومناطق الرياض وضواحيها",
  ]
  const visionTitle = content.visionTitle || "رؤيتنا"
  const visionDescription = content.visionDescription || "أن نكون المؤسسة الأولى المعتمدة في المملكة في تقديم الحلول اللوجستية وتأجير الحاويات."
  const missionTitle = content.missionTitle || "رسالتنا"
  const missionDescription = content.missionDescription || "توفير حلول فورية وموثوقة لإزالة ونقل الأنقاض والمخلفات بأعلى كفاءة وأفضل الأسعار."

  return (
    <section id="about" className="py-24 bg-gray-50 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            {eyebrow && (
              <div className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-bold mb-6">
                {eyebrow}
              </div>
            )}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-6 leading-tight">
              {title} <span className="text-secondary">{highlight}</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">{description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4">
                <div className="bg-primary/5 p-3 rounded-lg text-primary shrink-0"><Target size={24} /></div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">{visionTitle}</h4>
                  <p className="text-sm text-gray-600">{visionDescription}</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4">
                <div className="bg-secondary/10 p-3 rounded-lg text-secondary shrink-0"><ShieldCheck size={24} /></div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">{missionTitle}</h4>
                  <p className="text-sm text-gray-600">{missionDescription}</p>
                </div>
              </div>
            </div>

            {points.length > 0 && (
              <ul className="space-y-3">
                {points.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex items-center gap-3 text-gray-700 font-medium">
                    <CheckCircle2 className="text-secondary" size={20} />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden aspect-[4/5] md:aspect-square lg:aspect-[4/5] shadow-2xl">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
                width={960}
                height={1200}
                loading="lazy"
                decoding="async"
              />
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-primary to-transparent">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-xl text-white">
                  <p className="font-bold text-2xl mb-2">{content.statValue || "8+"}</p>
                  <p className="text-sm text-gray-200">{content.statLabel || "سنوات خبرة في تأجير الحاويات ونقل الأنقاض"}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}