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
];
for (const sql of serviceRequestMigrations) {
  try { sqlite.exec(sql); } catch { /* column already exists — safe to ignore */ }
}

const analyticsMigrations = [
  "ALTER TABLE page_views ADD COLUMN country TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE page_views ADD COLUMN city TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE page_views ADD COLUMN utm_source TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE page_views ADD COLUMN utm_medium TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE page_views ADD COLUMN utm_campaign TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE page_views ADD COLUMN gclid TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE active_visitors ADD COLUMN conversation_id INTEGER",
  "ALTER TABLE active_visitors ADD COLUMN client_name TEXT",
  "ALTER TABLE active_visitors ADD COLUMN phone TEXT",
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

export const db = drizzle(sqlite, { schema });
export { sqlite };
export * from "./schema";
