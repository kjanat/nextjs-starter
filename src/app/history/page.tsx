"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Injection } from "@/types/injection";

export default function HistoryPage() {
	const [injections, setInjections] = useState<Injection[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

	const fetchInjections = useCallback(async () => {
		try {
			const response = await fetch(`/api/injections?date=${selectedDate}`);
			const data = (await response.json()) as { injections: Injection[] };
			setInjections(data.injections || []);
		} catch (error) {
			console.error("Failed to fetch injections:", error);
		} finally {
			setLoading(false);
		}
	}, [selectedDate]);

	useEffect(() => {
		fetchInjections();
	}, [fetchInjections]);

	const formatTime = (dateString: string) => {
		return new Date(dateString).toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
		});
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		});
	};

	return (
		<div className="min-h-screen p-4 max-w-md mx-auto">
			{/* Header */}
			<div className="text-center mb-8 pt-8">
				<h1 className="text-3xl font-bold mb-2">📅 History</h1>
				<Link href="/" className="text-blue-500 hover:underline">
					← Back to Dashboard
				</Link>
			</div>

			{/* Date Selector */}
			<div className="mb-6">
				<input
					type="date"
					value={selectedDate}
					onChange={(e) => setSelectedDate(e.target.value)}
					className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800"
				/>
			</div>

			{/* Injections List */}
			{loading ? (
				<div className="text-center py-8">
					<div className="text-xl">Loading...</div>
				</div>
			) : injections.length === 0 ? (
				<div className="text-center py-8 text-gray-500">
					No injections recorded for {formatDate(selectedDate)}
				</div>
			) : (
				<div className="space-y-3">
					{injections.map((injection) => (
						<div
							key={injection.id}
							className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4"
						>
							<div className="flex items-center justify-between">
								<div>
									<div className="flex items-center gap-2">
										<span className="text-lg">
											{injection.injection_type === "morning" ? "🌅" : "🌙"}
										</span>
										<span className="font-semibold capitalize">
											{injection.injection_type} Dose
										</span>
									</div>
									<div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
										By: {injection.user_name} at {formatTime(injection.injection_time)}
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
					))}
				</div>
			)}
		</div>
	);
}
