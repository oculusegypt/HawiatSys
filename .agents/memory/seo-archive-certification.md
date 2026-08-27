---
name: SEO archive certification
description: The production SEO contract includes the extracted Hostinger archive, not just source or dist output.
---

The release is not SEO-certified until the final archive has been extracted and its homepage, representative dynamic pages, sitemap, robots file, PHP entry points, JavaScript/CSS assets, and referenced images have been inspected.

**Why:** Static output can diverge from the archive during copy, compatibility-image creation, PHP packaging, or sitemap ordering, so a clean Vite build alone can miss the production failure.

**How to apply:** Generate the sitemap before the frontend build, prerender before packaging, compare sitemap content across public/dist/build/archive, and run metadata plus local-image checks against the extracted archive.