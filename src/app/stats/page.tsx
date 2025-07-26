"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageLayout } from "@/components/PageLayout";
import { StatCard } from "@/components/StatCard";
import { ROUTES } from "@/lib/constants";
import { alertStyles, containerStyles } from "@/lib/styles";
import type { StatsResponse } from "@/types/api";

export default function StatsPage() {
	const [stats, setStats] = useState<StatsResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const sortedUserStats = useMemo(() => {
		if (!stats || !stats.userStats) return [];
		return Object.entries(stats.userStats).sort(([, a], [, b]) => b - a);
	}, [stats]);

	const topContributor = sortedUserStats[0] || null;

	const fetchStats = useCallback(async () => {
		try {
			setError(null);
			const response = await fetch("/api/injections/stats");

			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.statusText}`);
			}

			const result = await response.json();
			const data = result.data as StatsResponse;
			setStats(data);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to fetch statistics";
			console.error("Failed to fetch statistics:", err);
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	if (loading) {
		return <LoadingSpinner message="Loading statistics..." />;
	}

	if (!stats || error) {
		return <ErrorMessage error={error || "Failed to load statistics"} onRetry={fetchStats} />;
	}

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
					value={stats.lastWeekCompliance}
					label="7-Day Compliance"
					variant="green"
					suffix="%"
				/>
				<StatCard value={stats.morningInjections} label="Morning Doses" variant="yellow" />
				<StatCard value={stats.eveningInjections} label="Evening Doses" variant="purple" />
			</div>

			{/* Missed Doses Alert */}
			{stats.missedDoses > 0 && (
				<div className={`${alertStyles.error} mb-8`}>
					<div className="flex items-center gap-2">
						<span className="text-2xl">⚠️</span>
						<div>
							<div className="font-semibold text-red-700 dark:text-red-400">
								{stats.missedDoses} Missed Doses
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
							const percentage = Math.round((count / stats.totalInjections) * 100);
							const isTop = topContributor && topContributor[0] === name;

							return (
								<div key={name} className="flex items-center gap-3">
									{isTop && <span className="text-xl">🏆</span>}
									<div className="flex-1">
										<div className="flex justify-between mb-1">
											<span className="font-medium">{name}</span>
											<span className="text-sm text-gray-600 dark:text-gray-400">
												{count} ({percentage}%)
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
