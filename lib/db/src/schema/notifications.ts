import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationsTable = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("system"),
  recipientAdminId: integer("recipient_admin_id"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  refId: integer("ref_id"),
  refType: text("ref_type"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, isRead: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
