interface StatCardProps {
	value: number | string;
	label: string;
	colorClass: string;
	suffix?: string;
}

export function StatCard({ value, label, colorClass, suffix = "" }: StatCardProps) {
	return (
		<div className={`${colorClass} p-4 rounded-xl`}>
			<div
				className={`text-3xl font-bold ${colorClass.replace("bg-", "text-").replace("-50", "-600").replace("/20", "-400")}`}
			>
				{value}
				{suffix}
			</div>
			<div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
		</div>
	);
}
