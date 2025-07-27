"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";
import { defaultQueryOptions } from "@/lib/query-config";
import { trpc } from "./client";

/**
 * TRPC Provider with optimized React Query configuration
 *
 * Features:
 * - Unified query configuration from query-config
 * - HTTP batch link for efficient network requests
 * - SuperJSON transformer for Date/BigInt support
 * - Proper error handling and retry logic
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  // Create query client with optimized defaults
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: defaultQueryOptions,
      }),
  );

  // Create TRPC client with batch link
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${typeof window !== "undefined" ? window.location.origin : ""}/api/trpc`,
          transformer: superjson,
          // Add headers for better error handling
          headers() {
            return {
              "x-trpc-source": "injection-tracker",
            };
          },
          // Batch settings for performance
          maxBatchSize: 10,
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
