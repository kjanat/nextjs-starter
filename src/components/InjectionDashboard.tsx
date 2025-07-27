"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { memo, Suspense } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useInjectionForm } from "@/hooks/useInjectionForm";
import { useTodayStatus } from "@/hooks/useInjections";
import { ROUTES } from "@/lib/constants";
import { alertStyles, buttonStyles, cn, inputStyles } from "@/lib/styles";
import type { Injection } from "@/types";
import { INJECTION_TYPE } from "@/types/injection";

const InjectionCard = dynamic(
  () => import("@/components/InjectionCard").then((mod) => ({ default: mod.InjectionCard })),
  {
    loading: () => <div className="h-32 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl" />,
  },
);

interface NavigationLinksProps {
  className?: string;
}

const NavigationLinks = memo<NavigationLinksProps>(({ className }) => (
  <div className={cn("flex gap-2", className)}>
    <Link
      href={ROUTES.HISTORY}
      className={cn("flex-1 py-3 text-center", buttonStyles.secondary)}
      aria-label="View injection history"
      prefetch={true}
    >
      History
    </Link>
    <Link
      href={ROUTES.STATS}
      className={cn("flex-1 py-3 text-center", buttonStyles.secondary)}
      aria-label="View injection statistics"
      prefetch={true}
    >
      Statistics
    </Link>
  </div>
));

NavigationLinks.displayName = "NavigationLinks";

interface UserNameInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  touched?: boolean;
  showPrompt?: boolean;
  onPromptClose?: () => void;
}

const UserNameInput = memo<UserNameInputProps>(
  ({ value, onChange, onBlur, error, touched, showPrompt, onPromptClose }) => {
    const hasError = !!error && !!touched;

    if (showPrompt) {
      return (
        <div className={cn(alertStyles.warning, "mb-6")} role="alert">
          <p className="text-sm mb-2 font-medium">Please enter your name first:</p>
          <div>
            <input
              type="text"
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="Your name"
              className={cn(inputStyles, hasError && "border-red-500")}
              aria-label="Your name"
              aria-invalid={hasError}
              aria-describedby={hasError ? "name-error" : undefined}
            />
            {hasError && (
              <p id="name-error" className="text-sm text-red-500 mt-1">
                {error}
              </p>
            )}
          </div>
          {onPromptClose && (
            <button
              type="button"
              onClick={onPromptClose}
              className={cn("mt-2", buttonStyles.primary)}
              disabled={!value.trim() || hasError}
            >
              Save
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="mb-6">
        <label htmlFor="userName" className="sr-only">
          Enter your name
        </label>
        <input
          id="userName"
          type="text"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="Enter your name"
          className={cn(inputStyles, hasError && "border-red-500")}
          aria-invalid={hasError}
          aria-describedby={hasError ? "userName-error" : undefined}
        />
        {hasError && (
          <p id="userName-error" className="text-sm text-red-500 mt-1">
            {error}
          </p>
        )}
      </div>
    );
  },
);

UserNameInput.displayName = "UserNameInput";

export function InjectionDashboard() {
  const { data: todayStatus, refetch } = useTodayStatus();
  const form = useInjectionForm({
    onSuccess: async () => {
      await refetch();
    },
  });

  const morningInjection = todayStatus?.injections.find(
    (inj: Injection) => inj.injectionType === "morning",
  );
  const eveningInjection = todayStatus?.injections.find(
    (inj: Injection) => inj.injectionType === "evening",
  );

  return (
    <>
      <Suspense
        fallback={<LoadingSpinner message="Loading injection cards..." fullScreen={false} />}
      >
        <section className="space-y-4 mb-8" aria-label="Today's injections">
          <InjectionCard
            type={INJECTION_TYPE.MORNING}
            isCompleted={todayStatus?.morning ?? false}
            injectionDetails={morningInjection || null}
            onLogInjection={() => form.logInjection(INJECTION_TYPE.MORNING)}
            isLogging={form.isLogging}
          />
          <InjectionCard
            type={INJECTION_TYPE.EVENING}
            isCompleted={todayStatus?.evening ?? false}
            injectionDetails={eveningInjection || null}
            onLogInjection={() => form.logInjection(INJECTION_TYPE.EVENING)}
            isLogging={form.isLogging}
          />
        </section>
      </Suspense>

      <UserNameInput
        value={form.values.userName}
        onChange={form.handleChange("userName")}
        onBlur={form.handleBlur("userName")}
        error={form.errors.userName}
        touched={form.touched.userName}
      />

      <NavigationLinks />
    </>
  );
}
