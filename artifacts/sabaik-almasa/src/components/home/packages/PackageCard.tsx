import React from "react"
import { Link } from "wouter"
import type { Container } from "@workspace/api-client-react"
import { Check, Maximize, Weight, Info, Clock, Phone, MessageCircle } from "lucide-react"
import { resolveContactNumbers, useSiteSettings } from "@/context/SiteSettingsContext"
import { entityPath } from "@/lib/friendlySlug"

export interface PackageCardProps {
  container: Container
  index?: number
  companyName?: string
  onRequest: () => void
}

export const ARABIC_CATEGORY_NAMES: Record<string, string> = {
  debris: "مخلفات البناء والأنقاض",
  waste: "النفايات التجارية",
  contract: "عقود النظافة",
}

function parseImages(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      }
    } catch {}
  }
  return []
}

export function getContainerImage(container: Container): string {
  const firstSavedImage = parseImages(container.images)[0]
  if (container.imageUrl && container.imageUrl.trim() && !/^\/images\/packages\/package-\d+\.png$/i.test(container.imageUrl.trim())) {
    return container.imageUrl
  }
  if (firstSavedImage) return firstSavedImage
  if (container.category === "waste") return "/images/container-waste-small.webp"
  return "/images/Taqi-hero3.webp"
}

function parseFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw === "string") {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return []
}

function PhoneRow({ callNumber, whatsappNumber, name }: { callNumber: string; whatsappNumber: string; name: string }) {
  if (!callNumber && !whatsappNumber) return null
  const waMsg = encodeURIComponent(`أريد الاستفسار عن ${name}`)
  const waHref = whatsappNumber
    ? `https://wa.me/966${whatsappNumber.replace(/^0/, "")}?text=${waMsg}`
    : ""
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {callNumber && (
        <a href={`tel:${callNumber}`}
          className="flex items-center justify-center gap-1.5 border-2 border-slate-200 hover:border-slate-800 text-slate-800 py-2.5 rounded-xl text-xs font-bold transition-all hover:bg-slate-50">
          <Phone size={13} className="text-secondary" /> اتصل فوري
        </a>
      )}
      {waHref && (
        <a href={waHref} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md">
          <MessageCircle size={13} /> واتساب
        </a>
      )}
    </div>
  )
}

export function resolveServiceTypeFromContainer(c: { category?: any; name?: any; id?: any }): string {
  return c?.name ? String(c.name) : "الباقة المختارة"
}

export function PackageCard({ container: c, onRequest }: PackageCardProps) {
  const feats = parseFeatures(c.features)
  const { phoneWhatsapp, phoneCall, phones } = useSiteSettings()
  const { call: defaultCall, whatsapp: defaultWa } = resolveContactNumbers(phoneCall, phoneWhatsapp, phones)

  const callNumber = c.contactPhone2 || c.contactPhone1 || defaultCall
  const whatsappNumber = c.contactPhone1 || defaultWa

  const categoryArabic = ARABIC_CATEGORY_NAMES[c.category || ""] || "حاوية متاحة"
  const detailHref = `/containers/${entityPath({ slug: c.seoSlug, title: c.name, id: c.id, fallback: "container" })}`

  return (
    <article className="inventory-card bg-white rounded-3xl overflow-hidden flex flex-col justify-between group" data-testid={`card-container-${c.id}`}>
      <div className="inventory-media relative overflow-hidden bg-slate-100">
        {getContainerImage(c) ? (
          <img
            src={getContainerImage(c)}
            alt={c.name}
            data-testid={`img-container-${c.id}`}
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
            width="960"
            height="640"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "/images/Taqi-hero3.webp"
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-white font-bold text-lg">
            {c.name}
          </div>
        )}
        {categoryArabic && (
          <div className={`absolute top-3.5 right-3.5 backdrop-blur-md font-black text-xs px-3 py-1.5 rounded-xl shadow-md border ${
            c.category === 'waste'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : c.category === 'contract'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-secondary text-slate-950 border-amber-400'
          }`}>
            {categoryArabic}
          </div>
        )}
        {c.priceText && (
          <div className="absolute bottom-3.5 right-3.5 bg-amber-100/95 backdrop-blur-md text-amber-950 font-extrabold text-xs px-3.5 py-1.5 rounded-xl border border-amber-300 shadow-lg">
            {c.priceText}
          </div>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col gap-3.5">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 leading-snug group-hover:text-primary transition-colors">
            <Link href={detailHref} className="hover:underline" data-testid={`link-container-detail-${c.id}`}>{c.name}</Link>
          </h3>
          {(c.size || c.capacity) && (
            <div className="flex flex-wrap gap-2.5 mt-2 text-xs">
              {c.size && (
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200/60 px-2.5 py-1 rounded-lg font-bold">
                  <Maximize size={13} className="text-amber-600" />
                  <span>{c.size}</span>
                </div>
              )}
              {c.capacity && (
                <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">
                  <Weight size={13} className="text-slate-500" />
                  <span>{c.capacity}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">{c.description}</p>

        {feats.length > 0 && (
          <div className="space-y-2 pt-1">
            {feats.slice(0, 4).map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                  <Check size={11} className="stroke-[3]" />
                </div>
                <span>{f}</span>
              </div>
            ))}
          </div>
        )}

        {c.suitableFor && (
          <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
            <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <span><strong className="text-slate-800">مناسب لـ:</strong> {c.suitableFor}</span>
          </div>
        )}

        {c.rentalPeriod && (
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Clock size={13} className="text-amber-600 shrink-0" />
            <span>{c.rentalPeriod}</span>
          </div>
        )}

        {c.priceNote && (
          <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-xl px-3 py-2 border border-emerald-200/80">
            ✓ {c.priceNote}
          </p>
        )}

        <div className="pt-3 mt-auto border-t border-slate-100 space-y-2">
          <button
            onClick={onRequest}
            type="button"
            data-testid={`button-request-container-${c.id}`}
            className="w-full text-center bg-primary hover:bg-secondary hover:text-slate-950 text-white font-extrabold py-3 rounded-2xl transition-all duration-300 text-sm shadow-md hover:shadow-xl transform active:scale-98"
          >
            {"اطلب الحاوية الآن ←"}
          </button>
          <Link href={detailHref} className="block text-center text-xs font-bold text-slate-500 hover:text-primary transition-colors py-1" data-testid={`link-container-read-${c.id}`}>
            عرض مواصفات الحاوية
          </Link>
          <PhoneRow callNumber={callNumber} whatsappNumber={whatsappNumber} name={c.name} />
        </div>
      </div>
    </article>
  )
}
