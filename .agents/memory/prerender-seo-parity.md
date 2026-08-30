---
name: Prerender SEO parity
description: Static metadata must satisfy the same SEO constraints as hydrated runtime metadata
---

Static page generation must normalize every title-adjacent description before writing HTML and schema; runtime metadata hooks are not enough. When a database-backed source has an alternate table, choose the fallback based on rows that are actually SEO-eligible, not merely on whether the first table exists.

**Why:** The production archive is crawled before JavaScript hydration, and pages can otherwise pass runtime checks while shipping short or inconsistent descriptions in the first response.

**How to apply:** Reuse the same length and whitespace rules for homepage, static routes, dynamic routes, and database-backed SEO pages, then inspect extracted archive HTML rather than only the app preview. Compare the final sitemap URL set to canonical URLs from every extracted HTML file.

The Hostinger build should run the SEO gate only after the final ZIP is created, and area-route vocabularies should be shared or asserted between sitemap generation and prerendering.

**Why:** A pre-package check cannot catch stale files or copy-time divergence, and duplicated Arabic neighborhood slugs can recreate canonical/Sitemap mismatches after an otherwise successful build.

**How to apply:** Generate, package, extract, and validate the same archive that will be uploaded; fail the build when either route producer drifts from the canonical area list.