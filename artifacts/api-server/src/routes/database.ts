/**
 * database.ts — Raw DB management routes (admin only)
 * Allows listing tables, browsing rows, and deleting single rows.
 * Restricted to admin / manager roles.
 */
import { Router } from "express";
import { sqlite } from "@workspace/db";
import { requireAdmin, requireManagerOrAdmin, requireSectionPermission } from "../middleware/adminAuth";

const router = Router();

// Apply manager-or-admin guard to all routes in this file
router.use("/admin/database", requireAdmin, requireSectionPermission("database"), requireManagerOrAdmin);

// ── Blocked tables (never expose / allow delete) ────────────────────────────
const BLOCKED_TABLES = new Set(["admins"]);

// ── GET /api/admin/database/tables ──────────────────────────────────────────
// Returns list of all user tables with row count
router.get("/admin/database/tables", (_req, res) => {
  try {
    const tables = sqlite
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'
         ORDER BY name`
      )
      .all() as { name: string }[];

    const result = tables.map((t) => {
      const count = (
        sqlite.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get() as {
          cnt: number;
        }
      ).cnt;
      return { name: t.name, rows: count, blocked: BLOCKED_TABLES.has(t.name) };
    });

    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// ── GET /api/admin/database/tables/:table ───────────────────────────────────
// Returns columns + paginated rows for a table
router.get("/admin/database/tables/:table", (req, res) => {
  const { table } = req.params;
  if (BLOCKED_TABLES.has(table)) {
    return res.status(403).json({ error: "هذا الجدول محمي ولا يمكن عرضه" });
  }

  // Validate table name (alphanumeric + underscore only)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    return res.status(400).json({ error: "اسم جدول غير صالح" });
  }

  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(10, parseInt(String(req.query.limit ?? "50"), 10)));
    const offset = (page - 1) * limit;

    // Column info
    const columns = sqlite.prepare(`PRAGMA table_info("${table}")`).all() as {
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }[];

    if (columns.length === 0) {
      return res.status(404).json({ error: "الجدول غير موجود" });
    }

    const total = (
      sqlite.prepare(`SELECT COUNT(*) as cnt FROM "${table}"`).get() as {
        cnt: number;
      }
    ).cnt;

    const rows = sqlite
      .prepare(`SELECT * FROM "${table}" LIMIT ? OFFSET ?`)
      .all(limit, offset);

    return res.json({
      table,
      columns: columns.map((c) => ({
        name: c.name,
        type: c.type,
        pk: c.pk === 1,
      })),
      rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// ── DELETE /api/admin/database/tables/:table/:id ────────────────────────────
// Deletes the row with the given primary-key value
router.delete("/admin/database/tables/:table/:id", (req, res) => {
  const { table, id } = req.params;

  if (BLOCKED_TABLES.has(table)) {
    return res.status(403).json({ error: "هذا الجدول محمي ولا يمكن الحذف منه" });
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    return res.status(400).json({ error: "اسم جدول غير صالح" });
  }

  try {
    // Find primary key column name
    const columns = sqlite.prepare(`PRAGMA table_info("${table}")`).all() as {
      name: string;
      pk: number;
    }[];
    const pkCol = columns.find((c) => c.pk === 1);
    if (!pkCol) {
      return res.status(400).json({ error: "لا يوجد مفتاح أساسي في هذا الجدول" });
    }

    const result = sqlite
      .prepare(`DELETE FROM "${table}" WHERE "${pkCol.name}" = ?`)
      .run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "السجل غير موجود" });
    }

    return res.status(204).send();
  } catch (e: unknown) {
    const msg = String(e);
    if (msg.includes("FOREIGN KEY constraint failed")) {
      // Find tables that reference this table
      const refs = sqlite
        .prepare(
          `SELECT m.name as tbl FROM sqlite_master m
           WHERE m.type = 'table' AND m.sql LIKE '%REFERENCES "${table}"%'`
        )
        .all() as { tbl: string }[];
      const refNames = refs.map((r) => r.tbl).join("، ");
      return res.status(409).json({
        error: `لا يمكن حذف هذا السجل لأنه مرتبط بسجلات في جداول أخرى${refNames ? `: ${refNames}` : ""}. احذف السجلات المرتبطة أولاً ثم أعد المحاولة.`,
        code: "FOREIGN_KEY",
      });
    }
    return res.status(500).json({ error: msg });
  }
});

export default router;
