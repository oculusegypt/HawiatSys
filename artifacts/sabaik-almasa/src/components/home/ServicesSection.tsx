import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGetServices } from "@workspace/api-client-react"
import { Truck, Factory, Trash2, Leaf, Box, Settings, ChevronLeft, ChevronRight, ShieldCheck, Flame, ClipboardCheck, FileText, Wrench } from "lucide-react"
import { Link } from "wouter"
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

// Mini image carousel for service cards
function ServiceImageCarousel({ images, title, companyName }: { images: string[]; title?: string; companyName: string }) {
  const [idx, setIdx] = useState(0)
  if (images.length === 0) return null

  const prev = (e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length) }
  const next = (e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => (i + 1) % images.length) }

  return (
    <div className="relative w-full h-56 md:h-64 overflow-hidden mb-0 group/carousel">
      <AnimatePresence mode="wait">
        <motion.img
          key={idx}
          src={images[idx]}
          alt={title ? `${title} بالرياض — ${companyName}` : `خدمات تأجير الحاويات ونقل الأنقاض بالرياض`}
          className="w-full h-full object-cover"
            width="960"
            height="640"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none" }}
        />
      </AnimatePresence>

      {images.length > 1 && (
        <>
          <button onClick={prev}
             data-testid={`button-service-image-prev-${title || "service"}`}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 opacity-0 group-hover/carousel:opacity-100 transition-opacity">
            <ChevronLeft size={14} />
          </button>
          <button onClick={next}
             data-testid={`button-service-image-next-${title || "service"}`}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 opacity-0 group-hover/carousel:opacity-100 transition-opacity">
            <ChevronRight size={14} />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setIdx(i) }}
                 data-testid={`button-service-image-dot-${title || "service"}-${i}`}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-white w-3" : "bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
