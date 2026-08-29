/**
 * Convert public route slugs to short, readable ASCII paths.
 *
 * Arabic slugs are excellent source content but browsers and XML sitemaps
 * serialize them as long percent-encoded strings. Public URLs therefore use
 * a deterministic transliteration while the database keeps the original
 * editorial values for backwards compatibility.
 */
const ARABIC_PAIRS = [
  ["لا", "la"], ["لأ", "la"], ["لإ", "la"], ["لآ", "la"],
  ["ث", "th"], ["ذ", "dh"], ["ش", "sh"], ["خ", "kh"], ["غ", "gh"],
  ["ض", "d"], ["ظ", "z"], ["ع", "a"], ["ء", "a"], ["أ", "a"],
  ["إ", "i"], ["آ", "a"], ["ؤ", "w"], ["ئ", "y"],
  ["ا", "a"], ["ب", "b"], ["ت", "t"], ["ج", "j"], ["ح", "h"],
  ["د", "d"], ["ر", "r"], ["ز", "z"], ["س", "s"], ["ص", "s"],
  ["ط", "t"], ["ف", "f"], ["ق", "q"], ["ك", "k"], ["ل", "l"],
  ["م", "m"], ["ن", "n"], ["ه", "h"], ["و", "w"], ["ى", "a"],
  ["ي", "y"], ["ة", "h"],
];

export function friendlySlug(value, fallback = "page") {
  const source = String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670ـ]/g, "")
    .trim();
  if (!source) return fallback;

  let result = source.toLowerCase();
  for (const [character, replacement] of ARABIC_PAIRS) {
    result = result.split(character).join(replacement);
  }

  result = result
    .replace(/&/g, " and ")
    .replace(/['’`"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!result) return fallback;
  if (result.length <= 64) return result;
  return result.slice(0, 64).replace(/-[^-]*$/, "").replace(/-+$/, "") || result.slice(0, 64);
}

export function entitySlug({ slug, title, id, fallback = "page" }) {
  const rawSlug = String(slug ?? "").trim();
  const rawTitle = String(title ?? "").trim();
  const isGeneratedNumericSlug = /^(?:مقالة|post)[-_]?\d+$/i.test(rawSlug);
  const value = isGeneratedNumericSlug && rawTitle ? rawTitle : (rawSlug || rawTitle);
  const suffix = id == null ? "" : `-${String(id).replace(/[^0-9]/g, "")}`;
  return friendlySlug(value, `${fallback}${suffix}`) + (suffix && !friendlySlug(value, "").endsWith(suffix) ? suffix : "");
}