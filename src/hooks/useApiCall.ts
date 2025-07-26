import { useCallback, useEffect, useState } from "react";

interface UseApiCallOptions<T> {
	url: string;
	method?: "GET" | "POST" | "PUT" | "DELETE";
	body?: unknown;
	onSuccess?: (data: T) => void;
	onError?: (error: Error) => void;
	autoFetch?: boolean;
}

interface UseApiCallResult<T> {
	data: T | null;
	loading: boolean;
	error: Error | null;
	execute: () => Promise<void>;
	reset: () => void;
}

export function useApiCall<T>({
	url,
	method = "GET",
	body,
	onSuccess,
	onError,
	autoFetch = true,
}: UseApiCallOptions<T>): UseApiCallResult<T> {
	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(autoFetch);
	const [error, setError] = useState<Error | null>(null);

	const execute = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const options: RequestInit = {
				method,
				headers: {
					"Content-Type": "application/json",
				},
			};

			if (body && method !== "GET") {
				options.body = JSON.stringify(body);
			}

			const response = await fetch(url, options);

			if (!response.ok) {
				throw new Error(`Request failed: ${response.statusText}`);
			}

			const result = (await response.json()) as T;
			setData(result);
			onSuccess?.(result);
		} catch (err) {
			const error = err instanceof Error ? err : new Error("Unknown error occurred");
			setError(error);
			onError?.(error);
		} finally {
			setLoading(false);
		}
	}, [url, method, body, onSuccess, onError]);

	const reset = useCallback(() => {
		setData(null);
		setError(null);
		setLoading(false);
	}, []);

	useEffect(() => {
		if (autoFetch && method === "GET") {
			execute();
		}
	}, [autoFetch, method, execute]);

	return { data, loading, error, execute, reset };
}
