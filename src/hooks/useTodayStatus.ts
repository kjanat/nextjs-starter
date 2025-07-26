import { useCallback, useEffect, useState } from "react";
import { APP_CONFIG } from "@/lib/constants";
import type { TodayStatusResponse } from "@/types/api";

export function useTodayStatus() {
	const [todayStatus, setTodayStatus] = useState<TodayStatusResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchTodayStatus = useCallback(async () => {
		try {
			setError(null);
			const response = await fetch("/api/injections/today");

			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.statusText}`);
			}

			const data = (await response.json()) as TodayStatusResponse;
			setTodayStatus(data);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to fetch today status";
			console.error("Failed to fetch today status:", err);
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchTodayStatus();
		const interval = setInterval(fetchTodayStatus, APP_CONFIG.REFRESH_INTERVAL);
		return () => clearInterval(interval);
	}, [fetchTodayStatus]);

	return { todayStatus, loading, error, refetch: fetchTodayStatus };
}
