import { Router, type NextFunction, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable, containersTable, activeVisitorsTable } from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { createNotification } from "../lib/pushNotifications";
import { requireAdmin, requireNonDriver, requireSectionPermission } from "../middleware/adminAuth";

const router = Router();

const ONLINE_WINDOW_MS = 90 * 1000;
const TYPING_WINDOW_MS = 7 * 1000;

// Keep the API boundary aligned with the admin navigation permissions. Public
// conversation routes remain public; only the /admin namespace is restricted.
router.use("/admin/conversations", requireAdmin, requireNonDriver, requireSectionPermission("conversations"));

function requireAdminSender(req: Request, res: Response, next: NextFunction): void {
  if (req.body?.senderType !== "admin") {
    next();
    return;
  }
  requireAdmin(req, res, () => {
    requireNonDriver(req, res, () => {
      requireSectionPermission("conversations")(req, res, next);
    });
  });
}

function isRecent(value: string | null | undefined, windowMs: number): boolean {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp <= windowMs;
}

type ActiveVisitor = typeof activeVisitorsTable.$inferSelect;

function decorateConversation<T extends typeof conversationsTable.$inferSelect>(
  conversation: T,
  visitor?: ActiveVisitor,
) {
  return {
    ...conversation,
    isOnline: Boolean(visitor && isRecent(visitor.lastSeen, ONLINE_WINDOW_MS)),
    activePage: visitor?.page ?? null,
    isClientTyping: isRecent(conversation.clientTypingAt, TYPING_WINDOW_MS),
    isAdminTyping: isRecent(conversation.adminTypingAt, TYPING_WINDOW_MS),
  };
}

async function getConversationWithPresence(id: number) {
  const [conversation] = await db.select().from(conversationsTable)
    .where(eq(conversationsTable.id, id));
  if (!conversation) return null;
  const [visitor] = await db.select().from(activeVisitorsTable)
    .where(eq(activeVisitorsTable.conversationId, id))
    .orderBy(desc(activeVisitorsTable.lastSeen))
    .limit(1);
  return decorateConversation(conversation, visitor);
}

router.get(["/conversations", "/admin/conversations"], requireAdmin, requireNonDriver, async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const conversations = await db.select().from(conversationsTable).orderBy(desc(conversationsTable.updatedAt));
  const visitors = await db.select().from(activeVisitorsTable);
  const visitorByConversation = new Map<number, ActiveVisitor>();
  for (const visitor of visitors) {
    if (!visitor.conversationId) continue;
    const current = visitorByConversation.get(visitor.conversationId);
    if (!current || visitor.lastSeen > current.lastSeen) {
      visitorByConversation.set(visitor.conversationId, visitor);
    }
  }
  return res.json(conversations.map(conversation =>
    decorateConversation(conversation, visitorByConversation.get(conversation.id)),
  ));
});

router.post("/conversations", async (req, res) => {
  const { clientName, phone, email, subject, packageId, packageName } = req.body ?? {};
  if (typeof clientName !== "string" || !clientName.trim() || typeof phone !== "string" || !phone.trim()) {
    return res.status(400).json({ error: "الاسم ورقم الجوال مطلوبان لبدء المحادثة" });
  }
  const [conversation] = await db.insert(conversationsTable).values({
    clientName: clientName.trim(),
    phone: phone.trim(),
    email: typeof email === "string" && email.trim() ? email.trim() : null,
    subject: typeof subject === "string" && subject.trim() ? subject.trim() : null,
    packageId: packageId == null || packageId === "" ? null : Number(packageId),
    packageName: typeof packageName === "string" && packageName.trim() ? packageName.trim() : null,
  }).returning();

  await createNotification({
    title: "محادثة جديدة",
    message: `بدأ ${clientName} محادثة جديدة`,
    type: "chat",
    refId: conversation.id,
    refType: "conversation",
  });

  return res.status(201).json(conversation);
});

router.get(["/conversations/:id", "/admin/conversations/:id"], async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "معرّف المحادثة غير صحيح" });
  }
  const conversation = await getConversationWithPresence(id);
  if (!conversation) return res.status(404).json({ error: "المحادثة غير موجودة" });
  return res.json(conversation);
});

router.post(["/conversations/:id/typing", "/admin/conversations/:id/typing"], requireAdminSender, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "معرّف المحادثة غير صحيح" });
  }

  const senderType = req.body?.senderType;
  if (senderType !== "client" && senderType !== "admin") {
    return res.status(400).json({ error: "نوع المرسل غير صحيح" });
  }
  const isTyping = req.body?.isTyping !== false;
  const [conversation] = await db.select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id));
  if (!conversation) return res.status(404).json({ error: "المحادثة غير موجودة" });

  const field = senderType === "client" ? "clientTypingAt" : "adminTypingAt";
  await db.update(conversationsTable)
    .set({ [field]: isTyping ? new Date().toISOString() : null })
    .where(eq(conversationsTable.id, id));
  return res.json({ ok: true, isTyping });
});

router.patch(["/conversations/:id", "/admin/conversations/:id"], requireAdmin, requireNonDriver, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { status } = req.body;
  const [conversation] = await db.update(conversationsTable)
    .set({
      status,
      updatedAt: new Date().toISOString(),
      ...(status === "closed" ? { unreadCount: 0 } : {}),
    })
    .where(eq(conversationsTable.id, id))
    .returning();
  if (!conversation) return res.status(404).json({ error: "Not found" });
  return res.json(conversation);
});

router.get(["/conversations/:id/messages", "/admin/conversations/:id/messages"], async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "معرّف المحادثة غير صحيح" });
  }
  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(desc(messagesTable.createdAt));
  return res.json(messages.reverse());
});

// Only an authenticated admin opening a conversation marks the client's
// messages as read. Public/customer polling must never clear the admin badge.
router.post(["/conversations/:id/read", "/admin/conversations/:id/read"], requireAdmin, requireNonDriver, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "معرّف المحادثة غير صحيح" });
  }

  const [conversation] = await db.select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id));
  if (!conversation) return res.status(404).json({ error: "المحادثة غير موجودة" });

  await db.update(messagesTable)
    .set({ isRead: "true" })
    .where(and(
      eq(messagesTable.conversationId, id),
      eq(messagesTable.senderType, "client"),
    ));
  await db.update(conversationsTable)
    .set({ unreadCount: 0, updatedAt: new Date().toISOString() })
    .where(eq(conversationsTable.id, id));

  return res.json({ success: true, conversationId: id });
});

router.post(["/conversations/:id/messages", "/admin/conversations/:id/messages"], requireAdminSender, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const {
    content,
    senderType,
    messageType,
    metadata,
    attachmentUrl,
    attachmentType,
    locationLat,
    locationLng,
    locationLabel,
  } = req.body;
  if (typeof content !== "string" || (!content.trim() && !attachmentUrl && !locationLat)) {
    return res.status(400).json({ error: "الرسالة فارغة" });
  }
  const normalizedMessageType = messageType || "text";
  if (!["text", "package_form", "order_confirmation"].includes(normalizedMessageType)) {
    return res.status(400).json({ error: "نوع الرسالة غير صحيح" });
  }
  if (normalizedMessageType === "package_form") {
    let parsedMetadata: unknown;
    try {
      parsedMetadata = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
    } catch {
      return res.status(400).json({ error: "بيانات نموذج الباقة غير صحيحة" });
    }
    const containerId = Number((parsedMetadata as { containerId?: unknown } | null)?.containerId);
    if (!Number.isInteger(containerId) || containerId <= 0) {
      return res.status(400).json({ error: "معرّف الباقة غير صحيح" });
    }
    const [container] = await db.select({ id: containersTable.id })
      .from(containersTable)
      .where(eq(containersTable.id, containerId));
    if (!container) {
      return res.status(404).json({ error: "الباقة غير موجودة" });
    }
  }
  const [message] = await db.insert(messagesTable).values({
    conversationId: id,
    content: content || "",
    messageType: normalizedMessageType,
    metadata: metadata == null ? null : String(metadata),
    attachmentUrl: attachmentUrl || null,
    attachmentType: attachmentType || null,
    locationLat: locationLat == null ? null : String(locationLat),
    locationLng: locationLng == null ? null : String(locationLng),
    locationLabel: locationLabel || null,
    senderType: senderType ?? "client",
  }).returning();

  // Update conversation — increment unread only for client messages
  await db.update(conversationsTable)
    .set({
      lastMessage: content,
      updatedAt: new Date().toISOString(),
      unreadCount: senderType === "client" ? sql`unread_count + 1` : sql`unread_count`,
      clientTypingAt: senderType === "client" ? null : undefined,
      adminTypingAt: senderType === "admin" ? null : undefined,
    })
    .where(eq(conversationsTable.id, id));

  if (senderType === "client") {
    const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
    if (conversation) {
      await createNotification({
        title: "رسالة جديدة",
        message: `رسالة جديدة من ${conversation.clientName}`,
        type: "chat",
        refId: id,
        refType: "conversation",
      });
    }
  }

  return res.status(201).json({
    ...message,
    messageType: message.messageType || "text",
    isRead: message.isRead === "true",
  });
});

// Admin: delete single conversation + its messages
router.delete("/admin/conversations/:id", requireAdmin, requireNonDriver, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "معرّف المحادثة غير صحيح" });

  const [conversation] = await db.select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id));
  if (!conversation) return res.status(404).json({ error: "المحادثة غير موجودة" });

  await db.delete(messagesTable).where(eq(messagesTable.conversationId, id));
  await db.delete(conversationsTable).where(eq(conversationsTable.id, id));
  return res.json({ success: true, id });
});

// Admin: delete ALL conversations + messages
router.delete("/admin/conversations", requireAdmin, requireNonDriver, async (_req, res) => {
  await db.delete(messagesTable);
  await db.delete(conversationsTable);
  return res.json({ success: true });
});

export default router;
