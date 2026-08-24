---
name: Contract invoice source
description: Source-of-truth rules for invoices generated during container contract creation
---

An invoice created by the contract workflow is derived from the contract, not recalculated as a separate sale: the selected container is the invoice line item, the contract location is the service address, and the invoice total is the contract total. The invoice remains due/draft until normal financial posting.

**Why:** Recalculating the invoice independently can change totals, while generic descriptions lose the operational link between the contract, container, and service location.

**How to apply:** Keep these fields aligned in the Node API, Hostinger PHP API, invoice detail/print views, and any future contract billing changes.