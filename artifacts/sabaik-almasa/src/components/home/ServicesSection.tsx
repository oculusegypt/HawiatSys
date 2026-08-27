import { motion } from "framer-motion"
import { useGetServices } from "@workspace/api-client-react"
import { Truck, Factory, Trash2, Leaf, Box, Settings, ShieldCheck, Flame, ClipboardCheck, FileText, Wrench } from "lucide-react"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { ServiceCard } from "@/components/home/services/ServiceCard"

// Map string icons from DB to actual lucide components
const iconMap: Record<string, any> = {
  "truck": Truck,
  "factory": Factory,
  "trash2": Trash2,
  "leaf": Leaf,
  "box": Box,
  "settings": Settings,
  "Truck": Truck,
  "Factory": Factory,
  "Trash2": Trash2,
  "Leaf": Leaf,
  "Box": Box,
  "Settings": Settings,
  "ShieldCheck": ShieldCheck,
  "Flame": Flame,
  "ClipboardCheck": ClipboardCheck,
  "FileText": FileText,
  "Wrench": Wrench,
}

function parseImages(raw: any, fallback?: string | null): string[] {
  try {
    const arr = JSON.parse(raw ?? "[]")
    if (Array.isArray(arr) && arr.length > 0) return arr.filter(Boolean)
  } catch {}
  return fallback ? [fallback] : []
}

export function ServicesSection() {
  const { data: services } = useGetServices()
  const { companyName, homepageContent } = useSiteSettings()
  const copy = homepageContent.sections?.services

  if (!services || services.length === 0) return null

  return (
    <section id="services" className="py-24 bg-white relative">
      <div className="container mx-auto px-4 md:px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {(copy?.title || copy?.highlight) && (
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                {copy.title} {copy.highlight && <span className="text-secondary">{copy.highlight}</span>}
              </h2>
            )}
            <div className="w-24 h-1.5 bg-secondary mx-auto rounded-full mb-6"></div>
            {copy?.description && <p className="text-gray-600 text-lg">{copy.description}</p>}
          </motion.div>
        </div>

        <div className="service-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.filter(s => s.isActive !== false).map((service, index) => {
            const raw = service as any
            const images = parseImages(raw.images, service.imageUrl)
            const Icon = iconMap[service.icon] || Settings

            return (
              <ServiceCard
                key={service.id}
                id={service.id}
                title={service.title}
                description={service.description}
                icon={Icon}
                seoSlug={raw.seoSlug}
                images={images}
                companyName={companyName}
                detailsLabel={copy?.detailsLabel}
                index={index}
              />
            )
          })}
        </div>

      </div>
    </section>
  )
}
