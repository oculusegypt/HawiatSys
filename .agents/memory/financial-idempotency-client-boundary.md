---
name: Financial idempotency at the client boundary
description: Keep financial operation keys available to generated clients and HTTP retries
---

Financial mutations should accept an idempotency key from both the HTTP header and the request body, while the server remains authoritative for deduplication.

**Why:** Generated mutation hooks may not expose per-call request headers, so a header-only contract can silently lose duplicate protection in the normal UI path.

**How to apply:** Generate a fresh key when starting a user operation, send it in the body and header when possible, make retries reuse the same body key, and compare normalized financial identities rather than serialized display metadata.