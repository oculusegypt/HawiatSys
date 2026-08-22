---
name: SQLite analytics repair
description: A corrupted analytics table can contain duplicate primary-key records and freelist damage even when ordinary reads still work
---

When SQLite integrity checks report duplicate references or freelist damage in the analytics table, rebuild that table from a `NOT INDEXED` scan, let the primary key regenerate, then run `VACUUM`.

**Why:** The damaged b-tree may expose duplicate IDs that prevent a direct row-for-row rebuild while leaving normal application queries apparently functional.

**How to apply:** Stop the API first, preserve a database backup, copy all non-ID columns into a replacement table, swap it in, vacuum, and verify with `PRAGMA integrity_check`.