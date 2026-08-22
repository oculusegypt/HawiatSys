import { Router } from "express";
import { db } from "@workspace/db";
import { waMessagesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { getSetting, setSetting } from "./settings";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";
import { createNotification } from "../lib/pushNotifications";

const router = Router();
const WA_API = "https://graph.facebook.com/v19.0";
type WhatsAppApiResponse = {
  error?: { message?: string };
  data?: unknown[];
  messages?: Array<{ id?: string }>;
};

// All /admin/whatsapp/* routes require auth
router.use("/admin/whatsapp", requireAdmin, requireSectionPermission("whatsapp"));

// ── helpers ───────────────────────────────────────────────────────────────────

async function getWaSettings() {
  const [accessToken, businessId, phoneNumberId, webhookVerifyToken] = await Promise.all([
    getSetting("wa_access_token"),
    getSetting("wa_business_id"),
    getSetting("wa_phone_number_id"),
    getSetting("wa_webhook_verify_token"),
  ]);
  return { accessToken, businessId, phoneNumberId, webhookVerifyToken };
}

async function waFetch(path: string, accessToken: string, opts?: RequestInit) {
  const sep = path.includes("?") ? "&" : "?";
  const url = path.startsWith("http") ? path : `${WA_API}${path}${sep}access_token=${accessToken}`;
  const res = await fetch(url, opts);
  const json = await res.json() as WhatsAppApiResponse;
  if (!res.ok) throw new Error(json?.error?.message ?? `WA API ${res.status}`);
  return json;
}

// ── GET /api/admin/whatsapp/settings ─────────────────────────────────────────
router.get("/admin/whatsapp/settings", async (_req, res) => {
  const { accessToken, businessId, phoneNumberId, webhookVerifyToken } = await getWaSettings();
  return res.json({
    accessToken:       accessToken ? "•".repeat(20) + accessToken.slice(-6) : "",
    hasToken:          !!accessToken,
    businessId,
    phoneNumberId,
    webhookVerifyToken,
  });
});

// ── POST /api/admin/whatsapp/settings ─────────────────────────────────────────
router.post("/admin/whatsapp/settings", async (req, res) => {
  const { accessToken, businessId, phoneNumberId, webhookVerifyToken } = req.body as Record<string, string>;
  const saves: Promise<void>[] = [];
  if (accessToken   && !accessToken.startsWith("•")) saves.push(setSetting("wa_access_token",        accessToken));
  if (businessId)       saves.push(setSetting("wa_business_id",         businessId));
  if (phoneNumberId)    saves.push(setSetting("wa_phone_number_id",     phoneNumberId));
  if (webhookVerifyToken) saves.push(setSetting("wa_webhook_verify_token", webhookVerifyToken));
  await Promise.all(saves);
  return res.json({ ok: true });
});

// ── POST /api/admin/whatsapp/test ─────────────────────────────────────────────
router.post("/admin/whatsapp/test", async (_req, res) => {
  try {
    const { accessToken, businessId } = await getWaSettings();
    if (!accessToken) return res.status(400).json({ error: "لم يتم إدخال رمز الوصول بعد" });

    // Verify token + get account info
    const me = await waFetch(`/me?fields=name,id`, accessToken);

    // Get phone numbers linked to WABA
    let phones: unknown[] = [];
    if (businessId) {
      try {
        const phonesData = await waFetch(`/${businessId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,status`, accessToken);
        phones = phonesData?.data ?? [];
      } catch { /* non-fatal */ }
    }

    return res.json({ ok: true, account: me, phones });
  } catch (e) {
    return res.status(400).json({ ok: false, error: String(e) });
  }
});

// ── GET /api/admin/whatsapp/phone-numbers ─────────────────────────────────────
router.get("/admin/whatsapp/phone-numbers", async (_req, res) => {
  try {
    const { accessToken, businessId } = await getWaSettings();
    if (!accessToken || !businessId) return res.json([]);
    const data = await waFetch(`/${businessId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,status`, accessToken);
    return res.json(data?.data ?? []);
  } catch {
    return res.json([]);
  }
});

// ── GET /api/admin/whatsapp/messages ─────────────────────────────────────────
router.get("/admin/whatsapp/messages", async (req, res) => {
  const limit = parseInt(String(req.query.limit ?? 50));
  const from  = req.query.from as string | undefined;

  let q = db.select().from(waMessagesTable).orderBy(desc(waMessagesTable.createdAt)).$dynamic();
  if (from) q = q.where(eq(waMessagesTable.from, from));

  const messages = await q.limit(limit);
  return res.json(messages);
});

// ── PATCH /api/admin/whatsapp/messages/:id/read ───────────────────────────────
router.patch("/admin/whatsapp/messages/:id/read", async (req, res) => {
    const id = parseInt(String(req.params.id), 10);
  await db.update(waMessagesTable).set({ isRead: true }).where(eq(waMessagesTable.id, id));
  return res.json({ ok: true });
});

// ── DELETE /api/admin/whatsapp/messages/:id ────────────────────────────────────
router.delete("/admin/whatsapp/messages/:id", async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(waMessagesTable).where(eq(waMessagesTable.id, id));
  return res.json({ ok: true });
});

// ── POST /api/admin/whatsapp/send ─────────────────────────────────────────────
router.post("/admin/whatsapp/send", async (req, res) => {
  try {
    const { to, message } = req.body as { to: string; message: string };
    const { accessToken, phoneNumberId } = await getWaSettings();
    if (!accessToken || !phoneNumberId) return res.status(400).json({ error: "يرجى إعداد رمز الوصول ومعرّف رقم الهاتف أولاً" });

    const result = await waFetch(`/${phoneNumberId}/messages`, accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });

    // store outbound
    await db.insert(waMessagesTable).values({
      waId:      result?.messages?.[0]?.id,
      from:      phoneNumberId,
      toNumber:  to,
      type:      "text",
      body:      message,
      direction: "outbound",
      status:    "sent",
    }).onConflictDoNothing();

    return res.json({ ok: true, result });
  } catch (e) {
    return res.status(400).json({ error: String(e) });
  }
});

// ── Webhook: GET /api/webhooks/whatsapp (Meta verification) ────────────────────
router.get("/webhooks/whatsapp", async (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const { webhookVerifyToken } = await getWaSettings();
  if (mode === "subscribe" && token === (webhookVerifyToken || "my_secret_token_2026")) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ── Webhook: POST /api/webhooks/whatsapp (receive messages) ───────────────────
router.post("/webhooks/whatsapp", async (req, res) => {
  // Always ACK immediately
  res.sendStatus(200);

  try {
    const body = req.body as Record<string, unknown>;
    if (body.object !== "whatsapp_business_account") return;

    const entries = (body.entry as unknown[]) ?? [];
    for (const entry of entries) {
      const e = entry as Record<string, unknown>;
      const changes = (e.changes as unknown[]) ?? [];
      for (const change of changes) {
        const c = (change as Record<string, unknown>).value as Record<string, unknown>;
        if (!c) continue;

        const msgs   = (c.messages as unknown[]) ?? [];
        const contacts = (c.contacts as { profile?: { name?: string }; wa_id?: string }[]) ?? [];

        for (const m of msgs as Record<string, unknown>[]) {
          const fromNum  = String(m.from ?? "");
          const contact  = contacts.find(ct => ct.wa_id === fromNum);
          const fromName = contact?.profile?.name ?? "";
          const type     = String(m.type ?? "text");
          const body_text =
            type === "text"
              ? String((m.text as Record<string, unknown>)?.body ?? "")
              : type === "image"
              ? "[صورة]"
              : type === "audio"
              ? "[مقطع صوتي]"
              : type === "document"
              ? `[مستند: ${(m.document as Record<string, unknown>)?.filename ?? ""}]`
              : type === "location"
              ? `[موقع: ${(m.location as Record<string, unknown>)?.latitude ?? ""},${(m.location as Record<string, unknown>)?.longitude ?? ""}]`
              : `[${type}]`;

          await db.insert(waMessagesTable).values({
            waId:       String(m.id ?? ""),
            from:       fromNum,
            fromName,
            type,
            body:       body_text,
            direction:  "inbound",
            status:     "received",
            rawPayload: JSON.stringify(m),
          }).onConflictDoNothing();

          await createNotification({
            title: "رسالة واتساب جديدة",
            message: `رسالة جديدة من ${fromName || fromNum}`,
            type: "whatsapp",
            refType: "whatsapp",
          }).catch(() => {});
        }
      }
    }
  } catch { /* swallow — we already ACK'd */ }
});

export default router;
