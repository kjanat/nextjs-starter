import { endOfDay, startOfDay } from "date-fns";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { DrizzleDB } from "@/db/client";
import { type Injection, injections, type NewInjection } from "@/db/schema";
import { CacheKeys, CacheTTL, EdgeCache } from "@/lib/cache";
import { DatabaseError, ValidationError } from "@/lib/errors";

export interface InjectionFilters {
  userName?: string;
  date?: string | Date;
  startDate?: Date;
  endDate?: Date;
}

export interface InjectionStats {
  totalInjections: number;
  complianceRate: number;
  morningCount: number;
  eveningCount: number;
  userContributions: Record<string, number>;
  perfectDays: number;
  totalDays: number;
}

export interface TodayStatus {
  morning: boolean;
  evening: boolean;
  injections: Injection[];
}

/**
 * Repository for managing injection records with Drizzle ORM
 */
export class InjectionRepository {
  private cache: EdgeCache<unknown>;

  constructor(private db: DrizzleDB) {
    this.cache = new EdgeCache<unknown>(50); // Max 50 cached items
  }

  /**
   * Create a new injection record
   */
  async create(data: Omit<NewInjection, "id" | "createdAt" | "updatedAt">): Promise<Injection> {
    // Validate required fields
    if (!data.userName?.trim()) {
      throw new ValidationError("User name is required", { userName: ["Required field"] });
    }
    if (!data.injectionTime) {
      throw new ValidationError("Injection time is required", {
        injectionTime: ["Required field"],
      });
    }
    if (!data.injectionType || !["morning", "evening"].includes(data.injectionType)) {
      throw new ValidationError("Invalid injection type", {
        injectionType: ["Must be 'morning' or 'evening'"],
      });
    }

    try {
      const [injection] = await this.db
        .insert(injections)
        .values({
          userName: data.userName.trim(),
          injectionTime: data.injectionTime,
          injectionType: data.injectionType,
          notes: data.notes?.trim() || null,
        })
        .returning();

      if (!injection) {
        throw new DatabaseError("Failed to create injection - no record returned");
      }

      // Invalidate related caches
      this.cache.delete(CacheKeys.todayStatus(injection.userName));
      this.cache.delete(CacheKeys.todayStatus());
      this.cache.delete(CacheKeys.stats(30));
      this.cache.delete(CacheKeys.stats(7));

      return injection;
    } catch (error) {
      console.error("Failed to create injection:", error);
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError("Failed to create injection record", error);
    }
  }

  /**
   * Find injections by date range and optional user
   */
  async findByDateRange(startDate: Date, endDate: Date, userName?: string): Promise<Injection[]> {
    // Validate date range
    if (startDate > endDate) {
      throw new ValidationError("Start date must be before end date", {
        dateRange: ["Invalid date range"],
      });
    }

    try {
      const conditions = [
        gte(injections.injectionTime, startDate),
        lte(injections.injectionTime, endDate),
      ];

      if (userName?.trim()) {
        conditions.push(eq(injections.userName, userName.trim()));
      }

      return await this.db
        .select()
        .from(injections)
        .where(and(...conditions))
        .orderBy(desc(injections.injectionTime));
    } catch (error) {
      console.error("Failed to find injections by date range:", error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError("Failed to fetch injections by date range", error);
    }
  }

  /**
   * Find all injections with optional filters
   */
  async findAll(filters?: InjectionFilters): Promise<Injection[]> {
    try {
      const conditions = [];

      if (filters?.userName?.trim()) {
        conditions.push(eq(injections.userName, filters.userName.trim()));
      }

      if (filters?.date) {
        const date = new Date(filters.date);
        if (isNaN(date.getTime())) {
          throw new ValidationError("Invalid date format", {
            date: ["Must be a valid date"],
          });
        }
        conditions.push(
          gte(injections.injectionTime, startOfDay(date)),
          lte(injections.injectionTime, endOfDay(date)),
        );
      }

      const query = this.db.select().from(injections);

      if (conditions.length > 0) {
        query.where(and(...conditions));
      }

      return await query.orderBy(desc(injections.injectionTime));
    } catch (error) {
      console.error("Failed to find all injections:", error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError("Failed to fetch injections", error);
    }
  }

  /**
   * Get today's injection status for a user
   */
  async getTodayStatus(userName?: string): Promise<TodayStatus> {
    // Check cache first
    const cacheKey = CacheKeys.todayStatus(userName);
    const cached = this.cache.get(cacheKey) as TodayStatus | null;
    if (cached) {
      return cached;
    }

    try {
      const today = new Date();
      const todayInjections = await this.findByDateRange(
        startOfDay(today),
        endOfDay(today),
        userName,
      );

      const morningDone = todayInjections.some((inj) => inj.injectionType === "morning");
      const eveningDone = todayInjections.some((inj) => inj.injectionType === "evening");

      const result: TodayStatus = {
        morning: morningDone,
        evening: eveningDone,
        injections: todayInjections,
      };

      // Cache the result
      this.cache.set(cacheKey, result, CacheTTL.todayStatus);

      return result;
    } catch (error) {
      console.error("Failed to get today's status:", error);
      if (error instanceof DatabaseError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError("Failed to fetch today's status", error);
    }
  }

  /**
   * Get injection statistics for the last N days
   */
  async getStats(daysBack: number = 30): Promise<InjectionStats> {
    // Validate input
    if (daysBack < 1 || daysBack > 365) {
      throw new ValidationError("Days back must be between 1 and 365", {
        daysBack: ["Invalid range"],
      });
    }

    // Check cache first
    const cacheKey = CacheKeys.stats(daysBack);
    const cached = this.cache.get(cacheKey) as InjectionStats | null;
    if (cached) {
      return cached;
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const results = await this.db
        .select()
        .from(injections)
        .where(gte(injections.injectionTime, startDate))
        .orderBy(injections.injectionTime);

      const stats = this.calculateStats(results, daysBack);

      // Cache the result
      this.cache.set(cacheKey, stats, CacheTTL.stats);

      return stats;
    } catch (error) {
      console.error("Failed to get statistics:", error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError("Failed to calculate statistics", error);
    }
  }

  /**
   * Calculate statistics from injection records
   */
  private calculateStats(injectionRecords: Injection[], totalDays: number): InjectionStats {
    const totalInjections = injectionRecords.length;
    const expectedInjections = totalDays * 2; // 2 injections per day
    const complianceRate = totalInjections > 0 ? (totalInjections / expectedInjections) * 100 : 0;

    const morningCount = injectionRecords.filter((i) => i.injectionType === "morning").length;
    const eveningCount = injectionRecords.filter((i) => i.injectionType === "evening").length;

    // Calculate user contributions
    const userContributions = injectionRecords.reduce(
      (acc, inj) => {
        acc[inj.userName] = (acc[inj.userName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Calculate perfect days (days with both morning and evening injections)
    const daysMap = new Map<string, Set<string>>();
    injectionRecords.forEach((inj) => {
      const dateKey = inj.injectionTime.toISOString().split("T")[0];
      if (!daysMap.has(dateKey)) {
        daysMap.set(dateKey, new Set());
      }
      daysMap.get(dateKey)?.add(inj.injectionType);
    });

    const perfectDays = Array.from(daysMap.values()).filter(
      (types) => types.has("morning") && types.has("evening"),
    ).length;

    return {
      totalInjections,
      complianceRate: Math.round(complianceRate * 10) / 10,
      morningCount,
      eveningCount,
      userContributions,
      perfectDays,
      totalDays,
    };
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<boolean> {
    // Check cache first
    const cacheKey = "health-check";
    const cached = this.cache.get(cacheKey) as boolean | null;
    if (cached !== null) {
      return cached;
    }

    try {
      await this.db.select({ one: sql`1` }).from(injections).limit(1);

      // Cache successful health check
      this.cache.set(cacheKey, true, CacheTTL.healthCheck);
      return true;
    } catch (error) {
      console.error("Database health check failed:", error);
      // Don't cache failures
      return false;
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }
}
