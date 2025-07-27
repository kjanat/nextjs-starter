import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createMocks } from "node-mocks-http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "@/server/routers";
import { createContext } from "@/server/trpc";

// Mock the database
const mockDb = {
  injection: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

// Mock the context creation
vi.mock("@/server/trpc", () => ({
  createContext: vi.fn(),
  router: vi.fn(),
  publicProcedure: {
    input: vi.fn().mockReturnValue({
      mutation: vi.fn(),
      query: vi.fn(),
    }),
  },
}));

// Mock database
vi.mock("@/server/db", () => ({
  getPrisma: vi.fn().mockResolvedValue(mockDb),
}));

describe("tRPC API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createContext).mockResolvedValue({ db: mockDb as any });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("POST /api/trpc/injection.create", () => {
    it("should create injection successfully", async () => {
      const mockInjection = {
        id: "test-id",
        userName: "John Doe",
        injectionTime: new Date("2024-01-01T08:00:00Z"),
        injectionType: "morning",
        notes: "Test injection",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.injection.create.mockResolvedValue(mockInjection);

      const request = new Request("http://localhost:3000/api/trpc/injection.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: "John Doe",
          injectionTime: "2024-01-01T08:00:00Z",
          injectionType: "morning",
          notes: "Test injection",
        }),
      });

      const response = await fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext,
      });

      expect(response.status).toBe(200);
    });

    it("should handle validation errors", async () => {
      const request = new Request("http://localhost:3000/api/trpc/injection.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Missing required fields
          userName: "",
        }),
      });

      const response = await fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext,
      });

      expect(response.status).toBe(400);
    });

    it("should handle database errors", async () => {
      mockDb.injection.create.mockRejectedValue(new Error("Database error"));

      const request = new Request("http://localhost:3000/api/trpc/injection.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: "John Doe",
          injectionTime: "2024-01-01T08:00:00Z",
          injectionType: "morning",
        }),
      });

      const response = await fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext,
      });

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/trpc/injection.list", () => {
    it("should fetch injections successfully", async () => {
      const mockInjections = [
        {
          id: "test-1",
          userName: "John Doe",
          injectionTime: new Date("2024-01-01T08:00:00Z"),
          injectionType: "morning",
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.injection.findMany.mockResolvedValue(mockInjections);

      const request = new Request("http://localhost:3000/api/trpc/injection.list", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext,
      });

      expect(response.status).toBe(200);
    });

    it("should handle date filtering", async () => {
      mockDb.injection.findMany.mockResolvedValue([]);

      const request = new Request(
        'http://localhost:3000/api/trpc/injection.list?input={"date":"2024-01-01"}',
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext,
      });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/trpc/injection.todayStatus", () => {
    it("should return today status successfully", async () => {
      const mockInjections = [
        {
          id: "test-1",
          userName: "John Doe",
          injectionTime: new Date(),
          injectionType: "morning",
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.injection.findMany.mockResolvedValue(mockInjections);

      const request = new Request("http://localhost:3000/api/trpc/injection.todayStatus", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext,
      });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/trpc/injection.stats", () => {
    it("should calculate statistics successfully", async () => {
      const mockInjections = [
        {
          id: "test-1",
          userName: "John Doe",
          injectionTime: new Date(),
          injectionType: "morning",
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "test-2",
          userName: "Jane Doe",
          injectionTime: new Date(),
          injectionType: "evening",
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.injection.findMany.mockResolvedValue(mockInjections);

      const request = new Request("http://localhost:3000/api/trpc/injection.stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext,
      });

      expect(response.status).toBe(200);
    });
  });
});
