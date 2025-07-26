import type { Injection } from "@/types/injection";
import { INJECTION_TYPES } from "./constants";

export function validateInjectionData(data: unknown): data is Omit<Injection, "id"> {
	if (!data || typeof data !== "object") return false;

	const injection = data as Record<string, unknown>;

	// Required fields
	if (!injection.user_name || typeof injection.user_name !== "string") return false;
	if (!injection.injection_time || typeof injection.injection_time !== "string") return false;
	if (!injection.injection_type || typeof injection.injection_type !== "string") return false;

	// Validate injection type
	if (
		injection.injection_type !== INJECTION_TYPES.MORNING &&
		injection.injection_type !== INJECTION_TYPES.EVENING
	) {
		return false;
	}

	// Validate user name length
	if (injection.user_name.trim().length === 0 || injection.user_name.length > 100) {
		return false;
	}

	// Validate date format
	try {
		const date = new Date(injection.injection_time);
		if (Number.isNaN(date.getTime())) return false;
	} catch {
		return false;
	}

	// Optional notes validation
	if (injection.notes !== undefined && injection.notes !== null) {
		if (typeof injection.notes !== "string" || injection.notes.length > 500) {
			return false;
		}
	}

	return true;
}

export function sanitizeUserName(name: string): string {
	return name.trim().slice(0, 100);
}

export function sanitizeNotes(notes: string | null | undefined): string | null {
	if (!notes) return null;
	return notes.trim().slice(0, 500);
}
