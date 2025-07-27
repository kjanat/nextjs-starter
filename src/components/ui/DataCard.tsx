import type { ReactNode } from "react";
import { cn } from "@/lib/styles";

/**
 * Trend direction for the data card
 */
export type TrendDirection = "up" | "down" | "neutral";

/**
 * Visual variant for the data card
 */
export type DataCardVariant = "default" | "primary" | "success" | "warning" | "danger";

/**
 * Props for the DataCard component
 */
export interface DataCardProps {
  /** The main title/label for the data */
  title: string;
  /** The primary value to display (can be string or number) */
  value: string | number;
  /** Optional subtitle or additional context */
  subtitle?: string;
  /** Optional trend indicator */
  trend?: TrendDirection;
  /** Optional percentage change (displayed with trend) */
  trendValue?: string | number;
  /** Optional icon to display */
  icon?: ReactNode;
  /** Visual variant of the card */
  variant?: DataCardVariant;
  /** Additional CSS classes */
  className?: string;
  /** Make the card clickable */
  onClick?: () => void;
}

/**
 * Variant styles for the data card
 */
const variantStyles: Record<DataCardVariant, string> = {
  default: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
  primary: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  danger: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
};

/**
 * Value text colors for each variant
 */
const valueStyles: Record<DataCardVariant, string> = {
  default: "text-gray-900 dark:text-gray-100",
  primary: "text-blue-700 dark:text-blue-300",
  success: "text-green-700 dark:text-green-300",
  warning: "text-yellow-700 dark:text-yellow-300",
  danger: "text-red-700 dark:text-red-300",
};

/**
 * Trend indicator styles
 */
const trendStyles: Record<TrendDirection, { icon: string; color: string }> = {
  up: { icon: "↑", color: "text-green-600 dark:text-green-400" },
  down: { icon: "↓", color: "text-red-600 dark:text-red-400" },
  neutral: { icon: "→", color: "text-gray-600 dark:text-gray-400" },
};

/**
 * A reusable data card component for displaying metrics, statistics, and KPIs.
 * Commonly used in dashboards and analytics pages.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <DataCard title="Total Injections" value={42} />
 *
 * // With trend and subtitle
 * <DataCard
 *   title="Compliance Rate"
 *   value="95%"
 *   subtitle="Last 30 days"
 *   trend="up"
 *   trendValue="+5%"
 * />
 *
 * // With icon and variant
 * <DataCard
 *   title="Perfect Days"
 *   value={15}
 *   icon="🏆"
 *   variant="success"
 * />
 *
 * // Clickable card
 * <DataCard
 *   title="View Details"
 *   value="→"
 *   onClick={() => router.push('/details')}
 * />
 * ```
 */
export function DataCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  variant = "default",
  className,
  onClick,
}: DataCardProps) {
  const isClickable = Boolean(onClick);
  const trendInfo = trend ? trendStyles[trend] : null;

  const Component = isClickable ? "button" : "div";

  return (
    <Component
      className={cn(
        "rounded-xl border p-6 transition-all w-full text-left",
        variantStyles[variant],
        isClickable && "cursor-pointer hover:shadow-md hover:scale-[1.02]",
        className,
      )}
      onClick={isClickable ? onClick : undefined}
      type={isClickable ? "button" : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Main content */}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className={cn("text-3xl font-bold mt-1", valueStyles[variant])}>{value}</p>

          {/* Subtitle and/or trend */}
          {(subtitle || trend) && (
            <div className="flex items-center gap-2 mt-2">
              {subtitle && (
                <span className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</span>
              )}

              {trend && trendInfo && (
                <span
                  className={cn("flex items-center gap-1 text-sm font-medium", trendInfo.color)}
                >
                  <span aria-hidden="true">{trendInfo.icon}</span>
                  {trendValue && <span>{trendValue}</span>}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div className="flex-shrink-0 text-2xl opacity-50" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>
    </Component>
  );
}
