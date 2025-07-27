import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Injection table schema for Drizzle ORM
export const injections = sqliteTable(
  "injections",
  {
    // Using text for ID with cuid-like format
    id: text("id")
      .primaryKey()
      .$defaultFn(() => {
        // Simple cuid-like ID generator for edge compatibility
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 9);
        return `c${timestamp}${random}`;
      }),

    userName: text("user_name").notNull(),

    // Using integer timestamp for better D1 compatibility
    injectionTime: integer("injection_time", { mode: "timestamp" }).notNull(),

    injectionType: text("injection_type").notNull(),

    notes: text("notes"),

    // Timestamps with automatic defaults
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // Performance indexes
    userNameIdx: index("idx_injections_user_name").on(table.userName),
    injectionTimeIdx: index("idx_injections_injection_time").on(table.injectionTime),
    injectionTypeIdx: index("idx_injections_injection_type").on(table.injectionType),
  }),
);

// Type exports for TypeScript
export type Injection = typeof injections.$inferSelect;
export type NewInjection = typeof injections.$inferInsert;
