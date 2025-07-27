"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import { InjectionCard } from "@/components/InjectionCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageLayout } from "@/components/PageLayout";
import type { Injection } from "@/generated/prisma";
import { useCreateInjection, useTodayStatus } from "@/hooks/useInjections";
import { APP_CONFIG, ROUTES } from "@/lib/constants";
import { alertStyles, buttonStyles, inputStyles } from "@/lib/styles";
import { formatFullDate } from "@/lib/utils";
import { INJECTION_TYPE, type InjectionType } from "@/types/injection";

export default function Home() {
  const { data: todayStatus, isLoading, error, refetch } = useTodayStatus();
  const createInjection = useCreateInjection();
  const [userName, setUserName] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  const logInjection = useCallback(
    async (type: (typeof INJECTION_TYPE)[keyof typeof INJECTION_TYPE]) => {
      const trimmedName = userName.trim();
      if (!trimmedName) {
        setShowNamePrompt(true);
        return;
      }

      if (trimmedName.length > APP_CONFIG.MAX_NAME_LENGTH) {
        alert(`Name must be less than ${APP_CONFIG.MAX_NAME_LENGTH} characters`);
        return;
      }

      try {
        await createInjection.mutateAsync({
          userName: trimmedName,
          injectionTime: new Date().toISOString(),
          injectionType: type,
        });
        setUserName("");
      } catch (err) {
        console.error("Failed to log injection:", err);
        alert("Failed to log injection. Please try again.");
      }
    },
    [userName, createInjection],
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading today's status..." />;
  }

  if (error) {
    return <ErrorMessage error={error.message} onRetry={refetch} />;
  }

  const morningInjection = todayStatus?.injections.find(
    (inj: Injection) => inj.injectionType === "morning",
  );
  const eveningInjection = todayStatus?.injections.find(
    (inj: Injection) => inj.injectionType === "evening",
  );

  return (
    <PageLayout title="Insulin Tracker" icon="🐕" subtitle={formatFullDate(new Date())}>
      {/* Name Input */}
      {showNamePrompt && (
        <div className={`${alertStyles.warning} mb-6`}>
          <p className="text-sm mb-2">Please enter your name first:</p>
          <input
            type="text"
            id="name-prompt"
            name="userName"
            autoComplete="name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Your name"
            className={inputStyles}
          />
          <button
            type="button"
            onClick={() => setShowNamePrompt(false)}
            className={`mt-2 ${buttonStyles.primary}`}
          >
            Save
          </button>
        </div>
      )}

      {/* Status Cards */}
      <div className="space-y-4 mb-8">
        <InjectionCard
          type={INJECTION_TYPE.MORNING}
          isCompleted={todayStatus?.morning || false}
          injectionDetails={
            morningInjection
              ? {
                  id: parseInt(morningInjection.id),
                  user_name: morningInjection.userName,
                  injection_time: morningInjection.injectionTime.toISOString(),
                  injection_type: morningInjection.injectionType as InjectionType,
                  notes: morningInjection.notes || undefined,
                  created_at: morningInjection.createdAt.toISOString(),
                }
              : null
          }
          onLogInjection={() => logInjection(INJECTION_TYPE.MORNING)}
          isLogging={createInjection.isPending}
        />
        <InjectionCard
          type={INJECTION_TYPE.EVENING}
          isCompleted={todayStatus?.evening || false}
          injectionDetails={
            eveningInjection
              ? {
                  id: parseInt(eveningInjection.id),
                  user_name: eveningInjection.userName,
                  injection_time: eveningInjection.injectionTime.toISOString(),
                  injection_type: eveningInjection.injectionType as InjectionType,
                  notes: eveningInjection.notes || undefined,
                  created_at: eveningInjection.createdAt.toISOString(),
                }
              : null
          }
          onLogInjection={() => logInjection(INJECTION_TYPE.EVENING)}
          isLogging={createInjection.isPending}
        />
      </div>

      {/* Quick Name Input */}
      {!showNamePrompt && (
        <div className="mb-6">
          <input
            type="text"
            id="quick-name"
            name="userName"
            autoComplete="name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            className={inputStyles}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        <Link
          href={ROUTES.HISTORY}
          className={`flex-1 py-3 text-center ${buttonStyles.secondary}`}
          aria-label="View injection history"
        >
          History
        </Link>
        <Link
          href={ROUTES.STATS}
          className={`flex-1 py-3 text-center ${buttonStyles.secondary}`}
          aria-label="View injection statistics"
        >
          Statistics
        </Link>
      </div>
    </PageLayout>
  );
}
