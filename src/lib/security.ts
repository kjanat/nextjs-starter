import crypto from "node:crypto";

/**
 * Security configuration
 */
export const SECURITY_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  HASH_ITERATIONS: 100000,
  SALT_LENGTH: 32,
  TOKEN_LENGTH: 32,
  SESSION_DURATION: 86400, // 24 hours in seconds
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 900, // 15 minutes in seconds
} as const;

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(length = SECURITY_CONFIG.TOKEN_LENGTH): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate a secure salt for password hashing
 */
export function generateSalt(length = SECURITY_CONFIG.SALT_LENGTH): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Hash a password using PBKDF2
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      SECURITY_CONFIG.HASH_ITERATIONS,
      64,
      "sha512",
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey.toString("hex"));
      },
    );
  });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): Promise<boolean> {
  const passwordHash = await hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(passwordHash), Buffer.from(hash));
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} characters long`);
  }

  if (password.length > SECURITY_CONFIG.PASSWORD_MAX_LENGTH) {
    errors.push(`Password must be less than ${SECURITY_CONFIG.PASSWORD_MAX_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return input.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  return generateToken(32);
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(sessionToken));
}

/**
 * Rate limiting bucket
 */
export class RateLimitBucket {
  private attempts = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private maxAttempts: number,
    private windowMs: number,
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (attempt.count >= this.maxAttempts) {
      return false;
    }

    attempt.count++;
    return true;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  getRemainingAttempts(identifier: string): number {
    const attempt = this.attempts.get(identifier);
    if (!attempt || Date.now() > attempt.resetTime) {
      return this.maxAttempts;
    }
    return Math.max(0, this.maxAttempts - attempt.count);
  }

  getResetTime(identifier: string): number | null {
    const attempt = this.attempts.get(identifier);
    return attempt ? attempt.resetTime : null;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [id, attempt] of this.attempts.entries()) {
      if (now > attempt.resetTime) {
        this.attempts.delete(id);
      }
    }
  }
}

/**
 * Content Security Policy builder
 */
export class CSPBuilder {
  private directives: Map<string, string[]> = new Map();

  defaultSrc(...sources: string[]): this {
    this.directives.set("default-src", sources);
    return this;
  }

  scriptSrc(...sources: string[]): this {
    this.directives.set("script-src", sources);
    return this;
  }

  styleSrc(...sources: string[]): this {
    this.directives.set("style-src", sources);
    return this;
  }

  imgSrc(...sources: string[]): this {
    this.directives.set("img-src", sources);
    return this;
  }

  fontSrc(...sources: string[]): this {
    this.directives.set("font-src", sources);
    return this;
  }

  connectSrc(...sources: string[]): this {
    this.directives.set("connect-src", sources);
    return this;
  }

  frameAncestors(...sources: string[]): this {
    this.directives.set("frame-ancestors", sources);
    return this;
  }

  baseUri(...sources: string[]): this {
    this.directives.set("base-uri", sources);
    return this;
  }

  formAction(...sources: string[]): this {
    this.directives.set("form-action", sources);
    return this;
  }

  upgradeInsecureRequests(): this {
    this.directives.set("upgrade-insecure-requests", []);
    return this;
  }

  blockAllMixedContent(): this {
    this.directives.set("block-all-mixed-content", []);
    return this;
  }

  build(): string {
    const parts: string[] = [];
    for (const [directive, sources] of this.directives) {
      if (sources.length === 0) {
        parts.push(directive);
      } else {
        parts.push(`${directive} ${sources.join(" ")}`);
      }
    }
    return parts.join("; ");
  }
}

/**
 * Validate API key format
 */
export function isValidApiKey(apiKey: string): boolean {
  // API keys should be 32-64 character hex strings
  return /^[a-f0-9]{32,64}$/i.test(apiKey);
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: unknown): unknown {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  const masked = Array.isArray(data) ? [...data] : { ...data };
  const sensitiveKeys = [
    "password",
    "token",
    "apiKey",
    "api_key",
    "secret",
    "authorization",
    "credit_card",
    "ssn",
    "email",
  ];

  if (Array.isArray(masked)) {
    return masked.map((item) => maskSensitiveData(item));
  }

  const maskedObj = masked as Record<string, unknown>;
  for (const [key, value] of Object.entries(maskedObj)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      maskedObj[key] = "***MASKED***";
    } else if (typeof value === "object" && value !== null) {
      maskedObj[key] = maskSensitiveData(value);
    }
  }

  return maskedObj;
}

/**
 * Validate request origin
 */
export function isValidOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.includes("*")) return true;

  return allowedOrigins.some((allowed) => {
    if (allowed.includes("*")) {
      const regex = new RegExp(`^${allowed.replace(/\*/g, ".*").replace(/\./g, "\\.")}$`);
      return regex.test(origin);
    }
    return allowed === origin;
  });
}
