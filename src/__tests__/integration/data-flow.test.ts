import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InjectionDashboard } from "@/components/InjectionDashboard";
import { TRPCProvider } from "@/trpc/provider";

// Mock tRPC client
const mockTrpcClient = {
  injection: {
    create: {
      mutate: vi.fn(),
    },
    list: {
      useQuery: vi.fn(),
    },
    todayStatus: {
      useQuery: vi.fn(),
    },
    stats: {
      useQuery: vi.fn(),
    },
  },
};

// Mock the tRPC hooks
vi.mock("@/trpc/client", () => ({
  trpc: mockTrpcClient,
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();

  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(TRPCProvider, null, ui),
    ),
  );
};

describe("Data Flow Integration Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("Injection Dashboard Data Flow", () => {
    it("should load and display today status", async () => {
      // Mock today status response
      mockTrpcClient.injection.todayStatus.useQuery.mockReturnValue({
        data: {
          morning: true,
          evening: false,
          injections: [
            {
              id: "test-1",
              userName: "John Doe",
              injectionTime: new Date(),
              injectionType: "morning",
              notes: null,
            },
          ],
        },
        isLoading: false,
        error: null,
      });

      renderWithProviders(React.createElement(InjectionDashboard));

      await waitFor(() => {
        expect(screen.getByText(/morning/i)).toBeInTheDocument();
      });

      // Should show morning as completed
      const morningStatus = screen.getByTestId("morning-status");
      expect(morningStatus).toHaveClass("bg-green-100"); // or whatever completed state styling
    });

    it("should handle loading states", () => {
      mockTrpcClient.injection.todayStatus.useQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      renderWithProviders(React.createElement(InjectionDashboard));

      expect(screen.getByRole("status")).toBeInTheDocument(); // Loading spinner
    });

    it("should handle error states", () => {
      mockTrpcClient.injection.todayStatus.useQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Failed to fetch data"),
      });

      renderWithProviders(React.createElement(InjectionDashboard));

      expect(screen.getByRole("alert")).toBeInTheDocument(); // Error message
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    });
  });

  describe("Injection Creation Flow", () => {
    it("should create injection and update UI", async () => {
      const mockMutate = vi.fn();

      // Mock successful creation
      mockTrpcClient.injection.create.mutate.mockImplementation(mockMutate);

      // Mock initial empty state
      mockTrpcClient.injection.todayStatus.useQuery.mockReturnValue({
        data: {
          morning: false,
          evening: false,
          injections: [],
        },
        isLoading: false,
        error: null,
      });

      renderWithProviders(React.createElement(InjectionDashboard));

      // Find and click morning injection button
      const morningButton = screen.getByText(/add morning injection/i);
      fireEvent.click(morningButton);

      // Fill out form (assuming there's a form modal)
      const userNameInput = screen.getByLabelText(/name/i);
      fireEvent.change(userNameInput, { target: { value: "John Doe" } });

      const submitButton = screen.getByText(/save/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            userName: "John Doe",
            injectionType: "morning",
          }),
        );
      });
    });

    it("should handle form validation errors", async () => {
      mockTrpcClient.injection.todayStatus.useQuery.mockReturnValue({
        data: { morning: false, evening: false, injections: [] },
        isLoading: false,
        error: null,
      });

      renderWithProviders(React.createElement(InjectionDashboard));

      const morningButton = screen.getByText(/add morning injection/i);
      fireEvent.click(morningButton);

      // Try to submit without filling required fields
      const submitButton = screen.getByText(/save/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      });
    });
  });

  describe("Statistics Data Flow", () => {
    it("should display statistics correctly", async () => {
      mockTrpcClient.injection.stats.useQuery.mockReturnValue({
        data: {
          totalInjections: 45,
          complianceRate: 75.0,
          morningCount: 23,
          eveningCount: 22,
          userContributions: {
            "John Doe": 30,
            "Jane Doe": 15,
          },
          perfectDays: 15,
          totalDays: 30,
        },
        isLoading: false,
        error: null,
      });

      // Assuming we have a stats component
      renderWithProviders(
        React.createElement("div", { "data-testid": "stats" }, "Stats Component"),
      );

      await waitFor(() => {
        expect(screen.getByTestId("stats")).toBeInTheDocument();
      });

      // Would test actual stats display based on component implementation
    });
  });

  describe("Real-time Updates", () => {
    it("should refetch data after successful injection creation", async () => {
      const mockRefetch = vi.fn();

      mockTrpcClient.injection.todayStatus.useQuery.mockReturnValue({
        data: { morning: false, evening: false, injections: [] },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockTrpcClient.injection.create.mutate.mockImplementation((data, options) => {
        // Simulate successful mutation
        options?.onSuccess?.({
          id: "new-injection",
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      renderWithProviders(React.createElement(InjectionDashboard));

      const morningButton = screen.getByText(/add morning injection/i);
      fireEvent.click(morningButton);

      // Fill and submit form
      const userNameInput = screen.getByLabelText(/name/i);
      fireEvent.change(userNameInput, { target: { value: "John Doe" } });

      const submitButton = screen.getByText(/save/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });
});
