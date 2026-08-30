import { ChevronDown, HelpCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { HOME_FAQS } from "@/lib/seoSchema"

export function HomeFaqSection() {
  const [faqs, setFaqs] = useState<Array<{ q: string; a: string }>>([...HOME_FAQS])

  useEffect(() => {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
    fetch(`${base}/api/structured-content?path=/`)
      .then((response) => response.ok ? response.json() : [])
      .then((records) => {
        const items = Array.isArray(records) ? records.flatMap((record) =>
          Array.isArray(record?.payload?.items)
            ? record.payload.items.filter((item: any) => item?.enabled !== false)
            : [],
        ) : []
        const normalized = items
          .filter((item: any) => item && String(item.question ?? item.q ?? "").trim() && String(item.answer ?? item.a ?? "").trim())
          .map((item: any) => ({ q: String(item.question ?? item.q).trim(), a: String(item.answer ?? item.a).trim() }))
        if (normalized.length) setFaqs(normalized)
      })
      .catch(() => {})
  }, [])

  return (
    <section
      id="faq"
      className="border-t border-slate-200 bg-white py-20"
      aria-labelledby="home-faq-heading"
    >
      <div className="container mx-auto max-w-4xl px-4 md:px-6">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
            <HelpCircle size={16} aria-hidden="true" />
            إجابات قبل طلب الحاوية
          </span>
          <h2 id="home-faq-heading" className="mb-4 text-3xl font-black text-primary md:text-4xl">
            الأسئلة الشائعة حول تأجير الحاويات بالرياض
          </h2>
          <p className="text-base leading-8 text-slate-600">
            معلومات مباشرة تساعدك على اختيار المقاس ومعرفة طريقة التسعير والتوصيل والسحب.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              open
              className="group rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 marker:hidden">
                <span>{faq.q}</span>
                <ChevronDown
                  size={20}
                  aria-hidden="true"
                  className="shrink-0 text-primary transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 border-t border-slate-200 pt-3 text-sm leading-8 text-slate-600">
                {faq.a}
              </p>
            </details>
          ))}
        </div>

      </div>
    </section>
  )
}