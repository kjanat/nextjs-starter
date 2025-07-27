/**
 * Custom error classes for better error handling and debugging
 */

/**
 * Base error class for all application errors
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;

  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database-related errors
 */
export class DatabaseError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = true;

  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "DatabaseError";
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly errors?: Record<string, string[]>,
    cause?: unknown,
  ) {
    super(message, cause);
    this.name = "ValidationError";
  }
}

/**
 * Not found errors
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(
    public readonly resource: string,
    public readonly identifier?: string | number,
    cause?: unknown,
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, cause);
    this.name = "NotFoundError";
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly isOperational = true;

  constructor(
    public readonly retryAfter: number,
    message = "Too many requests",
    cause?: unknown,
  ) {
    super(message, cause);
    this.name = "RateLimitError";
  }
}

/**
 * Authorization errors
 */
export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly isOperational = true;

  constructor(message = "Unauthorized", cause?: unknown) {
    super(message, cause);
    this.name = "UnauthorizedError";
  }
}

/**
 * Helper function to determine if an error is operational
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Helper function to get error details safely
 */
export function getErrorDetails(error: unknown): {
  message: string;
  statusCode: number;
  details?: unknown;
} {
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      details: error.cause,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: 500,
      details: error.stack,
    };
  }

  return {
    message: "An unexpected error occurred",
    statusCode: 500,
    details: error,
  };
}
