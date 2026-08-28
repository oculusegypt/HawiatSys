---
name: Prerender SEO parity
description: Static metadata must satisfy the same SEO constraints as hydrated runtime metadata
---

Static page generation must normalize every title-adjacent description before writing HTML and schema; runtime metadata hooks are not enough. When a database-backed source has an alternate table, choose the fallback based on rows that are actually SEO-eligible, not merely on whether the first table exists.

**Why:** The production archive is crawled before JavaScript hydration, and pages can otherwise pass runtime checks while shipping short or inconsistent descriptions in the first response.

**How to apply:** Reuse the same length and whitespace rules for homepage, static routes, dynamic routes, and database-backed SEO pages, then inspect extracted archive HTML rather than only the app preview. Compare the final sitemap URL set to canonical URLs from every extracted HTML file.