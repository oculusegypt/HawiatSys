import { useEffect } from "react"

export function useDocumentSchema(id: string, schema: unknown, enabled = true) {
  useEffect(() => {
    const previous = document.getElementById(id)
    previous?.remove()
    if (!enabled) return
    // Remove the static route snapshot before adding the hydrated graph. Keep
    // the global business identity because it is maintained by SiteIdentitySEO.
    document.querySelectorAll('script[type="application/ld+json"]').forEach((element) => {
      if (element.id !== "local-business-schema") element.remove()
    })

    const script = document.createElement("script")
    script.id = id
    script.type = "application/ld+json"
    const schemaObject = schema && typeof schema === "object" && !Array.isArray(schema) ? schema : {}
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      ...(Array.isArray(schema) ? { "@graph": schema } : schemaObject),
    })
    document.head.appendChild(script)
    return () => document.getElementById(id)?.remove()
  }, [id, schema, enabled])
}