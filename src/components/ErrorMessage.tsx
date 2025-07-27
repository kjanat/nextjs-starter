import { memo } from "react";
import { ERROR_MESSAGES } from "@/lib/constants";
import { buttonStyles, cn } from "@/lib/styles";
import { ApiError } from "@/types/api";

interface ErrorMessageProps {
  error: string | Error | ApiError | null;
  fullScreen?: boolean;
  onRetry?: () => void;
  className?: string;
  title?: string;
  icon?: string;
}

function getErrorMessage(error: ErrorMessageProps["error"]): string {
  if (!error) return ERROR_MESSAGES.GENERIC;

  if (error instanceof ApiError) {
    if (error.code === "RATE_LIMIT_EXCEEDED") return ERROR_MESSAGES.RATE_LIMIT;
    if (error.code === "UNAUTHORIZED") return ERROR_MESSAGES.UNAUTHORIZED;
    if (error.status && error.status >= 500) return ERROR_MESSAGES.GENERIC;
    return error.message;
  }

  if (error instanceof Error) {
    if (error.message.includes("fetch")) return ERROR_MESSAGES.NETWORK;
    return error.message;
  }

  return error;
}

export const ErrorMessage = memo<ErrorMessageProps>(
  ({ error, fullScreen = true, onRetry, className, title = "Error", icon = "❌" }) => {
    const errorMessage = getErrorMessage(error);

    return (
      <div
        className={cn(
          fullScreen
            ? "min-h-screen flex items-center justify-center"
            : "flex items-center justify-center py-8",
          className,
        )}
        role="alert"
        aria-live="assertive"
      >
        <div className="text-center max-w-md px-4">
          <div className="text-4xl mb-4" role="img" aria-label="Error icon">
            {icon}
          </div>
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">{title}</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">{errorMessage}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={buttonStyles.primary}
              aria-label="Retry the failed operation"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  },
);

ErrorMessage.displayName = "ErrorMessage";
