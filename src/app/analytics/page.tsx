"use client";

import { useState } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageLayout } from "@/components/PageLayout";
import { ROUTES } from "@/lib/constants";
import { exportData } from "@/lib/export";
import { buttonStyles, containerStyles } from "@/lib/styles";
import { trpc } from "@/trpc/client";

export default function AnalyticsPage() {
  const [userName, setUserName] = useState("");
  const [daysToAnalyze, setDaysToAnalyze] = useState(30);

  const {
    data: analytics,
    isLoading,
    error,
    refetch,
  } = trpc.injection.getAdvancedAnalytics.useQuery(
    {
      userName: userName || undefined,
      daysToAnalyze,
    },
    {
      enabled: true,
    },
  );

  const { data: injections } = trpc.injection.list.useQuery({
    userName: userName || undefined,
  });

  const handleExport = (format: "csv" | "pdf") => {
    if (!injections) return;

    // Convert regular injections to enhanced format for export
    const enhancedInjections = injections.map((inj) => ({
      ...inj,
      insulinType: null,
      insulinBrand: null,
      dosageUnits: null,
      bloodGlucoseBefore: null,
      bloodGlucoseAfter: null,
      bloodGlucoseUnit: "mg/dL" as const,
      mealType: null,
      carbsGrams: null,
      injectionSite: null,
      tags: null,
      inventoryId: null,
    }));

    exportData(
      enhancedInjections,
      { format, includeAnalytics: true, includeSummary: true },
      analytics,
      userName || undefined,
    );
  };

  if (isLoading) {
    return <LoadingSpinner message="Analyzing data..." />;
  }

  if (error) {
    return <ErrorMessage error={error.message} onRetry={refetch} />;
  }

  if (!analytics) {
    return <ErrorMessage error="No analytics data available" onRetry={refetch} />;
  }

  return (
    <PageLayout
      title="Advanced Analytics"
      icon="📈"
      backTo={{ href: ROUTES.HOME, label: "← Back to Dashboard" }}
    >
      {/* Controls */}
      <div className={`${containerStyles.card} mb-6`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by User
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="All users"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Analysis Period
            </label>
            <select
              value={daysToAnalyze}
              onChange={(e) => setDaysToAnalyze(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={() => handleExport("csv")} className={buttonStyles.secondary}>
            Export CSV
          </button>
          <button onClick={() => handleExport("pdf")} className={buttonStyles.secondary}>
            Export Report
          </button>
        </div>
      </div>

      {/* Insights */}
      {analytics.insights.length > 0 && (
        <div
          className={`${containerStyles.card} mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800`}
        >
          <h2 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">
            💡 Insights
          </h2>
          <div className="space-y-2">
            {analytics.insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <p className="text-sm text-blue-700 dark:text-blue-300">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Patterns */}
      <div className={containerStyles.section}>
        <h2 className="text-xl font-semibold mb-4">Time of Day Patterns</h2>
        {analytics.timePatterns.length === 0 ? (
          <p className="text-gray-500">No patterns found</p>
        ) : (
          <div className="space-y-2">
            {analytics.timePatterns.slice(0, 10).map((pattern, index) => {
              const timeStr = `${pattern.hour.toString().padStart(2, "0")}:${pattern.minute.toString().padStart(2, "0")}`;
              const percentage = Math.round(
                (pattern.count / analytics.timePatterns.reduce((sum, p) => sum + p.count, 0)) * 100,
              );

              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-medium">{timeStr}</span>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6">
                      <div
                        className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(percentage, 10)}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {pattern.count} ({percentage}%)
                        </span>
                      </div>
                    </div>
                  </div>
                  {pattern.averageGlucose && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      ~{Math.round(pattern.averageGlucose)} mg/dL
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day of Week Patterns */}
      <div className={`${containerStyles.section} mt-8`}>
        <h2 className="text-xl font-semibold mb-4">Day of Week Compliance</h2>
        <div className="grid grid-cols-7 gap-2">
          {analytics.dayOfWeekPatterns.map((day) => (
            <div key={day.dayOfWeek} className={`${containerStyles.card} text-center`}>
              <div className="text-sm font-medium mb-1">{day.dayName.slice(0, 3)}</div>
              <div
                className={`text-2xl font-bold ${
                  day.complianceRate >= 90
                    ? "text-green-600 dark:text-green-400"
                    : day.complianceRate >= 70
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {Math.round(day.complianceRate)}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {day.totalInjections} doses
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Trends */}
      <div className={`${containerStyles.section} mt-8`}>
        <h2 className="text-xl font-semibold mb-4">Compliance Trends</h2>

        {/* Daily Trend Summary */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Last {daysToAnalyze} Days
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={containerStyles.card}>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(
                  analytics.complianceTrends.daily.reduce((sum, d) => sum + d.complianceRate, 0) /
                    analytics.complianceTrends.daily.length,
                )}
                %
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Average Compliance</div>
            </div>

            <div className={containerStyles.card}>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {analytics.complianceTrends.daily.filter((d) => d.perfectDay).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Perfect Days</div>
            </div>

            <div className={containerStyles.card}>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {analytics.complianceTrends.daily.filter((d) => d.actualDoses === 1).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Partial Days</div>
            </div>

            <div className={containerStyles.card}>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {analytics.complianceTrends.daily.filter((d) => d.actualDoses === 0).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Missed Days</div>
            </div>
          </div>
        </div>

        {/* Weekly Summary */}
        {analytics.complianceTrends.weekly.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Weekly Summary
            </h3>
            <div className="space-y-2">
              {analytics.complianceTrends.weekly.map((week, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm w-32">{week.dateLabel}</span>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6">
                      <div
                        className={`h-6 rounded-full flex items-center justify-end pr-2 ${
                          week.complianceRate >= 90
                            ? "bg-green-500"
                            : week.complianceRate >= 70
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${Math.max(week.complianceRate, 5)}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {Math.round(week.complianceRate)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {week.actualDoses}/{week.expectedDoses}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Glucose Patterns */}
      {analytics.glucosePatterns && (
        <div className={`${containerStyles.section} mt-8`}>
          <h2 className="text-xl font-semibold mb-4">Glucose Patterns</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className={containerStyles.card}>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {analytics.glucosePatterns.timeInRange}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Time in Range (70-180)</div>
            </div>
          </div>

          {Object.keys(analytics.glucosePatterns.averageBeforeMeal).length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Average Before Meals</h3>
                <div className="space-y-1">
                  {Object.entries(analytics.glucosePatterns.averageBeforeMeal).map(
                    ([meal, avg]) => (
                      <div key={meal} className="flex justify-between text-sm">
                        <span className="capitalize">{meal}</span>
                        <span className="font-medium">{Math.round(avg)} mg/dL</span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {Object.keys(analytics.glucosePatterns.averageAfterMeal).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Average After Meals</h3>
                  <div className="space-y-1">
                    {Object.entries(analytics.glucosePatterns.averageAfterMeal).map(
                      ([meal, avg]) => (
                        <div key={meal} className="flex justify-between text-sm">
                          <span className="capitalize">{meal}</span>
                          <span className="font-medium">{Math.round(avg)} mg/dL</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
