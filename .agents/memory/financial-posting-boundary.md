---
name: Financial posting boundary
description: Rules for reliable financial totals and reversals across the Node API, Hostinger PHP API, and admin reports.
---

All financial totals, contract balances, settlement validation, bank matching, and financial reports must use posted records only. A payment is the primary collection event; a receipt with the same operation is a presentation document and must not be counted again. Cancelling a posted financial record requires a documented posted reversal ledger entry linked to the original record and ledger entry.

**Why:** Draft, rejected, and cancelled records were previously able to inflate balances, while receipt/payment pairs and silent cancellations could leave misleading accounting totals. Node and Hostinger must remain behaviorally aligned.

**How to apply:** Centralize posted-collection filtering in both runtimes and the UI, preserve legacy relationship fields for reads, resolve returns through direct, original-payment, and original-invoice links, and add reversal metadata whenever a posted financial record is cancelled.