import { useCallback, useEffect, useState } from "react";
import { REFRESH_INTERVAL } from "@/lib/constants";
import type { Injection } from "@/types/injection";

interface TodayStatus {
	date: string;
	morningDone: boolean;
	eveningDone: boolean;
	morningDetails: Injection | null;
	eveningDetails: Injection | null;
	allComplete: boolean;
}

export function useTodayStatus() {
	const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchTodayStatus = useCallback(async () => {
		try {
			setError(null);
			const response = await fetch("/api/injections/today");

			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.statusText}`);
			}

			const data = (await response.json()) as TodayStatus;
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
		const interval = setInterval(fetchTodayStatus, REFRESH_INTERVAL);
		return () => clearInterval(interval);
	}, [fetchTodayStatus]);

	return { todayStatus, loading, error, refetch: fetchTodayStatus };
}
