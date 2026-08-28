import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { PackagesSection } from "@/components/home/PackagesSection"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { siteUrl } from "@/lib/siteUrl"
import { Link, useRoute } from "wouter"
import { ChevronLeft, Box, Truck, FileText } from "lucide-react"

export default function PackagesPage() {
  const { companyName } = useSiteSettings()
  const [, paramsDebris] = useRoute("/containers/debris")
  const [, paramsWaste] = useRoute("/containers/waste")
  const [, paramsContract] = useRoute("/containers/contract")
  const [, paramsContracts] = useRoute("/containers/contracts")
  const [, paramsAny] = useRoute("/containers/:category")

  let category = "all"
  if (paramsDebris) category = "debris"
  else if (paramsWaste) category = "waste"
  else if (paramsContract || paramsContracts) category = "contract"
  else if (paramsAny?.category) {
    if (paramsAny.category === "debris" || paramsAny.category === "أنقاض" || paramsAny.category === "حاويات-الأنقاض") category = "debris"
    else if (paramsAny.category === "waste" || paramsAny.category === "نفايات" || paramsAny.category === "حاويات-النفايات") category = "waste"
    else if (paramsAny.category === "contract" || paramsAny.category === "contracts" || paramsAny.category === "عقود-النظافة") category = "contract"
  }

  const brandSuffix = companyName ? ` | ${companyName}` : " | تأجير حاويات بالرياض"

  const META_BY_CAT: Record<string, { title: string; desc: string; keywords: string; heading: string; sub: string; icon: any }> = {
    debris: {
      title: `حاويات الأنقاض ومخلفات البناء بالرياض${brandSuffix}`,
      desc: "تأجير حاويات الأنقاض ومخلفات الهدم والترميم بالرياض مع التوصيل والسحب والتفريغ النظامي في المرادم المعتمدة.",
      keywords: "حاويات أنقاض بالرياض, تأجير حاويات مخلفات بناء, نقل أنقاض الرياض",
      heading: "حاويات الأنقاض ومخلفات البناء والهدم",
      sub: "مقاسات فعلية تناسب مشاريع الترميم والإنشاءات الكبرى مع توصيل وسحب منظم.",
      icon: Box
    },
    waste: {
      title: `حاويات النفايات والمكابس للمنشآت والمجمعات بالرياض${brandSuffix}`,
      desc: "تأجير حاويات النفايات والمكابس بعقود وتفريغ دوري منتظم للمطاعم والشركات والمجمعات بالرياض.",
      keywords: "حاويات نفايات الرياض, تأجير مكبس نفايات, تفريغ نفايات تجارية الرياض",
      heading: "حاويات النفايات والمكابس للمنشآت",
      sub: "حلول حاويات ومكابس مخصصة للمنشآت والمطاعم والمراكز التجارية مع جدول تفريغ منتظم.",
      icon: Truck
    },
    contract: {
      title: `عقود النظافة الإلكترونية وتجديد رخص بلدي بالرياض${brandSuffix}`,
      desc: "استخراج وتوثيق عقود النظافة الإلكترونية المعتمدة من منصة بلدي وأمانة منطقة الرياض لتجديد الرخص التجارية والمهنية والورش والمصانع فوراً.",
      keywords: "عقد نظافة بلدي الرياض, تجديد رخصة تجارية بلدي, عقد نظافة إلكتروني معتمد, منصة بلدي عقود نظافة, عقد نظافة مطاعم وشركات",
      heading: "عقود النظافة المعتمدة وتجديد الرخص",
      sub: "عقود نظافة إلكترونية موثقة ومصدقة من منصة بلدي وأمانة الرياض لجميع الأنشطة التجارية والمنشآت.",
      icon: FileText
    },
    all: {
      title: `مقاسات وأسعار تأجير الحاويات بالرياض${brandSuffix}`,
      desc: "استعرض أحجام ومقاسات حاويات الأنقاض والنفايات والمكابس وعقود النظافة المعتمدة بالرياض، ثم اطلب الحل المناسب لموقعك.",
      keywords: "تأجير حاويات بالرياض, أسعار الحاويات, حاويات أنقاض, حاويات نفايات, عقود نظافة بلدي",
      heading: "جميع مقاسات وأنواع الحاويات وعقود بلدي",
      sub: "اختر الحجم والفئة المناسبة لاحتياجات مشروعك أو منشأتك مع سرعة استجابة وتوصيل منظم.",
      icon: Box
    }
  }

  const currentMeta = META_BY_CAT[category] || META_BY_CAT.all
  const IconComp = currentMeta.icon

  useDocumentSEO({
    title: currentMeta.title,
    description: currentMeta.desc,
    keywords: currentMeta.keywords,
    canonical: siteUrl(category === "all" ? "/containers" : `/containers/${category}`),
    ogImage: category === "debris"
      ? "/images/seo/taqi-containers.jpg"
      : category === "waste"
        ? "/images/seo/taqi-services.jpg"
        : category === "contract"
          ? "/images/seo/taqi-partners.jpg"
          : "/images/seo/taqi-containers.jpg",
    ogImageAlt: currentMeta.heading,
  })

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      <Navbar />

      {/* Hero */}
      <div className="bg-primary text-white pt-28 pb-14 px-4 relative overflow-hidden">
        <div className="container mx-auto relative z-10">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-3">
            <Link href="/" className="hover:text-white transition-colors">الرئيسية</Link>
            <ChevronLeft size={14} />
            <Link href="/containers" className="hover:text-white transition-colors">الحاويات</Link>
            {category !== "all" && (
              <>
                <ChevronLeft size={14} />
                <span className="text-secondary font-bold">{currentMeta.heading}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary">
              <IconComp size={22} />
            </div>
            <h1 className="text-2xl md:text-4xl font-black">{currentMeta.heading}</h1>
          </div>
          <p className="text-white/80 mt-2 text-base md:text-lg max-w-2xl leading-relaxed">{currentMeta.sub}</p>
        </div>
      </div>

      <main className="flex-1">
        <PackagesSection initialCategory={category} />
      </main>

      <Footer />
    </div>
  )
}
