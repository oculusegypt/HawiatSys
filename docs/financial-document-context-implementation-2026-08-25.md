# Financial Document Context Implementation — 2026-08-25

## Scope

This change extends the existing financial core. It does not create a second ledger, replace double-entry posting, or touch production data.

## Implemented behavior

- Receipt records use a user-facing `RCV-YYYY-NNNNNN` document number when no number is supplied.
- Receipt and payment records may carry `receiptSource`, `currency`, `reference`, and the existing customer, contract, invoice, allocation, and payment-method fields.
- When a payment or receipt references an invoice, the API resolves the invoice's customer, contract, and contract number when those fields are not supplied. Conflicting customer or contract relationships are rejected by the existing validation.
- Posted receipts linked to a payment remain document-only in Financial Core. The payment remains the collection event, preventing duplicate cash and customer-account totals.
- Expense records accept a flexible category/type pair. At least one of category or expense type is required, and the chosen value is normalized into `expenseCategory` / `expenseType`.
- Expense and other-revenue records can optionally reference an employee, supplier, container, contract, work order, or customer site. Supplied references must identify an active record of the expected kind; contract context can infer the customer and contract number.
- Existing lifecycle, closed-period, idempotency, reversal, allocation, and double-entry rules remain authoritative.

## Context model

The project continues to use the existing record payload relationship fields rather than introducing an abstract database context table. This keeps legacy records readable and avoids a database-wide migration for fields that are legitimately optional.

## Naming

| Concept | API/payload field | Arabic UI label |
|---|---|---|
| Receipt number | `receiptNumber` | رقم الإيصال |
| Receipt source | `receiptSource` | مصدر القبض |
| Expense category | `expenseCategory` / legacy `category` | تصنيف المصروف |
| Expense type | `expenseType` | نوع المصروف |
| Responsible employee | `employeeRecordId` | الموظف المسؤول |
| Supplier/payee | `supplierRecordId` | المورد أو الدافع |
| Operational context | `containerRecordId`, `contractRecordId`, `workOrderRecordId`, `siteRecordId` | الحاوية / العقد / أمر العمل / الموقع |

## Verification boundary

The existing isolated financial-core and cross-report tests remain the regression authority for posting, allocation, receipt/payment de-duplication, reversals, closed periods, balanced journal totals, and Financial Truth. Hostinger parity remains a separate runtime concern; no production or Hostinger database was modified in this change.

## Known limitations

- The generic record dialog still accepts context IDs as text; contextual launchers may pre-fill them, but a future UX pass can replace these fields with searchable selectors without changing the API contract.
- Customer statements and profile totals should continue to consume Financial Truth for certified accounting figures; legacy record lists are detail/navigation views only.