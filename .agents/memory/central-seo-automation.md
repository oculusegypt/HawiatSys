---
name: Central SEO automation
description: The durable boundary for SEO metadata generation, slug stability, backfill, and prerender safety.
---

SEO metadata is a domain invariant, not an editor-maintenance task. Create and update workflows must generate complete metadata in both the development API and the Hostinger PHP API; legacy records need an idempotent repair path. Existing public slugs remain stable unless a new slug is explicitly requested, and generated slugs must be unique. Prerender and sitemap generation should include active public records even when legacy SEO fields are missing, while an explicit noindex choice remains separate from metadata presence.

**Why:** The production environment runs PHP/SQLite without Node, so implementing the rule in only one runtime creates different behavior and eventually reintroduces missing SEO pages.

**How to apply:** Any new SEO-dependent entity must use the same generator/backfill contract in Node, Hostinger PHP, public routing, sitemap generation, and prerender.