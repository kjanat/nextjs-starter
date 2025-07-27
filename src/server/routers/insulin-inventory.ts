import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { InsulinInventoryRepository } from "@/repositories/insulin-inventory.repository";
import { publicProcedure, router } from "../trpc";

// Input validation schemas
const createInventorySchema = z.object({
  userName: z.string().min(1, "User name is required"),
  insulinType: z.enum(["rapid", "long-acting", "intermediate", "mixed", "other"]),
  brand: z.string().optional(),
  concentration: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  volumeMl: z.number().positive().optional(),
  unitsPerMl: z.number().positive().default(100),
  purchaseDate: z.date().optional(),
  expirationDate: z.date(),
  storageLocation: z.string().optional(),
  notes: z.string().optional(),
});

const updateInventorySchema = z.object({
  id: z.string(),
  status: z.enum(["active", "finished", "expired", "discarded"]).optional(),
  openedDate: z.date().optional(),
  startedUsing: z.date().optional(),
  finishedUsing: z.date().optional(),
  currentUnitsRemaining: z.number().optional(),
  storageLocation: z.string().optional(),
  notes: z.string().optional(),
});

const logTemperatureExposureSchema = z.object({
  inventoryId: z.string(),
  exposureType: z.enum(["heat", "freeze", "room_temp"]),
  temperature: z.number().optional(),
  duration: z.number().optional(), // in minutes
  exposureDate: z.date(),
  severity: z.enum(["low", "medium", "high"]).optional(),
  notes: z.string().optional(),
});

const inventoryFiltersSchema = z.object({
  userName: z.string().optional(),
  status: z.string().optional(),
  insulinType: z.string().optional(),
  expiringWithinDays: z.number().optional(),
});

export const insulinInventoryRouter = router({
  // Create new inventory item
  create: publicProcedure.input(createInventorySchema).mutation(async ({ ctx, input }) => {
    try {
      const repository = new InsulinInventoryRepository(ctx.db);
      return await repository.create(input);
    } catch (error) {
      console.error("Failed to create inventory item:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to create inventory item",
      });
    }
  }),

  // Get all inventory items
  list: publicProcedure.input(inventoryFiltersSchema).query(async ({ ctx, input }) => {
    try {
      const repository = new InsulinInventoryRepository(ctx.db);
      return await repository.findAll(input);
    } catch (error) {
      console.error("Failed to fetch inventory items:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch inventory items",
      });
    }
  }),

  // Get single inventory item
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    try {
      const repository = new InsulinInventoryRepository(ctx.db);
      return await repository.findById(input.id);
    } catch (error) {
      console.error("Failed to fetch inventory item:", error);
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Inventory item not found",
      });
    }
  }),

  // Update inventory item
  update: publicProcedure.input(updateInventorySchema).mutation(async ({ ctx, input }) => {
    try {
      const repository = new InsulinInventoryRepository(ctx.db);
      const { id, ...data } = input;
      return await repository.update(id, data);
    } catch (error) {
      console.error("Failed to update inventory item:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to update inventory item",
      });
    }
  }),

  // Log temperature exposure
  logTemperatureExposure: publicProcedure
    .input(logTemperatureExposureSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const repository = new InsulinInventoryRepository(ctx.db);
        await repository.logTemperatureExposure(input);
        return { success: true };
      } catch (error) {
        console.error("Failed to log temperature exposure:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to log temperature exposure",
        });
      }
    }),

  // Get temperature exposures for an item
  getTemperatureExposures: publicProcedure
    .input(z.object({ inventoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const repository = new InsulinInventoryRepository(ctx.db);
        return await repository.getTemperatureExposures(input.inventoryId);
      } catch (error) {
        console.error("Failed to fetch temperature exposures:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch temperature exposures",
        });
      }
    }),

  // Get inventory statistics
  getStats: publicProcedure
    .input(z.object({ userName: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const repository = new InsulinInventoryRepository(ctx.db);
        return await repository.getStats(input.userName);
      } catch (error) {
        console.error("Failed to fetch inventory statistics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch inventory statistics",
        });
      }
    }),

  // Get alerts (expiring items, temperature issues, etc.)
  getAlerts: publicProcedure
    .input(z.object({ userName: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const repository = new InsulinInventoryRepository(ctx.db);
        return await repository.getAlerts(input.userName);
      } catch (error) {
        console.error("Failed to fetch alerts:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch alerts",
        });
      }
    }),

  // Calculate usage rate for an inventory item
  calculateUsageRate: publicProcedure
    .input(
      z.object({
        inventoryId: z.string(),
        injectionHistory: z.array(
          z.object({
            dosageUnits: z.number(),
            injectionTime: z.date(),
          }),
        ),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const repository = new InsulinInventoryRepository(ctx.db);
        return await repository.calculateUsageRate(input.inventoryId, input.injectionHistory);
      } catch (error) {
        console.error("Failed to calculate usage rate:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to calculate usage rate",
        });
      }
    }),
});
