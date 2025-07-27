import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDrizzleClient } from "@/db/client";
import { InjectionRepository } from "@/repositories/injection.repository";

/**
 * Server-side singleton for injection repository
 * Cached across requests in the same worker instance
 */
let cachedInjectionRepository: InjectionRepository | null = null;

/**
 * Get injection repository instance for server-side use
 *
 * This function creates or returns a cached repository instance
 * that can be used in Server Components and API routes.
 *
 * @throws {Error} If database binding is not available
 */
export async function getInjectionRepository(): Promise<InjectionRepository> {
  if (cachedInjectionRepository) {
    return cachedInjectionRepository;
  }

  const { env } = getCloudflareContext();

  if (!env?.DB) {
    throw new Error(
      "D1 database binding 'DB' not found. " +
        "Ensure your wrangler.toml has the correct d1_databases configuration.",
    );
  }

  const db = createDrizzleClient(env.DB);
  cachedInjectionRepository = new InjectionRepository(db);

  return cachedInjectionRepository;
}
