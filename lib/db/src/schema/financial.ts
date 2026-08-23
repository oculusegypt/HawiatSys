import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const financialAccountsTable = sqliteTable("financial_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
}, (table) => ({ codeUnique: uniqueIndex("uq_financial_accounts_code").on(table.code) }));

export const financialPeriodsTable = sqliteTable("financial_periods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  periodKey: text("period_key").notNull(),
  startsOn: text("starts_on").notNull(),
  endsOn: text("ends_on").notNull(),
  status: text("status").notNull().default("open"),
  closedBy: integer("closed_by"),
  closedAt: text("closed_at"),
}, (table) => ({ periodUnique: uniqueIndex("uq_financial_periods_key").on(table.periodKey) }));

export const financialTransactionsTable = sqliteTable("financial_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionNumber: text("transaction_number").notNull(),
  transactionType: text("transaction_type").notNull(),
  sourceKind: text("source_kind").notNull(),
  sourceId: integer("source_id").notNull(),
  reference: text("reference").notNull().default(""),
  transactionDate: text("transaction_date").notNull(),
  amount: real("amount").notNull().default(0),
  currency: text("currency").notNull().default("SAR"),
  status: text("status").notNull().default("posted"),
  operationKey: text("operation_key"),
  createdBy: integer("created_by"),
  approvedBy: integer("approved_by"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  postedAt: text("posted_at"),
  cancelledAt: text("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
}, (table) => ({
  sourceUnique: uniqueIndex("uq_financial_transactions_source").on(table.sourceKind, table.sourceId),
  operationUnique: uniqueIndex("uq_financial_transactions_operation").on(table.operationKey),
}));

export const financialJournalEntriesTable = sqliteTable("financial_journal_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id").notNull(),
  entryNumber: text("entry_number").notNull(),
  totalDebit: real("total_debit").notNull().default(0),
  totalCredit: real("total_credit").notNull().default(0),
  status: text("status").notNull().default("posted"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
}, (table) => ({
  transactionUnique: uniqueIndex("uq_financial_journal_transaction").on(table.transactionId),
}));

export const financialJournalLinesTable = sqliteTable("financial_journal_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  journalEntryId: integer("journal_entry_id").notNull(),
  accountCode: text("account_code").notNull(),
  debit: real("debit").notNull().default(0),
  credit: real("credit").notNull().default(0),
  description: text("description").notNull().default(""),
});

export const financialAllocationsTable = sqliteTable("financial_allocations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id").notNull(),
  contractId: integer("contract_id"),
  invoiceId: integer("invoice_id"),
  amount: real("amount").notNull(),
});

export const bankReconciliationsTable = sqliteTable("bank_reconciliations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  depositRecordId: integer("deposit_record_id").notNull(),
  bankAccountCode: text("bank_account_code").notNull().default("BANK-001"),
  depositReference: text("deposit_reference").notNull().default(""),
  depositDate: text("deposit_date").notNull(),
  amount: real("amount").notNull(),
  linkedTransactionId: integer("linked_transaction_id"),
  bankFee: real("bank_fee").notNull().default(0),
  difference: real("difference").notNull().default(0),
  differenceReason: text("difference_reason").notNull().default(""),
  status: text("status").notNull().default("unmatched"),
  approvedBy: integer("approved_by"),
  approvedAt: text("approved_at"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  rejectionReason: text("rejection_reason").notNull().default(""),
  auditTrail: text("audit_trail").notNull().default("[]"),
});