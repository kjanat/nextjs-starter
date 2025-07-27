"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import { ApiError } from "@/types/api";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  retryCount: number;
  errorHistory: ErrorRecord[];
}

interface ErrorRecord {
  timestamp: number;
  error: string;
  type: string;
}

const ERROR_STORAGE_KEY = "app-error-history";
const MAX_ERROR_HISTORY = 10;
const BACKOFF_BASE = 1000;

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      retryCount: 0,
      errorHistory: this.loadErrorHistory(),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Update state with error info
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
      errorHistory: this.addErrorToHistory(prevState.errorHistory, error),
    }));

    // Save error history to local storage
    this.saveErrorHistory(this.state.errorHistory);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to error reporting service in production
    if (process.env.NODE_ENV === "production") {
      this.logErrorToService(error, errorInfo);
    }

    // Attempt auto-recovery for specific error types
    this.attemptAutoRecovery(error);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && resetOnPropsChange) {
      let hasResetKeyChanged = false;

      if (resetKeys) {
        hasResetKeyChanged = resetKeys.some(
          (key) => prevProps[key as keyof Props] !== this.props[key as keyof Props],
        );
      } else {
        hasResetKeyChanged = prevProps.children !== this.props.children;
      }

      if (hasResetKeyChanged) {
        this.reset();
      }
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private loadErrorHistory(): ErrorRecord[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(ERROR_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveErrorHistory(history: ErrorRecord[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Ignore storage errors
    }
  }

  private addErrorToHistory(history: ErrorRecord[], error: Error): ErrorRecord[] {
    const newRecord: ErrorRecord = {
      timestamp: Date.now(),
      error: error.message,
      type: error.name,
    };

    const newHistory = [newRecord, ...history].slice(0, MAX_ERROR_HISTORY);
    return newHistory;
  }

  private isNetworkError(error: Error): boolean {
    return (
      error.message.toLowerCase().includes("network") ||
      error.message.toLowerCase().includes("fetch") ||
      (error instanceof TypeError && error.message.includes("Failed to fetch")) ||
      (error instanceof ApiError && error.status >= 500)
    );
  }

  private isRecoverableError(error: Error): boolean {
    return (
      this.isNetworkError(error) ||
      (error instanceof ApiError && error.status >= 500 && error.status < 600)
    );
  }

  private attemptAutoRecovery(error: Error) {
    const maxRetries = this.props.maxRetries ?? 3;

    if (this.isRecoverableError(error) && this.state.retryCount < maxRetries) {
      const backoffTime = BACKOFF_BASE * 2 ** this.state.retryCount;

      this.retryTimeoutId = setTimeout(() => {
        this.setState((prevState) => ({
          retryCount: prevState.retryCount + 1,
        }));
        this.reset();
      }, backoffTime);
    }
  }

  reset = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  clearErrorHistory = () => {
    this.setState({ errorHistory: [] });
    this.saveErrorHistory([]);
  };

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // In production, this would send to an error tracking service
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "unknown",
      url: typeof window !== "undefined" ? window.location.href : "unknown",
      errorCount: this.state.errorCount,
      retryCount: this.state.retryCount,
      isApiError: error instanceof ApiError,
      apiErrorCode: error instanceof ApiError ? error.code : undefined,
      isNetworkError: this.isNetworkError(error),
      errorHistory: this.state.errorHistory.slice(0, 5),
    };

    console.error("Error logged to service:", errorData);

    // In a real app, send to error tracking service
    // Example: Sentry.captureException(error, { extra: errorData });
  }

  private getErrorSeverity(error: Error): "low" | "medium" | "high" | "critical" {
    if (error instanceof ApiError) {
      if (error.status >= 500) return "critical";
      if (error.status >= 400) return "high";
      return "medium";
    }

    if (this.isNetworkError(error)) return "high";
    if (error.name === "SecurityError") return "critical";

    return "high";
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Determine error characteristics
      const error = this.state.error;
      const isApiError = error instanceof ApiError;
      const isNetworkError = this.isNetworkError(error);
      const isRecoverable = this.isRecoverableError(error);
      const severity = this.getErrorSeverity(error);

      // Customize error display based on type
      let title = "Something went wrong";
      let icon = "🚨";
      let message = error.message;

      if (isNetworkError) {
        title = "Connection Error";
        icon = "🌐";
        message = "Please check your internet connection and try again.";
      } else if (isApiError) {
        title = "Service Error";
        icon = "⚠️";
        if (error.status >= 500) {
          message = "Our servers are experiencing issues. Please try again later.";
        }
      }

      // Show more detailed error in development
      const showDetails = process.env.NODE_ENV === "development";
      const showHistory = showDetails && this.state.errorHistory.length > 0;

      // If isolate prop is true, only show a minimal error
      if (this.props.isolate) {
        return (
          <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
            <p className="text-red-800">
              {icon} {message}
            </p>
            <button
              type="button"
              onClick={this.reset}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <ErrorMessage
              error={isNetworkError ? new Error(message) : error}
              onRetry={this.reset}
              title={title}
              icon={icon}
            />

            {isRecoverable && this.state.retryCount > 0 && (
              <p className="mt-2 text-sm text-gray-600 text-center">
                Retry attempt {this.state.retryCount} of {this.props.maxRetries ?? 3}
              </p>
            )}

            {showDetails && (
              <>
                {this.state.errorInfo && (
                  <details className="mt-4 p-4 bg-gray-100 rounded-lg text-sm">
                    <summary className="cursor-pointer font-semibold">
                      Error Details (Development Only)
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div>
                        <strong>Severity:</strong> {severity}
                      </div>
                      <div>
                        <strong>Type:</strong> {error.name}
                      </div>
                      <div>
                        <strong>Recoverable:</strong> {isRecoverable ? "Yes" : "No"}
                      </div>
                      <pre className="mt-2 whitespace-pre-wrap text-xs overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  </details>
                )}

                {showHistory && (
                  <details className="mt-4 p-4 bg-gray-100 rounded-lg text-sm">
                    <summary className="cursor-pointer font-semibold">
                      Error History ({this.state.errorHistory.length})
                    </summary>
                    <div className="mt-2 space-y-1">
                      {this.state.errorHistory.map((record, index) => (
                        <div key={`error-${record.timestamp}-${index}`} className="text-xs">
                          <span className="text-gray-600">
                            {new Date(record.timestamp).toLocaleTimeString()}:
                          </span>{" "}
                          <span className="font-mono">{record.type}</span> -{" "}
                          {record.error.substring(0, 50)}...
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={this.clearErrorHistory}
                      className="mt-2 text-xs text-red-600 hover:text-red-800"
                    >
                      Clear History
                    </button>
                  </details>
                )}
              </>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
