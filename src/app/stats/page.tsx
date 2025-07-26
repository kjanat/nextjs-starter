"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/StatCard";

interface Stats {
	totalInjections: number;
	morningInjections: number;
	eveningInjections: number;
	missedDoses: number;
	userStats: Record<string, number>;
	lastWeekCompliance: number;
}

export default function StatsPage() {
	const [stats, setStats] = useState<Stats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const sortedUserStats = useMemo(() => {
		if (!stats) return [];
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

			const data = (await response.json()) as Stats;
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
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-2xl">Loading statistics...</div>
			</div>
		);
	}

	if (!stats) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-xl text-red-500">{error || "Failed to load statistics"}</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen p-4 max-w-md mx-auto">
			{/* Header */}
			<div className="text-center mb-8 pt-8">
				<h1 className="text-3xl font-bold mb-2">📊 Statistics</h1>
				<Link href="/" className="text-blue-500 hover:underline">
					← Back to Dashboard
				</Link>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 gap-4 mb-8">
				<StatCard
					value={stats.totalInjections}
					label="Total Injections"
					colorClass="bg-blue-50 dark:bg-blue-900/20"
				/>
				<StatCard
					value={stats.lastWeekCompliance}
					label="7-Day Compliance"
					colorClass="bg-green-50 dark:bg-green-900/20"
					suffix="%"
				/>
				<StatCard
					value={stats.morningInjections}
					label="Morning Doses"
					colorClass="bg-orange-50 dark:bg-orange-900/20"
				/>
				<StatCard
					value={stats.eveningInjections}
					label="Evening Doses"
					colorClass="bg-purple-50 dark:bg-purple-900/20"
				/>
			</div>

			{/* Missed Doses Alert */}
			{stats.missedDoses > 0 && (
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-xl p-4 mb-8">
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
			<div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
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
		</div>
	);
}
