import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Resolve data dir relative to this file (lib/db/src → workspace root = ../../../data)
const _dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(_dirname, "../../../data");
fs.mkdirSync(dbDir, { recursive: true });

const dbPath = process.env["DB_PATH"] ?? path.join(dbDir, "sabaik.db");

const sqlite: Database.Database = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");

// ── Schema migrations: add new columns if they don't exist ───────────────────
const adminMigrations = [
  "ALTER TABLE admins ADD COLUMN email TEXT",
  "ALTER TABLE admins ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'",
  "ALTER TABLE admins ADD COLUMN permissions TEXT",
  "ALTER TABLE admins ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE admins ADD COLUMN created_by INTEGER",
];
for (const sql of adminMigrations) {
  try { sqlite.exec(sql); } catch { /* column already exists — safe to ignore */ }
}

const serviceRequestMigrations = [
  "ALTER TABLE service_requests ADD COLUMN assigned_driver_id INTEGER",
  "ALTER TABLE service_requests ADD COLUMN assigned_vehicle_id INTEGER",
  "ALTER TABLE service_requests ADD COLUMN assigned_vehicle_plate TEXT",
  "ALTER TABLE service_requests ADD COLUMN driver_status TEXT NOT NULL DEFAULT 'unassigned'",
  "ALTER TABLE service_requests ADD COLUMN driver_response_at TEXT",
  "ALTER TABLE service_requests ADD COLUMN driver_started_at TEXT",
  "ALTER TABLE service_requests ADD COLUMN driver_completed_at TEXT",
  "ALTER TABLE service_requests ADD COLUMN driver_notes TEXT",
  "ALTER TABLE service_requests ADD COLUMN assigned_at TEXT",
  "ALTER TABLE service_requests ADD COLUMN property_type TEXT",
  "ALTER TABLE service_requests ADD COLUMN area_size TEXT",
  "ALTER TABLE service_requests ADD COLUMN session_id TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE service_requests ADD COLUMN acquisition_source TEXT NOT NULL DEFAULT 'مباشر'",
  "ALTER TABLE service_requests ADD COLUMN attribution_referrer TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE service_requests ADD COLUMN attribution_landing_page TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE service_requests ADD COLUMN attribution_utm_source TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE service_requests ADD COLUMN attribution_utm_medium TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE service_requests ADD COLUMN attribution_utm_campaign TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE service_requests ADD COLUMN attribution_gclid TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE service_requests ADD COLUMN customer_record_id INTEGER",
  "ALTER TABLE service_requests ADD COLUMN container_record_id INTEGER",
  "ALTER TABLE service_requests ADD COLUMN contract_record_id INTEGER",
  "ALTER TABLE service_requests ADD COLUMN driver_location_lat TEXT",
  "ALTER TABLE service_requests ADD COLUMN driver_location_lng TEXT",
  "ALTER TABLE service_requests ADD COLUMN driver_proof_photo_url TEXT",
  "ALTER TABLE service_requests ADD COLUMN driver_signature_data TEXT",
  "ALTER TABLE service_requests ADD COLUMN driver_receiver_name TEXT",
];
for (const sql of serviceRequestMigrations) {
  try { sqlite.exec(sql); } catch { /* column already exists — safe to ignore */ }
}

const analyticsMigrations = [
  "ALTER TABLE page_views ADD COLUMN country TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE page_views ADD COLUMN region TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE page_views ADD COLUMN city TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE page_views ADD COLUMN utm_source TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE page_views ADD COLUMN utm_medium TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE page_views ADD COLUMN utm_campaign TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE page_views ADD COLUMN gclid TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE active_visitors ADD COLUMN conversation_id INTEGER",
  "ALTER TABLE active_visitors ADD COLUMN client_name TEXT",
  "ALTER TABLE active_visitors ADD COLUMN phone TEXT",
  "ALTER TABLE active_visitors ADD COLUMN invitation_message TEXT",
  "ALTER TABLE active_visitors ADD COLUMN invitation_created_at TEXT",
];
for (const sql of analyticsMigrations) {
  try { sqlite.exec(sql); } catch { /* column already exists — safe to ignore */ }
}

const conversationMigrations = [
  "ALTER TABLE conversations ADD COLUMN package_id INTEGER",
  "ALTER TABLE conversations ADD COLUMN package_name TEXT",
  "ALTER TABLE conversations ADD COLUMN client_typing_at TEXT",
  "ALTER TABLE conversations ADD COLUMN admin_typing_at TEXT",
];
for (const sql of conversationMigrations) {
  try { sqlite.exec(sql); } catch { /* column already exists — safe to ignore */ }
}

// Ads were added after some portable SQLite databases were created. Keep the
// table available at startup so the admin list and public ad slots never fail
// simply because an older database was deployed.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    link_url TEXT NOT NULL DEFAULT '',
    button_text TEXT NOT NULL DEFAULT '',
    position TEXT NOT NULL DEFAULT 'middle',
    type TEXT NOT NULL DEFAULT 'banner',
    bg_color TEXT NOT NULL DEFAULT '#eff6ff',
    is_active INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const messageMigrations = [
  "ALTER TABLE messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text'",
  "ALTER TABLE messages ADD COLUMN metadata TEXT",
  "ALTER TABLE messages ADD COLUMN attachment_url TEXT",
  "ALTER TABLE messages ADD COLUMN attachment_type TEXT",
  "ALTER TABLE messages ADD COLUMN location_lat TEXT",
  "ALTER TABLE messages ADD COLUMN location_lng TEXT",
  "ALTER TABLE messages ADD COLUMN location_label TEXT",
];
for (const sql of messageMigrations) {
  try { sqlite.exec(sql); } catch { /* column already exists — safe to ignore */ }
}

try { sqlite.exec("ALTER TABLE notifications ADD COLUMN recipient_admin_id INTEGER"); } catch { /* already exists */ }
try { sqlite.exec("CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications(recipient_admin_id, created_at)"); } catch { /* already exists */ }

// Standalone SEO landing pages. Kept as a startup migration because the
// portable SQLite database may predate this feature.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS seo_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    target_keyword TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    excerpt TEXT NOT NULL DEFAULT '',
    cover_image TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'خدمات التنظيف',
    tags TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    published_at TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    seo_title TEXT NOT NULL DEFAULT '',
    seo_description TEXT NOT NULL DEFAULT '',
    seo_keywords TEXT NOT NULL DEFAULT '',
    seo_slug TEXT NOT NULL DEFAULT '',
    og_image TEXT NOT NULL DEFAULT '',
    canonical_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// First-party Structured Content / JSON-LD management. The JSON payload is
// intentionally flexible so adding a supported schema.org type never requires
// changing the database shape.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS structured_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope_path TEXT NOT NULL DEFAULT '/',
    schema_type TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    payload TEXT NOT NULL DEFAULT '{}',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(scope_path, schema_type)
  );
  CREATE INDEX IF NOT EXISTS idx_structured_content_scope
    ON structured_content(scope_path, is_active, sort_order);
`);

// SEO slugs are public identities. Repair only duplicate legacy values in
// deterministic id order, then enforce uniqueness for all non-empty slugs.
// Empty values remain available to explicit noindex/draft records.
for (const table of ["services", "packages"] as const) {
  const rows = sqlite
    .prepare(`SELECT id, seo_slug FROM ${table} WHERE seo_slug IS NOT NULL AND trim(seo_slug) <> '' ORDER BY id ASC`)
    .all() as Array<{ id: number; seo_slug: string }>;
  const used = new Set<string>();
  const updateSlug = sqlite.prepare(`UPDATE ${table} SET seo_slug = ? WHERE id = ?`);
  for (const row of rows) {
    const original = String(row.seo_slug).trim();
    let candidate = original;
    let suffix = 2;
    while (used.has(candidate.toLowerCase())) candidate = `${original}-${suffix++}`;
    if (candidate !== row.seo_slug) updateSlug.run(candidate, row.id);
    used.add(candidate.toLowerCase());
  }
  sqlite.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_${table}_seo_slug_unique ON ${table}(seo_slug) WHERE seo_slug IS NOT NULL AND trim(seo_slug) <> ''`,
  );
}

// Defensive SQLite constraints for portable databases. Triggers are used here
// because older installations cannot add CHECK constraints without rebuilding
// tables; they protect new writes without rewriting existing records.
sqlite.exec(`
  CREATE INDEX IF NOT EXISTS idx_service_requests_driver_status
    ON service_requests(assigned_driver_id, driver_status);
  CREATE INDEX IF NOT EXISTS idx_service_requests_status_created
    ON service_requests(status, created_at);
  CREATE TRIGGER IF NOT EXISTS validate_service_request_values_insert
    BEFORE INSERT ON service_requests
    WHEN NEW.appointment_type NOT IN ('immediate', 'scheduled')
      OR NEW.driver_status NOT IN ('unassigned', 'assigned', 'accepted', 'started', 'en_route', 'arrived', 'completed', 'rejected')
      OR NEW.status NOT IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected')
    BEGIN
      SELECT RAISE(ABORT, 'invalid service request status');
    END;
  CREATE TRIGGER IF NOT EXISTS validate_service_request_values_update
    BEFORE UPDATE OF appointment_type, driver_status, status ON service_requests
    WHEN NEW.appointment_type NOT IN ('immediate', 'scheduled')
      OR NEW.driver_status NOT IN ('unassigned', 'assigned', 'accepted', 'started', 'en_route', 'arrived', 'completed', 'rejected')
      OR NEW.status NOT IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected')
    BEGIN
      SELECT RAISE(ABORT, 'invalid service request status');
    END;
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

// Full container system records are intentionally kept in portable SQLite
// tables so the local app and Hostinger PHP export share the same data shape.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS container_system_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    reference TEXT NOT NULL DEFAULT '',
    payload TEXT NOT NULL DEFAULT '{}',
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_container_system_records_kind
    ON container_system_records(kind);
  CREATE INDEX IF NOT EXISTS idx_container_system_records_status
    ON container_system_records(status);
  CREATE TABLE IF NOT EXISTS container_system_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER,
    kind TEXT NOT NULL,
    action TEXT NOT NULL,
    before_payload TEXT,
    after_payload TEXT,
    actor_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_container_system_audit_created_at
    ON container_system_audit(created_at);
`);

// Normalize legacy fixture identifiers while preserving every relationship
// that references a container code in another record's JSON payload.
function normalizeContainerCodes(value: string) {
  return value.replace(/(?:DEMO-)?CNT-(12|20)-(\d{2})/g, (_match, size: string, sequence: string) => {
    const offset = size === "12" ? 100 : 110;
    return `CNT-${offset + Number(sequence)}`;
  });
}
const legacyContainerRecords = sqlite.prepare(
  "SELECT id, kind, reference, payload FROM container_system_records WHERE reference LIKE 'DEMO-CNT-%' OR payload LIKE '%DEMO-CNT-%'",
).all() as Array<{ id: number; kind: string; reference: string; payload: string }>;
const updateLegacyContainer = sqlite.prepare(
  "UPDATE container_system_records SET reference = ?, payload = ?, updated_at = ? WHERE id = ?",
);
for (const record of legacyContainerRecords) {
  const reference = record.kind === "container" || record.kind === "container_asset"
    ? normalizeContainerCodes(record.reference)
    : record.reference;
  const payload = normalizeContainerCodes(record.payload);
  if (reference !== record.reference || payload !== record.payload) {
    updateLegacyContainer.run(reference, payload, new Date().toISOString(), record.id);
  }
}

// Typed financial core. The legacy container record remains readable during
// migration, but all newly posted financial sources receive a typed ledger
// projection with database uniqueness constraints.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS financial_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS financial_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_key TEXT NOT NULL UNIQUE,
    starts_on TEXT NOT NULL,
    ends_on TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    closed_by INTEGER,
    closed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS financial_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_number TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    source_kind TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    reference TEXT NOT NULL DEFAULT '',
    transaction_date TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'SAR',
    status TEXT NOT NULL DEFAULT 'posted',
    operation_key TEXT UNIQUE,
    created_by INTEGER,
    approved_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    posted_at TEXT,
    cancelled_at TEXT,
    cancellation_reason TEXT,
    UNIQUE(source_kind, source_id)
  );
  CREATE TABLE IF NOT EXISTS financial_journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL UNIQUE,
    entry_number TEXT NOT NULL,
    total_debit REAL NOT NULL DEFAULT 0,
    total_credit REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'posted',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (abs(total_debit - total_credit) < 0.011)
  );
  CREATE TABLE IF NOT EXISTS financial_journal_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_entry_id INTEGER NOT NULL,
    account_code TEXT NOT NULL,
    debit REAL NOT NULL DEFAULT 0,
    credit REAL NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    CHECK (debit >= 0 AND credit >= 0 AND NOT (debit > 0 AND credit > 0))
  );
  CREATE TABLE IF NOT EXISTS financial_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    contract_id INTEGER,
    invoice_id INTEGER,
    amount REAL NOT NULL CHECK (amount > 0)
  );
  CREATE TABLE IF NOT EXISTS bank_reconciliations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deposit_record_id INTEGER NOT NULL,
    bank_account_code TEXT NOT NULL DEFAULT 'BANK-001',
    deposit_reference TEXT NOT NULL DEFAULT '',
    deposit_date TEXT NOT NULL,
    amount REAL NOT NULL,
    linked_transaction_id INTEGER,
    bank_fee REAL NOT NULL DEFAULT 0,
    difference REAL NOT NULL DEFAULT 0,
    difference_reason TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'unmatched',
    approved_by INTEGER,
    approved_at TEXT,
    reviewed_by INTEGER,
    reviewed_at TEXT,
    rejection_reason TEXT NOT NULL DEFAULT '',
    audit_trail TEXT NOT NULL DEFAULT '[]'
  );
`);
for (const sql of [
  "ALTER TABLE bank_reconciliations ADD COLUMN reviewed_by INTEGER",
  "ALTER TABLE bank_reconciliations ADD COLUMN reviewed_at TEXT",
  "ALTER TABLE bank_reconciliations ADD COLUMN rejection_reason TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE bank_reconciliations ADD COLUMN audit_trail TEXT NOT NULL DEFAULT '[]'",
]) {
  try { sqlite.exec(sql); } catch { /* existing portable database */ }
}
const financialAccounts = [
  ["CASH-001", "الخزينة الرئيسية", "cash"],
  ["BANK-001", "الحساب البنكي الرئيسي", "bank"],
  ["AR-001", "ذمم العملاء", "receivable"],
  ["AP-001", "ذمم الموردين", "payable"],
  ["REV-001", "إيرادات الخدمات", "revenue"],
  ["REV-OTHER", "إيرادات أخرى", "other_revenue"],
  ["EXP-001", "المصروفات العامة", "expense"],
  ["EXP-MAINT", "مصروفات الصيانة", "maintenance"],
  ["INV-001", "المخزون", "inventory"],
  ["COGS-001", "تكلفة المبيعات", "cogs"],
  ["COMM-001", "العمولات", "commission"],
  ["BANK-FEE", "رسوم بنكية", "bank_fee"],
  ["TRANSFER-001", "تحويلات داخلية", "transfer"],
  ["REFUND-001", "المرتجعات", "refund"],
  ["ADJ-001", "التسويات", "adjustment"],
] as const;
const accountInsert = sqlite.prepare("INSERT OR IGNORE INTO financial_accounts (code, name, category) VALUES (?, ?, ?)");
for (const account of financialAccounts) accountInsert.run(...account);

try { sqlite.exec("ALTER TABLE container_system_records ADD COLUMN operation_key TEXT"); } catch { /* already exists */ }
try {
  sqlite.exec(`
    UPDATE container_system_records
    SET operation_key = json_extract(payload, '$.operationKey')
    WHERE operation_key IS NULL
      AND json_extract(payload, '$.operationKey') IS NOT NULL
  `);
} catch { /* older SQLite builds may not expose json_extract */ }
sqlite.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_container_system_records_operation_key
    ON container_system_records(kind, operation_key)
    WHERE operation_key IS NOT NULL AND operation_key <> '' AND status <> 'archived'
`);

export const db = drizzle(sqlite, { schema });
export { sqlite };
export * from "./schema";
export * from "./financial-core";
