---
name: Hostinger FTP verification
description: Live HTTP can be healthy while the supplied FTP account cannot access the expected public_html path.
---

Treat FTP deployment verification as a separate prerequisite from HTTP smoke tests. A rejected FTP login or an FTPS session that cannot resolve the documented public_html directory means the deployed file identity is unproven, even when the live API responds correctly.

**Why:** A live Hostinger runtime may be serving a valid application while the available transfer account is stale, scoped differently, or pointed at a different root.

**How to apply:** Record the FTP/FTPS failure explicitly and do not claim source-to-live hash parity or upload a replacement database until access is corrected.