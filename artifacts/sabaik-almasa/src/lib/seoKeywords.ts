export const GOLDEN_SEO_KEYWORDS = [
  "حاويات نفايات للمطاعم",
  "حاويات مخلفات المنشآت",
  "حاوية مطعم الرياض",
  "خدمات تأجير حاويات بالرياض",
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
const GOLDEN_KEYWORD_SET = new Set<string>(GOLDEN_SEO_KEYWORDS)

function splitKeywords(value?: string | null): string[] {
  return String(value || "")
    .split(/[،,]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

export function mergeGoldenSeoKeywords(value?: string | null): string {
  const current = splitKeywords(value)
  // Keywords are metadata, not page copy. Appending the same global list to
  // every route created both keyword cannibalization and visible repetition
  // when editors reused the generated values in their content.
  const pageSpecific = current.filter((keyword) => !GOLDEN_KEYWORD_SET.has(keyword))
  return Array.from(new Set(pageSpecific)).join("، ")
}

export function pageSpecificSeoKeywords({
  targetKeyword,
  title,
  keywords,
}: {
  targetKeyword?: string | null
  title?: string | null
  keywords?: string | null
}): string {
  const targetKeywords = splitKeywords(targetKeyword)
  const candidates = [...targetKeywords, ...splitKeywords(keywords)]
    .filter((keyword) => keyword && !GOLDEN_KEYWORD_SET.has(keyword))
  const fallback = String(title || "").trim()
  return Array.from(new Set(candidates.length ? candidates : fallback ? [fallback] : []))
    .slice(0, 8)
    .join("، ")
}