---
name: Image optimization
description: ImageMagick format detection and safe WebP conversion in this workspace
---

When converting PNG assets to WebP with ImageMagick, the output path must end in `.webp` (or use an explicit format with a correctly named output); a temporary suffix such as `.webp.tmp` can make ImageMagick emit PNG instead.

**Why:** The tool chooses the encoder from the output filename in this environment, so an incorrectly named temporary file silently produces the wrong format and prevents the intended size reduction.

**How to apply:** Use a temporary filename ending in `.tmp.webp`, then atomically rename it to the final `.webp` path after verifying its MIME type and size.