import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const pageViewsTable = sqliteTable("page_views", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  page: text("page").notNull().default("/"),
  referrer: text("referrer").notNull().default(""),
  ipHash: text("ip_hash").notNull().default(""),
  deviceType: text("device_type").notNull().default("desktop"), // mobile | tablet | desktop
  country: text("country").notNull().default(""),
  region: text("region").notNull().default(""),
  city: text("city").notNull().default(""),
  utmSource: text("utm_source").notNull().default(""),
  utmMedium: text("utm_medium").notNull().default(""),
  utmCampaign: text("utm_campaign").notNull().default(""),
  gclid: text("gclid").notNull().default(""),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
});

// Active visitor heartbeat — cleaned up after 5 min inactivity
export const activeVisitorsTable = sqliteTable("active_visitors", {
  sessionId: text("session_id").primaryKey(),
  page: text("page").notNull().default("/"),
  deviceType: text("device_type").notNull().default("desktop"),
  conversationId: integer("conversation_id"),
  clientName: text("client_name"),
  phone: text("phone"),
  invitationMessage: text("invitation_message"),
  invitationCreatedAt: text("invitation_created_at"),
  lastSeen: text("last_seen").notNull(),
});
