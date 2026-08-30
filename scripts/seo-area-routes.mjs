/**
 * Canonical area route vocabulary shared by the sitemap and prerenderer.
 *
 * The page copy may contain richer neighborhood metadata, but the public
 * Arabic route must come from one map so a renamed slug cannot split the
 * sitemap from its HTML canonical.
 */
export const ARABIC_AREA_SLUGS = Object.freeze({
  "north-riyadh": "شمال-الرياض",
  "south-riyadh": "جنوب-الرياض",
  "east-riyadh": "شرق-الرياض",
  "west-riyadh": "غرب-الرياض",
  "central-riyadh": "وسط-الرياض",
  "al-malqa": "حي-الملقا",
  "al-yasmin": "حي-الياسمين",
  "al-narjis": "حي-النرجس",
  "al-aarid": "حي-العارض",
  "hittin": "حي-حطين",
  "al-sahafa": "حي-الصحافة",
  "al-nafal": "حي-النفل",
  "al-aqiq": "حي-العقيق",
  "al-rabi": "حي-الربيع",
  "al-ghadeer": "حي-الغدير",
  "al-wadi": "حي-الوادي",
  "al-nada": "حي-الندى",
  "al-falah": "حي-الفلاح",
  "al-qadesiya": "حي-القادسية",
  "al-naseem": "حي-النسيم",
  "al-rawdah": "حي-الروضة",
  "al-khaleej": "حي-الخليج",
  "al-nahdah": "حي-النهضة",
  "al-manar": "حي-المنار",
  "al-yarmouk": "حي-اليرموك",
  "al-munsiyah": "حي-المونسية",
  "al-hamra": "حي-الحمراء",
  "al-qurtubah": "حي-قرطبة",
  "al-shuhada": "حي-الشهداء",
  "al-suwaidi": "حي-السويدي",
  "al-uraija": "حي-العريجاء",
  "dhahrat-laban": "حي-ظهرة-لبن",
  "al-hazm": "حي-الحزم",
  "al-badiyah": "حي-البديعة",
  "shubra": "حي-شبرا",
  "al-awali": "حي-العوالي",
  "badr": "حي-بدر",
  "al-hair": "حي-الحائر",
  "al-shifa": "حي-الشفا",
  "al-aziziyah": "حي-العزيزية",
  "al-dar-al-baida": "حي-الدار-البيضاء",
  "al-manakh": "حي-المناخ",
  "al-iskan": "حي-الإسكان",
  "al-olaya": "حي-العليا",
  "al-sulaimaniya": "حي-السليمانية",
  "al-malaz": "حي-الملز",
  "al-murabba": "حي-المربع",
  "al-batha": "حي-البطحاء",
  "al-wizarat": "حي-الوزارات",
  "al-futah": "حي-الفوطة",
});

export const AREA_SLUGS = Object.freeze(Object.keys(ARABIC_AREA_SLUGS));

export function assertAreaRouteParity(sourceName, slugs) {
  const actual = [...new Set(slugs)].sort();
  const expected = [...AREA_SLUGS].sort();
  if (actual.length !== expected.length || actual.some((slug, index) => slug !== expected[index])) {
    const missing = expected.filter((slug) => !actual.includes(slug));
    const unexpected = actual.filter((slug) => !expected.includes(slug));
    throw new Error(
      `${sourceName} area routes differ from seo-area-routes.mjs; ` +
      `missing=${missing.join(",") || "0"} unexpected=${unexpected.join(",") || "0"}`,
    );
  }
}