import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

interface Ad {
  id: number
  title: string
  content: string
  imageUrl: string
  linkUrl: string
  buttonText: string
  position: string
  type: string
  bgColor: string
  isActive: boolean
  order: number
}

interface Props {
  position: string
}

export function AdsSection({ position }: Props) {
  const [ads, setAds] = useState<Ad[]>([])

  useEffect(() => {
    fetch(`${API_BASE}/api/ads?position=${position}`)
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setAds(data) : [])
      .catch(() => {})
  }, [position])

  if (ads.length === 0) return null

  return (
    <AnimatePresence>
      <section className="py-4 px-4 md:px-6" aria-label="إعلانات">
        <div className="container mx-auto space-y-4">
          {ads.map((ad, i) => (
            <motion.div
              key={ad.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <ImageAd ad={ad} />
            </motion.div>
          ))}
        </div>
      </section>
    </AnimatePresence>
  )
}

function ImageAd({ ad }: { ad: Ad }) {
  if (!ad.imageUrl) return null

  const Wrapper = ad.linkUrl ? "a" : "div"
  const wrapperProps = ad.linkUrl
    ? { href: ad.linkUrl, target: "_blank", rel: "noreferrer" }
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={`group block overflow-hidden ${ad.linkUrl ? "cursor-pointer" : ""}`}
    >
      <img
        src={ad.imageUrl}
        alt=""
        className="block w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.01]"
        width={1200}
        height={630}
        loading="lazy"
        decoding="async"
      />
    </Wrapper>
  )
}
