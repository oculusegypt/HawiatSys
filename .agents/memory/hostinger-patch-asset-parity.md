---
name: Hostinger patch asset parity
description: Asset completeness rules for code-only Hostinger update archives
---

Code-only Hostinger patches must include every root-level asset referenced by the shipped HTML or service worker, including favicon variants, the configured social-preview logo, and notification icons. The patch must still exclude `data/` and `uploads/` unless a full archive was explicitly requested.

**Why:** A patch can deploy successfully while leaving Google previews, favicons, or push notifications broken when those referenced assets are absent from the target site.

**How to apply:** When changing the update-archive builder, scan `index.html`, `manifest.json`, and `sw.js` for root asset references and verify each required file appears in the ZIP before delivery.