import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { ValuesSection } from "@/components/home/ValuesSection"
import { WhyChooseUs } from "@/components/home/WhyChooseUs"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { siteUrl } from "@/lib/siteUrl"
import { Link } from "wouter"
import { ChevronLeft } from "lucide-react"

export default function WhyUsCommitment() {
  useDocumentSEO({
    title: "التزامنا — {{company_name}} | قيمنا ومبادئنا",
    description: "تعرف على قيم ومبادئ {{company_name}} والتزامنا بتقديم حلول منظمة لتأجير الحاويات ونقل المخلفات في الرياض.",
    keywords: "التزام {{company_name}}, قيم المؤسسة, جودة نقل مخلفات البناء",
    canonical: siteUrl("/why-us/commitment"),
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
            <span className="text-white">التزامنا</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black">التزامنا</h1>
          <p className="text-white/70 mt-2 text-lg">قيمنا ومبادئنا في خدمة عملائنا</p>
        </div>
      </div>

      <main className="flex-1">
        <ValuesSection />
        <WhyChooseUs />
      </main>

      <Footer />
    </div>
  )
}
