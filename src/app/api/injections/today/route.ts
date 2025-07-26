import type { NextRequest } from "next/server";
import { createSuccessResponse, withErrorHandler } from "@/lib/api-helpers";
import { ERROR_MESSAGES } from "@/lib/constants";
import { apiRateLimiter } from "@/lib/rate-limit";
import { InjectionService } from "@/services/injection-service";
import type { TodayStatusResponse } from "@/types/api";
import { API_ERROR_CODES, ApiError } from "@/types/api";

export const GET = withErrorHandler(async (request: NextRequest) => {
	// Check rate limit
	if (!(await apiRateLimiter.isAllowed(request))) {
		throw new ApiError(ERROR_MESSAGES.RATE_LIMIT, 429, API_ERROR_CODES.RATE_LIMIT_EXCEEDED);
	}

	// Get today's status
	const todayStatus = await InjectionService.getTodayStatus();

	return createSuccessResponse<TodayStatusResponse>(todayStatus);
});
