"use client";

import { useState } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageLayout } from "@/components/PageLayout";
import type { Injection } from "@/generated/prisma";
import { useInjections } from "@/hooks/useInjections";
import { ROUTES } from "@/lib/constants";
import { containerStyles, inputStyles } from "@/lib/styles";
import { formatDate, formatTime, getToday } from "@/lib/utils";
import { INJECTION_TYPE } from "@/types/injection";

export default function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState(getToday());
  const { data: injectionsData, isLoading, error, refetch } = useInjections(selectedDate);

  if (isLoading) {
    return <LoadingSpinner message="Loading injection history..." />;
  }

  if (error) {
    return <ErrorMessage error={error.message} onRetry={refetch} />;
  }

  const injections = injectionsData || [];

  return (
    <PageLayout
      title="History"
      icon="📅"
      backTo={{ href: ROUTES.HOME, label: "← Back to Dashboard" }}
    >
      {/* Date Selector */}
      <div className="mb-6">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className={inputStyles}
        />
      </div>

      {/* Injections List */}
      {injections.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No injections recorded for {formatDate(selectedDate)}
        </div>
      ) : (
        <div className="space-y-3">
          {injections.map((injection: Injection) => {
            const isMorning = injection.injectionType === INJECTION_TYPE.MORNING;
            return (
              <div key={injection.id} className={containerStyles.card}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{isMorning ? "🌅" : "🌙"}</span>
                      <span className="font-semibold capitalize">
                        {injection.injectionType} Dose
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      By: {injection.userName} at {formatTime(injection.injectionTime.toString())}
                    </div>
                    {injection.notes && (
                      <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Note: {injection.notes}
                      </div>
                    )}
                  </div>
                  <div className="text-green-500">✅</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
