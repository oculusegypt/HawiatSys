---
name: Invoice payment auto-allocation
description: Payment entry points must resolve invoice context into a contract allocation consistently in Node and Hostinger PHP.
---

When a payment identifies a single invoice, the server and client should derive its contract and create the allocation automatically; users should not repeat contract selection.

**Why:** A visible invoice selection previously produced an empty allocation payload, blocking valid full and partial payments and risking Node/PHP behavior drift.

**How to apply:** Accept invoice ID or official number, resolve the linked contract before allocation validation, validate the invoice-contract relationship and outstanding balance, then update posted paid/remaining/status atomically with the payment workflow in both runtimes.