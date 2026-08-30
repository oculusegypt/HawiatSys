import { useEffect, useState } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { Link, useRoute } from "wouter"
import { ChevronLeft, Check, Phone, MessageCircle, Package } from "lucide-react"
import { useGetContainers } from "@workspace/api-client-react"
import type { Container } from "@workspace/api-client-react"
import { ServiceRequestForm } from "@/components/home/ServiceRequestForm"
import { useServiceRequest } from "@/context/ServiceRequestContext"
import { resolveServiceTypeFromContainer, getContainerImage, ARABIC_CATEGORY_NAMES } from "@/components/home/packages/PackageCard"
import { siteUrl } from "@/lib/siteUrl"
import { resolveContactNumbers, useSiteSettings } from "@/context/SiteSettingsContext"
import { entityPath, entitySlug, legacyEntitySlug } from "@/lib/friendlySlug"
import { breadcrumbSchema, containerSchema, pageSchema } from "@/lib/seoSchema"
import { useDocumentSchema } from "@/hooks/useDocumentSchema"

/** Convert container name+size to a URL slug (mirrors the old site's pattern) */
function toSlug(text: string): string {
  return text
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, "")
}

/** Find a container by URL slug — tries multiple matching strategies */
function findContainer(containers: Container[], slug: string): Container | undefined {
  const s = decodeURIComponent(slug).toLowerCase()
  return containers.find(c => {
    const namePart  = toSlug(c.name).toLowerCase()
    const sizePart  = c.size ? toSlug(c.size).toLowerCase() : ""
    const combined  = toSlug(`${c.name}-${c.size}`).toLowerCase()
    const seoPart   = c.seoSlug ? toSlug(c.seoSlug).toLowerCase() : ""
    const friendlyPart = entitySlug({ slug: c.seoSlug, title: c.name, id: c.id, fallback: "container" })
    return (
      s === String(c.id).toLowerCase() ||
      s === friendlyPart.toLowerCase() ||
      s === legacyEntitySlug({ slug: c.seoSlug, title: c.name, id: c.id, fallback: "container" }).toLowerCase() ||
      (seoPart && s === seoPart) ||
      s === namePart ||
      s === sizePart ||
      s === combined ||
      // partial match: slug contains a number from the size (e.g. "20" in "حاويات-20-ياردة")
      (sizePart && s.replace(/-/g, "").includes(sizePart.replace(/-/g, "")))
    )
  })
}

export default function PackageDetail() {
  const [, containerParams] = useRoute("/containers/:slug")
  const [, legacyParams] = useRoute("/container/:slug")
  const [, packageParams] = useRoute("/cleaning-packages/:slug")
  const slug = containerParams?.slug || legacyParams?.slug || packageParams?.slug || ""
  const { data: apiContainers, isLoading, isError, refetch } = useGetContainers()
  const [container, setContainer] = useState<Container | null>(null)
  const { openModal } = useServiceRequest()
  const { phoneCall, phoneWhatsapp, phones, companyName } = useSiteSettings()

  useEffect(() => {
    if (!apiContainers?.length) return
    const found = findContainer(apiContainers, slug)
    setContainer(found ?? null)
  }, [apiContainers, slug])

  const { call: callNumber, whatsapp: whatsappNumber } = resolveContactNumbers(phoneCall, phoneWhatsapp, phones)
  const waHref = container && whatsappNumber
    ? `https://wa.me/966${whatsappNumber.replace(/^0/, "")}?text=${encodeURIComponent(`أريد الاستفسار عن ${container.name}`)}`
    : "#"

  useDocumentSEO({
    title: container
      ? `${container.name}${container.size ? ` ${container.size}` : ""} | تأجير حاويات بالرياض`
      : "تفاصيل الباقة — خدمات التنظيف",
    description: container?.description ?? "تفاصيل وأسعار باقات تنظيف المنازل والفلل بالرياض.",
    canonical: siteUrl(`/containers/${entityPath({ slug: container?.seoSlug, title: container?.name, id: container?.id, fallback: "container" })}`),
    ogImage: container ? getContainerImage(container) : "/images/seo/taqi-containers.jpg",
    ogImageAlt: container ? `${container.name} لتأجير الحاويات بالرياض` : "حاويات للإيجار بالرياض",
    indexable: Boolean(container) && (typeof window === "undefined" || window.location.pathname.startsWith("/containers/")),
  })

  const containerUrl = siteUrl(`/containers/${entityPath({ slug: container?.seoSlug, title: container?.name, id: container?.id, fallback: "container" })}`)
  const containerDescription = container?.seoDescription || container?.description || "تفاصيل الحاوية المناسبة لمخلفات المشروع داخل الرياض."
  const categoryName: Record<string, string> = {
    debris: "حاويات الأنقاض ومخلفات البناء",
    waste: "حاويات النفايات للمنشآت",
    contract: "عقود النظافة الإلكترونية",
  }
  const containerSchemaValue = container ? {
    "@graph": [
      pageSchema({
        id: "webpage",
        type: "WebPage",
        name: container.name,
        description: containerDescription,
        url: containerUrl,
        image: getContainerImage(container),
        companyName: companyName || "المنشأة",
        about: categoryName[container.category || ""] || "تأجير الحاويات ونقل المخلفات",
      }),
      containerSchema({
        name: `${container.name}${container.size ? ` — ${container.size}` : ""}`,
        description: containerDescription,
        url: containerUrl,
        image: getContainerImage(container),
        category: categoryName[container.category || ""] || container.category,
        companyName: companyName || "المنشأة",
        priceText: container.priceText,
        pricePerDay: container.pricePerDay,
      }),
      breadcrumbSchema([
        { name: "الرئيسية", url: siteUrl("/") },
        { name: "الحاويات", url: siteUrl("/containers") },
        { name: container.name, url: containerUrl },
      ]),
    ],
  } : null
  useDocumentSchema("container-detail-schema", containerSchemaValue, Boolean(container))

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-gray-50" dir="rtl">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-32">
          <div className="h-10 w-2/3 rounded-xl bg-slate-200 animate-pulse mb-8" />
          <div className="grid md:grid-cols-2 gap-8">
            <div className="h-80 rounded-3xl bg-white animate-pulse" />
            <div className="h-80 rounded-3xl bg-white animate-pulse" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-gray-50" dir="rtl">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <h1 className="text-2xl font-black text-primary mb-3">تعذر تحميل مواصفات الحاوية</h1>
            <p className="text-gray-500 mb-5">حاول إعادة المحاولة أو تصفح جميع الحاويات.</p>
            <button type="button" onClick={() => refetch()} className="bg-primary text-white px-5 py-3 rounded-xl font-bold ml-2" data-testid="button-retry-container-detail">إعادة المحاولة</button>
            <Link href="/containers" className="text-primary font-bold hover:underline" data-testid="link-container-detail-list">عرض الحاويات</Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!container && apiContainers) {
    // Not found — redirect to container listing
    return (
      <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-center px-4 py-20">
          <div>
            <p className="text-gray-500 text-lg mb-4">الحاوية غير موجودة</p>
            <Link href="/containers" className="text-primary font-bold hover:underline" data-testid="link-container-not-found">عرض جميع الحاويات</Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      <Navbar />

      {/* Hero */}
      <div className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-3">
            <Link href="/" className="hover:text-white transition-colors">الرئيسية</Link>
            <ChevronLeft size={14} />
            <Link href="/containers" className="hover:text-white transition-colors">الحاويات</Link>
            <ChevronLeft size={14} />
            <span className="text-white">{container?.name ?? "..."}</span>
          </div>
          {container?.category && (
            <div className="mb-2">
              <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-bold">
                {ARABIC_CATEGORY_NAMES[container.category] || container.category}
              </span>
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-black">
            {container ? `${container.name}${container.size ? ` — ${container.size}` : ""}` : "جارٍ التحميل..."}
          </h1>
          {container?.suitableFor && (
            <p className="text-white/70 mt-2 text-lg">مناسبة لـ: {container.suitableFor}</p>
          )}
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 md:px-6 py-12">
        {container && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
            {/* Image */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white aspect-video">
              <img
                src={getContainerImage(container)}
                alt={container.name}
                width="960"
                height="640"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details */}
            <div className="space-y-6">
              {/* Price */}
              {container.priceText && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                  <p className="text-sm text-gray-500 mb-1">السعر</p>
                  <p className="text-2xl font-black text-primary">{container.priceText}</p>
                  {container.priceNote && <p className="text-sm text-gray-600 mt-1">{container.priceNote}</p>}
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {container.size && (
                  <div className="bg-white border border-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">الحجم</p>
                    <p className="font-bold text-gray-800">{container.size}</p>
                  </div>
                )}
                {container.capacity && (
                  <div className="bg-white border border-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">السعة</p>
                    <p className="font-bold text-gray-800">{container.capacity}</p>
                  </div>
                )}
                {container.rentalPeriod && (
                  <div className="bg-white border border-gray-100 rounded-xl p-4 col-span-2">
                    <p className="text-xs text-gray-400 mb-1">مدة الإيجار</p>
                    <p className="font-bold text-gray-800">{container.rentalPeriod}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {container.description && (
                <p className="text-gray-600 leading-relaxed">{container.description}</p>
              )}

              {/* Features */}
              {Array.isArray(container.features) && container.features.length > 0 && (
                <ul className="space-y-2">
                  {container.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-700 text-sm">
                      <Check size={16} className="text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              {/* CTA buttons */}
              <div className="flex gap-3 flex-wrap pt-2">
                <button
                  onClick={() => openModal({
                    serviceType: resolveServiceTypeFromContainer(container),
                    containerSize: `${container.name}${container.size ? ` - ${container.size}` : ""}`,
                    containerName: container.name,
                  })}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-md"
                >
                  <Package size={18} /> اطلب الخدمة الآن
                </button>
                <a href={waHref} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-md">
                  <MessageCircle size={18} /> واتساب
                </a>
                {callNumber && (
                  <a href={`tel:${callNumber}`}
                    className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-primary px-6 py-3 rounded-xl font-bold transition-colors shadow-sm">
                    <Phone size={18} /> اتصال مباشر
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Request form */}
        <div className="border-t pt-10">
          <h2 className="text-2xl font-bold text-primary mb-6">أو أرسل طلبك مباشرة</h2>
          <ServiceRequestForm />
        </div>
      </main>

      <Footer />
    </div>
  )
}
