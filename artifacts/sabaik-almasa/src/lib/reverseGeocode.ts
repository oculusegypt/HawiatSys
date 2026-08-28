/**
 * Accurate reverse geocoding using Nominatim (OpenStreetMap)
 * zoom=18 → street-level detail (most accurate)
 */
export interface GeoAddress {
  full: string          // كامل العنوان للإرسال
  road?: string         // اسم الشارع
  neighbourhood?: string // الحي
  city?: string         // المدينة
  raw: string           // display_name للاحتياط
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoAddress> {
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?lat=${lat}&lon=${lng}` +
    `&format=json&addressdetails=1&zoom=18&accept-language=ar`

  const res = await fetch(url, {
    headers: { "Accept-Language": "ar", "User-Agent": "CleanFlowServices/1.0" },
  })

  if (!res.ok) throw new Error("Nominatim error")

  const data = await res.json()
  const a = data.address || {}

  // Street: road → street → pedestrian → footway → path
  const road =
    a.road || a.street || a.pedestrian || a.footway ||
    a.path || a.residential || ""

  // House number prepended to road when available
  const streetFull = a.house_number
    ? `${road} ${a.house_number}`.trim()
    : road

  // District / neighbourhood
  const neighbourhood =
    a.neighbourhood || a.suburb || a.quarter ||
    a.city_district || a.district || ""

  // City
  const city =
    a.city || a.town || a.municipality ||
    a.county || a.state_district || a.village || ""

  const parts = [streetFull, neighbourhood, city].filter(Boolean)

  const full =
    parts.length >= 2
      ? parts.join("، ")
      : data.display_name?.split(",").slice(0, 4).join("،").trim() ||
        `${lat}, ${lng}`

  return { full, road: streetFull || undefined, neighbourhood: neighbourhood || undefined, city: city || undefined, raw: data.display_name || "" }
}

/**
 * Get GPS position with high accuracy & permissions policy fallback
 */
export function getHighAccuracyPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator || !navigator.geolocation) {
      reject(new Error("geolocation_unavailable"))
      return
    }

    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        }
      )
    } catch (err) {
      // Permission policy or insecure context error
      reject(err)
    }
  })
}
