import { type inferAsyncReturnType, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { createDrizzleContext } from "./drizzle-context";

/**
 * Create tRPC context
 * This is called for each request
 */
export const createContext = createDrizzleContext;

/**
 * Infer the context type
 */
export type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
        // Include validation errors for custom error types
        validationErrors:
          error.cause && typeof error.cause === "object" && "errors" in error.cause
            ? (error.cause as { errors: unknown }).errors
            : null,
      },
    };
  },
});

/**
 * Create a router
 */
export const router = t.router;

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = t.procedure;

/**
 * Re-export router type for convenience
 */
export type Router = ReturnType<typeof router>;
