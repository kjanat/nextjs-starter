import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDrizzleClient, EdgeDatabaseClient } from "@/db/client";
import { InjectionRepository } from "@/repositories/injection.repository";

// Cache the database client across requests in the same worker instance
let cachedClient: EdgeDatabaseClient | null = null;

// Error classes for better error handling
export class DatabaseConnectionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DatabaseConnectionError";
  }
}

export class DatabaseHealthCheckError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DatabaseHealthCheckError";
  }
}

/**
 * Create tRPC context with Drizzle ORM
 */
export async function createDrizzleContext() {
  try {
    // Get Cloudflare environment bindings
    const { env } = getCloudflareContext();

    if (!env?.DB) {
      throw new DatabaseConnectionError(
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
        throw new DatabaseHealthCheckError("Database health check failed");
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
    // Re-throw known errors
    if (error instanceof DatabaseConnectionError || error instanceof DatabaseHealthCheckError) {
      throw error;
    }
    // Wrap unknown errors
    throw new DatabaseConnectionError("Failed to create database context", error);
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

  if (!env?.DB) {
    throw new DatabaseConnectionError("D1 database binding not found");
  }

  return createDrizzleClient(env.DB);
}
