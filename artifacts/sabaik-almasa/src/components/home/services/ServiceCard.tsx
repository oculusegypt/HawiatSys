import React from "react"
import { Link } from "wouter"
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { useServiceRequest } from "@/context/ServiceRequestContext"

export interface ServiceCardProps {
  id: number
  title: string
  description: string
  icon: LucideIcon
  seoSlug?: string
  images?: string[]
  companyName?: string
  detailsLabel?: string
  index?: number
}

export function ServiceCard({
  id,
  title,
  description,
  icon: Icon,
  seoSlug,
  images = [],
  detailsLabel,
  index = 0,
}: ServiceCardProps) {
  const { openModal } = useServiceRequest()
  const hasImages = images.length > 0
  const targetSlug = seoSlug || String(id)
  const detailHref = `/services/${encodeURIComponent(targetSlug)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="service-card group relative bg-white transition-all duration-300 hover:-translate-y-1.5 overflow-hidden flex flex-col justify-between"
      data-testid={`card-service-${id}`}
    >
      {hasImages && (
        <div className="service-media-edge relative w-full h-56 md:h-64 bg-slate-100">
          <img
            src={images[0]}
            alt={`${title} في الرياض`}
            data-testid={`img-service-${id}`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
            width="960"
            height="640"
            loading={index < 2 ? "eager" : "lazy"}
            onError={(event) => {
              event.currentTarget.closest("div")?.remove()
            }}
          />
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full p-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-secondary group-hover:text-slate-950 group-hover:scale-110 shadow-sm">
          <Icon size={28} />
        </div>

        <h3 className="text-xl font-extrabold text-slate-950 mb-2.5 transition-colors duration-300 group-hover:text-primary">
          <Link href={detailHref} className="hover:underline" data-testid={`link-service-title-${id}`}>
            {title}
          </Link>
        </h3>

        <p className="leading-relaxed text-sm text-slate-600 mb-6 flex-1 line-clamp-3">
          {description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-slate-700 hover:text-secondary transition-colors"
            data-testid={`link-service-detail-${id}`}
          >
            {detailsLabel || "تفاصيل الخدمة ←"}
          </Link>
          <button
            type="button"
            onClick={() => openModal({ serviceType: title })}
            data-testid={`button-request-service-${id}`}
            className="rounded-xl bg-slate-900 hover:bg-secondary hover:text-slate-950 px-4 py-2 text-xs font-bold text-white transition-all shadow-sm active:scale-95"
          >
            اطلب الخدمة
          </button>
        </div>
      </div>
    </motion.div>
  )
}
