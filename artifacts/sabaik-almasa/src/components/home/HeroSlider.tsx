import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useGetSlides } from "@workspace/api-client-react"
import { useServiceRequest } from "@/context/ServiceRequestContext"
import { useSiteSettings } from "@/context/SiteSettingsContext"

export function HeroSlider() {
  const { data: slides, isLoading } = useGetSlides()
  const [currentIndex, setCurrentIndex] = useState(0)
  const { openModal } = useServiceRequest()
  const {
    companyName,
    heroCompanyVisible,
    heroCtaVisible,
    heroCompanyPosition,
    heroCtaPosition,
  } = useSiteSettings()

  const resolvedCompany = companyName || "خدمات تأجير الحاويات"
  const displaySlides = slides ?? []

  const positionClasses = (position: string) => {
    const [vertical, horizontal] = position.split("-")
    const verticalClass = vertical === "top"
      ? "top-6 md:top-10"
      : vertical === "bottom"
        ? "bottom-6 md:bottom-10"
        : "top-1/2 -translate-y-1/2"
    const horizontalClass = horizontal === "left"
      ? "left-6 md:left-10"
      : horizontal === "right"
        ? "right-6 md:right-10"
        : "left-1/2 -translate-x-1/2"
    return `${verticalClass} ${horizontalClass}`
  }

  useEffect(() => {
    if (displaySlides.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displaySlides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [displaySlides.length])

  if (isLoading || displaySlides.length === 0) {
    return (
      <section className="relative h-[85vh] md:h-[100dvh] w-full overflow-hidden bg-primary flex items-center justify-center">
        <div className="container mx-auto px-4 text-center">
          {heroCompanyVisible && (
            <div className="inline-block mb-4 px-4 py-1 border border-secondary/50 rounded-full bg-black/20 backdrop-blur-sm">
              <span className="text-secondary font-medium tracking-wider text-sm md:text-base">{resolvedCompany}</span>
            </div>
          )}
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            خدمة تأجير حاويات مخلفات النفايات والأنقاض بالرياض
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            حاويات متينة بمقاسات 6 إلى 30 ياردة للمشاريع السكنية والتجارية مع سرعة في التوصيل والسحب 24/7
          </p>
          {heroCtaVisible && (
            <div className="flex justify-center gap-4">
              <button
                onClick={() => openModal()}
                className="inline-flex items-center justify-center h-14 px-8 rounded-md bg-secondary text-white font-bold text-lg shadow-xl hover:bg-white hover:text-primary transition-colors"
              >
                اطلب حاويتك الآن
              </button>
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="relative h-[100dvh] w-full overflow-hidden bg-primary">
      {displaySlides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <div className="absolute inset-0">
              <img
              src={slide.imageUrl}
               alt={`${slide.title} | ${resolvedCompany}`}
               className="hero-slide-image w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = "none" }}
            />
              <div className="hero-slide-overlay absolute inset-0" />
          </div>

          <div className="absolute inset-0 z-20">
            <div className="container relative mx-auto h-full px-4 md:px-6 text-center">
              {heroCompanyVisible && (
                <div className={`absolute z-30 inline-block px-4 py-1 border border-secondary/50 rounded-full bg-black/20 backdrop-blur-sm ${positionClasses(heroCompanyPosition)}`}>
                  <span className="text-secondary font-medium tracking-wider text-sm md:text-base">{resolvedCompany}</span>
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: index === currentIndex ? 1 : 0, y: index === currentIndex ? 0 : 30 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="absolute inset-x-4 top-1/2 max-w-4xl mx-auto -translate-y-1/2"
              >
                {/* Only the active slide gets h1 */}
                {index === 0 ? (
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
                    {slide.title}
                  </h1>
                ) : (
                  <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
                    {slide.title}
                  </h2>
                )}

                <p className="text-lg md:text-2xl text-gray-200 mb-10 drop-shadow-md">
                  {slide.subtitle}
                </p>

              </motion.div>
              {heroCtaVisible && slide.ctaText && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: index === currentIndex ? 1 : 0, scale: index === currentIndex ? 1 : 0.9 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className={`absolute z-30 flex gap-4 flex-wrap ${positionClasses(heroCtaPosition)}`}
                >
                  <button
                    onClick={() => openModal()}
                    className="inline-flex items-center justify-center h-14 px-8 rounded-md bg-secondary text-white font-bold text-lg hover:bg-white hover:text-primary transition-all duration-300 shadow-xl hover:shadow-2xl"
                  >
                    {slide.ctaText}
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center gap-3">
        {displaySlides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex ? "w-10 bg-secondary" : "w-3 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  )
}
