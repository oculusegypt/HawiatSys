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

Unicode filenames in sitemap and prerendered HTML are commonly percent-encoded by `URL`; archive image checks must decode the URL pathname before looking up the extracted file.

**Why:** The files can exist with Arabic names while a literal filesystem lookup of `/images/content/%D8...jpg` reports them as missing, producing a false release failure.

**How to apply:** Decode URL pathnames in the SEO gate, then normalize `/api/uploads/` to `/uploads/` before checking archive files.

Compatibility aliases may remain physically present in the archive, but they must be `noindex, follow`, canonicalized to the primary route, and excluded from the Sitemap. Count indexable HTML separately from total HTML.

**Why:** Removing old routes breaks inbound links, while leaving duplicate aliases indexable inflates route counts and creates duplicate-content signals.

**How to apply:** Apply the rule in the prerender writer for every legacy prefix and translated alias, then verify the extracted archive has no `noindex` URL in Sitemap and that indexable HTML equals the canonical URL set.