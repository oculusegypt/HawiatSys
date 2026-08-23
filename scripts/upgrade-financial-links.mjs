#!/usr/bin/env node
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "lib/db/package.json"));
const Database = require("better-sqlite3");
const dbPath = process.env.DB_PATH || join(root, "data/sabaik.db");
const apply = process.argv.includes("--apply");
const output = process.env.REPORT_PATH || join(root, "financial-link-upgrade-report.json");
const db = new Database(dbPath);
const rows = db.prepare("SELECT * FROM container_system_records WHERE status != 'archived' ORDER BY id").all();
const payloadOf = row => { try { const value = JSON.parse(row.payload || "{}"); return value && typeof value === "object" ? value : {}; } catch { return {}; } };
const customers = rows.filter(row => row.kind === "customer");
const contracts = rows.filter(row => row.kind === "contract");
const invoices = rows.filter(row => row.kind === "invoice");
const byUniqueName = new Map();
for (const row of customers) {
  const name = String(payloadOf(row).name ?? payloadOf(row).customerName ?? "").trim();
  if (!name) continue;
  const list = byUniqueName.get(name) ?? [];
  list.push(row);
  byUniqueName.set(name, list);
}
const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  scanned: 0,
  upgraded: 0,
  unresolved: [],
  applied: apply,
  records: [],
};
const update = db.prepare("UPDATE container_system_records SET payload = ?, updated_at = ? WHERE id = ?");
const now = report.generatedAt;
const financialKinds = new Set(["contract", "invoice", "payment", "receipt"]);
const contractByNumber = new Map(
  contracts.map(row => [String(payloadOf(row).contractNumber ?? row.reference).trim(), row]),
);
const invoiceByNumber = new Map(
  invoices.map(row => [String(payloadOf(row).invoiceNumber ?? row.reference).trim(), row]),
);
const candidatesForCustomer = name => byUniqueName.get(String(name ?? "").trim()) ?? [];

for (const row of rows) {
  if (!financialKinds.has(row.kind)) continue;
  report.scanned++;
  const payload = payloadOf(row);
  const next = { ...payload };
  let changed = false;
  const unresolvedReasons = [];
  const customerCandidates = candidatesForCustomer(next.customerName);
  if (!next.customerRecordId) {
    if (customerCandidates.length === 1) { next.customerRecordId = customerCandidates[0].id; changed = true; }
    else if (customerCandidates.length > 1) unresolvedReasons.push("اسم العميل يطابق أكثر من عميل");
    else if (next.customerName) unresolvedReasons.push("لا يوجد عميل رسمي مطابق للاسم");
  }
  if (row.kind === "invoice" && !next.contractRecordId && next.contractNumber) {
    const contract = contractByNumber.get(String(next.contractNumber).trim());
    if (contract) { next.contractRecordId = contract.id; changed = true; }
    else unresolvedReasons.push("رقم العقد غير موجود");
  }
  if ((row.kind === "payment" || row.kind === "receipt") && !next.contractRecordId && next.contractNumber) {
    const contract = contractByNumber.get(String(next.contractNumber).trim());
    if (contract) { next.contractRecordId = contract.id; changed = true; }
    else unresolvedReasons.push("رقم العقد غير موجود");
  }
  if ((row.kind === "payment" || row.kind === "receipt") && !next.invoiceRecordId && next.invoiceNumber) {
    const invoice = invoiceByNumber.get(String(next.invoiceNumber).trim());
    if (invoice) { next.invoiceRecordId = invoice.id; changed = true; }
    else unresolvedReasons.push("رقم الفاتورة غير موجود");
  }
  if (next.contractRecordId && next.customerRecordId) {
    const contract = contracts.find(item => item.id === Number(next.contractRecordId));
    const contractCustomerId = Number(payloadOf(contract ?? {}).customerRecordId ?? 0);
    if (contractCustomerId && contractCustomerId !== Number(next.customerRecordId)) {
      unresolvedReasons.push("العقد لا يتبع العميل المحدد");
    }
  }
  if (next.invoiceRecordId && next.customerRecordId) {
    const invoice = invoices.find(item => item.id === Number(next.invoiceRecordId));
    const invoiceCustomerId = Number(payloadOf(invoice ?? {}).customerRecordId ?? 0);
    if (invoiceCustomerId && invoiceCustomerId !== Number(next.customerRecordId)) {
      unresolvedReasons.push("الفاتورة لا تتبع العميل المحدد");
    }
  }
  if (changed) {
    report.upgraded++;
    report.records.push({ id: row.id, kind: row.kind, before: payload, after: next });
  }
  const needsCustomer = ["contract", "invoice", "payment", "receipt"].includes(row.kind);
  const needsDocumentLink = ["invoice", "payment", "receipt"].includes(row.kind);
  if ((needsCustomer && !next.customerRecordId) || (needsDocumentLink && !next.contractRecordId && !next.invoiceRecordId) || unresolvedReasons.length) {
    report.unresolved.push({
      id: row.id,
      kind: row.kind,
      reference: row.reference,
      reason: unresolvedReasons.length ? unresolvedReasons : ["تعذر إيجاد علاقة رسمية وحيدة"],
      suggestedAction: "مراجعة يدوية قبل استخدام --apply",
    });
  }
}
if (apply) {
  const transaction = db.transaction(() => {
    for (const item of report.records) update.run(JSON.stringify(item.after), now, item.id);
  });
  transaction();
}
writeFileSync(output, JSON.stringify(report, null, 2), "utf8");
console.log(`تم فحص ${report.scanned} سجلاً، وترقية ${report.upgraded}، وتعذر ربط ${report.unresolved.length}.`);
console.log(`التقرير: ${output}${apply ? " (تم تطبيق الترقية)" : " (معاينة فقط؛ استخدم --apply للتطبيق)"}`);