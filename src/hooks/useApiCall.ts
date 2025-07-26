import { useCallback, useEffect, useReducer, useRef } from "react";
import { ApiError, type ApiResponse } from "@/types/api";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface UseApiCallOptions<TRequest = unknown> {
	method?: HttpMethod;
	body?: TRequest;
	headers?: HeadersInit;
	autoFetch?: boolean;
	retryCount?: number;
	retryDelay?: number;
	timeout?: number;
}

interface ApiCallState<TResponse> {
	data: TResponse | null;
	loading: boolean;
	error: ApiError | null;
	retryAttempts: number;
}

type ApiCallAction<TResponse> =
	| { type: "FETCH_START" }
	| { type: "FETCH_SUCCESS"; payload: TResponse }
	| { type: "FETCH_ERROR"; payload: ApiError }
	| { type: "RETRY" }
	| { type: "RESET" };

function apiCallReducer<TResponse>(
	state: ApiCallState<TResponse>,
	action: ApiCallAction<TResponse>,
): ApiCallState<TResponse> {
	switch (action.type) {
		case "FETCH_START":
			return { ...state, loading: true, error: null };
		case "FETCH_SUCCESS":
			return { data: action.payload, loading: false, error: null, retryAttempts: 0 };
		case "FETCH_ERROR":
			return { ...state, loading: false, error: action.payload };
		case "RETRY":
			return { ...state, retryAttempts: state.retryAttempts + 1 };
		case "RESET":
			return { data: null, loading: false, error: null, retryAttempts: 0 };
		default:
			return state;
	}
}

export function useApiCall<TResponse, TRequest = unknown>(
	url: string,
	options: UseApiCallOptions<TRequest> = {},
) {
	const {
		method = "GET",
		body,
		headers = {},
		autoFetch = false,
		retryCount = 0,
		retryDelay = 1000,
		timeout = 30000,
	} = options;

	const [state, dispatch] = useReducer(apiCallReducer<TResponse>, {
		data: null,
		loading: autoFetch && method === "GET",
		error: null,
		retryAttempts: 0,
	});

	const abortControllerRef = useRef<AbortController | null>(null);
	const isMountedRef = useRef(true);

	const execute = useCallback(
		async (overrideBody?: TRequest): Promise<TResponse | null> => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}

			abortControllerRef.current = new AbortController();
			const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), timeout);

			dispatch({ type: "FETCH_START" });

			try {
				const requestOptions: RequestInit = {
					method,
					headers: {
						"Content-Type": "application/json",
						...headers,
					},
					signal: abortControllerRef.current.signal,
				};

				const requestBody = overrideBody ?? body;
				if (requestBody && method !== "GET") {
					requestOptions.body = JSON.stringify(requestBody);
				}

				const response = await fetch(url, requestOptions);
				const responseData = await response.json();

				if (!response.ok) {
					const errorData = responseData as ApiResponse<never>;
					if (!errorData.success && errorData.error) {
						throw new ApiError(
							errorData.error.message,
							errorData.error.status ?? response.status,
							errorData.error.code,
						);
					}
					throw new ApiError(`Request failed: ${response.statusText}`, response.status);
				}

				const apiResponse = responseData as ApiResponse<TResponse>;
				if (!apiResponse.success) {
					throw new ApiError(
						apiResponse.error?.message ?? "Unknown error",
						apiResponse.error?.status,
						apiResponse.error?.code,
					);
				}

				if (isMountedRef.current) {
					dispatch({ type: "FETCH_SUCCESS", payload: apiResponse.data });
				}

				clearTimeout(timeoutId);
				return apiResponse.data;
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					return null;
				}

				const apiError =
					error instanceof ApiError
						? error
						: new ApiError(error instanceof Error ? error.message : "Unknown error occurred");

				if (isMountedRef.current) {
					if (state.retryAttempts < retryCount) {
						dispatch({ type: "RETRY" });
						setTimeout(() => execute(overrideBody), retryDelay * (state.retryAttempts + 1));
					} else {
						dispatch({ type: "FETCH_ERROR", payload: apiError });
					}
				}

				clearTimeout(timeoutId);
				return null;
			}
		},
		[url, method, body, headers, timeout, retryCount, retryDelay, state.retryAttempts],
	);

	const reset = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
		dispatch({ type: "RESET" });
	}, []);

	useEffect(() => {
		isMountedRef.current = true;

		if (autoFetch && method === "GET") {
			execute();
		}

		return () => {
			isMountedRef.current = false;
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, [autoFetch, execute, method]);

	return {
		data: state.data,
		loading: state.loading,
		error: state.error,
		execute,
		reset,
		retryAttempts: state.retryAttempts,
	};
}
