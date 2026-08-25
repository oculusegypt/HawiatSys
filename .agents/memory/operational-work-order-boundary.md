---
name: Operational work-order boundary
description: Durable domain rule for separating commercial requests from contract-driven field operations.
---

Contract-driven delivery, pickup, emptying, return, exchange, inspection, and maintenance are operational work orders. They must not manufacture rows in the commercial service_requests table; an explicitly supplied customer request may remain linked as its origin.

**Why:** The system previously used service_requests as a catch-all for field actions, causing duplicate request/work-order/appointment records and incorrect navigation into financial settlement screens.

**How to apply:** Create a work_order record with explicit customer, contract, container, site, operation type, appointment, and idempotency references. Keep assignment and driver lifecycle updates on that record, and keep ordinary operations outside the financial posting core.