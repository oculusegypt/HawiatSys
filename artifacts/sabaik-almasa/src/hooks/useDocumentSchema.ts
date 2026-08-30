import { useEffect } from "react"
import { replaceLegacyCompanyName, useSiteSettings } from "@/context/SiteSettingsContext"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
const CENTRAL_ID = "central-structured-data-schema"

type SchemaNode = Record<string, unknown>

function flatten(value: unknown): SchemaNode[] {
  if (Array.isArray(value)) return value.flatMap(flatten)
  if (!value || typeof value !== "object") return []
  const object = value as SchemaNode
  if (Array.isArray(object["@graph"])) return object["@graph"].flatMap(flatten)
  return [object]
}

function mergeSchemas(values: unknown[]): SchemaNode[] {
  const nodes: SchemaNode[] = []
  const keys = new Set<string>()
  for (const value of values) {
    for (const node of flatten(value)) {
      if (!node["@type"]) continue
      const id = typeof node["@id"] === "string" ? node["@id"] : ""
      const key = id || `${node["@type"]}:${JSON.stringify(node)}`
      if (keys.has(key)) continue
      keys.add(key)
      nodes.push(node)
    }
  }
  return nodes
}

function readHeadSchemas(): unknown[] {
  return Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .filter((script) => script.id !== CENTRAL_ID)
    .flatMap((script) => {
      try { return [JSON.parse(script.textContent || "")] } catch { return [] }
    })
}

function replaceDeep(value: unknown, companyName: string): unknown {
  if (typeof value === "string") return replaceLegacyCompanyName(value, companyName) || ""
  if (Array.isArray(value)) return value.map(item => replaceDeep(item, companyName))
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceDeep(item, companyName)]))
  }
  return value
}

/**
 * There is one runtime JSON-LD block per document. Page components can still
 * provide their data-backed nodes, while the API contributes managed
 * Structured Content for the current route. All sources are flattened and
 * deduplicated before they reach the head.
 */
export function useDocumentSchema(id: string, schema: unknown, enabled = true) {
  const { companyName, isLoaded } = useSiteSettings()
  const schemaKey = JSON.stringify(schema)
  useEffect(() => {
    const previous = document.getElementById(CENTRAL_ID)
    previous?.remove()
    if (!enabled || !isLoaded || window.location.pathname.startsWith("/admin")) return

    let cancelled = false
    const publish = (managed: unknown = null) => {
      if (cancelled) return
      const merged = mergeSchemas([...readHeadSchemas(), managed, replaceDeep(schema, companyName)])
      if (!merged.length) return
      document.querySelectorAll('script[type="application/ld+json"]').forEach((element) => element.remove())
      const script = document.createElement("script")
      script.id = CENTRAL_ID
      script.type = "application/ld+json"
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@graph": merged,
      })
      document.head.appendChild(script)
    }

    fetch(`${API_BASE}/api/structured-data?path=${encodeURIComponent(window.location.pathname)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((managed) => publish(managed))
      .catch(() => publish())

    return () => {
      cancelled = true
      document.getElementById(CENTRAL_ID)?.remove()
    }
  }, [companyName, id, isLoaded, schemaKey, enabled])
}