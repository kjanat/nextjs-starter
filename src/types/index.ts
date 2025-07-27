/**
 * Central type exports for the application
 */

// Re-export database types
export type {
  Injection as DBInjection,
  NewInjection as DBNewInjection,
} from "@/db/schema";
// Re-export error types
export type {
  AppError,
  DatabaseError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
// Re-export API types
export type {
  ApiError,
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponse,
} from "./api";
// Re-export injection types
export type {
  Injection,
  InjectionFilters,
  InjectionStats,
  InjectionType,
  NewInjection,
  TodayStatus,
} from "./injection";

// Define common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type NullableOptional<T> = T | null | undefined;

export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> = T extends (
  ...args: unknown[]
) => Promise<infer R>
  ? R
  : never;

export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
