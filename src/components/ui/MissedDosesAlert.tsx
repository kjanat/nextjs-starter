import { Alert } from "./Alert";

/**
 * Props for the MissedDosesAlert component
 */
export interface MissedDosesAlertProps {
  /** Number of missed doses */
  missedDoses: number;
  /** Number of days being calculated */
  daysCalculated: number;
  /** Whether the user has any injection history */
  hasHistory: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A specialized alert component for displaying missed doses information.
 * Only shows if the user has injection history and has actually missed doses.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <MissedDosesAlert
 *   missedDoses={3}
 *   daysCalculated={7}
 *   hasHistory={true}
 * />
 *
 * // Will not render (no history)
 * <MissedDosesAlert
 *   missedDoses={14}
 *   daysCalculated={7}
 *   hasHistory={false}
 * />
 *
 * // Will not render (no missed doses)
 * <MissedDosesAlert
 *   missedDoses={0}
 *   daysCalculated={7}
 *   hasHistory={true}
 * />
 * ```
 */
export function MissedDosesAlert({
  missedDoses,
  daysCalculated,
  hasHistory,
  className,
}: MissedDosesAlertProps) {
  // Don't show alert if user has no history or no missed doses
  if (!hasHistory || missedDoses === 0) {
    return null;
  }

  const doseText = missedDoses === 1 ? "Dose" : "Doses";
  const dayText = daysCalculated === 1 ? "day" : "days";

  return (
    <Alert variant="error" title={`${missedDoses} Missed ${doseText}`} className={className}>
      In the last {daysCalculated} {dayText}
    </Alert>
  );
}
