"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/styles";

/**
 * Configuration for a single navigation tab
 */
export interface NavigationTab {
  /** The URL to navigate to */
  href: string;
  /** Display label for the tab */
  label: string;
  /** Optional icon to display before the label */
  icon?: ReactNode;
  /** Whether to prefetch the page (Next.js Link prefetch) */
  prefetch?: boolean;
  /** Whether this tab is disabled */
  disabled?: boolean;
  /** Custom aria-label for accessibility */
  ariaLabel?: string;
}

/**
 * Props for the NavigationTabs component
 */
export interface NavigationTabsProps {
  /** Array of tabs to display */
  tabs: NavigationTab[];
  /** Layout variant for the tabs */
  variant?: "default" | "pills" | "underline";
  /** Size variant for the tabs */
  size?: "sm" | "md" | "lg";
  /** Whether tabs should take full width */
  fullWidth?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Base styles for tab containers by variant
 */
const containerStyles = {
  default: "flex gap-2",
  pills: "flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg",
  underline: "flex gap-0 border-b border-gray-200 dark:border-gray-700",
};

/**
 * Tab styles by variant and state
 */
const tabStyles = {
  default: {
    base: "px-4 py-2 rounded-md text-center font-medium transition-colors",
    active: "bg-blue-500 text-white",
    inactive:
      "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
    disabled: "bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 cursor-not-allowed",
  },
  pills: {
    base: "px-4 py-2 rounded-md text-center font-medium transition-all",
    active: "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm",
    inactive: "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
    disabled: "text-gray-400 dark:text-gray-600 cursor-not-allowed",
  },
  underline: {
    base: "px-4 py-2 text-center font-medium transition-colors relative",
    active:
      "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 -mb-px",
    inactive: "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
    disabled: "text-gray-400 dark:text-gray-600 cursor-not-allowed",
  },
};

/**
 * Size styles for tabs
 */
const sizeStyles = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

/**
 * A reusable navigation tabs component for consistent navigation UI across the app.
 * Supports multiple visual variants and automatically highlights the active tab.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <NavigationTabs
 *   tabs={[
 *     { href: "/", label: "Home" },
 *     { href: "/stats", label: "Statistics" },
 *     { href: "/history", label: "History" }
 *   ]}
 * />
 *
 * // With icons and variants
 * <NavigationTabs
 *   tabs={[
 *     { href: "/", label: "Dashboard", icon: "🏠" },
 *     { href: "/analytics", label: "Analytics", icon: "📊" },
 *     { href: "/settings", label: "Settings", icon: "⚙️", disabled: true }
 *   ]}
 *   variant="pills"
 *   size="lg"
 *   fullWidth
 * />
 *
 * // Underline style navigation
 * <NavigationTabs
 *   tabs={[
 *     { href: "/overview", label: "Overview" },
 *     { href: "/details", label: "Details" },
 *     { href: "/logs", label: "Logs" }
 *   ]}
 *   variant="underline"
 * />
 * ```
 */
export function NavigationTabs({
  tabs,
  variant = "default",
  size = "md",
  fullWidth = false,
  className,
}: NavigationTabsProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(containerStyles[variant], fullWidth && "w-full", className)}
      aria-label="Main navigation"
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const isDisabled = tab.disabled || false;
        const styles = tabStyles[variant];

        const tabContent = (
          <>
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            <span>{tab.label}</span>
          </>
        );

        const tabClassName = cn(
          styles.base,
          sizeStyles[size],
          isActive && styles.active,
          !isActive && !isDisabled && styles.inactive,
          isDisabled && styles.disabled,
          fullWidth && "flex-1",
        );

        if (isDisabled) {
          return (
            <span key={tab.href} className={tabClassName} aria-disabled="true" tabIndex={-1}>
              {tabContent}
            </span>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={tabClassName}
            prefetch={tab.prefetch}
            aria-label={tab.ariaLabel || tab.label}
            aria-current={isActive ? "page" : undefined}
          >
            {tabContent}
          </Link>
        );
      })}
    </nav>
  );
}
