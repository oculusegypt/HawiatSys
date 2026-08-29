---
name: Hero LCP loading
description: Browser loading behavior for prerendered hero images and hidden slider slides
---

The first hero image must be discoverable in the initial HTML and the slider should not render every hidden absolute-positioned slide as an image during first paint.

**Why:** Browsers can treat hidden or lazy images positioned inside the viewport as near-view resources, so a carousel can download several large images even when only one is visible. A preload alone does not prevent that network competition.

**How to apply:** Keep the active/next slide image set intentionally small, preserve explicit image dimensions, and verify the final generated HTML plus a mobile performance trace rather than relying on source-level lazy attributes.