---
name: Container route authorization
description: Container-system permissions must be enforced on the API route, not only by hiding navigation items in the admin UI.
---

Every container-system read and mutation must verify the caller's section permission at the server boundary.

**Why:** The admin sidebar is presentation only; a user can still call an API route directly, and broad authenticated access exposed operational and financial records.

**How to apply:** Use the shared permission resolver for summary, record, workflow, finance, and audit routes, and keep record-kind checks for dynamic create/update operations.