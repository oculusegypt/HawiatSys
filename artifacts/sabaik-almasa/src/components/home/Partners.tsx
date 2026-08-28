import { useState } from "react"
import { useGetPartners } from "@workspace/api-client-react"

function PartnerLogo({ name, logoUrl }: { name: string; logoUrl: string }) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <span className="font-bold text-lg text-gray-300 border-2 border-dashed border-gray-200 p-2 rounded">
        {name}
      </span>
    )
  }

  return (
    <img
      src={logoUrl}
      alt={name}
      className="max-w-full max-h-full object-contain"
      width={160}
      height={80}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
    />
  )
}

export function Partners() {
  const { data: partners } = useGetPartners()

  if (!partners || partners.length === 0) return null

  return (
    <section className="py-12 bg-white border-t border-b border-gray-100 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 mb-8 text-center">
        <h3 className="text-xl font-bold text-gray-400">شركاء النجاح</h3>
      </div>
      
      <div className="relative w-full flex overflow-x-hidden">
        {/* We duplicate the array to create a seamless infinite scroll effect */}
        <div className="animate-marquee flex whitespace-nowrap">
           {[...partners, ...partners, ...partners].map((partner, index) => (
            <div key={`${partner.id}-${index}`} className="mx-8 w-40 h-20 flex items-center justify-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
               <PartnerLogo name={partner.name} logoUrl={partner.logoUrl} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
