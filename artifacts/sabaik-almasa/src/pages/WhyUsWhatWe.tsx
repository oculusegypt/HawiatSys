import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { PackagesSection } from "@/components/home/PackagesSection"
import { HowItWorksSection } from "@/components/home/HowItWorksSection"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { siteUrl } from "@/lib/siteUrl"
import { Link } from "wouter"
import { ChevronLeft } from "lucide-react"

export default function WhyUsWhatWe() {
  useDocumentSEO({
    title: "خدماتنا — حلول الحاويات ونقل المخلفات | ماذا نقدم",
    description: "اكتشف حلول {{company_name}} لتأجير حاويات الأنقاض والنفايات والمكابس ونقل مخلفات البناء وعقود النظافة الإلكترونية بالرياض.",
    keywords: "خدمات تأجير الحاويات, نقل مخلفات البناء بالرياض, مكابس نفايات, عقود النظافة الإلكترونية",
    canonical: siteUrl("/why-us/what-we-do"),
  })

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      <Navbar />

      <div className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-3">
            <Link href="/" className="hover:text-white transition-colors">الرئيسية</Link>
            <ChevronLeft size={14} />
            <Link href="/#about" className="hover:text-white transition-colors">لماذا نحن</Link>
            <ChevronLeft size={14} />
            <span className="text-white">ماذا نقدم</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black">ماذا نقدم</h1>
          <p className="text-white/70 mt-2 text-lg">خدمات متكاملة لجميع احتياجاتك</p>
        </div>
      </div>

      <main className="flex-1">
        <PackagesSection />
        <HowItWorksSection />
      </main>

      <Footer />
    </div>
  )
}
