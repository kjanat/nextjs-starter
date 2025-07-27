"use client";

import { invalidateQueries, REFETCH_INTERVALS, STALE_TIMES } from "@/lib/query-config";
import { trpc } from "@/trpc/client";

/**
 * Hook to fetch injection list with proper caching
 *
 * @param date - Optional date filter
 * @param userName - Optional user name filter
 */
export function useInjections(date?: string, userName?: string) {
  return trpc.injection.list.useQuery(
    { date, userName },
    {
      staleTime: STALE_TIMES.injectionList,
      refetchInterval: REFETCH_INTERVALS.disabled,
    },
  );
}

/**
 * Hook to fetch today's injection status
 *
 * This is used on the dashboard and refetches periodically
 * to show real-time status updates
 *
 * @param userName - Optional user name filter
 */
export function useTodayStatus(userName?: string) {
  return trpc.injection.todayStatus.useQuery(
    { userName },
    {
      staleTime: STALE_TIMES.todayStatus,
      refetchInterval: REFETCH_INTERVALS.todayStatus,
    },
  );
}

/**
 * Hook to fetch injection statistics
 *
 * Note: Consider using the Server Component version on the stats page
 * for better performance and caching
 */
export function useStats() {
  return trpc.injection.stats.useQuery(undefined, {
    staleTime: STALE_TIMES.stats,
    refetchInterval: REFETCH_INTERVALS.disabled,
  });
}

/**
 * Hook to create a new injection with smart invalidation
 *
 * Automatically invalidates related queries after successful creation
 */
export function useCreateInjection() {
  const utils = trpc.useUtils();

  return trpc.injection.create.useMutation({
    onSuccess: (data, variables) => {
      // Invalidate queries with smart targeting

      // Always invalidate today's status for the user who created the injection
      utils.injection.todayStatus.invalidate({ userName: variables.userName });

      // Invalidate stats since they aggregate all data
      utils.injection.stats.invalidate();

      // Only invalidate list queries that would include this injection
      // This prevents unnecessary refetches of unrelated date ranges
      const injectionDate = new Date(variables.injectionTime);
      const dateString = injectionDate.toISOString().split("T")[0];

      // Invalidate queries for the specific date
      utils.injection.list.invalidate({ date: dateString });

      // Invalidate queries for the specific user
      utils.injection.list.invalidate({ userName: variables.userName });

      // Invalidate unfiltered queries
      utils.injection.list.invalidate({});
    },
    onError: (error) => {
      console.error("Failed to create injection:", error);
    },
  });
}
