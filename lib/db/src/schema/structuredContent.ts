import { sqliteTable, integer, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * First-party structured content managed by the SEO team.
 *
 * scopePath is the canonical pathname ("/" for the homepage and "*" for a
 * site-wide record). Keeping the payload as JSON lets the schema engine
 * support new schema.org types without a migration for every new property.
 */
export const structuredContentTable = sqliteTable(
  "structured_content",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scopePath: text("scope_path").notNull().default("/"),
    schemaType: text("schema_type").notNull(),
    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    payload: text("payload").notNull().default("{}"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    scopeSchemaUnique: uniqueIndex("idx_structured_content_scope_type").on(
      table.scopePath,
      table.schemaType,
    ),
  }),
);

export const insertStructuredContentSchema = createInsertSchema(structuredContentTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStructuredContent = z.infer<typeof insertStructuredContentSchema>;
export type StructuredContent = typeof structuredContentTable.$inferSelect;