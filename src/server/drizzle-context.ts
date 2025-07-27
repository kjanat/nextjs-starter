import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDrizzleClient, EdgeDatabaseClient } from "@/db/client";
import { InjectionRepository } from "@/repositories/injection.repository";

// Cache the database client across requests in the same worker instance
let cachedClient: EdgeDatabaseClient | null = null;

/**
 * Create tRPC context with Drizzle ORM
 */
export async function createDrizzleContext() {
  try {
    const isLocalDev = process.env.NODE_ENV === "development" && !process.env.CLOUDFLARE_ENV;

    if (isLocalDev) {
      // For local development, you need to run wrangler dev
      throw new Error(
        "Local development requires 'wrangler dev' for D1 database emulation. " +
          "Run: pnpm wrangler dev --local --persist",
      );
    }

    // Get Cloudflare environment bindings
    const { env } = getCloudflareContext();

    if (!env.DB) {
      throw new Error(
        "D1 database binding 'DB' not found. " +
          "Ensure your wrangler.toml has the correct d1_databases configuration.",
      );
    }

    // Create or reuse the database client
    if (!cachedClient) {
      cachedClient = new EdgeDatabaseClient(env.DB);

      // Verify the connection
      const isHealthy = await cachedClient.healthCheck();
      if (!isHealthy) {
        cachedClient = null;
        throw new Error("Database health check failed");
      }
    }

    // Get the Drizzle client
    const db = cachedClient.client;

    // Create repository instances
    const injectionRepository = new InjectionRepository(db);

    return {
      db,
      repositories: {
        injection: injectionRepository,
      },
    };
  } catch (error) {
    console.error("Failed to create Drizzle context:", error);
    throw error;
  }
}

/**
 * Context type for tRPC procedures
 */
export type DrizzleContext = Awaited<ReturnType<typeof createDrizzleContext>>;

/**
 * Helper function for API routes that need direct database access
 */
export async function getDirectDB() {
  const { env } = getCloudflareContext();

  if (!env.DB) {
    throw new Error("D1 database binding not found");
  }

  return createDrizzleClient(env.DB);
}
