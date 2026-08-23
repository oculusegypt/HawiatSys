---
name: Golden financial verification
description: Rules for maintaining the cross-report financial regression fixture and interpreting local versus Hostinger evidence.
---

The financial regression fixture must derive every expected report value from the posted journal behavior, including cash effects of deposits and transfers, while linked receipts remain document-only.

**Why:** Manual arithmetic initially missed non-income cash movements; the journal output exposed the discrepancy and prevented weakening the assertion.

**How to apply:** Keep the fixture isolated, anonymous, deterministic, and routed through Financial Core. Treat a successful archive build or PHP lint as local evidence only; Hostinger E2E remains blocked without an accessible Hostinger runtime.