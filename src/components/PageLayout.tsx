import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/styles";

interface BackLink {
  href: string;
  label: string;
  ariaLabel?: string;
}

interface PageLayoutProps {
  title: string;
  icon?: string;
  subtitle?: string | ReactNode;
  backTo?: BackLink;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function PageLayout({
  title,
  icon,
  subtitle,
  backTo,
  children,
  className,
  headerClassName,
  contentClassName,
}: PageLayoutProps) {
  return (
    <div className={cn("min-h-screen p-4 max-w-md mx-auto", className)}>
      <header className={cn("text-center mb-8 pt-8", headerClassName)}>
        <h1 className="text-3xl font-bold mb-2">
          {icon && (
            <span className="mr-2" role="img" aria-label={`${title} icon`}>
              {icon}
            </span>
          )}
          <span>{title}</span>
        </h1>
        {subtitle && <div className="text-gray-600 dark:text-gray-400">{subtitle}</div>}
        {backTo && (
          <nav className="mt-2">
            <Link
              href={backTo.href}
              className="text-blue-500 hover:text-blue-600 hover:underline transition-colors"
              aria-label={backTo.ariaLabel ?? backTo.label}
            >
              {backTo.label}
            </Link>
          </nav>
        )}
      </header>

      <main className={contentClassName}>{children}</main>
    </div>
  );
}
