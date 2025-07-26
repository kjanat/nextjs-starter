export const INJECTION_TYPES = {
	MORNING: "morning",
	EVENING: "evening",
} as const;

export const INJECTION_TARGETS = {
	MORNING: "~8:00 AM",
	EVENING: "~6:00 PM",
} as const;

export const REFRESH_INTERVAL = 30000; // 30 seconds

export const COMPLIANCE_DAYS = 7;
export const DOSES_PER_DAY = 2;
