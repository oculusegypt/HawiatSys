export const GOLDEN_SEO_KEYWORDS = [
  "حاويات نفايات للمطاعم",
  "حاويات مخلفات المنشآت",
  "حاوية مطعم الرياض",
  "خدمات رفتأجير حاويات بالرياض",
  "حاويات أنقاض",
  "حاويات نفايات",
  "نقل مخلفات البناء",
  "عقود نظافة بلدي",
  "تأجير حاويات أنقاض",
  "تأجير حاويات نفايات",
  "تأجير حاويات نفايات للمطاعم",
  "نقل مخلفات البناء والهدم",
  "حاوية 20 ياردة",
  "حاوية انقاض 20 يارده",
  "حاوية انقاض 12 يارده",
  "حاوية 12 يارده نفايات",
  "إدارة مخلفات مطاعم",
  "حاويات نفايات مقاهي",
  "تأجير الحاويات بالرياض",
] as const

export const GOLDEN_SEO_KEYWORDS_TEXT = GOLDEN_SEO_KEYWORDS.join("، ")

export function mergeGoldenSeoKeywords(value?: string | null): string {
  const current = (value || "")
    .split(/[،,]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean)
  return Array.from(new Set([...current, ...GOLDEN_SEO_KEYWORDS])).join("، ")
}