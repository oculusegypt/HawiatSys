import { Router } from "express";
import { db } from "@workspace/db";
import {
  serviceRequestsTable,
  conversationsTable,
  messagesTable,
  notificationsTable,
} from "@workspace/db";
import { eq, count, desc, gte, sql } from "drizzle-orm";
import { requireAdmin, requireNonDriver, requireSectionPermission } from "../middleware/adminAuth";

const router = Router();

// Lightweight counters used by the admin shell. Keep this separate from the
// heavier dashboard stats endpoint so the sidebar can poll frequently.
router.get("/admin/sidebar-counts", requireAdmin, requireNonDriver, requireSectionPermission("dashboard"), async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  const [conversationCount] = await db
    .select({ count: count() })
    .from(messagesTable)
    .innerJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
    .where(sql`
      ${messagesTable.senderType} = 'client'
      AND ${messagesTable.isRead} = 'false'
      AND ${conversationsTable.status} = 'open'
    `);
  const [openConversationCount] = await db
    .select({ count: count() })
    .from(conversationsTable)
    .where(eq(conversationsTable.status, "open"));
  const [pendingRequestCount] = await db
    .select({ count: count() })
    .from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.status, "pending"));
  const [unreadNotificationCount] = await db
    .select({ count: count() })
    .from(notificationsTable)
    .where(sql`
      ${notificationsTable.isRead} = 0
      AND COALESCE(${notificationsTable.type}, '') NOT IN ('chat', 'conversation', 'message', 'whatsapp')
      AND COALESCE(${notificationsTable.refType}, '') <> 'conversation'
    `);

  return res.json({
    unreadConversations: Number(conversationCount?.count ?? 0),
    unreadMessages: Number(conversationCount?.count ?? 0),
    openConversations: Number(openConversationCount?.count ?? 0),
    pendingRequests: Number(pendingRequestCount?.count ?? 0),
    unreadNotifications: Number(unreadNotificationCount?.count ?? 0),
  });
});

router.get("/admin/stats", requireAdmin, requireNonDriver, requireSectionPermission("dashboard"), async (_req, res) => {
  // ── Core counts ──────────────────────────────────────────
  const [totalReq]       = await db.select({ count: count() }).from(serviceRequestsTable);
  const [pendingReq]     = await db.select({ count: count() }).from(serviceRequestsTable).where(eq(serviceRequestsTable.status, "pending"));
  const [inProgressReq]  = await db.select({ count: count() }).from(serviceRequestsTable).where(eq(serviceRequestsTable.status, "in_progress"));
  const [completedReq]   = await db.select({ count: count() }).from(serviceRequestsTable).where(eq(serviceRequestsTable.status, "completed"));
  const [cancelledReq]   = await db.select({ count: count() }).from(serviceRequestsTable).where(eq(serviceRequestsTable.status, "cancelled"));
  const [totalConv]      = await db.select({ count: count() }).from(conversationsTable);
  const [openConv]       = await db.select({ count: count() }).from(conversationsTable).where(eq(conversationsTable.status, "open"));
  const [unreadNotif]    = await db.select({ count: count() }).from(notificationsTable).where(eq(notificationsTable.isRead, false));

  // ── Today ────────────────────────────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const [todayReq] = await db
    .select({ count: count() })
    .from(serviceRequestsTable)
    .where(gte(serviceRequestsTable.createdAt, todayISO));

  // ── Yesterday ────────────────────────────────────────────
  const yestStart = new Date(todayStart);
  yestStart.setDate(yestStart.getDate() - 1);
  const yestEnd = new Date(todayStart);
  const [yestReq] = await db
    .select({ count: count() })
    .from(serviceRequestsTable)
    .where(
      sql`${serviceRequestsTable.createdAt} >= ${yestStart.toISOString()}
          AND ${serviceRequestsTable.createdAt} < ${yestEnd.toISOString()}`
    );

  // ── This week ────────────────────────────────────────────
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const [weekReq] = await db
    .select({ count: count() })
    .from(serviceRequestsTable)
    .where(gte(serviceRequestsTable.createdAt, weekStart.toISOString()));

  // ── Scheduled requests ───────────────────────────────────
  const [scheduledReq] = await db
    .select({ count: count() })
    .from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.appointmentType, "scheduled"))
    .catch(() => [{ count: 0 }]);

  // ── Last 7 days – daily breakdown ────────────────────────
  const allRecent = await db
    .select({ createdAt: serviceRequestsTable.createdAt, status: serviceRequestsTable.status })
    .from(serviceRequestsTable)
    .where(gte(serviceRequestsTable.createdAt, weekStart.toISOString()));

  const dayLabels: string[] = [];
  const dayMap: Record<string, { total: number; completed: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("ar-SA", { weekday: "short" });
    dayLabels.push(label);
    dayMap[key] = { total: 0, completed: 0 };
  }
  for (const r of allRecent) {
    const key = r.createdAt.slice(0, 10);
    if (dayMap[key]) {
      dayMap[key].total++;
      if (r.status === "completed") dayMap[key].completed++;
    }
  }
  const dailyTrend = Object.entries(dayMap).map(([date, v], i) => ({
    day: dayLabels[i],
    date,
    total: v.total,
    completed: v.completed,
  }));

  // ── Service type breakdown ────────────────────────────────
  const allRequests = await db
    .select({ serviceType: serviceRequestsTable.serviceType, status: serviceRequestsTable.status })
    .from(serviceRequestsTable);

  const serviceMap: Record<string, number> = {};
  for (const r of allRequests) {
    const key = r.serviceType || "غير محدد";
    serviceMap[key] = (serviceMap[key] || 0) + 1;
  }
  const serviceBreakdown = Object.entries(serviceMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── Status distribution ──────────────────────────────────
  const statusDistribution = [
    { name: "جديد",        value: pendingReq.count,    color: "#3b82f6" },
    { name: "قيد التنفيذ", value: inProgressReq.count,  color: "#f59e0b" },
    { name: "مكتمل",       value: completedReq.count,   color: "#10b981" },
    { name: "ملغي",        value: cancelledReq.count,   color: "#ef4444" },
  ];

  // ── Completion rate ──────────────────────────────────────
  const completionRate = totalReq.count > 0
    ? Math.round((completedReq.count / totalReq.count) * 100)
    : 0;

  // ── Recent requests (last 8) ─────────────────────────────
  const recentRequests = await db
    .select()
    .from(serviceRequestsTable)
    .orderBy(desc(serviceRequestsTable.createdAt))
    .limit(8);

  // ── Recent notifications ─────────────────────────────────
  const recentNotifications = await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.createdAt))
    .limit(5);

  return res.json({
    // Core
    totalRequests:       totalReq.count,
    pendingRequests:     pendingReq.count,
    inProgressRequests:  inProgressReq.count,
    completedRequests:   completedReq.count,
    cancelledRequests:   cancelledReq.count,
    totalConversations:  totalConv.count,
    openConversations:   openConv.count,
    unreadNotifications: unreadNotif.count,
    // Time-based
    todayRequests:       todayReq.count,
    yesterdayRequests:   yestReq.count,
    weekRequests:        weekReq.count,
    scheduledRequests:   scheduledReq.count,
    // Analytics
    completionRate,
    dailyTrend,
    serviceBreakdown,
    statusDistribution,
    // Lists
    recentRequests,
    recentNotifications,
  });
});

export default router;
