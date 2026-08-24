---
name: Contract location fallback
description: Contract workflow behavior when a user supplies a location without selecting an existing customer site
---

The contract workflow treats a manual or map-selected location as sufficient location data: when no existing customer-site record is selected, it creates an active customer-site record linked to the chosen customer inside the same transaction, then links the contract and assignment to it.

**Why:** The wizard accepts manual/map location input, so requiring a pre-existing site ID caused valid contract submissions to fail with 422 and required Node and Hostinger PHP to behave differently.

**How to apply:** Preserve this fallback in both the development API and generated Hostinger PHP archive. Keep the generated site transactionally coupled to the contract so failed workflows do not leave orphan location records.