---
name: SQLite analytics repair
description: A corrupted analytics table can contain duplicate primary-key records and freelist damage even when ordinary reads still work
---

When SQLite integrity checks report duplicate references or freelist damage in the analytics table, rebuild that table from a `NOT INDEXED` scan, let the primary key regenerate, then run `VACUUM`. If the table cannot be read at all, build the Hostinger archive from a known-good snapshot and merge only readable, non-corrupt source tables; never package the raw damaged file.

**Why:** The damaged b-tree may expose duplicate IDs that prevent a direct row-for-row rebuild while leaving normal application queries apparently functional.

**How to apply:** Stop the API first, preserve a database backup, copy all non-ID columns into a replacement table when possible, swap it in, vacuum, and verify with `PRAGMA integrity_check`. For an archive-only repair, keep the original database untouched, merge current readable business tables into the healthy snapshot, use `journal_mode=DELETE`, and verify the extracted archive database again.