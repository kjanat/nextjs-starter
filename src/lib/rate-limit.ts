import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";

interface RateLimitConfig {
	windowMs: number;
	max: number;
	keyPrefix: string;
	projectPrefix?: string;
}

export class RateLimiter {
	private config: RateLimitConfig;

	constructor(config: RateLimitConfig) {
		this.config = config;
	}

	async isAllowed(request: NextRequest): Promise<boolean> {
		const { env } = await getCloudflareContext();

		// Get client identifier (IP address or user ID)
		const clientId = this.getClientIdentifier(request);
		const projectPrefix = this.config.projectPrefix || "insulin-tracker";
		const key = `${projectPrefix}:${this.config.keyPrefix}:${clientId}`;

		// Get current window
		const now = Date.now();
		const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
		const windowKey = `${key}:${windowStart}`;

		try {
			// Get current count from KV
			const currentCount = await env.RATE_LIMIT?.get(windowKey);
			const count = currentCount ? parseInt(currentCount, 10) : 0;

			if (count >= this.config.max) {
				return false;
			}

			// Increment counter
			await env.RATE_LIMIT?.put(windowKey, (count + 1).toString(), {
				expirationTtl: Math.ceil(this.config.windowMs / 1000),
			});

			return true;
		} catch {
			// If KV is not configured, allow the request
			console.warn("Rate limiting KV not configured");
			return true;
		}
	}

	private getClientIdentifier(request: NextRequest): string {
		// Try to get real IP from Cloudflare headers
		const cfConnectingIp = request.headers.get("CF-Connecting-IP");
		if (cfConnectingIp) return cfConnectingIp;

		// Fallback to X-Forwarded-For
		const xForwardedFor = request.headers.get("X-Forwarded-For");
		if (xForwardedFor) {
			return xForwardedFor.split(",")[0].trim();
		}

		// Last resort - use a default
		return "unknown";
	}
}

// Rate limiter instances for different endpoints
export const apiRateLimiter = new RateLimiter({
	windowMs: 60 * 1000, // 1 minute
	max: 30, // 30 requests per minute
	keyPrefix: "rl:api",
	projectPrefix: "insulin-tracker", // Project-specific prefix
});

export const injectionRateLimiter = new RateLimiter({
	windowMs: 60 * 1000, // 1 minute
	max: 10, // 10 injections per minute per IP
	keyPrefix: "rl:injection",
	projectPrefix: "insulin-tracker", // Project-specific prefix
});
