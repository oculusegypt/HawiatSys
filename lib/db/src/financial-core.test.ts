import assert from "node:assert/strict";
import { closeFinancialPeriod, financialTruth, postToFinancialCore, reverseInFinancialCore } from "./financial-core.js";

const invoice = postToFinancialCore({
  sourceKind: "invoice", sourceId: 91001, reference: "INV-TEST-01", amount: 100,
  date: "2026-08-10", createdBy: 1,
});
assert.equal(invoice.idempotent, false);
const payment = postToFinancialCore({
  sourceKind: "payment", sourceId: 91002, reference: "PAY-TEST-01", amount: 100,
  date: "2026-08-11", operationKey: "test-payment-91002", createdBy: 1,
  paymentMethod: "نقدي", allocations: [{ contractId: 1, invoiceId: 91001, amount: 100 }],
});
assert.equal(payment.idempotent, false);
assert.equal(postToFinancialCore({
  sourceKind: "payment", sourceId: 91002, reference: "PAY-TEST-01", amount: 100,
  date: "2026-08-11", operationKey: "test-payment-91002", createdBy: 1,
}).idempotent, true);

const bankFee = postToFinancialCore({
  sourceKind: "bank_fee", sourceId: 91004, reference: "BANK-FEE-TEST-01", amount: 12,
  date: "2026-08-12", operationKey: "test-bank-fee-91004", createdBy: 1,
  paymentMethod: "بنكي",
});
assert.equal(bankFee.idempotent, false);
assert.equal(postToFinancialCore({
  sourceKind: "bank_fee", sourceId: 91004, reference: "BANK-FEE-TEST-01", amount: 12,
  date: "2026-08-12", operationKey: "test-bank-fee-91004", createdBy: 1,
}).idempotent, true);
const totalsAfterBankFee = financialTruth().totals as {
  bankFees: number; totalDebit: number; totalCredit: number;
};
assert.equal(Number(totalsAfterBankFee.bankFees), 12);
assert.ok(Math.abs(Number(totalsAfterBankFee.totalDebit) - Number(totalsAfterBankFee.totalCredit)) < 0.01);

const totalsBeforeReverse = financialTruth().totals as { totalDebit: number; totalCredit: number };
assert.ok(Math.abs(Number(totalsBeforeReverse.totalDebit) - Number(totalsBeforeReverse.totalCredit)) < 0.01);
assert.equal(reverseInFinancialCore({ sourceKind: "payment", sourceId: 91002, amount: 100 }, "اختبار العكس", 1)?.idempotent, false);
const totals = financialTruth().totals as { totalDebit: number; totalCredit: number };
assert.ok(Math.abs(Number(totals.totalDebit) - Number(totals.totalCredit)) < 0.01);

closeFinancialPeriod("2026-08", 1);
assert.throws(() => postToFinancialCore({
  sourceKind: "expense", sourceId: 91003, amount: 10, date: "2026-08-20", createdBy: 1,
}), /مغلقة/);
console.log("financial-core assertions passed");