import { motion, AnimatePresence } from "framer-motion"
import { useGetContainers } from "@workspace/api-client-react"
import type { Container } from "@workspace/api-client-react"
import { useServiceRequest } from "@/context/ServiceRequestContext"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { PackageCard } from "@/components/home/packages/PackageCard"

export function PackagesSection({ initialCategory = "all" }: { initialCategory?: string }) {
  const { data: apiData, isLoading } = useGetContainers()
  const { openModal } = useServiceRequest()
  const { companyName, homepageContent } = useSiteSettings()
  const copy = homepageContent.sections?.packages

  const all: Container[] = (apiData ?? [])
    .filter((c) => c.isActive)
    .sort((a, b) => a.order - b.order)
  const filtered = all

  if (!isLoading && all.length === 0) return null

  return (
    <section id="containers" className="py-24 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">

        {/* Header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-secondary font-bold text-sm tracking-wider uppercase bg-secondary/10 px-4 py-1.5 rounded-full inline-block mb-3">
            {companyName ? `حاويات ${companyName}` : "حاويات المشاريع والأنقاض"}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            {copy?.title || "مقاسات وأسعار"}{" "}
            <span className="text-secondary">{copy?.highlight || (companyName ? `حاويات ${companyName}` : "الحاويات المتاحة")}</span>
          </h2>
          <div className="w-24 h-1.5 bg-secondary mx-auto rounded-full mb-6" />
          <p className="text-gray-600 text-lg">
            {copy?.description || "اختر الباقة المناسبة لاحتياجاتك، وسيتواصل معك فريقنا لتأكيد التفاصيل وموعد التنفيذ."}
          </p>
        </motion.div>

        {/* Cards Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={initialCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-md animate-pulse h-80" />
                ))
              : filtered.map((c, i) =>
                  <PackageCard key={c.id} container={c} index={i} companyName={companyName} onRequest={() =>
                    openModal({
                      serviceType: c.name,
                      containerSize: `${c.name}${c.size ? ` - ${c.size}` : ""}`,
                      containerName: c.name,
                    })
                  } />
                )}
            {!isLoading && filtered.length === 0 && (
              <div className="col-span-full text-center py-16 text-gray-400">
                <p className="text-lg">لا توجد حاويات في هذه الفئة حالياً</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  )
}
