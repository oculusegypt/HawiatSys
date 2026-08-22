---
name: SQLite startup migrations
description: Why portable SQLite feature tables use startup DDL in this workspace
---

For portable SQLite features, keep a matching `CREATE TABLE IF NOT EXISTS` startup migration alongside the Drizzle schema.

**Why:** `drizzle-kit push` can require an interactive named-schema conflict prompt in the non-TTY agent environment, while the running app must still initialize fresh and existing database files deterministically.

**How to apply:** Add the Drizzle table for types and queries, then add idempotent startup DDL and indexes in the database client initialization. Keep the column names and defaults synchronized. For PHP workflows, explicitly bind every NOT NULL timestamp instead of relying on SQLite defaults in legacy files.