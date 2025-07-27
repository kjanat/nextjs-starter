"use client";

import { useMemo } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageLayout } from "@/components/PageLayout";
import { StatCard } from "@/components/StatCard";
import { useStats } from "@/hooks/useInjections";
import { ROUTES } from "@/lib/constants";
import { alertStyles, containerStyles } from "@/lib/styles";

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

  // Calculate missed doses (expected - actual)
  const expectedDoses = 14; // 2 per day for 7 days
  const actualDoses = Math.min(stats.totalInjections, expectedDoses);
  const missedDoses = Math.max(0, expectedDoses - actualDoses);

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
      <div className={`${containerStyles.card} mb-8`}>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.perfectDays}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Perfect days out of {stats.totalDays}
          </div>
        </div>
      </div>

      {/* Missed Doses Alert */}
      {missedDoses > 0 && (
        <div className={`${alertStyles.error} mb-8`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-semibold text-red-700 dark:text-red-400">
                {missedDoses} Missed Doses
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">In the last 7 days</div>
            </div>
          </div>
        </div>
      )}

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
    </PageLayout>
  );
}
