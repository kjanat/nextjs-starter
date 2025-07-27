import type { NextRequest } from "next/server";

export interface LogContext {
  requestId: string;
  method: string;
  path: string;
  userAgent?: string;
  ip?: string;
  timestamp: string;
}

export interface LogEntry {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  context: LogContext;
  data?: Record<string, unknown>;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private static instance: Logger | null = null;
  private readonly isDevelopment = process.env.NODE_ENV === "development";
  private readonly logQueue: LogEntry[] = [];
  private readonly MAX_QUEUE_SIZE = 100;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Create log context from request
   */
  createContext(request: NextRequest, requestId: string): LogContext {
    return {
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      userAgent: request.headers.get("user-agent") || undefined,
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Log info level message
   */
  info(message: string, context: LogContext, data?: Record<string, unknown>): void {
    this.log({ level: "info", message, context, data });
  }

  /**
   * Log warning level message
   */
  warn(message: string, context: LogContext, data?: Record<string, unknown>): void {
    this.log({ level: "warn", message, context, data });
  }

  /**
   * Log error level message
   */
  error(
    message: string,
    context: LogContext,
    error?: Error | unknown,
    data?: Record<string, unknown>,
  ): void {
    const errorData =
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            code: (error as Error & { code?: string }).code,
          }
        : { message: String(error) };

    this.log({
      level: "error",
      message,
      context,
      data,
      error: errorData,
    });
  }

  /**
   * Log debug level message
   */
  debug(message: string, context: LogContext, data?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      this.log({ level: "debug", message, context, data });
    }
  }

  /**
   * Log request completion
   */
  logRequest(context: LogContext, status: number, duration: number, size?: number): void {
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

    this.log({
      level,
      message: `${context.method} ${context.path} ${status}`,
      context,
      duration,
      data: {
        status,
        size,
        userAgent: context.userAgent,
      },
    });
  }

  /**
   * Internal log method
   */
  private log(entry: LogEntry): void {
    // In development, use console logging
    if (this.isDevelopment) {
      const color = {
        info: "\x1b[36m",
        warn: "\x1b[33m",
        error: "\x1b[31m",
        debug: "\x1b[90m",
      }[entry.level];
      const reset = "\x1b[0m";

      console.log(
        `${color}[${entry.level.toUpperCase()}]${reset}`,
        `[${entry.context.timestamp}]`,
        `[${entry.context.requestId}]`,
        entry.message,
        entry.duration ? `(${entry.duration}ms)` : "",
        entry.data ? JSON.stringify(entry.data) : "",
      );

      if (entry.error) {
        console.error(entry.error);
      }
    } else {
      // In production, queue logs for batch processing
      this.queueLog(entry);
    }
  }

  /**
   * Queue log for batch processing
   */
  private queueLog(entry: LogEntry): void {
    this.logQueue.push(entry);

    // Flush queue if it's full
    if (this.logQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flush();
    }
  }

  /**
   * Flush log queue
   */
  flush(): void {
    if (this.logQueue.length === 0) return;

    // In production, this would send logs to a logging service
    // For now, we'll just output to console as JSON
    const logs = [...this.logQueue];
    this.logQueue.length = 0;

    logs.forEach((log) => {
      console.log(JSON.stringify(log));
    });
  }

  /**
   * Create a child logger with fixed context
   */
  child(context: LogContext): LoggerWithContext {
    return new LoggerWithContext(this, context);
  }
}

/**
 * Logger with fixed context
 */
export class LoggerWithContext {
  constructor(
    private logger: Logger,
    private context: LogContext,
  ) {}

  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(message, this.context, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(message, this.context, data);
  }

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    this.logger.error(message, this.context, error, data);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(message, this.context, data);
  }
}

/**
 * Request duration tracker
 */
export class RequestTimer {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }
}
