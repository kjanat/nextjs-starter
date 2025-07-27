import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// Type for the Drizzle database instance
export type DrizzleDB = ReturnType<typeof createDrizzleClient>;

// Factory function to create Drizzle client
export function createDrizzleClient(d1: D1Database) {
  // Type assertion needed due to version mismatch between @cloudflare/workers-types and drizzle-orm
  return drizzle(d1 as Parameters<typeof drizzle>[0], {
    schema,
    logger: process.env.NODE_ENV === "development",
  });
}

// Singleton instance management
let drizzleInstance: DrizzleDB | null = null;

/**
 * Get or create a Drizzle database instance
 * Handles both development (local SQLite) and production (Cloudflare D1) environments
 */
export async function getDrizzle(): Promise<DrizzleDB> {
  // Return existing instance if available
  if (drizzleInstance) {
    return drizzleInstance;
  }

  try {
    const isLocalDev = process.env.NODE_ENV === "development" && !process.env.CLOUDFLARE_ENV;

    if (isLocalDev) {
      // Local development: Create a mock D1 interface
      // Note: In real implementation, you'd use better-sqlite3 or similar
      throw new Error("Local development requires wrangler dev for D1 emulation");
    }

    // Production/Edge: Get D1 binding from Cloudflare context
    const { env } = getCloudflareContext();

    if (!env.DB) {
      throw new Error(
        "D1 database binding 'DB' not found. Check your wrangler.toml configuration.",
      );
    }

    drizzleInstance = createDrizzleClient(env.DB);

    // Perform a simple health check
    await drizzleInstance.select().from(schema.injections).limit(1);

    console.log("✅ Drizzle ORM connected to D1 database");
    return drizzleInstance;
  } catch (error) {
    console.error("Failed to initialize Drizzle ORM:", error);
    throw error;
  }
}

/**
 * Edge-compatible database client with built-in health checking
 */
export class EdgeDatabaseClient {
  private db: DrizzleDB;
  private lastHealthCheck: number = 0;
  private healthCheckInterval = 30000; // 30 seconds
  private isHealthy = true;

  constructor(d1: D1Database) {
    this.db = createDrizzleClient(d1);
  }

  get client(): DrizzleDB {
    return this.db;
  }

  /**
   * Perform a health check on the database connection
   */
  async healthCheck(): Promise<boolean> {
    const now = Date.now();

    // Skip if recently checked
    if (now - this.lastHealthCheck < this.healthCheckInterval && this.isHealthy) {
      return true;
    }

    try {
      // Simple query to verify connection
      await this.db.select().from(schema.injections).limit(1);

      this.isHealthy = true;
      this.lastHealthCheck = now;
      return true;
    } catch (error) {
      console.error("Database health check failed:", error);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Get a healthy database client
   */
  async getHealthyClient(): Promise<DrizzleDB> {
    const isHealthy = await this.healthCheck();

    if (!isHealthy) {
      throw new Error("Database connection is unhealthy");
    }

    return this.db;
  }
}

// Export convenience function for getting DB in API routes
export async function getDB(): Promise<DrizzleDB> {
  return getDrizzle();
}
