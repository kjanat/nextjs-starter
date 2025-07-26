import type { NextRequest } from "next/server";
import {
	createPaginationMetadata,
	createSuccessResponse,
	getPaginationParams,
	parseRequestBody,
	withErrorHandler,
} from "@/lib/api-helpers";
import { ERROR_MESSAGES } from "@/lib/constants";
import { apiRateLimiter, injectionRateLimiter } from "@/lib/rate-limit";
import { sanitizeQueryParam } from "@/lib/validation";
import { InjectionService } from "@/services/injection-service";
import type { CreateInjectionResponse, InjectionsResponse } from "@/types/api";
import { API_ERROR_CODES, ApiError } from "@/types/api";

export const GET = withErrorHandler(async (request: NextRequest) => {
	// Check rate limit
	if (!(await apiRateLimiter.isAllowed(request))) {
		throw new ApiError(ERROR_MESSAGES.RATE_LIMIT, 429, API_ERROR_CODES.RATE_LIMIT_EXCEEDED);
	}

	const url = new URL(request.url);
	const { page, perPage } = getPaginationParams(url);

	// Extract and sanitize filters
	const filters = {
		date: sanitizeQueryParam(url.searchParams.get("date") || undefined, 10), // YYYY-MM-DD
		userName: sanitizeQueryParam(url.searchParams.get("userName") || undefined, 50),
		type: sanitizeQueryParam(url.searchParams.get("type") || undefined, 10),
	};

	// Fetch injections with pagination
	const { injections, total } = await InjectionService.getInjections(filters, page, perPage);

	// Create response with pagination metadata
	const response: InjectionsResponse & { pagination: ReturnType<typeof createPaginationMetadata> } =
		{
			injections,
			total,
			pagination: createPaginationMetadata({ page, perPage, total }),
		};

	return createSuccessResponse(response);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
	// Check rate limit for injection creation
	if (!(await injectionRateLimiter.isAllowed(request))) {
		throw new ApiError(ERROR_MESSAGES.RATE_LIMIT, 429, API_ERROR_CODES.RATE_LIMIT_EXCEEDED);
	}

	// Parse request body
	const data = await parseRequestBody(request);

	// Create injection
	const injection = await InjectionService.createInjection(data);

	// Create response
	const response: CreateInjectionResponse = {
		id: injection.id,
		injection,
	};

	return createSuccessResponse(response, 201);
});
