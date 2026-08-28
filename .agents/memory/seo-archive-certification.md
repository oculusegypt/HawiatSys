---
name: SEO archive certification
description: The production SEO contract includes the extracted Hostinger archive, not just source or dist output.
---

The release is not SEO-certified until the final archive has been extracted and its homepage, representative dynamic pages, sitemap, robots file, PHP entry points, JavaScript/CSS assets, and referenced images have been inspected.

**Why:** Static output can diverge from the archive during copy, compatibility-image creation, PHP packaging, or sitemap ordering, so a clean Vite build alone can miss the production failure.

**How to apply:** Generate the sitemap before the frontend build, prerender before packaging, compare sitemap content across public/dist/build/archive, and run metadata plus local-image checks against the extracted archive.

The prerender step must also replace the root HTML public-origin placeholder; otherwise the runtime resolver starts with an empty origin even when canonical and OG tags are correct.

**Why:** Vite copies the source placeholder into the first response, while React settings load asynchronously after the page has already begun rendering.

**How to apply:** Assert that the extracted archive homepage contains the configured origin in `site-public-url`, canonical, OG URL, JSON-LD, sitemap, and robots.

The SEO gate must resolve the public origin through the same explicit build override used by sitemap generation when the development setting is intentionally blank.

**Why:** The development database may leave the public URL empty for runtime auto-detection, while a production archive still needs one canonical HTTPS origin.

**How to apply:** Pass the production origin explicitly during archive certification and compare the extracted archive against that origin.