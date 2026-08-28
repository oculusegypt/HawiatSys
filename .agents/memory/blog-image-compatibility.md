---
name: Blog image compatibility
description: The project decision governing legacy article images and newly created blog drafts.
---

Content-image migrations may create title-based copies for articles, SEO pages, services, and hero slides when that is an explicit content requirement. Existing source files and old paths must remain available for compatibility, while every database and prerendered HTML reference must resolve to a packaged file.

**Why:** Hostinger builds combine mutable SQLite content with static HTML. A cleanup pass that only inspects database references can quarantine assets still used by generated pages, leaving broken images after an otherwise successful build.

**How to apply:** Keep migrations source-preserving and idempotent. Before packaging, protect references from all relevant database image columns and restore previously quarantined referenced assets; then run the archive SEO gate, which checks sitemap and HTML image existence.