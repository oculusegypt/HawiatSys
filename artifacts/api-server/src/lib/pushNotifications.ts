import webpush from "web-push";
import { db, adminsTable, notificationsTable, pushSubscriptionsTable, siteSettingsTable, type Notification } from "@workspace/db";
import { eq, inArray, isNull } from "drizzle-orm";
import { logger } from "./logger";

const VAPID_SETTING_KEYS = ["vapid_public_key", "vapid_private_key", "vapid_subject"] as const;
type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

function readEnvironmentConfig(): Partial<VapidConfig> {
  return {
    publicKey: process.env.VAPID_PUBLIC_KEY?.trim() || undefined,
    privateKey: process.env.VAPID_PRIVATE_KEY?.trim() || undefined,
    subject: process.env.VAPID_SUBJECT?.trim() || undefined,
  };
}

export async function getVapidConfig(): Promise<VapidConfig | null> {
  const environment = readEnvironmentConfig();
  const rows = await db.select()
    .from(siteSettingsTable)
    .where(inArray(siteSettingsTable.key, [...VAPID_SETTING_KEYS]));
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  // Prefer configured secrets, while retaining a previously persisted
  // configuration so the SQLite database remains portable to PHP hosting.
  let values = {
    publicKey: environment.publicKey ?? stored.get("vapid_public_key") ?? "",
    privateKey: environment.privateKey ?? stored.get("vapid_private_key") ?? "",
    subject: environment.subject ?? stored.get("vapid_subject") ?? "",
  };

  // A workflow can be started without exposing the project secrets to its
  // child process. In that case create one durable key pair instead of
  // leaving push notifications permanently disabled. This runs only when no
  // usable VAPID configuration exists; partial configurations still fail
  // explicitly rather than combining unrelated keys.
  if (!values.publicKey && !values.privateKey && !values.subject) {
    const generated = webpush.generateVAPIDKeys();
    values = {
      publicKey: generated.publicKey,
      privateKey: generated.privateKey,
      subject: "mailto:admin@localhost",
    };
    logger.warn("VAPID secrets were unavailable to the workflow; generated a durable SQLite key pair");
  }

  if (values.publicKey && values.privateKey && values.subject) {
    const updatedAt = new Date().toISOString();
    const updates = [
      ["vapid_public_key", values.publicKey],
      ["vapid_private_key", values.privateKey],
      ["vapid_subject", values.subject],
    ] as const;
    for (const [key, value] of updates) {
      await db.insert(siteSettingsTable)
        .values({ key, value, updatedAt })
        .onConflictDoUpdate({
          target: siteSettingsTable.key,
          set: { value, updatedAt },
        });
    }
  }

  if (!values.publicKey || !values.privateKey || !values.subject) return null;
  return values;
}

export async function getVapidPublicKey(): Promise<string | null> {
  return (await getVapidConfig())?.publicKey ?? null;
}

export async function sendNotificationPush(notification: Notification): Promise<void> {
  const config = await getVapidConfig();
  if (!config) {
    logger.warn("Push notification delivery skipped because VAPID is not configured");
    return;
  }
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

  const subscriptions = notification.recipientAdminId
    ? await db.select().from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.adminId, notification.recipientAdminId))
    : await db.select({
        id: pushSubscriptionsTable.id,
        endpoint: pushSubscriptionsTable.endpoint,
        p256dh: pushSubscriptionsTable.p256dh,
        auth: pushSubscriptionsTable.auth,
      }).from(pushSubscriptionsTable)
      .innerJoin(adminsTable, eq(adminsTable.id, pushSubscriptionsTable.adminId))
      .where(inArray(adminsTable.role, ["admin", "manager", "customer_service", "requests_officer"]));
  const payload = JSON.stringify({
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    refId: notification.refId,
    refType: notification.refType,
    createdAt: notification.createdAt,
  });

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
        );
      } catch (error: unknown) {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error
          ? Number((error as { statusCode?: number }).statusCode)
          : 0;

        if (statusCode === 404 || statusCode === 410) {
          await db.delete(pushSubscriptionsTable)
            .where(eq(pushSubscriptionsTable.id, subscription.id));
          return;
        }

        logger.warn({ err: error, subscriptionId: subscription.id }, "Push notification delivery failed");
      }
    }),
  );
}

export async function createNotification(
  values: {
    title: string;
    message: string;
    type?: string;
    recipientAdminId?: number | null;
    refId?: number | null;
    refType?: string | null;
  },
) {
  const [notification] = await db.insert(notificationsTable)
    .values({
      title: values.title,
      message: values.message,
      type: values.type ?? "system",
      recipientAdminId: values.recipientAdminId ?? null,
      refId: values.refId ?? null,
      refType: values.refType ?? null,
    })
    .returning();

  if (notification) {
    void sendNotificationPush(notification).catch((error: unknown) => {
      logger.error({ err: error, notificationId: notification.id }, "Push notification delivery failed");
    });
  }
  return notification;
}