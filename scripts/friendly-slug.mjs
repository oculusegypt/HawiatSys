/**
 * Normalize public route slugs without transliterating Arabic.
 *
 * Arabic is the editorial language of this site, so canonical URLs preserve
 * Arabic characters. Browsers and XML sitemaps percent-encode those
 * characters when serializing the URL. The legacy helpers below are retained
 * only so old ASCII inbound links can still resolve.
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

function legacyFriendlySlug(value, fallback = "page") {
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

export function friendlySlug(value, fallback = "page") {
  const source = String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670ـ]/g, "")
    .trim();
  if (!source) return fallback;

  const result = source
    .replace(/&/g, " و ")
    .replace(/['’`"]/g, "")
    .replace(/[^\u0600-\u06FF\u0750-\u077F0-9a-zA-Z-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!result) return fallback;
  if (result.length <= 100) return result;
  return result.slice(0, 100).replace(/-[^-]*$/, "").replace(/-+$/, "") || result.slice(0, 100);
}

function publicSource({ slug, title }) {
  const rawSlug = String(slug ?? "").trim();
  const rawTitle = String(title ?? "").trim();
  const isGeneratedNumericSlug = /^(?:مقالة|post)[-_]?\d+$/i.test(rawSlug);
  const hasArabic = (value) => /[\u0600-\u06FF]/u.test(value);
  return isGeneratedNumericSlug && rawTitle
    ? rawTitle
    : hasArabic(rawSlug)
      ? rawSlug
      : (hasArabic(rawTitle) ? rawTitle : (rawSlug || rawTitle));
}

function legacySource({ slug, title }) {
  const rawSlug = String(slug ?? "").trim();
  const rawTitle = String(title ?? "").trim();
  const isGeneratedNumericSlug = /^(?:مقالة|post)[-_]?\d+$/i.test(rawSlug);
  return isGeneratedNumericSlug && rawTitle ? rawTitle : (rawSlug || rawTitle);
}

export function entitySlug({ slug, title, id, fallback = "page" }) {
  const value = publicSource({ slug, title });
  const suffix = id == null ? "" : `-${String(id).replace(/[^0-9]/g, "")}`;
  const base = friendlySlug(value, `${fallback}${suffix}`);
  return base + (suffix && !base.endsWith(suffix) ? suffix : "");
}

export function entityPath(options) {
  return encodeURIComponent(entitySlug(options));
}

export function legacyEntitySlug({ slug, title, id, fallback = "page" }) {
  const value = legacySource({ slug, title });
  const suffix = id == null ? "" : `-${String(id).replace(/[^0-9]/g, "")}`;
  const base = legacyFriendlySlug(value, `${fallback}${suffix}`);
  return base + (suffix && !base.endsWith(suffix) ? suffix : "");
}