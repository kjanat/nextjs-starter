// src/server/db.ts

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@/generated/prisma";

let prisma: PrismaClient | undefined;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
const CONNECTION_RETRY_DELAY = 1000;

interface ConnectionHealth {
  isHealthy: boolean;
  lastCheck: number;
  consecutiveFailures: number;
}

const connectionHealth: ConnectionHealth = {
  isHealthy: true,
  lastCheck: 0,
  consecutiveFailures: 0,
};

async function createPrismaClient(): Promise<PrismaClient> {
  try {
    // Check if we're in local development environment
    const isLocalDev = process.env.NODE_ENV === "development" && !process.env.CLOUDFLARE_ENV;

    let client: PrismaClient;

    if (isLocalDev) {
      // Local development: use SQLite directly
      console.log("🔧 Local development: connecting to SQLite database");
      client = new PrismaClient({
        log: ["error", "warn"],
        datasources: {
          db: {
            url: process.env.DATABASE_URL || "file:./prisma/db.sqlite",
          },
        },
      });
    } else {
      // Production/Cloudflare Workers: use D1 adapter
      console.log("☁️ Production: connecting to Cloudflare D1 database");
      const { env } = getCloudflareContext();

      if (!env.DB) {
        throw new Error("D1 database binding not found - check wrangler.toml configuration");
      }

      const adapter = new PrismaD1(env.DB);
      client = new PrismaClient({
        adapter,
        log: ["error"],
      });
    }

    // Test connection with a simple query
    await client.$queryRaw`SELECT 1`;

    connectionHealth.isHealthy = true;
    connectionHealth.consecutiveFailures = 0;
    connectionAttempts = 0;

    console.log(`✅ Database connection successful (${isLocalDev ? "SQLite" : "D1"})`);
    return client;
  } catch (error) {
    connectionHealth.isHealthy = false;
    connectionHealth.consecutiveFailures++;
    connectionAttempts++;

    console.error(`Database connection attempt ${connectionAttempts} failed:`, {
      error: error instanceof Error ? error.message : String(error),
      consecutiveFailures: connectionHealth.consecutiveFailures,
      environment: process.env.NODE_ENV,
      isCloudflare: !!process.env.CLOUDFLARE_ENV,
    });

    if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      await new Promise((resolve) =>
        setTimeout(resolve, CONNECTION_RETRY_DELAY * connectionAttempts),
      );
      return createPrismaClient();
    }

    throw new Error(
      `Failed to connect to database after ${MAX_CONNECTION_ATTEMPTS} attempts: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function getPrisma(): Promise<PrismaClient> {
  const now = Date.now();
  const healthCheckInterval = 30000; // 30 seconds

  // Check if we need to validate connection health
  if (prisma && now - connectionHealth.lastCheck > healthCheckInterval) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      connectionHealth.isHealthy = true;
      connectionHealth.lastCheck = now;
      connectionHealth.consecutiveFailures = 0;
    } catch (error) {
      console.warn("Database health check failed, creating new connection:", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Clean up the old connection
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.warn("Error disconnecting old client:", disconnectError);
      }

      prisma = undefined;
      connectionHealth.isHealthy = false;
    }
  }

  if (!prisma || !connectionHealth.isHealthy) {
    prisma = await createPrismaClient();
    connectionHealth.lastCheck = now;
  }

  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    try {
      await prisma.$disconnect();
      prisma = undefined;
      connectionHealth.isHealthy = false;
    } catch (error) {
      console.error("Error disconnecting Prisma client:", error);
    }
  }
}
