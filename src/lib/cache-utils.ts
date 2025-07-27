import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Server-side cache invalidation utilities
 *
 * These functions help invalidate Next.js caches after mutations
 * to ensure fresh data is served to users
 */

/**
 * Invalidate injection-related caches
 *
 * Call this after creating, updating, or deleting injections
 */
export async function invalidateInjectionCaches() {
  // Invalidate the injection stats cache tag
  revalidateTag("injections");
  revalidateTag("stats");

  // Invalidate specific pages that show injection data
  revalidatePath("/");
  revalidatePath("/stats");
  revalidatePath("/history");
  revalidatePath("/analytics");
}

/**
 * Invalidate inventory-related caches
 *
 * Call this after inventory mutations
 */
export async function invalidateInventoryCaches() {
  revalidateTag("inventory");
  revalidatePath("/inventory");
}

/**
 * Invalidate all app caches
 *
 * Use sparingly - only for major data changes
 */
export async function invalidateAllCaches() {
  // Invalidate all cache tags
  revalidateTag("injections");
  revalidateTag("stats");
  revalidateTag("inventory");
  revalidateTag("analytics");

  // Invalidate all pages
  revalidatePath("/", "layout");
}
