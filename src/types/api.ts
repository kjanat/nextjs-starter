import type { Injection } from "./injection";

// API Response types
export interface ApiResponse<T> {
	data?: T;
	error?: string;
	success: boolean;
}

export interface InjectionsResponse {
	injections: Injection[];
}

export interface TodayStatusResponse {
	date: string;
	morningDone: boolean;
	eveningDone: boolean;
	morningDetails: Injection | null;
	eveningDetails: Injection | null;
	allComplete: boolean;
}

export interface StatsResponse {
	totalInjections: number;
	morningInjections: number;
	eveningInjections: number;
	missedDoses: number;
	userStats: Record<string, number>;
	lastWeekCompliance: number;
}

export interface CreateInjectionResponse {
	success: boolean;
	id: number;
}

// API Error type
export class ApiError extends Error {
	constructor(
		message: string,
		public status?: number,
		public code?: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}
