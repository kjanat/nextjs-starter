import { INJECTION_TARGETS, INJECTION_TYPES } from "@/lib/constants";
import { buttonStyles, getInjectionCardClasses } from "@/lib/styles";
import { formatTime } from "@/lib/utils";
import type { Injection } from "@/types/injection";

interface InjectionCardProps {
	type: "morning" | "evening";
	isCompleted: boolean;
	injectionDetails: Injection | null;
	onLogInjection: () => void;
	isLogging: boolean;
}

export function InjectionCard({
	type,
	isCompleted,
	injectionDetails,
	onLogInjection,
	isLogging,
}: InjectionCardProps) {
	const isMorning = type === INJECTION_TYPES.MORNING;
	const emoji = isMorning ? "🌅" : "🌙";
	const title = isMorning ? "Morning Dose" : "Evening Dose";
	const target = isMorning ? INJECTION_TARGETS.MORNING : INJECTION_TARGETS.EVENING;

	return (
		<div className={getInjectionCardClasses(isCompleted)}>
			<div className="flex items-center justify-between mb-3">
				<h2 className="text-xl font-semibold">{title}</h2>
				<span className="text-2xl">{emoji}</span>
			</div>
			<div className="text-sm text-gray-600 dark:text-gray-400 mb-3">Target: {target}</div>
			{isCompleted ? (
				<div>
					<div className="text-green-700 dark:text-green-400 font-semibold">✅ Completed</div>
					<div className="text-sm mt-1">
						By: {injectionDetails?.user_name} at {formatTime(injectionDetails?.injection_time)}
					</div>
				</div>
			) : (
				<button
					type="button"
					onClick={onLogInjection}
					disabled={isLogging}
					className={`w-full py-3 ${buttonStyles.danger}`}
				>
					{isLogging ? "Logging..." : `Give ${title}`}
				</button>
			)}
		</div>
	);
}
