import { endOfDay, startOfDay } from "date-fns";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { DrizzleDB } from "@/db/client";
import { type Injection, injections, type NewInjection } from "@/db/schema";

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
  constructor(private db: DrizzleDB) {}

  /**
   * Create a new injection record
   */
  async create(data: Omit<NewInjection, "id" | "createdAt" | "updatedAt">): Promise<Injection> {
    try {
      const [injection] = await this.db
        .insert(injections)
        .values({
          userName: data.userName,
          injectionTime: data.injectionTime,
          injectionType: data.injectionType,
          notes: data.notes,
        })
        .returning();

      return injection;
    } catch (error) {
      console.error("Failed to create injection:", error);
      throw new Error("Failed to create injection record");
    }
  }

  /**
   * Find injections by date range and optional user
   */
  async findByDateRange(startDate: Date, endDate: Date, userName?: string): Promise<Injection[]> {
    try {
      const conditions = [
        gte(injections.injectionTime, startDate),
        lte(injections.injectionTime, endDate),
      ];

      if (userName) {
        conditions.push(eq(injections.userName, userName));
      }

      return await this.db
        .select()
        .from(injections)
        .where(and(...conditions))
        .orderBy(desc(injections.injectionTime));
    } catch (error) {
      console.error("Failed to find injections by date range:", error);
      throw new Error("Failed to fetch injections");
    }
  }

  /**
   * Find all injections with optional filters
   */
  async findAll(filters?: InjectionFilters): Promise<Injection[]> {
    try {
      const conditions = [];

      if (filters?.userName) {
        conditions.push(eq(injections.userName, filters.userName));
      }

      if (filters?.date) {
        const date = new Date(filters.date);
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
      throw new Error("Failed to fetch injections");
    }
  }

  /**
   * Get today's injection status for a user
   */
  async getTodayStatus(userName?: string): Promise<TodayStatus> {
    try {
      const today = new Date();
      const todayInjections = await this.findByDateRange(
        startOfDay(today),
        endOfDay(today),
        userName,
      );

      const morningDone = todayInjections.some((inj) => inj.injectionType === "morning");
      const eveningDone = todayInjections.some((inj) => inj.injectionType === "evening");

      return {
        morning: morningDone,
        evening: eveningDone,
        injections: todayInjections,
      };
    } catch (error) {
      console.error("Failed to get today's status:", error);
      throw new Error("Failed to fetch today's status");
    }
  }

  /**
   * Get injection statistics for the last N days
   */
  async getStats(daysBack: number = 30): Promise<InjectionStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const results = await this.db
        .select()
        .from(injections)
        .where(gte(injections.injectionTime, startDate))
        .orderBy(injections.injectionTime);

      return this.calculateStats(results, daysBack);
    } catch (error) {
      console.error("Failed to get statistics:", error);
      throw new Error("Failed to calculate statistics");
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
    try {
      await this.db.select({ one: sql`1` }).from(injections).limit(1);
      return true;
    } catch {
      return false;
    }
  }
}
