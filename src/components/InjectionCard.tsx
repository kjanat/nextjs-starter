import { memo, useMemo } from "react";
import { INJECTION_TARGETS } from "@/lib/constants";
import { buttonStyles, cn, getInjectionCardClasses } from "@/lib/styles";
import { formatTime } from "@/lib/utils";
import { INJECTION_TYPE, type Injection, type InjectionType } from "@/types/injection";

interface InjectionCardProps {
  type: InjectionType;
  isCompleted: boolean;
  injectionDetails: Injection | null;
  onLogInjection: () => void;
  isLogging: boolean;
  className?: string;
}

interface InjectionMetadata {
  emoji: string;
  title: string;
  target: string;
  ariaLabel: string;
}

const INJECTION_METADATA: Record<InjectionType, InjectionMetadata> = {
  [INJECTION_TYPE.MORNING]: {
    emoji: "🌅",
    title: "Morning Dose",
    target: INJECTION_TARGETS.MORNING,
    ariaLabel: "Morning insulin injection",
  },
  [INJECTION_TYPE.EVENING]: {
    emoji: "🌙",
    title: "Evening Dose",
    target: INJECTION_TARGETS.EVENING,
    ariaLabel: "Evening insulin injection",
  },
};

export const InjectionCard = memo<InjectionCardProps>(
  ({ type, isCompleted, injectionDetails, onLogInjection, isLogging, className }) => {
    const metadata = INJECTION_METADATA[type];

    const completionInfo = useMemo(() => {
      if (!isCompleted || !injectionDetails) return null;

      return {
        userName: injectionDetails.user_name,
        time: formatTime(injectionDetails.injection_time),
      };
    }, [isCompleted, injectionDetails]);

    const cardStatus = isCompleted ? "completed" : "pending";

    return (
      <article
        className={cn(getInjectionCardClasses(isCompleted), className)}
        aria-label={metadata.ariaLabel}
        aria-live="polite"
        aria-busy={isLogging}
      >
        <header className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">{metadata.title}</h2>
          <span className="text-2xl" role="img" aria-label={metadata.title}>
            {metadata.emoji}
          </span>
        </header>

        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Target: <time>{metadata.target}</time>
        </div>

        <div data-status={cardStatus}>
          {isCompleted && completionInfo && injectionDetails ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
                <span role="img" aria-label="Completed">
                  ✅
                </span>
                <span>Completed</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                By: <span className="font-medium">{completionInfo.userName}</span> at{" "}
                <time dateTime={injectionDetails.injection_time}>{completionInfo.time}</time>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogInjection}
              disabled={isLogging}
              className={cn("w-full py-3", buttonStyles.danger)}
              aria-label={`Log ${metadata.title.toLowerCase()}`}
            >
              {isLogging ? (
                <>
                  <span className="sr-only">Logging injection, please wait</span>
                  <span aria-hidden="true">Logging...</span>
                </>
              ) : (
                `Give ${metadata.title}`
              )}
            </button>
          )}
        </div>
      </article>
    );
  },
);

InjectionCard.displayName = "InjectionCard";
