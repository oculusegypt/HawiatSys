---
name: Hostinger FTP verification
description: Live HTTP can be healthy while the supplied FTP account cannot access the expected public_html path.
---

Treat FTP deployment verification as a separate prerequisite from HTTP smoke tests. Verify the exact current account and protocol against the documented public_html directory; a historical FTP failure must not be treated as current evidence.

**Why:** A live Hostinger runtime may be serving a valid application while the available transfer account is stale, scoped differently, or pointed at a different root.

**How to apply:** Record the current FTP result explicitly. Claim source-to-live hash parity only after downloading the live files and comparing hashes, and never upload a replacement database as part of a code-only patch.