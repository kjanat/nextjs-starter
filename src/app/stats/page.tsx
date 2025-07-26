"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

	useEffect(() => {
		fetchStats();
	}, []);

	const fetchStats = async () => {
		try {
			const response = await fetch("/api/injections/stats");
			const data = (await response.json()) as Stats;
			setStats(data);
		} catch (error) {
			console.error("Failed to fetch statistics:", error);
		} finally {
			setLoading(false);
		}
	};

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
				<div className="text-xl text-red-500">Failed to load statistics</div>
			</div>
		);
	}

	const getTopContributor = () => {
		const users = Object.entries(stats.userStats);
		if (users.length === 0) return null;
		return users.reduce((a, b) => (a[1] > b[1] ? a : b));
	};

	const topContributor = getTopContributor();

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
				{/* Total Injections */}
				<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
					<div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
						{stats.totalInjections}
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400">Total Injections</div>
				</div>

				{/* Compliance Rate */}
				<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
					<div className="text-3xl font-bold text-green-600 dark:text-green-400">
						{stats.lastWeekCompliance}%
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400">7-Day Compliance</div>
				</div>

				{/* Morning Doses */}
				<div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl">
					<div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
						{stats.morningInjections}
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400">Morning Doses</div>
				</div>

				{/* Evening Doses */}
				<div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
					<div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
						{stats.eveningInjections}
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400">Evening Doses</div>
				</div>
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
				<div className="space-y-3">
					{Object.entries(stats.userStats)
						.sort(([, a], [, b]) => b - a)
						.map(([name, count]) => {
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
												className="bg-blue-500 h-2 rounded-full"
												style={{ width: `${percentage}%` }}
											/>
										</div>
									</div>
								</div>
							);
						})}
				</div>
			</div>
		</div>
	);
}
