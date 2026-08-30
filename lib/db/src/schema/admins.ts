import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ADMIN_ROLES = ["admin", "manager", "customer_service", "requests_officer", "driver"] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

export const ALL_SECTIONS = [
  "dashboard", "analytics", "requests", "conversations", "whatsapp",
  "notifications", "blog", "slides", "ads", "testimonials", "reviews",
  "services", "packages", "containers", "partners", "settings", "seo", "seo_pages", "structured_content", "employees", "database",
  "work_orders", "container_system",
  "container_system_customer", "container_system_container", "container_system_container_type",
  "container_system_container_asset", "container_system_driver", "container_system_ledger_entry",
  "container_system_contract", "container_system_contract_line", "container_system_container_movement",
  "container_system_receipt", "container_system_payment", "container_system_expense", "container_system_deposit",
  "container_system_bank_deposit", "container_system_treasury", "container_system_transfer",
  "container_system_maintenance", "container_system_alert", "container_system_permit",
  "container_system_appointment", "container_system_reports", "container_system_vehicle",
  "container_system_warehouse", "container_system_category", "container_system_category_size",
  "container_system_salary_advance", "container_system_salary_payment", "container_system_fuel_expense",
  "container_system_daily_expense", "container_system_invoice", "container_system_invoice_return",
  "container_system_tax", "container_system_commission", "container_system_oil_change",
  "container_system_salary", "container_system_branch",
  "container_system_employee", "container_system_settings", "container_system_audit",
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
