import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { StatsBar } from "@/components/home/StatsBar"
import { WhyChooseUs } from "@/components/home/WhyChooseUs"
import { Testimonials } from "@/components/home/Testimonials"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { siteUrl } from "@/lib/siteUrl"
import { Link } from "wouter"
import { ChevronLeft } from "lucide-react"

export default function WhyUsExperience() {
  useDocumentSEO({
    title: "خبرتنا المتراكمة — {{company_name}}",
    description: "خبرة ميدانية في تأجير الحاويات ونقل مخلفات البناء للمنازل والمقاولين والمنشآت في الرياض.",
    keywords: "خبرة تأجير الحاويات, نقل مخلفات البناء بالرياض, {{company_name}}",
    canonical: siteUrl("/why-us/experience"),
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
            <span className="text-white">خبرتنا المتراكمة</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black">خبرتنا المتراكمة</h1>
          <p className="text-white/70 mt-2 text-lg">سنوات من الإنجازات التي تتحدث عن نفسها</p>
        </div>
      </div>

      <main className="flex-1">
        <StatsBar />
        <WhyChooseUs />
        <Testimonials />
      </main>

      <Footer />
    </div>
  )
}
