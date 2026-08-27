import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const db = new Database(resolve(root, "data/sabaik.db"));
const now = new Date().toISOString();
const relationKeys = [
  "customerRecordId", "siteRecordId", "containerRecordId", "contractRecordId",
  "workOrderId", "appointmentId", "sourceId", "containerId", "assetId",
];

try {
  const rows = db.prepare("SELECT id, kind, status, reference, payload FROM container_system_records").all();
  const referencedIds = new Set();
  for (const row of rows) {
    let payload = {};
    try {
      payload = JSON.parse(row.payload || "{}");
    } catch {
      // A malformed payload is not a reason to delete a historical record.
    }
    for (const key of relationKeys) {
      const value = Number(payload[key]);
      if (Number.isInteger(value) && value > 0) referencedIds.add(value);
    }
    if (Array.isArray(payload.allocations)) {
      for (const allocation of payload.allocations) {
        for (const key of ["contractId", "invoiceId"]) {
          const value = Number(allocation?.[key]);
          if (Number.isInteger(value) && value > 0) referencedIds.add(value);
        }
      }
    }
  }

  const candidates = rows.filter((row) => {
    let payload = {};
    try {
      payload = JSON.parse(row.payload || "{}");
    } catch {
      return false;
    }
    return row.kind === "container" &&
      row.status !== "archived" &&
      payload.testData === true &&
      !referencedIds.has(Number(row.id));
  });

  const archive = db.prepare(
    "UPDATE container_system_records SET status = 'archived', updated_at = ? WHERE id = ? AND status != 'archived'",
  );
  const audit = db.prepare(
    "INSERT INTO container_system_audit (record_id, kind, action, before_payload, after_payload, actor_id, created_at) VALUES (?, ?, ?, ?, NULL, NULL, ?)",
  );
  const transaction = db.transaction(() => {
    for (const row of candidates) {
      archive.run(now, row.id);
      audit.run(row.id, row.kind, "cleanup_archive_unused_test_record", row.payload, now);
    }
  });
  transaction();

  console.log(JSON.stringify({
    archived: candidates.map((row) => ({ id: row.id, reference: row.reference })),
    preservedReferencedTestContainers: rows.filter((row) => row.kind === "container" && row.status !== "archived" && referencedIds.has(Number(row.id))).map((row) => row.id),
  }, null, 2));
} finally {
  db.close();
}