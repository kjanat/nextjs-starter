import { memo } from "react";
import { cn } from "@/lib/styles";

type ColorVariant = "green" | "blue" | "yellow" | "red" | "purple" | "gray";

interface StatCardProps {
  value: number | string;
  label: string;
  variant?: ColorVariant;
  suffix?: string;
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
  "aria-label"?: string;
}

const variantStyles: Record<ColorVariant, { bg: string; text: string }> = {
  green: {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-600 dark:text-green-400",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-600 dark:text-blue-400",
  },
  yellow: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    text: "text-yellow-600 dark:text-yellow-400",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-600 dark:text-red-400",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-600 dark:text-purple-400",
  },
  gray: {
    bg: "bg-gray-50 dark:bg-gray-900/20",
    text: "text-gray-600 dark:text-gray-400",
  },
};

export const StatCard = memo<StatCardProps>(
  ({
    value,
    label,
    variant = "gray",
    suffix = "",
    className,
    valueClassName,
    labelClassName,
    "aria-label": ariaLabel,
  }) => {
    const styles = variantStyles[variant];
    const formattedValue = typeof value === "number" ? value.toLocaleString() : value;

    return (
      <article
        className={cn("p-4 rounded-xl transition-colors", styles.bg, className)}
        aria-label={ariaLabel ?? `${label}: ${formattedValue}${suffix}`}
      >
        <div className={cn("text-3xl font-bold", styles.text, valueClassName)} aria-hidden="true">
          {formattedValue}
          {suffix}
        </div>
        <div
          className={cn("text-sm text-gray-600 dark:text-gray-400", labelClassName)}
          aria-hidden="true"
        >
          {label}
        </div>
      </article>
    );
  },
);

StatCard.displayName = "StatCard";
