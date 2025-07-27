import type { NextRequest } from "next/server";
import { ERROR_MESSAGES } from "@/lib/constants";
import { validatePaginationParams } from "@/lib/pagination";
import { API_ERROR_CODES, ApiError, type ApiErrorCode, type ApiResponse } from "@/types/api";

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(data: T, status = 200): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  return Response.json(response, { status });
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  message: string,
  status = 500,
  code?: ApiErrorCode | string,
): Response {
  const response: ApiResponse<never> = {
    success: false,
    error: {
      message,
      status,
      code: code || API_ERROR_CODES.SERVER_ERROR,
    },
  };
  return Response.json(response, { status });
}

/**
 * Wraps an API handler with error handling
 */
export function withErrorHandler<T extends (request: NextRequest) => Promise<Response>>(
  handler: T,
): T {
  return (async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (error) {
      console.error("API Error:", error);

      if (error instanceof ApiError) {
        return createErrorResponse(error.message, error.status, error.code);
      }

      if (error instanceof Error) {
        return createErrorResponse(error.message);
      }

      return createErrorResponse(ERROR_MESSAGES.GENERIC);
    }
  }) as T;
}

/**
 * Validates request method
 */
export function validateMethod(request: NextRequest, allowedMethods: string[]): void {
  if (!allowedMethods.includes(request.method)) {
    throw new ApiError(
      `Method ${request.method} not allowed`,
      405,
      API_ERROR_CODES.VALIDATION_ERROR,
    );
  }
}

/**
 * Safely parses JSON from request body
 */
export async function parseRequestBody<T>(request: NextRequest): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new ApiError("Invalid JSON in request body", 400, API_ERROR_CODES.VALIDATION_ERROR);
  }
}

/**
 * Creates pagination metadata
 */
export interface PaginationParams {
  page: number;
  perPage: number;
  total: number;
}

export interface PaginationMetadata {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function createPaginationMetadata(params: PaginationParams): PaginationMetadata {
  const totalPages = Math.ceil(params.total / params.perPage);
  return {
    page: params.page,
    perPage: params.perPage,
    total: params.total,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1,
  };
}

/**
 * Extracts and validates pagination parameters from URL
 */
export function getPaginationParams(url: URL): { page: number; perPage: number } {
  const pageParam = url.searchParams.get("page");
  const perPageParam = url.searchParams.get("perPage");
  return validatePaginationParams(pageParam, perPageParam);
}
