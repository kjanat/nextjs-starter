import { beforeEach, describe, expect, it, vi } from "vitest";
import { injectionRouter } from "@/server/routers/injection";
import { createContext } from "@/server/trpc";

// Mock the database
const mockDb = {
  injection: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

// Mock context
const mockContext = {
  db: mockDb as any,
};

describe("Injection Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create procedure", () => {
    it("should create a new injection record", async () => {
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

      const caller = injectionRouter.createCaller(mockContext);
      const result = await caller.create({
        userName: "John Doe",
        injectionTime: "2024-01-01T08:00:00Z",
        injectionType: "morning",
        notes: "Test injection",
      });

      expect(result).toEqual(mockInjection);
      expect(mockDb.injection.create).toHaveBeenCalledWith({
        data: {
          userName: "John Doe",
          injectionTime: new Date("2024-01-01T08:00:00Z"),
          injectionType: "morning",
          notes: "Test injection",
        },
      });
    });

    it("should handle database errors gracefully", async () => {
      mockDb.injection.create.mockRejectedValue(new Error("Database error"));

      const caller = injectionRouter.createCaller(mockContext);

      await expect(
        caller.create({
          userName: "John Doe",
          injectionTime: "2024-01-01T08:00:00Z",
          injectionType: "morning",
        }),
      ).rejects.toThrow("Failed to create injection record");
    });
  });

  describe("list procedure", () => {
    it("should list all injections when no filters provided", async () => {
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

      const caller = injectionRouter.createCaller(mockContext);
      const result = await caller.list({});

      expect(result).toEqual(mockInjections);
      expect(mockDb.injection.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: {
          injectionTime: "desc",
        },
      });
    });

    it("should filter by date when provided", async () => {
      mockDb.injection.findMany.mockResolvedValue([]);

      const caller = injectionRouter.createCaller(mockContext);
      await caller.list({ date: "2024-01-01" });

      expect(mockDb.injection.findMany).toHaveBeenCalledWith({
        where: {
          injectionTime: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
        orderBy: {
          injectionTime: "desc",
        },
      });
    });

    it("should filter by userName when provided", async () => {
      mockDb.injection.findMany.mockResolvedValue([]);

      const caller = injectionRouter.createCaller(mockContext);
      await caller.list({ userName: "John Doe" });

      expect(mockDb.injection.findMany).toHaveBeenCalledWith({
        where: {
          userName: "John Doe",
        },
        orderBy: {
          injectionTime: "desc",
        },
      });
    });
  });

  describe("todayStatus procedure", () => {
    it("should return morning and evening status for today", async () => {
      const today = new Date();
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

      const caller = injectionRouter.createCaller(mockContext);
      const result = await caller.todayStatus({});

      expect(result).toEqual({
        morning: true,
        evening: false,
        injections: mockInjections,
      });
    });

    it("should filter by userName when provided", async () => {
      mockDb.injection.findMany.mockResolvedValue([]);

      const caller = injectionRouter.createCaller(mockContext);
      await caller.todayStatus({ userName: "John Doe" });

      expect(mockDb.injection.findMany).toHaveBeenCalledWith({
        where: {
          injectionTime: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
          userName: "John Doe",
        },
        orderBy: {
          injectionTime: "desc",
        },
      });
    });
  });

  describe("stats procedure", () => {
    it("should calculate statistics correctly", async () => {
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

      const caller = injectionRouter.createCaller(mockContext);
      const result = await caller.stats();

      expect(result).toEqual({
        totalInjections: 2,
        complianceRate: expect.any(Number),
        morningCount: 1,
        eveningCount: 1,
        userContributions: {
          "John Doe": 1,
          "Jane Doe": 1,
        },
        perfectDays: expect.any(Number),
        totalDays: 30,
      });
    });
  });
});
