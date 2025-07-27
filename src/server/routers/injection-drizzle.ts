import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { DatabaseError, getErrorDetails, ValidationError } from "@/lib/errors";
import {
  createInjectionSchema,
  getInjectionsSchema,
  todayStatusSchema,
} from "../schemas/injection";
import { publicProcedure, router } from "../trpc";

/**
 * Injection router using Drizzle ORM and repository pattern
 */
export const injectionRouter = router({
  /**
   * Create a new injection record
   */
  create: publicProcedure.input(createInjectionSchema).mutation(async ({ ctx, input }) => {
    try {
      const injection = await ctx.repositories.injection.create({
        userName: input.userName,
        injectionTime: new Date(input.injectionTime),
        injectionType: input.injectionType,
        notes: input.notes,
      });

      return injection;
    } catch (error) {
      console.error("Failed to create injection:", getErrorDetails(error));

      if (error instanceof ValidationError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
          cause: error.errors,
        });
      }

      if (error instanceof DatabaseError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
          cause: error,
        });
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create injection record",
        cause: error,
      });
    }
  }),

  /**
   * List injections with optional filters
   */
  list: publicProcedure.input(getInjectionsSchema).query(async ({ ctx, input }) => {
    try {
      // Use repository method which handles all the filtering logic
      const injections = await ctx.repositories.injection.findAll({
        date: input.date || undefined,
        userName: input.userName || undefined,
      });

      return injections;
    } catch (error) {
      console.error("Failed to fetch injections:", getErrorDetails(error));

      if (error instanceof ValidationError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
          cause: error.errors,
        });
      }

      if (error instanceof DatabaseError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
          cause: error,
        });
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch injections",
        cause: error,
      });
    }
  }),

  /**
   * Get today's injection status
   */
  todayStatus: publicProcedure.input(todayStatusSchema).query(async ({ ctx, input }) => {
    try {
      const status = await ctx.repositories.injection.getTodayStatus(input.userName || undefined);

      return status;
    } catch (error) {
      console.error("todayStatus error:", getErrorDetails(error));

      if (error instanceof DatabaseError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
          cause: error,
        });
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch today's status",
        cause: error,
      });
    }
  }),

  /**
   * Get injection statistics for a specified period
   */
  stats: publicProcedure
    .input(
      z
        .object({
          daysBack: z.number().min(1).max(365).default(30),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      try {
        const daysBack = input?.daysBack ?? 30;
        const stats = await ctx.repositories.injection.getStats(daysBack);
        return stats;
      } catch (error) {
        console.error("Failed to calculate statistics:", getErrorDetails(error));

        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
            cause: error.errors,
          });
        }

        if (error instanceof DatabaseError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to calculate statistics",
          cause: error,
        });
      }
    }),

  /**
   * Health check endpoint
   */
  healthCheck: publicProcedure.query(async ({ ctx }) => {
    try {
      const isHealthy = await ctx.repositories.injection.healthCheck();

      return {
        status: isHealthy ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),
});
