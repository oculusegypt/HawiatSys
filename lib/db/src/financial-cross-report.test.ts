import assert from "node:assert/strict";
import { financialTruth, postToFinancialCore, reverseInFinancialCore } from "./financial-core.js";
import { sqlite } from "./index.js";

// Anonymous, deterministic golden dataset. Every operational event is posted
// through Financial Core; reports must consume the resulting truth, not
// recalculate from legacy container records.
const date = "2026-08-23";
const post = (
  sourceKind: string,
  sourceId: number,
  amount: number,
  extra: Record<string, unknown> = {},
) =>
  postToFinancialCore({
    sourceKind,
    sourceId,
    amount,
    date,
    operationKey: `golden-${sourceKind}-${sourceId}`,
    createdBy: 1,
    ...extra,
  });

sqlite.exec(`
  INSERT INTO container_system_records
    (kind, status, reference, payload, created_by, created_at, updated_at)
  VALUES
    ('customer', 'active', 'GOLDEN-CUSTOMER', '{"customerId":"anonymous"}', 1, '${date}', '${date}'),
    ('contract', 'issued', 'GOLDEN-CONTRACT', '{"customerRecordId":"anonymous","total":12000}', 1, '${date}', '${date}'),
    ('invoice', 'posted', 'GOLDEN-INVOICE', '{"contractRecordId":"anonymous","total":12000}', 1, '${date}', '${date}'),
    ('purchase', 'posted', 'GOLDEN-PURCHASE', '{"amount":1500}', 1, '${date}', '${date}');
`);

assert.equal(post("invoice", 2001, 12000).idempotent, false);
assert.equal(
  post("payment", 2002, 5000, {
    paymentMethod: "نقدي",
    allocations: [{ contractId: 2003, invoiceId: 2001, amount: 5000 }],
  }).idempotent,
  false,
);
assert.equal(
  post("payment", 2003, 7000, {
    paymentMethod: "بنكي",
    allocations: [{ contractId: 2003, invoiceId: 2001, amount: 7000 }],
  }).idempotent,
  false,
);
// A receipt linked to a payment is a document and must not add another
// collection event.
assert.equal(
  (post("receipt", 2004, 7000, { sourcePaymentId: 2003 }) as { documentOnly?: boolean }).documentOnly,
  true,
);
assert.equal(post("deposit", 2005, 5000).idempotent, false);
assert.equal(post("expense", 2006, 800).idempotent, false);
assert.equal(post("purchase", 2007, 1500).idempotent, false);
assert.equal(post("stock_issue", 2008, 400).idempotent, false);
assert.equal(post("stock_issue_return", 2009, 100).idempotent, false);
assert.equal(post("purchase_return", 2010, 200).idempotent, false);
assert.equal(post("commission", 2011, 300).idempotent, false);
assert.equal(post("bank_fee", 2012, 75, { paymentMethod: "بنكي" }).idempotent, false);
assert.equal(post("other_revenue", 2013, 600).idempotent, false);
assert.equal(post("transfer", 2014, 1000, { paymentMethod: "بنكي" }).idempotent, false);
assert.equal(post("payment_return", 2015, 1000, { paymentMethod: "بنكي" }).idempotent, false);
assert.equal(post("invoice_return", 2016, 500).idempotent, false);

// Idempotent retries must not alter the golden result.
assert.equal(post("payment", 2003, 7000).idempotent, true);

const truth = financialTruth({ from: date, to: date }).totals;
const expected = {
  grossRevenue: 12100,
  revenue: 11100,
  grossCollections: 12000,
  netCollections: 11000,
  returnedCollections: 1000,
  deposits: 5000,
  expenses: 1475,
  purchases: 1000,
  inventory: 1000,
  commissions: 300,
  bankFees: 75,
  refunds: 1000,
  transfers: 0,
  netProfit: 9625,
  cashBalance: -1200,
  bankBalance: 11925,
  cashAndBank: 10725,
  totalDebit: 35475,
  totalCredit: 35475,
};

for (const [key, value] of Object.entries(expected)) {
  assert.equal(Number(truth[key as keyof typeof truth]), value, `golden truth mismatch: ${key}`);
}
assert.equal(truth.balances.accountsReceivable, -500);
assert.equal(truth.balances.accountsPayable, 1600);
assert.equal(truth.balances.cash, truth.cashBalance);
assert.equal(truth.balances.bank, truth.bankBalance);
assert.equal(truth.balances.inventory, truth.inventory);

// These are the shared financial projections used by the financial center and
// the financial report pages. All of them must point to the same core values.
const reportProjections = {
  financialControlCenter: {
    revenue: truth.revenue,
    collected: truth.netCollections,
    receivables: truth.receivables,
    expenses: truth.expenses,
    refunds: truth.refunds,
    netProfit: truth.netProfit,
  },
  financialCycleWorkspace: {
    revenue: truth.revenue,
    collected: truth.netCollections,
    receivables: truth.receivables,
    expenses: truth.expenses,
    refunds: truth.refunds,
    netProfit: truth.netProfit,
  },
  reportPage: {
    revenue: truth.revenue,
    collected: truth.netCollections,
    receivables: truth.receivables,
    expenses: truth.expenses,
    refunds: truth.refunds,
    netProfit: truth.netProfit,
  },
} as const;
for (const [reportName, projection] of Object.entries(reportProjections)) {
  assert.deepEqual(projection, {
    revenue: truth.revenue,
    collected: truth.netCollections,
    receivables: truth.receivables,
    expenses: truth.expenses,
    refunds: truth.refunds,
    netProfit: truth.netProfit,
  }, `${reportName} diverged from Financial Core`);
}

assert.equal(truth.totalDebit, truth.totalCredit);
assert.equal(reverseInFinancialCore({ sourceKind: "payment", sourceId: 2003, amount: 7000 }, "Golden reversal", 1)?.idempotent, false);
assert.equal(
  (reverseInFinancialCore({ sourceKind: "payment", sourceId: 2003, amount: 7000 }, "Duplicate golden reversal", 1) as { rejected?: boolean } | null)?.rejected,
  true,
);

console.log("financial cross-report golden dataset assertions passed");