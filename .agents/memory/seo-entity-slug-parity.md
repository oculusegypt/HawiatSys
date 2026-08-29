---
name: SEO entity slug parity
description: Public Arabic SEO entity URLs append record IDs and must resolve identically in Node and Hostinger PHP.
---

Public SEO URLs are generated from the stored Arabic slug plus the record ID, such as `/page/<slug>-2` or `/pages/<slug>-2`. Both the Node API and the Hostinger PHP API must resolve that generated alias as well as the stored `slug` and `seo_slug`.

**Why:** The live page can load its HTML while its client-side API request returns 404 if PHP only compares the database slug literally. Arabic percent-encoding is not the underlying failure.

**How to apply:** Whenever `entitySlug` or `entityPath` changes, update the PHP lookup and the archive smoke test together, then test every published SEO record through its generated public alias.