import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface SecurityHeaders {
  [key: string]: string;
}

const SECURITY_HEADERS: SecurityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-DNS-Prefetch-Control": "on",
  "X-Permitted-Cross-Domain-Policies": "none",
};

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) || ["*"];
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60;

// Rate limit tracking with automatic cleanup
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 10000; // Prevent unlimited growth

let lastCleanup = 0;

function checkRateLimit(clientId: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const limit = rateLimitMap.get(clientId);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
  }

  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: limit.resetTime };
  }

  limit.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - limit.count,
    resetTime: limit.resetTime,
  };
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname, origin } = request.nextUrl;
  const requestOrigin = request.headers.get("origin") || "";
  const clientId =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "anonymous";

  // Add request ID for tracking
  const requestId = crypto.randomUUID();
  response.headers.set("X-Request-ID", requestId);

  // Apply rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const rateLimitResult = checkRateLimit(clientId);

    response.headers.set("X-RateLimit-Limit", RATE_LIMIT_MAX_REQUESTS.toString());
    response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
    response.headers.set("X-RateLimit-Reset", new Date(rateLimitResult.resetTime).toISOString());

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: "Too many requests. Please try again later.",
            code: "RATE_LIMIT_EXCEEDED",
            status: 429,
          },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            ...Object.fromEntries(response.headers.entries()),
          },
        },
      );
    }
  }

  // Apply security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Set CSP header
  response.headers.set("Content-Security-Policy", CSP_DIRECTIVES.join("; "));

  // Enhanced CORS configuration for API routes
  if (pathname.startsWith("/api/")) {
    // Check if origin is allowed with wildcard support
    const isAllowedOrigin =
      ALLOWED_ORIGINS.includes("*") ||
      ALLOWED_ORIGINS.some((allowed) => {
        if (allowed.includes("*")) {
          const regex = new RegExp(`^${allowed.replace(/\*/g, ".*")}$`);
          return regex.test(requestOrigin);
        }
        return allowed === requestOrigin;
      }) ||
      requestOrigin === origin;

    if (isAllowedOrigin) {
      response.headers.set(
        "Access-Control-Allow-Origin",
        ALLOWED_ORIGINS.includes("*") ? "*" : requestOrigin,
      );
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With, X-Request-ID",
      );
      response.headers.set("Access-Control-Max-Age", "86400");
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set(
        "Access-Control-Expose-Headers",
        "X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
      );
    }

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: response.headers });
    }
  }

  // Log request
  if (process.env.NODE_ENV === "development") {
    console.log(`[${new Date().toISOString()}] ${request.method} ${pathname} - ${requestId}`);
  }

  // Clean up old rate limit entries periodically
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    lastCleanup = now;

    // Remove expired entries
    const expiredEntries: string[] = [];
    for (const [id, limit] of rateLimitMap.entries()) {
      if (now > limit.resetTime + RATE_LIMIT_WINDOW) {
        expiredEntries.push(id);
      }
    }

    expiredEntries.forEach((id) => rateLimitMap.delete(id));

    // If still too many entries, remove oldest entries
    if (rateLimitMap.size > MAX_ENTRIES) {
      const entries = Array.from(rateLimitMap.entries()).sort(
        ([, a], [, b]) => a.resetTime - b.resetTime,
      );

      const toRemove = entries.slice(0, entries.length - MAX_ENTRIES);
      toRemove.forEach(([id]) => rateLimitMap.delete(id));
    }

    // Log cleanup stats in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `Rate limit cleanup: removed ${expiredEntries.length} expired entries, ${rateLimitMap.size} remaining`,
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
