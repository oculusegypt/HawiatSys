import assert from "node:assert/strict";
import {
  closeFinancialPeriod,
  financialTruth,
  postToFinancialCore,
  reverseInFinancialCore,
} from "./financial-core.js";
import { sqlite } from "./index.js";

// This fixture intentionally includes the operational record boundary as well as
// the ledger tables. It is safe, anonymous, deterministic, and isolated by the
// package test command's DB_PATH.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS container_system_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', reference TEXT NOT NULL DEFAULT '',
    payload TEXT NOT NULL DEFAULT '{}'
  );
  INSERT INTO container_system_records (kind, status, reference, payload)
  VALUES ('customer', 'active', 'CUS-CERT', '{"name":"عميل اختبار مجهّل"}'),
         ('contract', 'active', 'CON-CERT', '{"customerRecordId":1,"total":10000}'),
         ('invoice', 'posted', 'INV-CERT', '{"contractRecordId":2,"total":10000}'),
         ('purchase', 'posted', 'PUR-CERT', '{"amount":1000}'),
         ('stock_issue', 'posted', 'ISS-CERT', '{"amount":300}');
`);

const post = (sourceKind: string, sourceId: number, amount: number, extra: Record<string, unknown> = {}) =>
  postToFinancialCore({
    sourceKind,
    sourceId,
    amount,
    date: "2026-08-23",
    operationKey: `cert-${sourceKind}-${sourceId}`,
    createdBy: 1,
    ...extra,
  });

assert.equal(post("invoice", 1001, 10000).idempotent, false);
assert.equal(post("payment", 1002, 10000, {
  paymentMethod: "بنكي",
  allocations: [{ contractId: 2, invoiceId: 1001, amount: 10000 }],
}).idempotent, false);
assert.equal(post("payment", 1002, 10000).idempotent, true);
assert.equal((post("receipt", 1003, 10000, { sourcePaymentId: 1002 }) as { documentOnly?: boolean }).documentOnly, true);
assert.equal(post("deposit", 1004, 10000).idempotent, false);
assert.equal(post("expense", 1005, 500).idempotent, false);
assert.equal(post("purchase", 1006, 1000).idempotent, false);
assert.equal(post("stock_issue", 1007, 300).idempotent, false);
assert.equal(post("commission", 1008, 200).idempotent, false);
assert.equal(post("bank_fee", 1009, 50).idempotent, false);
assert.equal(post("other_revenue", 1010, 400).idempotent, false);
assert.equal(post("transfer", 1011, 250).idempotent, false);
assert.equal(post("payment_return", 1012, 200, { paymentMethod: "بنكي" }).idempotent, false);
assert.equal(post("invoice_return", 1013, 200).idempotent, false);

let truth = financialTruth().totals;
assert.equal(truth.totalDebit, truth.totalCredit);
assert.equal(truth.revenue, 10000);
assert.equal(truth.netCollections, 9800);
assert.equal(truth.refunds, 200);
assert.equal(truth.bankFees, 50);
assert.equal(truth.commissions, 200);
assert.equal(truth.balances.accountsReceivable, -200);

const reversal = reverseInFinancialCore({ sourceKind: "payment", sourceId: 1002, amount: 10000 }, "اختبار عكس", 1);
assert.equal(reversal?.idempotent, false);
assert.equal((reverseInFinancialCore({ sourceKind: "payment", sourceId: 1002, amount: 10000 }, "إعادة محاولة", 1) as { rejected?: boolean } | null)?.rejected, true);
truth = financialTruth().totals;
assert.equal(truth.totalDebit, truth.totalCredit);
assert.equal(truth.balances.accountsReceivable, 9800);

closeFinancialPeriod("2026-08", 1);
assert.throws(() => post("expense", 1099, 10), /مغلقة/);
assert.throws(() => reverseInFinancialCore({ sourceKind: "invoice", sourceId: 1001, amount: 10000 }, "فترة مغلقة", 1), /مغلقة/);

console.log("financial certification assertions passed");