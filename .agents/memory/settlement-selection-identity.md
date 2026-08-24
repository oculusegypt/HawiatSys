---
name: Settlement selection identity
description: Keep customer-payment validation and submission aligned with the selected contract identity.
---

Customer settlement forms may display a contract number while storing the actual choice as a contract record ID. Validation and submission must use the selected ID list as the source of truth, with the display number retained only for compatibility and presentation.

**Why:** A valid contract selection could be rejected when its display-number field was temporarily empty or stale, even though the UI visibly showed the selected contract.

**How to apply:** Derive settlement allocations from the selected contract IDs, fall back to the legacy single contract ID when needed, and send any invoice relationship inside the matching allocation.