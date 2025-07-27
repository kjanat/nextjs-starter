/**
 * Unified query configuration for React Query and tRPC
 *
 * This module provides centralized query configuration including:
 * - Query keys for data deduplication
 * - Stale times for cache management
 * - Refetch intervals for real-time updates
 * - Error retry logic
 */

/**
 * Query key factory for consistent key generation
 *
 * Usage:
 * - queryKeys.all: All queries in the app
 * - queryKeys.injections.all: All injection queries
 * - queryKeys.injections.list(filters): Specific injection list
 * - queryKeys.injections.detail(id): Specific injection
 * - queryKeys.injections.stats(): Statistics query
 * - queryKeys.injections.todayStatus(userName): Today's status
 */
export const queryKeys = {
  all: ["injections"] as const,
  injections: {
    all: ["injections"] as const,
    lists: () => [...queryKeys.injections.all, "list"] as const,
    list: (filters?: { date?: string; userName?: string }) =>
      [...queryKeys.injections.lists(), filters] as const,
    details: () => [...queryKeys.injections.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.injections.details(), id] as const,
    stats: () => [...queryKeys.injections.all, "stats"] as const,
    todayStatus: (userName?: string) =>
      [...queryKeys.injections.all, "todayStatus", userName] as const,
  },
  inventory: {
    all: ["inventory"] as const,
    lists: () => [...queryKeys.inventory.all, "list"] as const,
    list: (filters?: { insulinType?: string }) =>
      [...queryKeys.inventory.lists(), filters] as const,
    current: () => [...queryKeys.inventory.all, "current"] as const,
    history: () => [...queryKeys.inventory.all, "history"] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    patterns: (days?: number) => [...queryKeys.analytics.all, "patterns", days] as const,
    predictions: () => [...queryKeys.analytics.all, "predictions"] as const,
    trends: (range?: string) => [...queryKeys.analytics.all, "trends", range] as const,
  },
} as const;

/**
 * Query stale times in milliseconds
 *
 * These determine how long data is considered fresh before
 * React Query will refetch in the background
 */
export const STALE_TIMES = {
  // User-specific data that changes frequently
  todayStatus: 30 * 1000, // 30 seconds
  injectionList: 60 * 1000, // 1 minute

  // Aggregate data that changes less frequently
  stats: 5 * 60 * 1000, // 5 minutes
  analytics: 10 * 60 * 1000, // 10 minutes
  inventory: 5 * 60 * 1000, // 5 minutes

  // Static or rarely changing data
  userPreferences: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Cache times in milliseconds
 *
 * These determine how long data stays in the cache
 * before being garbage collected
 */
export const CACHE_TIMES = {
  default: 5 * 60 * 1000, // 5 minutes
  long: 30 * 60 * 1000, // 30 minutes
  infinite: Number.POSITIVE_INFINITY,
} as const;

/**
 * Refetch intervals for real-time features
 */
export const REFETCH_INTERVALS = {
  // Only refetch today's status on the dashboard
  todayStatus: 60 * 1000, // 1 minute
  // No automatic refetch for other queries
  disabled: false as const,
} as const;

/**
 * Default query client options
 *
 * These provide sensible defaults for all queries
 * and can be overridden on a per-query basis
 */
export const defaultQueryOptions = {
  queries: {
    // How long before data is considered stale
    staleTime: STALE_TIMES.injectionList,

    // How long to keep data in cache
    cacheTime: CACHE_TIMES.default,

    // Retry failed requests with exponential backoff
    retry: (failureCount: number, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.data?.httpStatus >= 400 && error?.data?.httpStatus < 500) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },

    // Retry delay with exponential backoff
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch on window focus for fresh data
    refetchOnWindowFocus: true,

    // Don't refetch on reconnect by default
    refetchOnReconnect: false,
  },
  mutations: {
    // Retry mutations once on failure
    retry: 1,

    // Retry delay for mutations
    retryDelay: 1000,
  },
} as const;

/**
 * Query invalidation helpers
 *
 * Use these to invalidate related queries after mutations
 */
export const invalidateQueries = {
  // Invalidate all injection-related queries
  allInjections: () => queryKeys.injections.all,

  // Invalidate specific injection queries
  injectionStats: () => queryKeys.injections.stats(),
  todayStatus: (userName?: string) => queryKeys.injections.todayStatus(userName),
  injectionList: (filters?: { date?: string; userName?: string }) =>
    queryKeys.injections.list(filters),

  // Invalidate inventory queries
  allInventory: () => queryKeys.inventory.all,
  currentInventory: () => queryKeys.inventory.current(),

  // Invalidate analytics
  allAnalytics: () => queryKeys.analytics.all,
} as const;
