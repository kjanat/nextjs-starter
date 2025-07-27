import { router } from "../trpc";
import { injectionRouter } from "./injection";

export const appRouter = router({
  injection: injectionRouter,
});

export type AppRouter = typeof appRouter;
