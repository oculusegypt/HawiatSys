---
name: SQLite archive logical parity
description: Certifying that a restored or archived SQLite database represents the same data even when file bytes differ.
---

SQLite files with identical logical data can have different physical hashes after `VACUUM`, checkpointing, or page-layout changes. A release check must therefore pair file hashes with schema and row-content parity across every application table.

**Why:** A closure verification produced different source/archive SHA-256 values after creating a clean snapshot, while all 30 schemas and row sets were identical. Treating the physical hash as the only evidence would have produced a false failure.

**How to apply:** Verify `PRAGMA integrity_check`, compare table schemas and sorted row-content hashes, and separately verify the exact archive entry hashes for files that must be byte-identical, such as PHP sources and ZIP twins.