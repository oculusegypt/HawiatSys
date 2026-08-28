---
name: Node/PHP authorization parity
description: Security boundaries must remain equivalent between the development API and the Hostinger archive
---

When an administrative API permission or compatibility route changes, apply the same boundary and supported method/path set to the standalone PHP router used by the Hostinger deployment.

**Why:** The production hosting target does not run the Node server, so securing only the development API leaves the deployed application exposed.

**How to apply:** Compare each admin method/path used by the frontend against both routers, update the shared PHP authorization helper and route guard alongside Node middleware changes, then run PHP syntax validation and an authenticated request against an extracted archive copy.

Financial workflows also require response-shape parity: settlement must create a real `ledger_entry`, return it on create and idempotent retry, and preserve deposit links in both runtimes.