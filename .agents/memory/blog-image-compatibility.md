---
name: Blog image compatibility
description: The project decision governing legacy article images and newly created blog drafts.
---

Article images are part of the existing content contract and must keep their legacy `cover_image` and `og_image` paths. Do not normalize existing blog images to title- or slug-based files under `/images/content/`. New blog drafts that have no previous image should reuse an existing SEO image rather than creating a new title-based blog asset.

**Why:** The user explicitly requires existing blog artwork and links to remain unchanged; replacing the paths changes the established content presentation and can break legacy upload references.

**How to apply:** Limit `/images/content/` naming to SEO pages unless the user explicitly requests blog-image migration. Before rebuilding Hostinger, verify that existing posts do not reference `/images/content/` and that any generated blog-only copies are removed.