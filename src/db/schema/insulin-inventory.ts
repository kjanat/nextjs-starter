import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Insulin inventory table for tracking vials/pens
export const insulinInventory = sqliteTable(
  "insulin_inventory",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 9);
        return `inv${timestamp}${random}`;
      }),

    userName: text("user_name").notNull(),

    // Insulin details
    insulinType: text("insulin_type").notNull(), // rapid, long-acting, etc.
    brand: text("brand"), // Humalog, Lantus, etc.
    concentration: text("concentration"), // U100, U200, etc.

    // Quantity tracking
    quantity: integer("quantity").notNull().default(1), // Number of vials/pens
    volumeMl: real("volume_ml"), // Volume in ml per vial/pen
    unitsPerMl: integer("units_per_ml").default(100), // Usually 100 units/ml

    // Dates
    purchaseDate: integer("purchase_date", { mode: "timestamp" }),
    expirationDate: integer("expiration_date", { mode: "timestamp" }).notNull(),
    openedDate: integer("opened_date", { mode: "timestamp" }),

    // Usage tracking
    startedUsing: integer("started_using", { mode: "timestamp" }),
    finishedUsing: integer("finished_using", { mode: "timestamp" }),
    currentUnitsRemaining: real("current_units_remaining"),

    // Storage conditions
    storageLocation: text("storage_location"), // fridge, room temp, etc.
    temperatureExposures: text("temperature_exposures"), // JSON array of exposure events

    // Status
    status: text("status").notNull().default("active"), // active, finished, expired, discarded
    notes: text("notes"),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userNameIdx: index("idx_inventory_user_name").on(table.userName),
    statusIdx: index("idx_inventory_status").on(table.status),
    expirationIdx: index("idx_inventory_expiration").on(table.expirationDate),
    insulinTypeIdx: index("idx_inventory_insulin_type").on(table.insulinType),
  }),
);

// Temperature exposure log for tracking storage conditions
export const temperatureExposures = sqliteTable(
  "temperature_exposures",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 9);
        return `temp${timestamp}${random}`;
      }),

    inventoryId: text("inventory_id")
      .notNull()
      .references(() => insulinInventory.id, { onDelete: "cascade" }),

    exposureType: text("exposure_type").notNull(), // heat, freeze, room_temp
    temperature: real("temperature"), // Temperature in Celsius if known
    duration: integer("duration"), // Duration in minutes
    exposureDate: integer("exposure_date", { mode: "timestamp" }).notNull(),

    severity: text("severity"), // low, medium, high
    notes: text("notes"),

    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => ({
    inventoryIdx: index("idx_exposure_inventory").on(table.inventoryId),
    dateIdx: index("idx_exposure_date").on(table.exposureDate),
  }),
);

// Type exports
export type InsulinInventory = typeof insulinInventory.$inferSelect;
export type NewInsulinInventory = typeof insulinInventory.$inferInsert;
export type TemperatureExposure = typeof temperatureExposures.$inferSelect;
export type NewTemperatureExposure = typeof temperatureExposures.$inferInsert;
