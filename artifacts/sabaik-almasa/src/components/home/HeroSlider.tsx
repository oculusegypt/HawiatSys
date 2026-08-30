import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { useGetSlides } from "@workspace/api-client-react"
import { useServiceRequest } from "@/context/ServiceRequestContext"
import { useSiteSettings } from "@/context/SiteSettingsContext"

export function HeroSlider() {
  const { data: slides, isLoading } = useGetSlides()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loadedSlides, setLoadedSlides] = useState<Set<number>>(() => new Set([0]))
  const [isPaused, setIsPaused] = useState(false)
  const [isFocusWithin, setIsFocusWithin] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())
  const touchStartX = useRef<number | null>(null)
  const { openModal } = useServiceRequest()
  const {
    companyName,
    heroCompanyVisible,
    heroCtaVisible,
    heroCompanyPosition,
    heroContentPosition,
    heroCtaPosition,
  } = useSiteSettings()

  const resolvedCompany = companyName || ""
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

  const centeredCompany = heroCompanyPosition === "center-center"
  const centeredCta = heroCtaPosition === "center-center"
  const contentHorizontal = heroContentPosition.split("-")[1] ?? "center"

  useEffect(() => {
    if (displaySlides.length <= 1 || isPaused || isFocusWithin) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displaySlides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [displaySlides.length, isPaused, isFocusWithin])

  useEffect(() => {
    if (currentIndex >= displaySlides.length && displaySlides.length > 0) {
      setCurrentIndex(0)
    }
  }, [currentIndex, displaySlides.length])

  // Keep the first slide (the LCP candidate) and only the next requested
  // slide in the browser's image queue. Hidden absolute-positioned images are
  // still considered near the viewport by browsers, so rendering all of them
  // defeats lazy loading and downloads several hundred KB on first visit.
  useEffect(() => {
    if (!displaySlides.length) return
    const nextIndex = (currentIndex + 1) % displaySlides.length
    setLoadedSlides((previous) => {
      const next = new Set(previous)
      next.add(currentIndex)
      if (displaySlides.length > 1) next.add(nextIndex)
      return next
    })
  }, [currentIndex, displaySlides.length])

  const goToSlide = (index: number) => {
    if (!displaySlides.length) return
    setCurrentIndex((index + displaySlides.length) % displaySlides.length)
  }

  const goToPrevious = () => goToSlide(currentIndex - 1)
  const goToNext = () => goToSlide(currentIndex + 1)

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (touchStartX.current === null) return
    const touchEndX = event.changedTouches[0]?.clientX
    if (touchEndX === undefined) return
    const distance = touchEndX - touchStartX.current
    if (Math.abs(distance) > 45) {
      distance > 0 ? goToPrevious() : goToNext()
    }
    touchStartX.current = null
  }

  if (isLoading) {
    return (
      <section className="home-hero relative h-[85vh] md:h-[100dvh] w-full overflow-hidden bg-primary flex items-center justify-center" aria-busy="true" aria-label="جار تحميل الواجهة الرئيسية">
        <div className="container mx-auto px-4">
          <div className="mx-auto h-3 w-28 animate-pulse rounded-full bg-white/20" />
          <div className="mx-auto mt-6 h-12 max-w-3xl animate-pulse rounded-2xl bg-white/10" />
          <div className="mx-auto mt-4 h-12 max-w-2xl animate-pulse rounded-2xl bg-white/10" />
          <div className="mx-auto mt-8 h-14 w-44 animate-pulse rounded-md bg-white/10" />
        </div>
      </section>
    )
  }

  if (displaySlides.length === 0) return null

  return (
    <section
      className="home-hero relative h-[100dvh] w-full overflow-hidden bg-primary"
      aria-roledescription="سلايدر"
      aria-label="العروض والخدمات"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onFocus={() => setIsFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocusWithin(false)
        }
      }}
    >
      {displaySlides.map((slide, index) => (
        <div
          key={slide.id}
          role="group"
          aria-roledescription="شريحة"
          aria-label={`${index + 1} من ${displaySlides.length}`}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <div className="absolute inset-0">
            {failedImages.has(index) ? (
              <div className="hero-slide-fallback absolute inset-0" aria-hidden="true" />
            ) : !loadedSlides.has(index) ? (
              <div className="hero-slide-fallback absolute inset-0" aria-hidden="true" />
            ) : (
              <img
                src={slide.imageUrl.trim()}
                alt={`${slide.title} | ${resolvedCompany}`}
                className="hero-slide-image w-full h-full object-cover"
                width={1672}
                height={941}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "low"}
                decoding={index === 0 ? "sync" : "async"}
                onError={() => setFailedImages((previous) => new Set(previous).add(index))}
              />
            )}
            <div className="hero-slide-overlay absolute inset-0" />
          </div>

          <div className="absolute inset-0 z-20 text-[#143b4f]">
            <div className="container relative mx-auto h-full px-4 md:px-6 text-center">
              {heroCompanyVisible && (
                <div className={`hero-eyebrow absolute z-30 inline-flex items-center gap-2 px-4 py-1.5 border rounded-full backdrop-blur-md ${centeredCompany ? "top-24 md:top-32 left-1/2 -translate-x-1/2" : positionClasses(heroCompanyPosition)}`}>
                  <span className="text-secondary font-medium tracking-wider text-sm md:text-base">{resolvedCompany}</span>
                </div>
              )}
              <div
                className={`hero-slide-content hero-content absolute z-30 transition-[opacity,transform] duration-700 ease-out ${
                  index === currentIndex
                    ? "translate-y-[-50%] opacity-100"
                    : "translate-y-[calc(-50%+30px)] opacity-0 pointer-events-none"
                } ${positionClasses(heroContentPosition)} ${centeredCta ? "flex flex-col items-center" : ""}`}
                style={{
                  textAlign: contentHorizontal === "left"
                    ? "left"
                    : contentHorizontal === "right"
                      ? "right"
                      : "center",
                }}
              >
                {/* Only the active slide gets h1 */}
                {index === 0 ? (
                    <h1 className="hero-title text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-[0_3px_10px_rgba(0,0,0,0.75)]">
                    {slide.title}
                  </h1>
                ) : (
                    <h2 className="hero-title text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-[0_3px_10px_rgba(0,0,0,0.75)]">
                    {slide.title}
                  </h2>
                )}

                <p className="hero-subtitle text-lg md:text-2xl text-white mb-10 drop-shadow-[0_2px_7px_rgba(0,0,0,0.8)]">
                  {slide.subtitle}
                </p>

                {heroCtaVisible && centeredCta && slide.ctaText && (
                  <button
                    onClick={() => openModal()}
                    className="hero-cta inline-flex items-center justify-center h-14 px-8 rounded-xl bg-secondary text-white font-bold text-lg hover:bg-white hover:text-primary transition-all duration-300 shadow-xl hover:shadow-2xl"
                  >
                    {slide.ctaText}
                  </button>
                )}
              </div>
              {heroCtaVisible && slide.ctaText && !centeredCta && (
                <div
                  className={`absolute z-30 flex gap-4 flex-wrap transition-[opacity,transform] duration-500 ease-out ${
                    index === currentIndex ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none"
                  } ${positionClasses(heroCtaPosition)}`}
                >
                  <button
                    onClick={() => openModal()}
                    className="hero-cta inline-flex items-center justify-center h-14 px-8 rounded-xl bg-secondary text-white font-bold text-lg hover:bg-white hover:text-primary transition-all duration-300 shadow-xl hover:shadow-2xl"
                  >
                    {slide.ctaText}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      {failedImages.size > 0 && (
        <div className="sr-only" role="status">
          تعذر تحميل بعض الصور، ويتم عرض بقية الشرائح المتاحة.
        </div>
      )}
      {displaySlides.length > 1 && (
        <div className="hero-controls absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3">
            <button
              type="button"
              onClick={goToPrevious}
              className="hero-control inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur-md transition hover:border-white/70 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-secondary"
              aria-label="الشريحة السابقة"
            >
              <ChevronLeft size={21} aria-hidden="true" />
            </button>
            <div className="hero-dots flex items-center justify-center gap-2" role="tablist" aria-label="اختيار الشريحة">
              {displaySlides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  className="h-2.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-transparent"
                  data-active={idx === currentIndex}
                  aria-label={`الانتقال إلى الشريحة ${idx + 1}`}
                  aria-selected={idx === currentIndex}
                  role="tab"
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsPaused((previous) => !previous)}
              className="hero-control inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur-md transition hover:border-white/70 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-secondary"
              aria-label={isPaused ? "تشغيل العرض التلقائي" : "إيقاف العرض التلقائي"}
              aria-pressed={isPaused}
            >
              {isPaused ? <Play size={17} fill="currentColor" aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="hero-control inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur-md transition hover:border-white/70 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-secondary"
              aria-label="الشريحة التالية"
            >
              <ChevronRight size={21} aria-hidden="true" />
            </button>
        </div>
      )}
    </section>
  );
}
