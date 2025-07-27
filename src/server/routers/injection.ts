import { TRPCError } from "@trpc/server";
import { endOfDay, startOfDay } from "date-fns";
import type { Injection } from "@/generated/prisma";
import {
  createInjectionSchema,
  getInjectionsSchema,
  todayStatusSchema,
} from "../schemas/injection";
import { publicProcedure, router } from "../trpc";

export const injectionRouter = router({
  create: publicProcedure.input(createInjectionSchema).mutation(async ({ ctx, input }) => {
    try {
      const injection = await ctx.db.injection.create({
        data: {
          userName: input.userName,
          injectionTime: new Date(input.injectionTime),
          injectionType: input.injectionType,
          notes: input.notes,
        },
      });
      return injection;
    } catch (error) {
      console.error("Failed to create injection:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        input: {
          userName: input.userName,
          injectionType: input.injectionType,
          injectionTime: input.injectionTime,
        },
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create injection record",
      });
    }
  }),

  list: publicProcedure.input(getInjectionsSchema).query(async ({ ctx, input }) => {
    try {
      const where: Record<string, unknown> = {};

      if (input.date) {
        const date = new Date(input.date);
        where.injectionTime = {
          gte: startOfDay(date),
          lte: endOfDay(date),
        };
      }

      if (input.userName) {
        where.userName = input.userName;
      }

      const injections = await ctx.db.injection.findMany({
        where,
        orderBy: {
          injectionTime: "desc",
        },
      });

      return injections;
    } catch (error) {
      console.error("Failed to fetch injections:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        input: {
          date: input.date,
          userName: input.userName,
        },
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch injections",
      });
    }
  }),

  todayStatus: publicProcedure.input(todayStatusSchema).query(async ({ ctx, input }) => {
    try {
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);

      const where: Record<string, unknown> = {
        injectionTime: {
          gte: startOfToday,
          lte: endOfToday,
        },
      };

      if (input.userName) {
        where.userName = input.userName;
      }

      // Efficient database query - filter at database level
      const todayInjections = await ctx.db.injection.findMany({
        where,
        orderBy: {
          injectionTime: "desc",
        },
      });

      const morningDone = todayInjections.some((inj: Injection) => inj.injectionType === "morning");
      const eveningDone = todayInjections.some((inj: Injection) => inj.injectionType === "evening");

      return {
        morning: morningDone,
        evening: eveningDone,
        injections: todayInjections,
      };
    } catch (error) {
      console.error("todayStatus error:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userName: input.userName,
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch today's status",
      });
    }
  }),

  stats: publicProcedure.query(async ({ ctx }) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const allInjections = await ctx.db.injection.findMany({
        where: {
          injectionTime: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: {
          injectionTime: "asc",
        },
      });

      // Calculate statistics
      const totalInjections = allInjections.length;
      const expectedInjections = 60; // 2 per day for 30 days
      const complianceRate = (totalInjections / expectedInjections) * 100;

      // Count by type
      const morningCount = allInjections.filter(
        (inj: Injection) => inj.injectionType === "morning",
      ).length;
      const eveningCount = allInjections.filter(
        (inj: Injection) => inj.injectionType === "evening",
      ).length;

      // User contributions
      const userContributions = allInjections.reduce(
        (acc: Record<string, number>, inj: Injection) => {
          acc[inj.userName] = (acc[inj.userName] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Days with both injections
      const daysMap = new Map<string, Set<string>>();
      allInjections.forEach((inj: Injection) => {
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
        totalDays: 30,
      };
    } catch (error) {
      console.error("Failed to calculate statistics:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to calculate statistics",
      });
    }
  }),
});
