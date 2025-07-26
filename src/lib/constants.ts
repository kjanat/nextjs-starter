export const INJECTION_TARGETS = {
	MORNING: "~8:00 AM",
	EVENING: "~6:00 PM",
} as const;

export const APP_CONFIG = {
	REFRESH_INTERVAL: 30_000,
	COMPLIANCE_DAYS: 7,
	DOSES_PER_DAY: 2,
	MAX_NAME_LENGTH: 50,
	MAX_NOTES_LENGTH: 500,
	DATE_FORMAT: "YYYY-MM-DD",
	TIME_FORMAT: "h:mm A",
} as const;

export const UI_CONSTANTS = {
	ANIMATION_DURATION: 200,
	DEBOUNCE_DELAY: 300,
	TOAST_DURATION: 5000,
} as const;

export const ERROR_MESSAGES = {
	GENERIC: "Something went wrong. Please try again.",
	NETWORK: "Network error. Please check your connection.",
	VALIDATION: "Please check your input and try again.",
	UNAUTHORIZED: "You are not authorized to perform this action.",
	RATE_LIMIT: "Too many requests. Please try again later.",
} as const;

export const ROUTES = {
	HOME: "/",
	HISTORY: "/history",
	STATS: "/stats",
} as const;
