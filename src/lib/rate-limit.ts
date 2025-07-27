import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";

interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix: string;
  projectPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      standardHeaders: true,
      legacyHeaders: true,
      ...config,
    };
  }

  async isAllowed(request: NextRequest): Promise<boolean> {
    const info = await this.getRateLimitInfo(request);
    return info.remaining > 0;
  }

  async getRateLimitInfo(request: NextRequest): Promise<RateLimitInfo> {
    const { env } = await getCloudflareContext();

    // Get client identifier (IP address or user ID)
    const clientId = this.getClientIdentifier(request);
    const projectPrefix = this.config.projectPrefix || "insulin-tracker";
    const key = `${projectPrefix}:${this.config.keyPrefix}:${clientId}`;

    // Get current window
    const now = Date.now();
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
    const windowEnd = windowStart + this.config.windowMs;
    const windowKey = `${key}:${windowStart}`;

    try {
      // Get current count from KV
      const currentCount = await env.RATE_LIMIT?.get(windowKey);
      const count = currentCount ? parseInt(currentCount, 10) : 0;

      const info: RateLimitInfo = {
        limit: this.config.max,
        current: count,
        remaining: Math.max(0, this.config.max - count),
        resetTime: new Date(windowEnd),
      };

      if (info.remaining === 0) {
        info.retryAfter = Math.ceil((windowEnd - now) / 1000);
      }

      // Only increment if we haven't hit the limit
      if (count < this.config.max) {
        await env.RATE_LIMIT?.put(windowKey, (count + 1).toString(), {
          expirationTtl: Math.ceil(this.config.windowMs / 1000) + 60, // Add buffer
        });
      }

      return info;
    } catch (error) {
      // If KV is not configured, return unlimited
      console.warn("Rate limiting KV not configured:", error);
      return {
        limit: this.config.max,
        current: 0,
        remaining: this.config.max,
        resetTime: new Date(windowEnd),
      };
    }
  }

  async reset(request: NextRequest): Promise<void> {
    const { env } = await getCloudflareContext();

    const clientId = this.getClientIdentifier(request);
    const projectPrefix = this.config.projectPrefix || "insulin-tracker";
    const key = `${projectPrefix}:${this.config.keyPrefix}:${clientId}`;

    const now = Date.now();
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
    const windowKey = `${key}:${windowStart}`;

    try {
      await env.RATE_LIMIT?.delete(windowKey);
    } catch (error) {
      console.warn("Failed to reset rate limit:", error);
    }
  }

  private getClientIdentifier(request: NextRequest): string {
    // Check for authenticated user
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const userId = this.extractUserIdFromAuth(authHeader);
      if (userId) {
        return `user:${userId}`;
      }
    }

    // Try to get real IP from various headers
    const cfConnectingIp = request.headers.get("cf-connecting-ip");
    if (cfConnectingIp) return `ip:${cfConnectingIp}`;

    const xRealIp = request.headers.get("x-real-ip");
    if (xRealIp) return `ip:${xRealIp}`;

    const xForwardedFor = request.headers.get("x-forwarded-for");
    if (xForwardedFor) {
      const ip = xForwardedFor.split(",")[0].trim();
      return `ip:${ip}`;
    }

    // Use request IP if available
    // Note: request.ip is not available in Next.js middleware

    // Last resort - use user agent hash
    const userAgent = request.headers.get("user-agent") || "unknown";
    const hash = this.simpleHash(userAgent);
    return `ua:${hash}`;
  }

  private extractUserIdFromAuth(authHeader: string): string | null {
    // This is a simplified implementation
    // In a real app, you would verify and decode the JWT token
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      // Use first 16 chars of token as identifier
      return token.substring(0, 16);
    }
    return null;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Helper function to set rate limit headers on response
 */
export function setRateLimitHeaders(
  response: Response,
  info: RateLimitInfo,
  standardHeaders = true,
  legacyHeaders = true,
): void {
  if (standardHeaders) {
    response.headers.set("RateLimit-Limit", info.limit.toString());
    response.headers.set("RateLimit-Remaining", info.remaining.toString());
    response.headers.set("RateLimit-Reset", Math.floor(info.resetTime.getTime() / 1000).toString());
  }

  if (legacyHeaders) {
    response.headers.set("X-RateLimit-Limit", info.limit.toString());
    response.headers.set("X-RateLimit-Remaining", info.remaining.toString());
    response.headers.set("X-RateLimit-Reset", info.resetTime.toISOString());
  }

  if (info.retryAfter !== undefined) {
    response.headers.set("Retry-After", info.retryAfter.toString());
  }
}

// Rate limiter instances for different endpoints
export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  keyPrefix: "rl:api",
  projectPrefix: "insulin-tracker",
});

export const injectionRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 injections per minute per IP
  keyPrefix: "rl:injection",
  projectPrefix: "insulin-tracker",
});

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 auth attempts per 15 minutes
  keyPrefix: "rl:auth",
  projectPrefix: "insulin-tracker",
  skipSuccessfulRequests: true,
});
