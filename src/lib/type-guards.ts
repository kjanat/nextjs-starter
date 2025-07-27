import type {
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponse,
  CreateInjectionRequest,
  CreateInjectionResponse,
  InjectionsResponse,
  StatsResponse,
  TodayStatusResponse,
} from "@/types/api";
import type { Injection, InjectionType, NewInjection } from "@/types/injection";
import { INJECTION_TYPE } from "@/types/injection";

/**
 * Type guard to check if a response is successful
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if a response is an error
 */
export function isApiError<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Type guard to check if a value is a valid injection type
 */
export function isValidInjectionType(value: unknown): value is InjectionType {
  return value === INJECTION_TYPE.MORNING || value === INJECTION_TYPE.EVENING;
}

/**
 * Type guard to check if an object is a valid Injection
 */
export function isInjection(obj: unknown): obj is Injection {
  if (!obj || typeof obj !== "object") return false;

  const injection = obj as Record<string, unknown>;

  return (
    typeof injection.id === "string" &&
    typeof injection.userName === "string" &&
    injection.injectionTime instanceof Date &&
    isValidInjectionType(injection.injectionType) &&
    (injection.notes === undefined ||
      injection.notes === null ||
      typeof injection.notes === "string") &&
    injection.createdAt instanceof Date &&
    injection.updatedAt instanceof Date
  );
}

/**
 * Type guard to check if an object is a valid NewInjection
 */
export function isNewInjection(obj: unknown): obj is NewInjection {
  if (!obj || typeof obj !== "object") return false;

  const injection = obj as Record<string, unknown>;

  return (
    (injection.id === undefined || typeof injection.id === "string") &&
    typeof injection.userName === "string" &&
    injection.injectionTime instanceof Date &&
    isValidInjectionType(injection.injectionType) &&
    (injection.notes === undefined ||
      injection.notes === null ||
      typeof injection.notes === "string")
  );
}

/**
 * Type guard to check if an object is a valid InjectionsResponse
 */
export function isInjectionsResponse(obj: unknown): obj is InjectionsResponse {
  if (!obj || typeof obj !== "object") return false;

  const response = obj as Record<string, unknown>;

  return (
    Array.isArray(response.injections) &&
    response.injections.every(isInjection) &&
    typeof response.total === "number"
  );
}

/**
 * Type guard to check if an object is a valid TodayStatusResponse
 */
export function isTodayStatusResponse(obj: unknown): obj is TodayStatusResponse {
  if (!obj || typeof obj !== "object") return false;

  const response = obj as Record<string, unknown>;

  return (
    typeof response.date === "string" &&
    typeof response.morningDone === "boolean" &&
    typeof response.eveningDone === "boolean" &&
    (response.morningDetails === null || isInjection(response.morningDetails)) &&
    (response.eveningDetails === null || isInjection(response.eveningDetails)) &&
    typeof response.allComplete === "boolean"
  );
}

/**
 * Type guard to check if an object is a valid StatsResponse
 */
export function isStatsResponse(obj: unknown): obj is StatsResponse {
  if (!obj || typeof obj !== "object") return false;

  const response = obj as Record<string, unknown>;

  return (
    typeof response.totalInjections === "number" &&
    typeof response.morningInjections === "number" &&
    typeof response.eveningInjections === "number" &&
    typeof response.missedDoses === "number" &&
    typeof response.lastWeekCompliance === "number" &&
    response.userStats !== null &&
    typeof response.userStats === "object" &&
    Object.values(response.userStats).every((v) => typeof v === "number")
  );
}

/**
 * Type guard to check if an object is a valid CreateInjectionRequest
 */
export function isCreateInjectionRequest(obj: unknown): obj is CreateInjectionRequest {
  return isNewInjection(obj);
}

/**
 * Type guard to check if an object is a valid CreateInjectionResponse
 */
export function isCreateInjectionResponse(obj: unknown): obj is CreateInjectionResponse {
  if (!obj || typeof obj !== "object") return false;

  const response = obj as Record<string, unknown>;

  return typeof response.id === "number" && isInjection(response.injection);
}

/**
 * Safely parse JSON with type checking
 */
export function safeJsonParse<T>(
  json: string,
  typeGuard: (value: unknown) => value is T,
): T | null {
  try {
    const parsed = JSON.parse(json);
    return typeGuard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Assert a condition and throw with a custom message if false
 */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Assert that a value is not null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = "Value is null or undefined",
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

/**
 * Type-safe object keys
 */
export function objectKeys<T extends object>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}

/**
 * Type-safe object entries
 */
export function objectEntries<T extends object>(obj: T): Array<[keyof T, T[keyof T]]> {
  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
}

/**
 * Type-safe object from entries
 */
export function objectFromEntries<K extends PropertyKey, V>(entries: Array<[K, V]>): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}

/**
 * Exhaustive check for discriminated unions
 */
export function exhaustiveCheck(value: never): never {
  throw new Error(`Unhandled value: ${value}`);
}
