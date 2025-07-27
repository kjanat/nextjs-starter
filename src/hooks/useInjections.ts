"use client";

import { trpc } from "@/trpc/client";

export function useInjections(date?: string, userName?: string) {
  return trpc.injection.list.useQuery({ date, userName });
}

export function useTodayStatus(userName?: string) {
  return trpc.injection.todayStatus.useQuery({ userName });
}

export function useStats() {
  return trpc.injection.stats.useQuery();
}

export function useCreateInjection() {
  const utils = trpc.useUtils();

  return trpc.injection.create.useMutation({
    onSuccess: () => {
      // Invalidate relevant queries after creating an injection
      utils.injection.list.invalidate();
      utils.injection.todayStatus.invalidate();
      utils.injection.stats.invalidate();
    },
  });
}
