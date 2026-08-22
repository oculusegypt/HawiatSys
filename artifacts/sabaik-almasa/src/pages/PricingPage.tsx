import { useEffect } from "react"
import { Link } from "wouter"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { useServiceRequest } from "@/context/ServiceRequestContext"
import { Phone, MessageCircle, ChevronLeft, CheckCircle2, AlertCircle, Box } from "lucide-react"
import { getSiteUrl } from "@/lib/siteUrl"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { PUBLIC_PRICING_NOTICE, PUBLIC_PRICING_PACKAGES } from "@/lib/pricing"

const FACTORS = [
  { title: "مقاس الحاوية المطلوب", desc: "تتراوح المقاسات من 12 إلى 30 ياردة لمخلفات الأنقاض، و6 إلى 10 ياردة للنفايات التجارية." },
  { title: "نوع ووزن المخلفات", desc: "مخلفات الهدم الثقيلة والخرسانة المسلحة تختلف عن مخلفات الترميم الخفيفة أو النفايات العضوية." },
  { title: "مدة بقاء الحاوية والتفريغات", desc: "المدة القياسية 10 أيام للرد، مع إمكانية جدولة ردود متعددة أو عقود سنوية للمنشآت." },
  { title: "الموقع وسهولة الوصول بالرياض", desc: "أسطولنا يغطي جميع أحياء شمال، شرق، جنوب، وغرب الرياض مع الالتزام بالسلامة وتفادي الإضرار بالأرصفة." },
]

const FAQS = [
  {
    q: "كم سعر إيجار حاوية الأنقاض 20 ياردة في الرياض؟",
    a: "سعر إيجار حاوية 20 ياردة هو 500 ريال للرد الواحد شامل التوصيل والسحب والتفريغ في المردم الرسمي لمدة بقاء تصل إلى 10 أيام.",
  },
  {
    q: "كم سعر إيجار حاوية الأنقاض الصغيرة 12 ياردة؟",
    a: "سعر حاوية 12 ياردة هو 400 ريال للرد، وهي مثالية لمشاريع الترميم الصغيرة والتعديلات الداخلية.",
  },
  {
    q: "هل توفرون عقود نظافة إلكترونية معتمدة للبلدية؟",
    a: "نعم، نقدم عقود نظافة معتمدة ومربوطة فورياً مع منصة بلدي وأمانة منطقة الرياض لتجديد وإصدار الرخص التجارية.",
  },
  {
    q: "ما هي المدة المسموح بها لبقاء الحاوية في الموقع؟",
    a: "مدة بقاء الحاوية هي 10 أيام للرد الواحد، ويمكن تمديد المدة أو طلب السحب والتبديل في أي وقت بتواصل سريع.",
  },
  {
    q: "ما هي المناطق التي تخدمونها في الرياض؟",
    a: "نغطي كافة أحياء الرياض: شمال الرياض (الملقا، الياسمين، النرجس، العارض، حطين)، شرق الرياض (الرمال، القادسية، اليرموك)، جنوب الرياض، وغرب الرياض ووسط العاصمة.",
  },
  {
    q: "كم يستغرق توصيل الحاوية بعد تأكيد الطلب؟",
    a: "يتم توصيل الحاوية لموقعك خلال ساعتين من تأكيد الطلب للطلبات الفورية، أو في الموعد المحدد للطلبات المجدولة.",
  },
]

export default function PricingPage() {
  const { companyName, phoneCall, phoneWhatsapp, logoUrl, priceRange, address, city, region, country, isLoaded } = useSiteSettings()
  const resolvedCompany = companyName || ""
  const pricingWhatsappHref = `https://wa.me/966${(phoneWhatsapp || "0554498403").replace(/^0/, "")}?text=${encodeURIComponent("أريد الاستفسار عن أسعار تأجير الحاويات")}`
  const packagesWhatsappHref = `https://wa.me/966${(phoneWhatsapp || "0554498403").replace(/^0/, "")}?text=${encodeURIComponent("أريد طلب تأجير حاوية")}`

  useEffect(() => {
    if (!isLoaded) return
    const SITE_URL = getSiteUrl()
    document.title = companyName ? `أسعار تأجير الحاويات بالرياض | ${companyName}` : "أسعار تأجير الحاويات بالرياض | عروض حصرية وتوصيل فوري"

    const setMeta = (attr: string, name: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el) }
      el.content = content
    }
    setMeta("name", "description", `أسعار تأجير حاويات الأنقاض والنفايات والمكابس بالرياض ${companyName ? `من ${companyName}` : ""}. أسعار تبدأ من 400 ريال للرد شامل التوصيل والسحب والتفريغ في المرادم الرسمية.`)
    setMeta("name", "keywords", "أسعار تأجير الحاويات بالرياض, حاوية 12 ياردة, حاوية 20 ياردة, حاوية 30 ياردة, عقد نظافة بلدي, نقل مخلفات الهدم بالرياض")
    setMeta("property", "og:title", companyName ? `أسعار تأجير الحاويات بالرياض | ${companyName}` : "أسعار تأجير الحاويات بالرياض")
    setMeta("property", "og:description", "اطلب حاويتك الآن بأفضل الأسعار مع التوصيل الفوري والتفريغ المعتمد.")
    setMeta("property", "og:url", `${SITE_URL}/pricing`)
    setMeta("property", "og:image", `${SITE_URL}/images/hero-debris-container.jpg`)
    setMeta("property", "og:image:alt", `أسعار تأجير الحاويات بالرياض — ${resolvedCompany}`)
    setMeta("property", "og:locale", "ar_SA")
    setMeta("property", "og:site_name", `${resolvedCompany} — تأجير حاويات بالرياض`)
    setMeta("property", "og:type", "website")
    setMeta("name", "twitter:card", "summary_large_image")
    setMeta("name", "twitter:image", `${SITE_URL}/images/hero-debris-container.jpg`)
    setMeta("name", "twitter:url", `${SITE_URL}/pricing`)

    let canon = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null
    if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon) }
    canon.href = `${SITE_URL}/pricing`

    // Pricing schema
    const existing = document.getElementById("pricing-schema")
    if (existing) existing.remove()
    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "تأجير حاويات الأنقاض والنفايات بالرياض",
        "url": `${SITE_URL}/pricing`,
        "description": "تأجير حاويات 12 و 15 و 20 و 30 ياردة لنقل مخلفات البناء والهدم وعقود النظافة الإلكترونية بالرياض",
        "provider": {
          "@type": "LocalBusiness",
          "name": resolvedCompany,
          "@id": `${SITE_URL}/#business`,
          "image": logoUrl || `${SITE_URL}/images/logo.webp`,
          "priceRange": priceRange || "$$",
          "telephone": phoneCall ? `+966${phoneCall.replace(/^0/, "")}` : "+966554498403",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": address || "طريق الملك فهد، حي الصحافة",
            "addressLocality": city || "الرياض",
            "addressRegion": region || "منطقة الرياض",
            "addressCountry": country || "SA",
          },
        },
        "areaServed": "الرياض",
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "قائمة أسعار الحاويات",
          "itemListElement": PUBLIC_PRICING_PACKAGES.map((pkg, index) => ({
            "@type": "Offer",
            "position": index + 1,
            "name": pkg.name,
            "description": pkg.priceNote,
            "itemOffered": { "@type": "Service", "name": pkg.name },
          })),
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": FAQS.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a }
        }))
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": SITE_URL },
          { "@type": "ListItem", "position": 2, "name": "أسعار تأجير الحاويات", "item": `${SITE_URL}/pricing` },
        ]
      }
    ]
    const s = document.createElement("script")
    s.id = "pricing-schema"
    s.type = "application/ld+json"
    s.textContent = JSON.stringify(schemas)
    document.head.appendChild(s)

    return () => { document.getElementById("pricing-schema")?.remove() }
  }, [resolvedCompany, phoneCall, logoUrl, priceRange, address, city, region, country, isLoaded])

  const { openModal } = useServiceRequest()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-bl from-primary to-primary/80 text-white pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <nav className="flex items-center gap-2 text-white/60 text-sm mb-4">
            <Link href="/"><span className="hover:text-white transition-colors">الرئيسية</span></Link>
            <ChevronLeft size={13} />
            <span className="text-white">أسعار تأجير الحاويات</span>
          </nav>
          <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight">
            أسعار تأجير الحاويات بالرياض
            <span className="block text-2xl md:text-3xl text-secondary mt-1">أسعار واضحة وشاملة التوصيل والسحب</span>
          </h1>
          <p className="text-white/80 text-lg max-w-2xl leading-relaxed">
            نوفر لك حاويات الأنقاض والنفايات بمختلف المقاسات في كافة أحياء الرياض. السعر يشمل التوصيل، مدة بقاء تصل إلى 10 أيام، والنقل والتفريغ في المرادم الرسمية.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <a href={`tel:${phoneCall || "0554498403"}`} className="inline-flex items-center gap-2 bg-white text-primary px-5 py-2.5 rounded-xl font-black text-sm hover:bg-secondary hover:text-white transition-colors shadow-lg">
              <Phone size={16} /> اتصل: {phoneCall || "0554498403"}
            </a>
            <a href={pricingWhatsappHref} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-green-600 transition-colors shadow-lg">
              <MessageCircle size={16} /> واتساب مباشر
            </a>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto max-w-5xl px-4 py-12">

        {/* Price Cards */}
        <section className="mb-14">
          <h2 className="text-2xl font-black text-gray-900 mb-2">جدول مقاسات وأسعار الحاويات</h2>
          <p className="text-gray-500 mb-8">{PUBLIC_PRICING_NOTICE}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PUBLIC_PRICING_PACKAGES.map(c => (
              <div key={c.name} className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${c.highlight ? "border-secondary shadow-secondary/10" : "border-gray-100"}`}>
                <div>
                  {c.highlight && (
                    <div className="bg-secondary text-white text-center py-1.5 text-xs font-black tracking-wide">الحاوية الأكثر طلباً لمشاريع البناء</div>
                  )}
                  <div className="h-44 overflow-hidden bg-gray-100">
                    <img
                      src={c.img}
                      alt={c.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = "/api/uploads/container-debris-small.webp" }}
                    />
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-gray-900">{c.name}</h3>
                        <p className="text-xs text-gray-500">{c.size} — {c.capacity}</p>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="text-xs font-black text-secondary bg-secondary/10 px-2 py-1 rounded-lg">{c.priceLabel}</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">{c.priceNote}</p>
                    <ul className="space-y-1.5 pt-1">
                      {c.best.map(b => (
                        <li key={b} className="flex items-center gap-2 text-xs text-gray-600">
                          <CheckCircle2 size={13} className="text-secondary shrink-0" /> {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="p-5 pt-0">
                  <button
                    onClick={() => openModal({ serviceType: "حاويات الأنقاض", containerName: c.name })}
                    className={`w-full py-2.5 rounded-xl font-black text-xs transition-colors ${c.highlight ? "bg-primary text-white hover:bg-secondary" : "bg-gray-100 text-gray-800 hover:bg-primary hover:text-white"}`}
                  >
                    اطلب الحاوية الآن
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Price Table */}
        <section className="mb-14 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-black text-gray-900">مقارنة أسعار حاويات الأنقاض والنفايات بالرياض</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["المقاس والسعة", "الاستخدام الأنسب", "مدة البقاء", "السعر للرد"].map(h => (
                    <th key={h} className="text-right px-4 py-3 font-black text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ["حاوية 12 ياردة (10 م³)", "الترميمات والتعديلات الداخلية", "حتى 10 أيام", "400 ر.س"],
                  ["حاوية 15 ياردة (12 م³)", "أعمال التوسعة والتشطيب", "حتى 10 أيام", "450 ر.س"],
                  ["حاوية 20 ياردة (16 م³)", "بناء وهدم الفلل والعمائر", "حتى 10 أيام", "500 ر.س"],
                  ["حاوية 30 ياردة (22 م³)", "المشاريع الكبرى والهدم الشامل", "حتى 10 أيام", "700 ر.س"],
                  ["حاوية نفايات 6 - 10 ياردة", "المطاعم والمنشآت التجارية", "عقد سنوي", "حسب الموقع والنشاط"],
                  ["مكبس نفايات 2 ياردة", "المجمعات والهايبرماركت", "عقد توريد وصيانة", "حسب المواصفات"],
                ].map(row => (
                  <tr key={row[0]} className="hover:bg-gray-50 transition-colors">
                    {row.map((cell, i) => (
                      <td key={i} className={`px-4 py-3 text-xs ${i === 3 ? "font-black text-secondary" : "text-gray-700"}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">{PUBLIC_PRICING_NOTICE}</p>
          </div>
        </section>

        {/* Factors */}
        <section className="mb-14">
          <h2 className="text-2xl font-black text-gray-900 mb-2">العوامل المحددة لتكلفة الحاوية</h2>
          <p className="text-gray-500 mb-6">تساعدك هذه العوامل في اختيار المقاس الملائم لمشروعك وتفادي التكاليف الإضافية.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FACTORS.map(f => (
              <div key={f.title} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-start gap-4">
                <div>
                  <h3 className="font-black text-gray-900 mb-1 text-sm">{f.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-14">
          <h2 className="text-2xl font-black text-gray-900 mb-6">الأسئلة الشائعة حول أسعار الحاويات</h2>
          <div className="space-y-4">
            {FAQS.map(f => (
              <div key={f.q} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-black text-gray-900 mb-2 flex items-start gap-2 text-sm">
                  <span className="text-primary shrink-0">س:</span> {f.q}
                </h3>
                <p className="text-gray-600 text-xs leading-relaxed mr-5">
                  <span className="text-gray-400 font-bold">ج: </span>{f.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-l from-primary to-primary/90 rounded-2xl p-8 text-white text-center">
          <Box size={40} className="mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl font-black mb-2">هل تحتاج إلى توصيل حاوية فورياً لموقعك؟</h2>
          <p className="text-white/70 mb-6 max-w-lg mx-auto text-xs">احجز مقاسك الآن وسيصلك أسطولنا في أي حي بالرياض خلال ساعتين.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 bg-secondary text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-white hover:text-primary transition-colors shadow-lg"
            >
              <Box size={16} /> اطلب الحاوية الآن
            </button>
            <a href={`tel:${phoneCall || "0554498403"}`} className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-6 py-3 rounded-xl font-black text-xs hover:bg-white/20 transition-colors">
              <Phone size={16} /> {phoneCall || "0554498403"}
            </a>
            <a href={packagesWhatsappHref} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-green-600 transition-colors">
              <MessageCircle size={16} /> واتساب
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
