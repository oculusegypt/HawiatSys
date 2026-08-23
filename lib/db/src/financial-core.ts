import { sqlite } from "./index";

export type FinancialSource = {
  sourceKind: string;
  sourceId: number;
  reference?: string;
  amount: number;
  date?: string;
  currency?: string;
  operationKey?: string | null;
  createdBy?: number | null;
  allocations?: Array<{ contractId?: number | null; invoiceId?: number | null; amount: number }>;
  paymentMethod?: string;
  /** A receipt linked to a payment is a document, not a second collection event. */
  sourcePaymentId?: number | null;
};

export type FinancialTruthContract = {
  revenue: number;
  collected: number;
  receivables: number;
  expenses: number;
  purchases: number;
  inventory: number;
  commissions: number;
  bankFees: number;
  refunds: number;
  transfers: number;
  cashBalance: number;
  bankBalance: number;
  netProfit: number;
  balances: {
    accountsReceivable: number;
    accountsPayable: number;
    cash: number;
    bank: number;
    inventory: number;
  };
  grossRevenue: number;
  grossCollections: number;
  netCollections: number;
  returnedCollections: number;
  deposits: number;
  cashAndBank: number;
  totalDebit: number;
  totalCredit: number;
};

const accountFor = (kind: string, paymentMethod = ""): [string, string] => {
  if (kind === "invoice") return ["AR-001", "REV-001"];
  // An invoice return reverses the original revenue and receivable.
  if (kind === "invoice_return") return ["REV-001", "AR-001"];
  if (kind === "payment_return") return ["REFUND-001", paymentMethod.includes("بنكي") ? "BANK-001" : "CASH-001"];
  if (kind === "payment" || kind === "receipt") return [paymentMethod.includes("بنكي") || paymentMethod.includes("شبكة") ? "BANK-001" : "CASH-001", "AR-001"];
  if (kind === "deposit" || kind === "bank_deposit") return ["BANK-001", "CASH-001"];
  if (kind === "other_revenue") return ["CASH-001", "REV-OTHER"];
  if (kind === "purchase") return ["INV-001", "AP-001"];
  if (kind === "purchase_return") return ["AP-001", "INV-001"];
  if (kind === "stock_issue") return ["COGS-001", "INV-001"];
  if (kind === "stock_issue_return") return ["INV-001", "COGS-001"];
  if (kind === "transfer") return ["BANK-001", "CASH-001"];
  if (kind === "maintenance") return ["EXP-MAINT", "CASH-001"];
  if (kind === "commission") return ["COMM-001", "AP-001"];
  if (kind === "bank_fee") return ["BANK-FEE", "BANK-001"];
  if (kind === "salary_advance" || kind === "salary_payment" || kind === "expense" || kind === "daily_expense" || kind === "fuel_expense") return ["EXP-001", "CASH-001"];
  return ["ADJ-001", "CASH-001"];
};

function assertOpenPeriod(date: string) {
  const periodKey = date.slice(0, 7);
  const periodEnd = new Date(Date.UTC(Number(periodKey.slice(0, 4)), Number(periodKey.slice(5, 7)), 0))
    .toISOString()
    .slice(0, 10);
  const existing = sqlite.prepare("SELECT status FROM financial_periods WHERE period_key = ?").get(periodKey) as { status: string } | undefined;
  if (existing?.status === "closed") throw new Error(`الفترة المالية ${periodKey} مغلقة؛ سجّل تسوية رسمية في فترة مفتوحة`);
  if (!existing) {
    sqlite.prepare("INSERT OR IGNORE INTO financial_periods (period_key, starts_on, ends_on, status) VALUES (?, ?, ?, 'open')")
      .run(periodKey, `${periodKey}-01`, periodEnd);
  }
}

export function postToFinancialCore(source: FinancialSource) {
  if (!Number.isFinite(source.amount) || source.amount <= 0) throw new Error("لا يمكن ترحيل قيمة مالية غير موجبة");
  // Receipts linked to a payment are presentation documents. Keeping them out
  // of the ledger is the accounting boundary that prevents double counting.
  if (source.sourceKind === "receipt" && source.sourcePaymentId) {
    return { id: null, journalId: null, idempotent: true, documentOnly: true };
  }
  const now = new Date().toISOString();
  const date = source.date || now.slice(0, 10);
  assertOpenPeriod(date);
  const result = sqlite.transaction(() => {
    const existing = sqlite.prepare("SELECT id FROM financial_transactions WHERE source_kind = ? AND source_id = ?").get(source.sourceKind, source.sourceId) as { id: number } | undefined;
    if (existing) return { id: existing.id, idempotent: true };
    const tx = sqlite.prepare(`
      INSERT INTO financial_transactions
        (transaction_number, transaction_type, source_kind, source_id, reference, transaction_date, amount, currency, status, operation_key, created_by, posted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?, ?, ?)
    `).run(`FT-${source.sourceId}`, source.sourceKind, source.sourceKind, source.sourceId, source.reference || "", date, source.amount, source.currency || "SAR", source.operationKey || null, source.createdBy || null, now);
    const transactionId = Number(tx.lastInsertRowid);
    const [debitAccount, creditAccount] = accountFor(source.sourceKind, source.paymentMethod);
    const journal = sqlite.prepare(`
      INSERT INTO financial_journal_entries (transaction_id, entry_number, total_debit, total_credit, status)
      VALUES (?, ?, ?, ?, 'posted')
    `).run(transactionId, `FJ-${transactionId}`, source.amount, source.amount);
    const journalId = Number(journal.lastInsertRowid);
    const line = sqlite.prepare("INSERT INTO financial_journal_lines (journal_entry_id, account_code, debit, credit, description) VALUES (?, ?, ?, ?, ?)");
    line.run(journalId, debitAccount, source.amount, 0, `مدين — ${source.sourceKind}`);
    line.run(journalId, creditAccount, 0, source.amount, `دائن — ${source.sourceKind}`);
    if (source.allocations) {
      const allocation = sqlite.prepare("INSERT INTO financial_allocations (transaction_id, contract_id, invoice_id, amount) VALUES (?, ?, ?, ?)");
      for (const item of source.allocations) allocation.run(transactionId, item.contractId || null, item.invoiceId || null, item.amount);
    }
    return { id: transactionId, journalId, idempotent: false };
  })();
  return result;
}

export function reverseInFinancialCore(source: FinancialSource, reason: string, actorId?: number | null) {
  const original = sqlite.prepare("SELECT id FROM financial_transactions WHERE source_kind = ? AND source_id = ? AND status = 'posted'").get(source.sourceKind, source.sourceId) as { id: number } | undefined;
  if (!original) return null;
  const reversal = sqlite.prepare("SELECT id FROM financial_transactions WHERE source_kind = 'reversal' AND source_id = ?").get(source.sourceId) as { id: number } | undefined;
  if (reversal) return { id: reversal.id, idempotent: true, rejected: true };
  const date = new Date().toISOString().slice(0, 10);
  assertOpenPeriod(date);
  return sqlite.transaction(() => {
    const now = new Date().toISOString();
    const tx = sqlite.prepare(`
      INSERT INTO financial_transactions
        (transaction_number, transaction_type, source_kind, source_id, reference, transaction_date, amount, currency, status, operation_key, created_by, posted_at, cancellation_reason)
      VALUES (?, 'reversal', 'reversal', ?, ?, ?, ?, 'SAR', 'posted', ?, ?, ?, ?)
    `).run(`FT-REV-${source.sourceId}`, source.sourceId, `REV-${source.sourceId}`, date, source.amount, `reversal:${source.sourceKind}:${source.sourceId}`, actorId || null, now, reason);
    const reversalId = Number(tx.lastInsertRowid);
    const journal = sqlite.prepare("INSERT INTO financial_journal_entries (transaction_id, entry_number, total_debit, total_credit, status) VALUES (?, ?, ?, ?, 'posted')")
      .run(reversalId, `FJ-REV-${reversalId}`, source.amount, source.amount);
    const originalJournal = sqlite.prepare("SELECT id FROM financial_journal_entries WHERE transaction_id = ?").get(original.id) as { id: number } | undefined;
    const lines = originalJournal ? sqlite.prepare("SELECT account_code, debit, credit, description FROM financial_journal_lines WHERE journal_entry_id = ?").all(originalJournal.id) as Array<{ account_code: string; debit: number; credit: number; description: string }> : [];
    const line = sqlite.prepare("INSERT INTO financial_journal_lines (journal_entry_id, account_code, debit, credit, description) VALUES (?, ?, ?, ?, ?)");
    for (const item of lines) line.run(Number(journal.lastInsertRowid), item.account_code, item.credit, item.debit, `عكس: ${item.description}`);
    return { id: reversalId, journalId: Number(journal.lastInsertRowid), idempotent: false };
  })();
}

export function financialTruth(filters: { from?: string; to?: string } = {}) {
  const from = filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from) ? filters.from : null;
  const to = filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to) ? filters.to : null;
  const dateClause = " AND (? IS NULL OR ft.transaction_date >= ?) AND (? IS NULL OR ft.transaction_date <= ?)";
  const totals = sqlite.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN jl.account_code IN ('CASH-001','BANK-001') THEN jl.debit - jl.credit ELSE 0 END), 0) AS cashAndBank,
      COALESCE(SUM(CASE WHEN jl.account_code = 'CASH-001' THEN jl.debit - jl.credit ELSE 0 END), 0) AS cashBalance,
      COALESCE(SUM(CASE WHEN jl.account_code = 'BANK-001' THEN jl.debit - jl.credit ELSE 0 END), 0) AS bankBalance,
      COALESCE(SUM(CASE WHEN jl.account_code LIKE 'REV%' THEN jl.credit - jl.debit ELSE 0 END), 0) AS grossRevenue,
      COALESCE(SUM(CASE WHEN jl.account_code = 'REFUND-001' THEN jl.debit - jl.credit ELSE 0 END), 0) AS refunds,
      COALESCE(SUM(CASE WHEN jl.account_code LIKE 'EXP%' OR jl.account_code IN ('COMM-001','COGS-001','BANK-FEE') THEN jl.debit - jl.credit ELSE 0 END), 0) AS expenses,
      COALESCE(SUM(CASE WHEN jl.account_code = 'COMM-001' THEN jl.debit - jl.credit ELSE 0 END), 0) AS commissions,
      COALESCE(SUM(CASE WHEN jl.account_code = 'BANK-FEE' THEN jl.debit - jl.credit ELSE 0 END), 0) AS bankFees,
      COALESCE(SUM(CASE WHEN jl.account_code = 'INV-001' THEN jl.debit - jl.credit ELSE 0 END), 0) AS inventory,
      COALESCE(SUM(CASE WHEN jl.account_code = 'AR-001' THEN jl.debit - jl.credit ELSE 0 END), 0) AS receivables,
      COALESCE(SUM(CASE WHEN jl.account_code = 'AP-001' THEN jl.credit - jl.debit ELSE 0 END), 0) AS payables,
      COALESCE(SUM(jl.debit), 0) AS totalDebit,
      COALESCE(SUM(jl.credit), 0) AS totalCredit
     FROM financial_journal_entries je
     JOIN financial_transactions ft ON ft.id = je.transaction_id
    JOIN financial_journal_lines jl ON jl.journal_entry_id = je.id
     WHERE je.status = 'posted' AND ft.status = 'posted'${dateClause}
  `).get(from, from, to, to);
  const collectionTotals = sqlite.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN transaction_type IN ('payment','receipt') THEN amount ELSE 0 END), 0) AS grossCollections,
      COALESCE(SUM(CASE WHEN transaction_type = 'payment_return' THEN amount ELSE 0 END), 0) AS returnedCollections
    FROM financial_transactions
     WHERE status = 'posted' AND (? IS NULL OR transaction_date >= ?) AND (? IS NULL OR transaction_date <= ?)
  `).get(from, from, to, to) as { grossCollections: number; returnedCollections: number };
  const depositTotals = sqlite.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS deposits
    FROM financial_transactions
    WHERE status = 'posted' AND transaction_type IN ('deposit', 'bank_deposit')
      AND (? IS NULL OR transaction_date >= ?) AND (? IS NULL OR transaction_date <= ?)
  `).get(from, from, to, to) as { deposits: number };
  const counts = sqlite.prepare(`
    SELECT transaction_type AS kind, COUNT(*) AS count
    FROM financial_transactions
    WHERE status = 'posted'
      AND (? IS NULL OR transaction_date >= ?) AND (? IS NULL OR transaction_date <= ?)
    GROUP BY transaction_type ORDER BY transaction_type
  `).all(from, from, to, to);
  const rawTotals = totals as {
    cashAndBank: number; cashBalance: number; bankBalance: number; grossRevenue: number; refunds: number; expenses: number;
    inventory: number; commissions: number; bankFees: number;
    receivables: number; payables: number; totalDebit: number; totalCredit: number;
  };
  const revenue = Number((Number(rawTotals.grossRevenue) - Number(rawTotals.refunds)).toFixed(2));
  const normalizedTotals: FinancialTruthContract = {
    revenue,
    collected: Number((Number(collectionTotals.grossCollections) - Number(collectionTotals.returnedCollections)).toFixed(2)),
    purchases: Number(rawTotals.inventory),
    transfers: 0,
    netProfit: Number((revenue - Number(rawTotals.expenses)).toFixed(2)),
    balances: {
      accountsReceivable: Number(rawTotals.receivables),
      accountsPayable: Number(rawTotals.payables),
      cash: Number(rawTotals.cashBalance),
      bank: Number(rawTotals.bankBalance),
      inventory: Number(rawTotals.inventory),
    },
    ...rawTotals,
    netCollections: Number((Number(collectionTotals.grossCollections) - Number(collectionTotals.returnedCollections)).toFixed(2)),
    grossCollections: Number(collectionTotals.grossCollections),
    returnedCollections: Number(collectionTotals.returnedCollections),
    deposits: Number(depositTotals.deposits),
  } as FinancialTruthContract;
  return { totals: normalizedTotals, counts };
}

export function financialPeriods() {
  return sqlite.prepare("SELECT * FROM financial_periods ORDER BY period_key DESC").all();
}

export function closeFinancialPeriod(periodKey: string, actorId?: number | null) {
  const period = sqlite.prepare("SELECT status FROM financial_periods WHERE period_key = ?").get(periodKey) as { status: string } | undefined;
  if (!period) throw new Error("الفترة المالية غير موجودة");
  if (period.status === "closed") return;
  const imbalance = sqlite.prepare("SELECT COALESCE(SUM(total_debit), 0) AS debit, COALESCE(SUM(total_credit), 0) AS credit FROM financial_journal_entries je JOIN financial_transactions ft ON ft.id = je.transaction_id WHERE ft.transaction_date LIKE ? AND je.status = 'posted'").get(`${periodKey}%`) as { debit: number; credit: number };
  if (Math.abs(Number(imbalance.debit) - Number(imbalance.credit)) > 0.01) throw new Error("لا يمكن إغلاق فترة بأستاذ غير متوازن");
  sqlite.prepare("UPDATE financial_periods SET status = 'closed', closed_by = ?, closed_at = ? WHERE period_key = ?").run(actorId || null, new Date().toISOString(), periodKey);
}