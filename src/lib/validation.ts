import { APP_CONFIG } from "@/lib/constants";
import { INJECTION_TYPE, type Injection } from "@/types/injection";

export function validateInjectionData(data: unknown): data is Omit<Injection, "id"> {
	if (!data || typeof data !== "object") return false;

	const injection = data as Record<string, unknown>;

	// Required fields
	if (!injection.user_name || typeof injection.user_name !== "string") return false;
	if (!injection.injection_time || typeof injection.injection_time !== "string") return false;
	if (!injection.injection_type || typeof injection.injection_type !== "string") return false;

	// Validate injection type
	if (
		injection.injection_type !== INJECTION_TYPE.MORNING &&
		injection.injection_type !== INJECTION_TYPE.EVENING
	) {
		return false;
	}

	// Validate user name length
	if (
		injection.user_name.trim().length === 0 ||
		injection.user_name.length > APP_CONFIG.MAX_NAME_LENGTH
	) {
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
		if (
			typeof injection.notes !== "string" ||
			injection.notes.length > APP_CONFIG.MAX_NOTES_LENGTH
		) {
			return false;
		}
	}

	return true;
}

// HTML entity encoding to prevent XSS
function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
		"/": "&#x2F;",
	};
	return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

export function sanitizeUserName(name: string): string {
	// Remove dangerous characters and escape HTML
	const cleaned = name.replace(/[^\w\s-]/gi, "").trim();
	return escapeHtml(cleaned).slice(0, APP_CONFIG.MAX_NAME_LENGTH);
}

export function sanitizeNotes(notes: string | null | undefined): string | null {
	if (!notes) return null;
	// Allow more characters in notes but still escape HTML
	const cleaned = notes.trim();
	return escapeHtml(cleaned).slice(0, APP_CONFIG.MAX_NOTES_LENGTH);
}
