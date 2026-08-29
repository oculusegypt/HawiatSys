---
name: Vite canonical root URLs
description: Root-relative canonical links can be treated as local build assets by Vite.
---

Avoid putting a root-relative canonical href such as `/` in the raw Vite HTML template; Vite may resolve it as the project directory and fail with EISDIR.

**Why:** Vite processes HTML asset URLs during production builds, while the prerender stage already owns the final absolute canonical URL.

**How to apply:** Let prerender insert or replace the canonical tag with the configured absolute public origin, and keep the raw template free of root-relative asset-like canonical hrefs.