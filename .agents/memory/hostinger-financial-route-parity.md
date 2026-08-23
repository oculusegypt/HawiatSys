---
name: Hostinger financial route parity
description: Keep PHP generic record creation aligned with Node for idempotency and closed-period posting
---

The Hostinger PHP generic record route must treat contracts as idempotent documents and must reject a requested posted financial record in a closed period before inserting anything; it must not silently downgrade that request to draft.

**Why:** A live production cycle exposed that the PHP route's idempotency list covered financial movements but omitted contracts, while its status normalization silently converted direct posted requests to drafts. Node and PHP then produced different externally visible behavior.

**How to apply:** Whenever financial lifecycle or idempotency behavior changes in Node, inspect the equivalent PHP route and test both a repeated contract key and a direct post into a closed period.