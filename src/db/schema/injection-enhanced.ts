import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Enhanced injection table schema for multi-dose support
export const injectionsEnhanced = sqliteTable(
  "injections_enhanced",
  {
    // Using text for ID with cuid-like format
    id: text("id")
      .primaryKey()
      .$defaultFn(() => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 9);
        return `inj${timestamp}${random}`;
      }),

    userName: text("user_name").notNull(),

    // Time and type
    injectionTime: integer("injection_time", { mode: "timestamp" }).notNull(),
    injectionType: text("injection_type").notNull(), // morning, evening, meal, correction, etc.

    // Insulin details
    insulinType: text("insulin_type"), // rapid, long-acting, intermediate, etc.
    insulinBrand: text("insulin_brand"), // Humalog, Lantus, etc.
    dosageUnits: real("dosage_units"), // Number of units injected

    // Related measurements
    bloodGlucoseBefore: real("blood_glucose_before"), // mg/dL or mmol/L
    bloodGlucoseAfter: real("blood_glucose_after"), // mg/dL or mmol/L
    bloodGlucoseUnit: text("blood_glucose_unit").default("mg/dL"), // mg/dL or mmol/L

    // Meal context
    mealType: text("meal_type"), // breakfast, lunch, dinner, snack
    carbsGrams: real("carbs_grams"), // Carbohydrates in grams

    // Site rotation
    injectionSite: text("injection_site"), // abdomen, thigh, arm, etc.

    // Additional context
    notes: text("notes"),
    tags: text("tags"), // JSON array of tags: exercise, sick, stress, etc.

    // Link to inventory if tracked
    inventoryId: text("inventory_id"),

    // Timestamps with automatic defaults
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // Performance indexes
    userNameIdx: index("idx_injections_enh_user_name").on(table.userName),
    injectionTimeIdx: index("idx_injections_enh_injection_time").on(table.injectionTime),
    injectionTypeIdx: index("idx_injections_enh_injection_type").on(table.injectionType),
    insulinTypeIdx: index("idx_injections_enh_insulin_type").on(table.insulinType),
    mealTypeIdx: index("idx_injections_enh_meal_type").on(table.mealType),
  }),
);

// Type exports for TypeScript
export type InjectionEnhanced = typeof injectionsEnhanced.$inferSelect;
export type NewInjectionEnhanced = typeof injectionsEnhanced.$inferInsert;
