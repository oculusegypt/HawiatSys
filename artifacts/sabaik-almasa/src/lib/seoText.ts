const SEO_DESCRIPTION_MIN = 120
const SEO_DESCRIPTION_MAX = 160

const DEFAULT_EXTENSION =
  " اطلب عرضاً واضحاً حسب المقاس ونوع المخلفات وموقع المشروع وموعد التوصيل داخل الرياض."

export function normalizeSeoDescription(value: string | null | undefined, context = ""): string {
  let text = String(value || "").replace(/\s+/g, " ").trim()
  if (!text) {
    text = context
      ? `تعرف على ${context} وخيارات التوصيل والسحب ونقل المخلفات في الرياض.`
      : "تأجير حاويات الأنقاض والنفايات ونقل مخلفات البناء داخل الرياض بخدمة منظمة."
  }

  if (text.length < SEO_DESCRIPTION_MIN) {
    const addition = context
      ? ` تعرف على تفاصيل ${context} والمقاسات المناسبة وخيارات التوصيل والسحب.`
      : DEFAULT_EXTENSION
    text = `${text.replace(/[،.!؟\s]+$/u, "")}،${addition}`
  }

  if (text.length > SEO_DESCRIPTION_MAX) {
    text = `${text.slice(0, SEO_DESCRIPTION_MAX - 1).replace(/\s+\S*$/u, "").trim()}…`
  }

  return text
}

export function readableSeoExcerpt(value: string | null | undefined): string {
  const text = String(value || "").replace(/\s+/g, " ").trim()
  if (!text) return ""
  const parts = text.split(/[،,]/).map((part) => part.trim()).filter(Boolean)
  const keywordParts = parts.slice(2).filter((part) => /حاوي|مخلف|تأجير|نقل|نفايات|أنقاض/u.test(part))
  if (parts.length >= 4 && keywordParts.length >= 2) {
    return parts.slice(0, 2).join("، ")
  }
  return text
}
