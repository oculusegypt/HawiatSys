---
name: Rental service schema boundary
description: Structured-data rules for locally delivered container rental services.
---

Container rental is a locally delivered service, not a shippable ecommerce product. Public rental pages must use `Service` and must not emit `Product`, `Offer`, merchant return-policy fields, or shipping fields unless verified business policies are added.

**Why:** The business data describes quoting, delivery, pickup, and exchange by project location; inventing ecommerce shipping or return terms creates misleading Merchant listings and Search Console errors.

**How to apply:** Keep container detail, pricing, homepage service catalogs, and area pages on the service model. If genuine product sales are introduced later, add a separate explicitly documented product contract with real policies.