"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageLayout } from "@/components/PageLayout";
import { StatCard } from "@/components/StatCard";
import { DataCard, MissedDosesAlert } from "@/components/ui";
import { useStats } from "@/hooks/useInjections";
import { ROUTES } from "@/lib/constants";
import { buttonStyles, containerStyles } from "@/lib/styles";

export default function StatsPage() {
  const { data: stats, isLoading, error, refetch } = useStats();

  const sortedUserStats = useMemo(() => {
    if (!stats || !stats.userContributions) return [];
    return Object.entries(stats.userContributions).sort(
      ([, a], [, b]) => (b as number) - (a as number),
    );
  }, [stats]);

  const topContributor = sortedUserStats[0] || null;

  if (isLoading) {
    return <LoadingSpinner message="Loading statistics..." />;
  }

  if (!stats || error) {
    return <ErrorMessage error={error?.message || "Failed to load statistics"} onRetry={refetch} />;
  }

  // Calculate missed doses only if user has injection history
  const hasInjectionHistory = stats.totalInjections > 0;

  // Use last 7 days or actual tracking period, whichever is shorter
  const daysToCalculate =
    hasInjectionHistory && stats.actualDaysTracked > 0 ? Math.min(7, stats.actualDaysTracked) : 0;

  // Only calculate expected doses if user has started tracking
  const expectedDoses = daysToCalculate * 2; // 2 per day
  const actualDosesInPeriod =
    daysToCalculate > 0 ? Math.min(stats.totalInjections, expectedDoses) : 0;
  const missedDoses = daysToCalculate > 0 ? Math.max(0, expectedDoses - actualDosesInPeriod) : 0;

  return (
    <PageLayout
      title="Statistics"
      icon="📊"
      backTo={{ href: ROUTES.HOME, label: "← Back to Dashboard" }}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard value={stats.totalInjections} label="Total Injections" variant="blue" />
        <StatCard
          value={stats.complianceRate}
          label="30-Day Compliance"
          variant="green"
          suffix="%"
        />
        <StatCard value={stats.morningCount} label="Morning Doses" variant="yellow" />
        <StatCard value={stats.eveningCount} label="Evening Doses" variant="purple" />
      </div>

      {/* Perfect Days */}
      <DataCard
        title="Perfect Days"
        value={stats.perfectDays}
        subtitle={`Out of ${stats.totalDays} days`}
        variant="success"
        icon="✨"
        className="mb-8"
      />

      {/* Missed Doses Alert */}
      <MissedDosesAlert
        missedDoses={missedDoses}
        daysCalculated={daysToCalculate}
        hasHistory={hasInjectionHistory}
        className="mb-8"
      />

      {/* User Contributions */}
      <div className={containerStyles.section}>
        <h2 className="text-xl font-semibold mb-4">User Contributions</h2>
        {sortedUserStats.length === 0 ? (
          <p className="text-gray-500">No contributions yet</p>
        ) : (
          <div className="space-y-3">
            {sortedUserStats.map(([name, count]) => {
              const percentage = Math.round(((count as number) / stats.totalInjections) * 100);
              const isTop = topContributor && topContributor[0] === name;

              return (
                <div key={name} className="flex items-center gap-3">
                  {isTop && <span className="text-xl">🏆</span>}
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{name}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {String(count)} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Link to Advanced Analytics */}
      <div className="mt-8">
        <Link href="/analytics" className={`block w-full py-3 text-center ${buttonStyles.primary}`}>
          View Advanced Analytics →
        </Link>
      </div>
    </PageLayout>
  );
}
