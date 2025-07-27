import { router } from "../trpc";
import { injectionRouter } from "./injection-drizzle";
import { insulinInventoryRouter } from "./insulin-inventory";

export const appRouter = router({
  injection: injectionRouter,
  insulinInventory: insulinInventoryRouter,
});

export type AppRouter = typeof appRouter;
