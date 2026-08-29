const ARABIC_PAIRS: Array<[string, string]> = [
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

export function friendlySlug(value: unknown, fallback = "page"): string {
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

export function entitySlug(value: {
  slug?: unknown;
  title?: unknown;
  id?: unknown;
  fallback?: string;
}): string {
  const rawSlug = String(value.slug ?? "").trim();
  const rawTitle = String(value.title ?? "").trim();
  const source = /^(?:مقالة|post)[-_]?\d+$/i.test(rawSlug) && rawTitle
    ? rawTitle
    : (rawSlug || rawTitle);
  const suffix = value.id == null ? "" : `-${String(value.id).replace(/[^0-9]/g, "")}`;
  const base = friendlySlug(source, `${value.fallback || "page"}${suffix}`);
  return base + (suffix && !base.endsWith(suffix) ? suffix : "");
}