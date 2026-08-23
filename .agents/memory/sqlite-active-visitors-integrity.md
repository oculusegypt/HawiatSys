---
name: Active visitors SQLite integrity
description: How to interpret active_visitors autoindex failures in WAL-backed portable databases.
---

An `integrity_check` failure on the `active_visitors` primary-key autoindex with no duplicate `session_id` values can indicate an inconsistent WAL-backed copy rather than duplicate data corruption. A safe SQLite backup plus index rebuild on the stopped source restored integrity without deleting rows.

**Why:** Copying a live WAL database without first checkpointing can capture an incomplete main file and leave index/table state inconsistent; the visible row count may also change when pending WAL content is incorporated.

**How to apply:** Stop the writer, preserve a SQLite backup, checkpoint or use SQLite backup APIs, then run the smallest repair (`REINDEX` for the affected index) and verify both `integrity_check` and row preservation before packaging or deployment.