import { addDays, differenceInDays } from "date-fns";
import { and, desc, eq, lte } from "drizzle-orm";
import type { DrizzleDB } from "@/db/client";
import {
  type InsulinInventory,
  insulinInventory,
  type NewInsulinInventory,
  type NewTemperatureExposure,
  temperatureExposures,
} from "@/db/schema";
import { DatabaseError, NotFoundError, ValidationError } from "@/lib/errors";

export interface InventoryFilters {
  userName?: string;
  status?: string;
  insulinType?: string;
  expiringWithinDays?: number;
}

export interface InventoryStats {
  totalActive: number;
  expiringWithin30Days: number;
  expiringWithin7Days: number;
  expired: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  estimatedDaysRemaining: Record<string, number>;
}

export interface UsageRate {
  inventoryId: string;
  averageUnitsPerDay: number;
  daysOfSupplyRemaining: number;
  projectedEmptyDate: Date | null;
}

export class InsulinInventoryRepository {
  constructor(private db: DrizzleDB) {}

  /**
   * Create a new insulin inventory record
   */
  async create(
    data: Omit<NewInsulinInventory, "id" | "createdAt" | "updatedAt">,
  ): Promise<InsulinInventory> {
    // Validate required fields
    if (!data.userName?.trim()) {
      throw new ValidationError("User name is required", { userName: ["Required field"] });
    }
    if (!data.insulinType?.trim()) {
      throw new ValidationError("Insulin type is required", { insulinType: ["Required field"] });
    }
    if (!data.expirationDate) {
      throw new ValidationError("Expiration date is required", {
        expirationDate: ["Required field"],
      });
    }

    // Validate expiration date is in the future
    if (new Date(data.expirationDate) < new Date()) {
      throw new ValidationError("Expiration date must be in the future", {
        expirationDate: ["Must be a future date"],
      });
    }

    try {
      const [inventory] = await this.db
        .insert(insulinInventory)
        .values({
          ...data,
          userName: data.userName.trim(),
          insulinType: data.insulinType.trim(),
          brand: data.brand?.trim(),
          status: data.status || "active",
        })
        .returning();

      if (!inventory) {
        throw new DatabaseError("Failed to create inventory record");
      }

      return inventory;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError("Failed to create inventory record", error);
    }
  }

  /**
   * Find all inventory items with optional filters
   */
  async findAll(filters?: InventoryFilters): Promise<InsulinInventory[]> {
    try {
      const conditions = [];

      if (filters?.userName?.trim()) {
        conditions.push(eq(insulinInventory.userName, filters.userName.trim()));
      }

      if (filters?.status?.trim()) {
        conditions.push(eq(insulinInventory.status, filters.status.trim()));
      }

      if (filters?.insulinType?.trim()) {
        conditions.push(eq(insulinInventory.insulinType, filters.insulinType.trim()));
      }

      if (filters?.expiringWithinDays) {
        const expirationThreshold = addDays(new Date(), filters.expiringWithinDays);
        conditions.push(lte(insulinInventory.expirationDate, expirationThreshold));
        conditions.push(eq(insulinInventory.status, "active"));
      }

      const query = this.db.select().from(insulinInventory);

      if (conditions.length > 0) {
        query.where(and(...conditions));
      }

      return await query.orderBy(desc(insulinInventory.createdAt));
    } catch (error) {
      throw new DatabaseError("Failed to fetch inventory items", error);
    }
  }

  /**
   * Find inventory by ID
   */
  async findById(id: string): Promise<InsulinInventory> {
    try {
      const [inventory] = await this.db
        .select()
        .from(insulinInventory)
        .where(eq(insulinInventory.id, id))
        .limit(1);

      if (!inventory) {
        throw new NotFoundError("Inventory item not found");
      }

      return inventory;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to fetch inventory item", error);
    }
  }

  /**
   * Update inventory item
   */
  async update(
    id: string,
    data: Partial<Omit<InsulinInventory, "id" | "createdAt" | "updatedAt">>,
  ): Promise<InsulinInventory> {
    try {
      const [updated] = await this.db
        .update(insulinInventory)
        .set(data)
        .where(eq(insulinInventory.id, id))
        .returning();

      if (!updated) {
        throw new NotFoundError("Inventory item not found");
      }

      return updated;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to update inventory item", error);
    }
  }

  /**
   * Log temperature exposure event
   */
  async logTemperatureExposure(
    data: Omit<NewTemperatureExposure, "id" | "createdAt">,
  ): Promise<void> {
    try {
      await this.db.insert(temperatureExposures).values(data);
    } catch (error) {
      throw new DatabaseError("Failed to log temperature exposure", error);
    }
  }

  /**
   * Get temperature exposure history for an inventory item
   */
  async getTemperatureExposures(inventoryId: string) {
    try {
      return await this.db
        .select()
        .from(temperatureExposures)
        .where(eq(temperatureExposures.inventoryId, inventoryId))
        .orderBy(desc(temperatureExposures.exposureDate));
    } catch (error) {
      throw new DatabaseError("Failed to fetch temperature exposures", error);
    }
  }

  /**
   * Calculate usage rate based on injection history
   */
  async calculateUsageRate(
    inventoryId: string,
    injectionHistory: Array<{ dosageUnits: number; injectionTime: Date }>,
  ): Promise<UsageRate> {
    try {
      const inventory = await this.findById(inventoryId);

      if (!inventory.startedUsing || injectionHistory.length === 0) {
        return {
          inventoryId,
          averageUnitsPerDay: 0,
          daysOfSupplyRemaining: 0,
          projectedEmptyDate: null,
        };
      }

      // Calculate total units used
      const totalUnitsUsed = injectionHistory.reduce((sum, inj) => sum + (inj.dosageUnits || 0), 0);

      // Calculate days since started
      const daysSinceStart = differenceInDays(new Date(), inventory.startedUsing);
      const averageUnitsPerDay = daysSinceStart > 0 ? totalUnitsUsed / daysSinceStart : 0;

      // Calculate remaining supply
      const totalUnits =
        (inventory.volumeMl || 0) * (inventory.unitsPerMl || 100) * (inventory.quantity || 1);
      const unitsRemaining = inventory.currentUnitsRemaining || totalUnits - totalUnitsUsed;
      const daysOfSupplyRemaining =
        averageUnitsPerDay > 0 ? Math.floor(unitsRemaining / averageUnitsPerDay) : 0;

      const projectedEmptyDate =
        daysOfSupplyRemaining > 0 ? addDays(new Date(), daysOfSupplyRemaining) : null;

      return {
        inventoryId,
        averageUnitsPerDay: Math.round(averageUnitsPerDay * 10) / 10,
        daysOfSupplyRemaining,
        projectedEmptyDate,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to calculate usage rate", error);
    }
  }

  /**
   * Get inventory statistics
   */
  async getStats(userName?: string): Promise<InventoryStats> {
    try {
      const conditions = userName ? [eq(insulinInventory.userName, userName)] : [];

      const items = await this.db
        .select()
        .from(insulinInventory)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const now = new Date();
      const in7Days = addDays(now, 7);
      const in30Days = addDays(now, 30);

      const stats: InventoryStats = {
        totalActive: 0,
        expiringWithin30Days: 0,
        expiringWithin7Days: 0,
        expired: 0,
        byType: {},
        byStatus: {},
        estimatedDaysRemaining: {},
      };

      items.forEach((item) => {
        // Count by status
        stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;

        // Count by type
        stats.byType[item.insulinType] = (stats.byType[item.insulinType] || 0) + 1;

        if (item.status === "active") {
          stats.totalActive++;

          // Check expiration
          if (item.expirationDate < now) {
            stats.expired++;
          } else if (item.expirationDate <= in7Days) {
            stats.expiringWithin7Days++;
            stats.expiringWithin30Days++;
          } else if (item.expirationDate <= in30Days) {
            stats.expiringWithin30Days++;
          }
        }
      });

      return stats;
    } catch (error) {
      throw new DatabaseError("Failed to calculate inventory statistics", error);
    }
  }

  /**
   * Check for items needing alerts (expiring soon, low stock)
   */
  async getAlerts(
    userName: string,
  ): Promise<Array<{ type: string; message: string; severity: string; inventoryId: string }>> {
    try {
      const alerts: Array<{
        type: string;
        message: string;
        severity: string;
        inventoryId: string;
      }> = [];

      const activeItems = await this.findAll({ userName, status: "active" });
      const now = new Date();

      for (const item of activeItems) {
        // Check expiration
        const daysUntilExpiry = differenceInDays(item.expirationDate, now);

        if (daysUntilExpiry < 0) {
          alerts.push({
            type: "expired",
            message: `${item.brand || item.insulinType} has expired`,
            severity: "high",
            inventoryId: item.id,
          });
        } else if (daysUntilExpiry <= 7) {
          alerts.push({
            type: "expiring_soon",
            message: `${item.brand || item.insulinType} expires in ${daysUntilExpiry} days`,
            severity: "high",
            inventoryId: item.id,
          });
        } else if (daysUntilExpiry <= 30) {
          alerts.push({
            type: "expiring_soon",
            message: `${item.brand || item.insulinType} expires in ${daysUntilExpiry} days`,
            severity: "medium",
            inventoryId: item.id,
          });
        }

        // Check if opened for too long (28 days for most insulins)
        if (item.openedDate) {
          const daysSinceOpened = differenceInDays(now, item.openedDate);
          if (daysSinceOpened > 28) {
            alerts.push({
              type: "opened_too_long",
              message: `${item.brand || item.insulinType} has been open for ${daysSinceOpened} days`,
              severity: "high",
              inventoryId: item.id,
            });
          }
        }

        // Check temperature exposures
        const exposures = await this.getTemperatureExposures(item.id);
        const severeExposures = exposures.filter((e) => e.severity === "high");
        if (severeExposures.length > 0) {
          alerts.push({
            type: "temperature_exposure",
            message: `${item.brand || item.insulinType} has ${severeExposures.length} severe temperature exposure(s)`,
            severity: "high",
            inventoryId: item.id,
          });
        }
      }

      return alerts;
    } catch (error) {
      throw new DatabaseError("Failed to check alerts", error);
    }
  }
}
