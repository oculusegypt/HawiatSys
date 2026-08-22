---
name: Hashed asset compatibility
description: Keeping Hostinger patches compatible with stale HTML or CDN/browser caches after Vite asset hashes change.
---

When a deployed page can retain older Vite asset URLs, the next Hostinger patch must include regenerated static HTML pages plus lightweight compatibility aliases for the reported old hashed chunks.

**Why:** Replacing hashed assets while old prerendered pages or cached HTML remain active can produce `ERR_ABORTED 404` for vendor files, styles, or dynamic imports even though the current build is valid.

**How to apply:** Run prerender after Vite build, copy all generated HTML into the patch, add only the reported old chunk-name aliases, verify aliases match current chunks, and keep uploads/images untouched.

For FTP-based Hostinger deployment, verify each uploaded file's remote byte size against the local archive before reporting success.

**Why:** An FTP server can acknowledge an upload before the remote write is durable, leaving HTML and hashed assets out of sync despite a successful API response.

**How to apply:** Upload files one by one, compare remote size, retry once on mismatch, and fail the deployment if the second verification still differs.