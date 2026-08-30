---
name: SEO entity slug parity
description: Public Arabic SEO entity URLs append record IDs and must resolve identically in Node and Hostinger PHP.
---

Public SEO URLs are generated from the stored Arabic slug plus the record ID, such as `/page/<slug>-2` or `/pages/<slug>-2`. Both the Node API and the Hostinger PHP API must resolve that generated alias as well as the stored `slug` and `seo_slug`.

**Why:** The live page can load its HTML while its client-side API request returns 404 if PHP only compares the database slug literally. Arabic percent-encoding is not the underlying failure.

**How to apply:** Whenever `entitySlug` or `entityPath` changes, update the PHP lookup and the archive smoke test together, then test every published SEO record through its generated public alias.

The deployable prerender and sitemap scripts must import the same service-aware slug strategy as the React and API runtimes; otherwise the archive can publish a different canonical URL even when API aliases work.

**Why:** A duplicated slug helper in the build pipeline previously left Arabic service URLs in static HTML and the sitemap while the runtime already recognized compact ASCII aliases.

**How to apply:** Treat runtime helpers and `scripts/friendly-slug.mjs` as one contract, and inspect generated service directories, canonicals, and sitemap entries after every slug change.