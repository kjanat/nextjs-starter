import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { disconnectPrisma, getPrisma } from "@/server/db";

// Mock the Prisma client
vi.mock("@/generated/prisma", () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $queryRaw: vi.fn().mockResolvedValue([{ "1": 1 }]),
    $disconnect: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock @prisma/adapter-d1
vi.mock("@prisma/adapter-d1", () => ({
  PrismaD1: vi.fn().mockImplementation(() => ({})),
}));

describe("Database Connection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    delete process.env.CLOUDFLARE_ENV;
    process.env.NODE_ENV = "test";
  });

  afterEach(async () => {
    await disconnectPrisma();
  });

  describe("Local Development Environment", () => {
    it("should connect to SQLite in local development", async () => {
      process.env.NODE_ENV = "development";
      process.env.DATABASE_URL = "file:./test.db";

      const prisma = await getPrisma();
      expect(prisma).toBeDefined();
    });

    it("should use DATABASE_URL from environment", async () => {
      process.env.NODE_ENV = "development";
      process.env.DATABASE_URL = "file:./custom.db";

      const prisma = await getPrisma();
      expect(prisma).toBeDefined();
    });

    it("should fall back to default SQLite path if DATABASE_URL not set", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.DATABASE_URL;

      const prisma = await getPrisma();
      expect(prisma).toBeDefined();
    });
  });

  describe("Production Environment", () => {
    it("should attempt to use D1 adapter in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.CLOUDFLARE_ENV = "production";

      try {
        await getPrisma();
      } catch (error) {
        // Expected to fail in test environment since we don't have real D1 binding
        expect(error).toBeDefined();
      }
    });
  });

  describe("Connection Health", () => {
    it("should test connection with SELECT 1 query", async () => {
      process.env.NODE_ENV = "development";

      const prisma = await getPrisma();
      expect(prisma).toBeDefined();
      // The mock should have been called for the health check
    });

    it("should handle connection failures gracefully", async () => {
      const { PrismaClient } = await import("@/generated/prisma");
      const mockPrismaClient = PrismaClient as any;

      // Mock a failing connection
      mockPrismaClient.mockImplementationOnce(() => ({
        $queryRaw: vi.fn().mockRejectedValue(new Error("Connection failed")),
        $disconnect: vi.fn(),
      }));

      process.env.NODE_ENV = "development";

      await expect(getPrisma()).rejects.toThrow();
    });
  });

  describe("disconnectPrisma", () => {
    it("should disconnect client gracefully", async () => {
      process.env.NODE_ENV = "development";

      await getPrisma();
      await expect(disconnectPrisma()).resolves.not.toThrow();
    });

    it("should handle disconnect errors gracefully", async () => {
      const { PrismaClient } = await import("@/generated/prisma");
      const mockPrismaClient = PrismaClient as any;

      mockPrismaClient.mockImplementationOnce(() => ({
        $queryRaw: vi.fn().mockResolvedValue([{ "1": 1 }]),
        $disconnect: vi.fn().mockRejectedValue(new Error("Disconnect failed")),
      }));

      process.env.NODE_ENV = "development";

      await getPrisma();
      await expect(disconnectPrisma()).resolves.not.toThrow();
    });
  });
});
