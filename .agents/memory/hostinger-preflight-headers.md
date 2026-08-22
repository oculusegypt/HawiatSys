---
name: Hostinger preflight headers
description: Browser preflight requirements for custom headers in the PHP deployment.
---

The Hostinger PHP API must list every custom request header used by the frontend in `Access-Control-Allow-Headers`, including idempotency headers.

**Why:** Browsers reject the workflow request during OPTIONS preflight before PHP can process it when a custom header is omitted, which can look like an unrelated 422 or failed save.

**How to apply:** Whenever a frontend mutation adds a custom header, update the PHP API CORS response and the generated Hostinger archive together.