/**
 * Injection-specific validation functions
 * These supplement the validation done by Drizzle ORM
 */

import { INJECTION_TYPE } from "@/types/injection";

export const INJECTION_LIMITS = {
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 50,
  MAX_NOTES_LENGTH: 500,
} as const;

/**
 * Validate injection type
 */
export function isValidInjectionType(type: unknown): type is string {
  return type === INJECTION_TYPE.MORNING || type === INJECTION_TYPE.EVENING;
}

/**
 * Validate user name
 */
export function isValidUserName(name: unknown): boolean {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  return (
    trimmed.length >= INJECTION_LIMITS.MIN_NAME_LENGTH &&
    trimmed.length <= INJECTION_LIMITS.MAX_NAME_LENGTH &&
    /^[a-zA-Z0-9\s\-']+$/.test(trimmed)
  );
}

/**
 * Validate notes
 */
export function isValidNotes(notes: unknown): boolean {
  if (notes === null || notes === undefined) return true;
  if (typeof notes !== "string") return false;
  return notes.length <= INJECTION_LIMITS.MAX_NOTES_LENGTH;
}

/**
 * Sanitize user name
 */
export function sanitizeUserName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Sanitize notes
 */
export function sanitizeNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  return notes.trim().replace(/\s+/g, " ");
}
