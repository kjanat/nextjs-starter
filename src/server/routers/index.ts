import { router } from "../trpc";
import { injectionRouter } from "./injection-drizzle";

export const appRouter = router({
  injection: injectionRouter,
});

export type AppRouter = typeof appRouter;
