import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { getPrisma } from "./db";

export const createContext = async () => ({ db: await getPrisma() });
type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    if (error.cause instanceof ZodError) return { ...shape, zod: error.cause.flatten() };
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  ping: publicProcedure.query(() => "pong"),
});

export type AppRouter = typeof appRouter;
