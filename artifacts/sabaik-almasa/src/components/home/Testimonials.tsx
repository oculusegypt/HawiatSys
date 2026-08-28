import { motion } from "framer-motion"
import { useState } from "react"
import { useGetTestimonials, useCreateTestimonial } from "@workspace/api-client-react"
import { Star, Quote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { normalizeCompanyText, useSiteSettings } from "@/context/SiteSettingsContext"

export function Testimonials() {
  const { data: testimonials, refetch } = useGetTestimonials()
  const { mutate: createTestimonial, isPending: isSubmitting } = useCreateTestimonial()
  const { companyName, homepageContent } = useSiteSettings()
  const copy = homepageContent.sections?.testimonials
  const [reviewName, setReviewName] = useState("")
  const [reviewContent, setReviewContent] = useState("")
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewError, setReviewError] = useState("")
  const [reviewSent, setReviewSent] = useState(false)

  const activeTestimonials = testimonials?.filter(testimonial => testimonial.isActive !== false) ?? []
  if (activeTestimonials.length === 0) return null

  const submitReview = (event: React.FormEvent) => {
    event.preventDefault()
    if (!reviewName.trim() || !reviewContent.trim()) {
      setReviewError("يرجى كتابة الاسم والتقييم")
      return
    }

    setReviewError("")
    createTestimonial({
      data: {
        clientName: reviewName.trim(),
        company: "عميل",
        content: reviewContent.trim(),
        rating: reviewRating,
        isActive: false,
      },
    }, {
      onSuccess: () => {
        setReviewName("")
        setReviewContent("")
        setReviewRating(5)
        setReviewSent(true)
        void refetch()
      },
      onError: () => setReviewError("تعذر إرسال التقييم، حاول مرة أخرى"),
    })
  }

  return (
    <section id="testimonials" className="py-24 bg-gray-50 relative">
      <div className="container mx-auto px-4 md:px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {copy?.title && <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">{copy.title}</h2>}
            <div className="w-24 h-1.5 bg-secondary mx-auto rounded-full mb-6"></div>
            {copy?.description && <p className="text-gray-600 text-lg">{copy.description}</p>}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {activeTestimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative"
            >
              <div className="absolute top-6 left-6 text-gray-200">
                <Quote size={60} className="transform rotate-180" />
              </div>
              
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    size={18} 
                    className={i < testimonial.rating ? "text-secondary fill-secondary" : "text-gray-300"} 
                  />
                ))}
              </div>
              
              <p className="text-gray-700 leading-relaxed mb-8 relative z-10 min-h-[80px]">
                 "{normalizeCompanyText(testimonial.content)}"
              </p>
              
              <div className="flex items-center gap-4 border-t border-gray-100 pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
                  {testimonial.clientName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{testimonial.clientName}</h4>
                  <p className="text-sm text-gray-500">{testimonial.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 max-w-2xl mx-auto rounded-2xl border border-primary/10 bg-white p-6 shadow-sm"
        >
          <div className="text-center mb-5">
            <h3 className="text-xl font-bold text-primary">شاركنا تقييمك</h3>
            <p className="mt-1 text-sm text-gray-500">رأيك يساعدنا على تحسين خدمتنا</p>
          </div>

          {reviewSent ? (
            <div className="rounded-xl bg-green-50 px-4 py-5 text-center text-sm font-medium text-green-700">
              شكراً لك، تم استلام تقييمك وسيظهر بعد المراجعة.
            </div>
          ) : (
            <form onSubmit={submitReview} className="space-y-4">
              <div className="flex items-center justify-center gap-1" dir="ltr" aria-label={`التقييم ${reviewRating} من 5`}>
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setReviewRating(value)}
                    className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-secondary/50"
                    aria-label={`${value} نجوم`}
                  >
                    <Star size={25} className={value <= reviewRating ? "fill-secondary text-secondary" : "text-gray-300"} />
                  </button>
                ))}
              </div>

              <Input
                value={reviewName}
                onChange={event => setReviewName(event.target.value)}
                placeholder="اسمك الكريم"
                aria-label="اسمك الكريم"
                maxLength={100}
              />
              <textarea
                value={reviewContent}
                onChange={event => setReviewContent(event.target.value)}
                placeholder="اكتب تجربتك معنا"
                aria-label="تجربتك معنا"
                maxLength={500}
                rows={4}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {reviewError && <p className="text-center text-sm text-red-600">{reviewError}</p>}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "جاري الإرسال..." : "إرسال التقييم"}
              </Button>
            </form>
          )}
        </motion.div>

      </div>
    </section>
  )
}
