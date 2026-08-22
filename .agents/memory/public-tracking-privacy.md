---
name: Public tracking privacy
description: Public order tracking must expose only identification and progress fields, never operational evidence or live driver data.
---

Public order tracking is intentionally a reduced projection of an order, not the administrative record.

**Why:** The tracking endpoint is unauthenticated by design, while administrative records can contain phone details, private notes, signatures, proof uploads, and driver location.

**How to apply:** When adding fields to public tracking responses, keep the allowlist limited to customer-facing identification and appointment/status information; require authenticated admin access for operational evidence.