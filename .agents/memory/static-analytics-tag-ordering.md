---
name: Static analytics tag ordering
description: Durable guidance for combining a prerendered analytics snippet with a runtime analytics loader.
---

When analytics is present in prerendered HTML and also managed by the client runtime, use a stable element ID and reuse the existing script when its source matches the configured tag. Any prerender head injection must occur after the complete analytics initialization block, not merely after the external script element.

**Why:** A runtime loader that only removes its own dynamically-created element can leave the prerendered script behind and create duplicate Google tags. Separately, inserting SEO or hydration helpers after the external script but before its inline initialization can violate the required “first after `<head>`” placement.

**How to apply:** Keep one tagged external script per generated page, make the runtime locate it by ID/source, and verify both the generated page count and the first non-whitespace head element after every prerender/build change.