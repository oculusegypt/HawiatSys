---
name: SQLite seed transaction compatibility
description: Portable demo seed scripts should not assume the Drizzle wrapper exposes a callable transaction method.
---

Use sequential SQLite operations in portable seed scripts unless the concrete database wrapper has been verified to expose the transaction API. Keep reset-and-seed commands deterministic and idempotent at the dataset level.

**Why:** The workspace's Drizzle SQLite wrapper did not expose `db.transaction(...)` at runtime even though the underlying driver supports transactions.

**How to apply:** Prefer direct reset/upsert operations for development fixture commands, or use the exported raw SQLite handle only when an atomic transaction is genuinely required.