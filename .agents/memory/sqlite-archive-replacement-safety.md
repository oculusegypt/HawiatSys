---
name: SQLite archive replacement safety
description: Safe replacement of a portable SQLite snapshot while the local API uses WAL mode.
---

When restoring a SQLite snapshot into the active app, stop API writers before replacing the file, remove destination WAL/SHM sidecars, and verify integrity before restarting.

**Why:** A live API process can write sidecars against the replaced database and make an otherwise healthy archive appear malformed on the next startup.

**How to apply:** Preserve the prior database, replace the main file only while no writer is running, run `PRAGMA integrity_check`, then restart the API and verify the proxied health endpoint.