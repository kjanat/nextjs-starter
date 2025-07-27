import type { Injection, InjectionStats, NewInjection } from "./injection";

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  error?: never;
};

export type ApiErrorResponse = {
  success: false;
  data?: never;
  error: {
    message: string;
    code?: string;
    status?: number;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface InjectionsResponse {
  injections: readonly Injection[];
  total: number;
}

export interface TodayStatusResponse {
  date: string;
  morningDone: boolean;
  eveningDone: boolean;
  morningDetails: Injection | null;
  eveningDetails: Injection | null;
  allComplete: boolean;
}

export type StatsResponse = InjectionStats;

export type CreateInjectionRequest = NewInjection;

export interface CreateInjectionResponse {
  id: number;
  injection: Injection;
}

export const API_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  SERVER_ERROR: "SERVER_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode | string;

  constructor(
    message: string,
    status = 500,
    code: ApiErrorCode | string = API_ERROR_CODES.SERVER_ERROR,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  toJSON() {
    return {
      message: this.message,
      status: this.status,
      code: this.code,
    };
  }
}
