import type { ReactNode } from "react";
import { cn } from "@/lib/styles";

/**
 * Alert component variants
 */
export type AlertVariant = "error" | "warning" | "info" | "success";

/**
 * Props for the Alert component
 */
export interface AlertProps {
  /** Visual variant that determines the alert's color scheme and default icon */
  variant: AlertVariant;
  /** Main title/heading for the alert (optional) */
  title?: string;
  /** Alert content - can be text or React elements */
  children: ReactNode;
  /** Custom icon to override the default variant icon */
  icon?: ReactNode;
  /** Whether the alert can be dismissed by the user */
  dismissible?: boolean;
  /** Callback when the alert is dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes to apply to the alert container */
  className?: string;
}

/**
 * Default icons for each alert variant
 */
const defaultIcons: Record<AlertVariant, string> = {
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
  success: "✅",
};

/**
 * CSS classes for each alert variant
 */
const variantStyles: Record<AlertVariant, string> = {
  error:
    "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
  warning:
    "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200",
  info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
  success:
    "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
};

/**
 * Text color classes for titles in each variant
 */
const titleStyles: Record<AlertVariant, string> = {
  error: "text-red-700 dark:text-red-400",
  warning: "text-yellow-700 dark:text-yellow-400",
  info: "text-blue-700 dark:text-blue-400",
  success: "text-green-700 dark:text-green-400",
};

/**
 * A reusable alert component for displaying important messages to users.
 * Supports multiple variants (error, warning, info, success) with appropriate styling.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Alert variant="error">
 *   Something went wrong!
 * </Alert>
 *
 * // With title and custom icon
 * <Alert variant="warning" title="Low Stock" icon="📦">
 *   You have only 2 vials remaining.
 * </Alert>
 *
 * // Dismissible alert
 * <Alert variant="info" dismissible onDismiss={() => console.log('dismissed')}>
 *   This is an informational message.
 * </Alert>
 * ```
 */
export function Alert({
  variant,
  title,
  children,
  icon,
  dismissible = false,
  onDismiss,
  className,
}: AlertProps) {
  const defaultIcon = defaultIcons[variant];
  const displayIcon = icon ?? defaultIcon;

  return (
    <div
      className={cn("rounded-lg border p-4 transition-colors", variantStyles[variant], className)}
      role="alert"
    >
      <div className="flex gap-3">
        {/* Icon */}
        {displayIcon && (
          <span className="flex-shrink-0 text-xl" aria-hidden="true">
            {displayIcon}
          </span>
        )}

        {/* Content */}
        <div className="flex-1">
          {title && <h3 className={cn("font-semibold mb-1", titleStyles[variant])}>{title}</h3>}
          <div className="text-sm">{children}</div>
        </div>

        {/* Dismiss button */}
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 ml-auto -mt-1 -mr-1 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Dismiss alert"
          >
            <span className="text-lg">×</span>
          </button>
        )}
      </div>
    </div>
  );
}
