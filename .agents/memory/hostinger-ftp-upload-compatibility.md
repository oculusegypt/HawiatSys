---
name: Hostinger FTP upload compatibility
description: Compatibility rules for the admin-managed Hostinger patch uploader.
---

The Hostinger uploader must validate ZIP contents safely while walking the extracted directory tree for actual upload paths; relying on a separately decoded ZIP filename list can corrupt or mismatch Unicode route names. Uploading the extracted directory through the FTP client's recursive directory method avoids repeated directory setup and is substantially more reliable for large prerendered patches.

**Why:** ZIP metadata decoding and filesystem names can differ for Arabic route directories, and per-file FTP directory creation made a complete patch exceed interactive request timeouts.

**How to apply:** Keep archive path validation, extract into a dedicated directory that excludes the ZIP itself, recursively enumerate regular files from that directory, and upload the directory tree. If a stored FTP password cannot be decrypted because a previous SESSION_SECRET was used, use the managed secret fallback without logging or exposing the password.