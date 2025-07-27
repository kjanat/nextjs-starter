import { APP_CONFIG } from "@/lib/constants";
import { INJECTION_TYPE, type Injection } from "@/types/injection";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Validation patterns
const PATTERNS = {
  // Alphanumeric with spaces, hyphens, and apostrophes (for names)
  NAME: /^[a-zA-Z0-9\s\-']+$/,
  // Basic email pattern
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Phone pattern (basic international format)
  PHONE: /^\+?[\d\s\-()]+$/,
  // URL pattern
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/,
  // ISO date format
  ISO_DATE: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  // Dangerous patterns to block
  SCRIPT_TAG: /<script[^>]*>|<\/script>/i,
  SQL_INJECTION: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)|(-{2})|\/\*/i,
  XSS_PATTERN: /(javascript:|onerror=|onclick=|onload=|<iframe|<embed|<object)/i,
} as const;

// Character limits
const LIMITS = {
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: APP_CONFIG.MAX_NAME_LENGTH,
  MIN_NOTES_LENGTH: 0,
  MAX_NOTES_LENGTH: APP_CONFIG.MAX_NOTES_LENGTH,
  MAX_URL_LENGTH: 2048,
  MAX_EMAIL_LENGTH: 254,
} as const;

/**
 * Base validator functions
 */
export const validators = {
  required: (value: unknown, fieldName: string): ValidationError | null => {
    if (value === null || value === undefined || value === "") {
      return { field: fieldName, message: `${fieldName} is required` };
    }
    return null;
  },

  string: (value: unknown, fieldName: string): ValidationError | null => {
    if (typeof value !== "string") {
      return { field: fieldName, message: `${fieldName} must be a string` };
    }
    return null;
  },

  number: (value: unknown, fieldName: string): ValidationError | null => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return { field: fieldName, message: `${fieldName} must be a valid number` };
    }
    return null;
  },

  minLength: (value: string, min: number, fieldName: string): ValidationError | null => {
    if (value.length < min) {
      return { field: fieldName, message: `${fieldName} must be at least ${min} characters` };
    }
    return null;
  },

  maxLength: (value: string, max: number, fieldName: string): ValidationError | null => {
    if (value.length > max) {
      return { field: fieldName, message: `${fieldName} must be less than ${max} characters` };
    }
    return null;
  },

  pattern: (
    value: string,
    pattern: RegExp,
    fieldName: string,
    message?: string,
  ): ValidationError | null => {
    if (!pattern.test(value)) {
      return { field: fieldName, message: message || `${fieldName} has invalid format` };
    }
    return null;
  },

  enum: <T>(
    value: unknown,
    validValues: readonly T[],
    fieldName: string,
  ): ValidationError | null => {
    if (!validValues.includes(value as T)) {
      return {
        field: fieldName,
        message: `${fieldName} must be one of: ${validValues.join(", ")}`,
      };
    }
    return null;
  },

  date: (value: string, fieldName: string): ValidationError | null => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return { field: fieldName, message: `${fieldName} must be a valid date` };
    }
    return null;
  },

  dateNotInFuture: (value: string, fieldName: string): ValidationError | null => {
    const date = new Date(value);
    if (date > new Date()) {
      return { field: fieldName, message: `${fieldName} cannot be in the future` };
    }
    return null;
  },

  dateInRange: (value: string, min: Date, max: Date, fieldName: string): ValidationError | null => {
    const date = new Date(value);
    if (date < min || date > max) {
      return {
        field: fieldName,
        message: `${fieldName} must be between ${min.toISOString()} and ${max.toISOString()}`,
      };
    }
    return null;
  },

  noScriptTags: (value: string, fieldName: string): ValidationError | null => {
    if (PATTERNS.SCRIPT_TAG.test(value)) {
      return { field: fieldName, message: `${fieldName} contains invalid HTML` };
    }
    return null;
  },

  noSqlInjection: (value: string, fieldName: string): ValidationError | null => {
    if (PATTERNS.SQL_INJECTION.test(value)) {
      return { field: fieldName, message: `${fieldName} contains invalid characters` };
    }
    return null;
  },

  noXss: (value: string, fieldName: string): ValidationError | null => {
    if (PATTERNS.XSS_PATTERN.test(value)) {
      return { field: fieldName, message: `${fieldName} contains potentially dangerous content` };
    }
    return null;
  },
};

/**
 * Composite validator that runs multiple validators
 */
export function validate(
  value: unknown,
  fieldName: string,
  ...validatorFuncs: Array<(value: unknown, fieldName: string) => ValidationError | null>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const validator of validatorFuncs) {
    const error = validator(value, fieldName);
    if (error) {
      errors.push(error);
      // Stop on first error for this field
      break;
    }
  }

  return errors;
}

/**
 * Main injection validation function
 */
export function validateInjectionData(data: unknown): data is Omit<Injection, "id" | "created_at"> {
  const result = validateInjectionDataWithErrors(data);
  return result.isValid;
}

export function validateInjectionDataWithErrors(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== "object") {
    errors.push({ field: "data", message: "Invalid data format" });
    return { isValid: false, errors };
  }

  const injection = data as Record<string, unknown>;

  // Validate user_name
  errors.push(
    ...validate(
      injection.user_name,
      "user_name",
      validators.required,
      validators.string,
      (value) => validators.minLength(String(value).trim(), LIMITS.MIN_NAME_LENGTH, "user_name"),
      (value) => validators.maxLength(String(value), LIMITS.MAX_NAME_LENGTH, "user_name"),
      (value) =>
        validators.pattern(
          String(value),
          PATTERNS.NAME,
          "user_name",
          "User name contains invalid characters",
        ),
      (value) => validators.noScriptTags(String(value), "user_name"),
      (value) => validators.noSqlInjection(String(value), "user_name"),
      (value) => validators.noXss(String(value), "user_name"),
    ),
  );

  // Validate injection_time
  errors.push(
    ...validate(
      injection.injection_time,
      "injection_time",
      validators.required,
      validators.string,
      (value) => validators.date(String(value), "injection_time"),
      (value) => validators.dateNotInFuture(String(value), "injection_time"),
      (value) => {
        // Check if date is not too old (e.g., more than 1 year)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const date = new Date(String(value));
        if (date < oneYearAgo) {
          return {
            field: "injection_time",
            message: "Injection time cannot be more than 1 year in the past",
          };
        }
        return null;
      },
    ),
  );

  // Validate injection_type
  errors.push(
    ...validate(
      injection.injection_type,
      "injection_type",
      validators.required,
      validators.string,
      (value) =>
        validators.enum(value, [INJECTION_TYPE.MORNING, INJECTION_TYPE.EVENING], "injection_type"),
    ),
  );

  // Optional notes validation
  if (injection.notes !== undefined && injection.notes !== null && injection.notes !== "") {
    errors.push(
      ...validate(
        injection.notes,
        "notes",
        validators.string,
        (value) => validators.maxLength(String(value), LIMITS.MAX_NOTES_LENGTH, "notes"),
        (value) => validators.noScriptTags(String(value), "notes"),
        (value) => validators.noXss(String(value), "notes"),
      ),
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Email validation
 */
export function validateEmail(email: string): ValidationResult {
  const errors = validate(
    email,
    "email",
    validators.required,
    validators.string,
    (value) => validators.maxLength(String(value), LIMITS.MAX_EMAIL_LENGTH, "email"),
    (value) => validators.pattern(String(value), PATTERNS.EMAIL, "email", "Invalid email format"),
  );

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * URL validation
 */
export function validateUrl(url: string): ValidationResult {
  const errors = validate(
    url,
    "url",
    validators.required,
    validators.string,
    (value) => validators.maxLength(String(value), LIMITS.MAX_URL_LENGTH, "url"),
    (value) => validators.pattern(String(value), PATTERNS.URL, "url", "Invalid URL format"),
  );

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * HTML entity encoding to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  };
  return text.replace(/[&<>"'/`=]/g, (char) => map[char]);
}

/**
 * Remove null bytes and other dangerous characters
 */
function removeNullBytes(text: string): string {
  return text.replace(/\0/g, "");
}

/**
 * Normalize whitespace
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Sanitize user name with comprehensive cleaning
 */
export function sanitizeUserName(name: string): string {
  // Remove null bytes
  let cleaned = removeNullBytes(name);

  // Remove any HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, "");

  // Keep only allowed characters
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s\-']/g, "");

  // Normalize whitespace
  cleaned = normalizeWhitespace(cleaned);

  // Escape HTML entities
  cleaned = escapeHtml(cleaned);

  // Truncate to max length
  return cleaned.slice(0, LIMITS.MAX_NAME_LENGTH);
}

/**
 * Sanitize notes with less strict rules but still safe
 */
export function sanitizeNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;

  // Remove null bytes
  let cleaned = removeNullBytes(notes);

  // Remove script tags and dangerous HTML
  cleaned = cleaned.replace(PATTERNS.SCRIPT_TAG, "");
  cleaned = cleaned.replace(/<iframe[^>]*>.*?<\/iframe>/gi, "");
  cleaned = cleaned.replace(/<embed[^>]*>/gi, "");
  cleaned = cleaned.replace(/<object[^>]*>.*?<\/object>/gi, "");

  // Remove dangerous attributes
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  cleaned = cleaned.replace(/javascript:/gi, "");

  // Normalize whitespace
  cleaned = normalizeWhitespace(cleaned);

  // Escape HTML entities
  cleaned = escapeHtml(cleaned);

  // Truncate to max length
  return cleaned.slice(0, LIMITS.MAX_NOTES_LENGTH);
}

/**
 * Sanitize and validate query parameters
 */
export function sanitizeQueryParam(
  param: string | string[] | undefined,
  maxLength = 100,
): string | undefined {
  if (!param) return undefined;

  const value = Array.isArray(param) ? param[0] : param;
  if (!value) return undefined;

  // Remove null bytes and normalize
  let cleaned = removeNullBytes(value);
  cleaned = normalizeWhitespace(cleaned);

  // Basic XSS prevention
  cleaned = escapeHtml(cleaned);

  // Truncate
  return cleaned.slice(0, maxLength);
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
  page: unknown,
  perPage: unknown,
): { page: number; perPage: number } {
  const defaultPage = 1;
  const defaultPerPage = 20;
  const maxPerPage = 100;

  let validPage = defaultPage;
  let validPerPage = defaultPerPage;

  if (typeof page === "string" || typeof page === "number") {
    const parsed = Number(page);
    if (!Number.isNaN(parsed) && parsed > 0) {
      validPage = Math.floor(parsed);
    }
  }

  if (typeof perPage === "string" || typeof perPage === "number") {
    const parsed = Number(perPage);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= maxPerPage) {
      validPerPage = Math.floor(parsed);
    }
  }

  return { page: validPage, perPage: validPerPage };
}

/**
 * Generic object validation
 */
export function validateObject<T extends Record<string, unknown>>(
  data: unknown,
  schema: {
    [K in keyof T]: Array<(value: unknown, fieldName: string) => ValidationError | null>;
  },
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== "object") {
    errors.push({ field: "data", message: "Invalid data format" });
    return { isValid: false, errors };
  }

  const obj = data as Record<string, unknown>;

  for (const [field, validators] of Object.entries(schema)) {
    const fieldErrors = validate(obj[field], field, ...validators);
    errors.push(...fieldErrors);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
