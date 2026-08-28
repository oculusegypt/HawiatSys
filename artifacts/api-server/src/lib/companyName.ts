const legacyName = String.fromCodePoint(
  1587, 1576, 1575, 1574, 1610, 32, 1575, 1604, 1605, 1575, 1587, 1577,
)
const legacyInstitution = `${String.fromCodePoint(1605, 1572, 1587, 1587, 1577)} ${legacyName}`
const legacyCompany = `${String.fromCodePoint(1588, 1585, 1603, 1577)} ${legacyName}`
const currentLegacyName = String.fromCodePoint(
  1575, 1604, 1587, 1607, 1605, 32, 1603, 1604, 1610, 1606,
)
const currentLegacyInstitution = `${String.fromCodePoint(1605, 1572, 1587, 1587, 1577)} ${currentLegacyName}`

export function replaceLegacyCompanyName(value: unknown, companyName: string): string {
  if (typeof value !== "string" || !value || !companyName.trim()) {
    return typeof value === "string" ? value : ""
  }

  const resolvedName = companyName.trim()
  let normalized = value
    .replace(new RegExp(legacyInstitution, "g"), resolvedName)
    .replace(new RegExp(legacyCompany, "g"), resolvedName)
    .replace(new RegExp(legacyName, "g"), resolvedName)
    .replace(/منصة\s+حاويات/g, resolvedName)

  // The current configured name can itself be a legacy phrase. Only replace
  // it when the administrator has chosen a different name, otherwise a bare
  // phrase replacement would turn "مؤسسة تقي جروب" into a duplicated prefix.
  if (resolvedName !== currentLegacyInstitution) {
    normalized = normalized
      .replace(new RegExp(currentLegacyInstitution, "g"), resolvedName)
      .replace(new RegExp(currentLegacyName, "g"), resolvedName)
  }

  return normalized
}