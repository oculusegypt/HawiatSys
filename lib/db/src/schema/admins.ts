import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ADMIN_ROLES = ["admin", "manager", "customer_service", "requests_officer", "driver"] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

export const ALL_SECTIONS = [
  "dashboard", "analytics", "requests", "conversations", "whatsapp",
  "notifications", "blog", "slides", "ads", "testimonials",
  "services", "packages", "containers", "partners", "settings", "seo", "seo_pages", "employees", "database",
  "work_orders", "container_system",
] as const;
export type AdminSection = typeof ALL_SECTIONS[number];

export const ROLE_DEFAULT_PERMISSIONS: Record<AdminRole, AdminSection[]> = {
  admin:            [...ALL_SECTIONS],
  manager:          [...ALL_SECTIONS],
  customer_service: ["dashboard", "conversations", "whatsapp", "notifications"],
  requests_officer: ["dashboard", "requests", "notifications"],
  driver:          ["dashboard", "work_orders"],
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  admin:            "مدير النظام",
  manager:          "مدير",
  customer_service: "خدمة عملاء",
  requests_officer: "مسؤول طلبات",
  driver:          "سائق",
};

export function resolvePermissions(role: string, customPermissions: string | null): AdminSection[] {
  if (role === "admin") return [...ALL_SECTIONS];
  if (customPermissions) {
    try {
      const parsed = JSON.parse(customPermissions) as AdminSection[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* ignore */ }
  }
  return ROLE_DEFAULT_PERMISSIONS[role as AdminRole] ?? ["dashboard"];
}

export const adminsTable = sqliteTable("admins", {
  id:           integer("id").primaryKey({ autoIncrement: true }),
  username:     text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name:         text("name").notNull(),
  email:        text("email"),
  role:         text("role").notNull().default("admin"),
  permissions:  text("permissions"),        // JSON array | null = use role defaults
  isActive:     integer("is_active").notNull().default(1),
  createdBy:    integer("created_by"),
  createdAt:    text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
});

export const insertAdminSchema = createInsertSchema(adminsTable).omit({ id: true, createdAt: true });
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof adminsTable.$inferSelect;
