import { Link } from "wouter"
import { motion } from "framer-motion"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useServiceRequest } from "@/context/ServiceRequestContext"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { useState } from "react"
import { entityPath } from "@/lib/friendlySlug"

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
  const { companyName } = useSiteSettings()
  const hasImages = images.length > 0
  const [imageFailed, setImageFailed] = useState(false)
  const detailHref = `/services/${entityPath({ slug: seoSlug, title, id, fallback: "service" })}`

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="service-card group relative bg-white transition-all duration-300 hover:-translate-y-2 overflow-hidden flex flex-col"
      data-testid={`card-service-${id}`}
    >
      <div className={`service-media relative w-full aspect-[16/10] bg-slate-100 ${hasImages && !imageFailed ? "" : "service-media-fallback"}`}>
        {hasImages && !imageFailed ? (
          <img
            src={images[0]}
            alt={`${title} في الرياض`}
            data-testid={`img-service-${id}`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            width="960"
            height="640"
             loading="lazy"
             decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#3aaea5]">
            <Icon size={42} strokeWidth={1.5} />
            <span className="text-xs font-bold">خدمة ميدانية في الرياض</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12384b]/75 via-transparent to-transparent pointer-events-none" />
        <span className="absolute top-4 right-4 rounded-full border border-white/25 bg-[#12384b]/85 px-3 py-1.5 text-[11px] font-extrabold text-white backdrop-blur-sm">
          خدمة متاحة
        </span>
        <div className="absolute bottom-4 right-4 left-4 flex items-end justify-between gap-3 text-white">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-[#12384b] shadow-lg">
            <Icon size={23} />
          </span>
          <span className="text-xs font-bold text-white/85">{companyName || "المنشأة"} · الرياض</span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col flex-1 p-6 md:p-7">
        <h3 className="text-xl font-extrabold text-slate-950 mb-3 transition-colors duration-300 group-hover:text-primary">
          <Link href={detailHref} className="hover:text-[#3aaea5] transition-colors" data-testid={`link-service-title-${id}`}>
            {title}
          </Link>
        </h3>

        <p className="leading-relaxed text-sm text-slate-600 mb-5 flex-1 line-clamp-3">
          {description}
        </p>

        <div className="mb-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f2f8f8] px-2.5 py-1.5 text-[11px] font-bold text-[#406170]">
            <CheckCircle2 size={13} className="text-[#3aaea5]" /> تنفيذ منظم
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#fff7e8] px-2.5 py-1.5 text-[11px] font-bold text-[#765517]">
            <CheckCircle2 size={13} /> عرض حسب الموقع
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#12384b] hover:text-[#3aaea5] transition-colors"
            data-testid={`link-service-detail-${id}`}
          >
            {detailsLabel || "تفاصيل الخدمة"} <ArrowLeft size={14} />
          </Link>
          <button
            type="button"
            onClick={() => openModal({ serviceType: title })}
            data-testid={`button-request-service-${id}`}
            className="rounded-xl bg-[#12384b] hover:bg-[#3aaea5] hover:text-[#12384b] px-4 py-2.5 text-xs font-bold text-white transition-all shadow-sm active:scale-95"
          >
            اطلب الخدمة
          </button>
        </div>
      </div>
    </motion.article>
  )
}
