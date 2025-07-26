import { useEffect } from "react";
import { useApiCall } from "@/hooks/useApiCall";
import { APP_CONFIG } from "@/lib/constants";
import type { TodayStatusResponse } from "@/types/api";

export function useTodayStatus() {
	const { data, loading, error, execute } = useApiCall<TodayStatusResponse>(
		"/api/injections/today",
		{
			autoFetch: true,
			retryCount: 2,
			retryDelay: 1000,
		},
	);

	useEffect(() => {
		const interval = setInterval(() => {
			execute();
		}, APP_CONFIG.REFRESH_INTERVAL);

		return () => clearInterval(interval);
	}, [execute]);

	return {
		todayStatus: data,
		loading,
		error: error ? error.message : null,
		refetch: execute,
	};
}
