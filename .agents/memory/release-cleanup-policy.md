---
name: Release cleanup policy
description: The repository keeps only repeatable production-build tools and current operational documentation.
---

The source tree should contain repeatable build, packaging, runtime, and reusable validation tools; one-off migrations, seeders, probes, generated reports, and superseded handoffs should be removed after their result is incorporated into the current database or release.

**Why:** Historical executable scripts and reports create competing sources of truth and make it easy to rebuild obsolete content or follow a deployment path that no longer matches production.

**How to apply:** Before a release, search for references to retired files, keep the active Hostinger build and patch paths intact, retain current security/operations guides, and certify the newly generated archive rather than relying on an older report.