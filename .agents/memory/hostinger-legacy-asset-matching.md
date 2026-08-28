---
name: Hostinger legacy asset matching
description: How production archive cleanup avoids reintroducing retired image assets
---

Production archive cleanup must compare legacy asset stems case-insensitively and apply the same exclusion rule to every copied directory, including compatibility image copies.

**Why:** Removing a legacy file only from the archive root is insufficient; recursive copies and path-compatibility generation can bring an unused asset back into the Hostinger package.

**How to apply:** Add each retired filename as its normalized lowercase stem in the production exclusion set, then inspect the final ZIP listing for both the retired filename and its source-directory variants.