"use client";

import { useCallback, useEffect, useState } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageLayout } from "@/components/PageLayout";
import { INJECTION_TYPES } from "@/lib/constants";
import { containerStyles, inputStyles } from "@/lib/styles";
import { formatDate, formatTime, getToday } from "@/lib/utils";
import type { InjectionsResponse } from "@/types/api";
import type { Injection } from "@/types/injection";

export default function HistoryPage() {
	const [injections, setInjections] = useState<Injection[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedDate, setSelectedDate] = useState(getToday());

	const fetchInjections = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(`/api/injections?date=${selectedDate}`);

			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.statusText}`);
			}

			const data = (await response.json()) as InjectionsResponse;
			setInjections(data.injections || []);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to fetch injections";
			console.error("Failed to fetch injections:", err);
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}, [selectedDate]);

	useEffect(() => {
		fetchInjections();
	}, [fetchInjections]);

	if (loading) {
		return <LoadingSpinner message="Loading injection history..." />;
	}

	if (error) {
		return <ErrorMessage error={error} onRetry={fetchInjections} />;
	}

	return (
		<PageLayout title="History" icon="📅" backTo={{ href: "/", label: "← Back to Dashboard" }}>
			{/* Date Selector */}
			<div className="mb-6">
				<input
					type="date"
					value={selectedDate}
					onChange={(e) => setSelectedDate(e.target.value)}
					className={inputStyles}
				/>
			</div>

			{/* Injections List */}
			{injections.length === 0 ? (
				<div className="text-center py-8 text-gray-500">
					No injections recorded for {formatDate(selectedDate)}
				</div>
			) : (
				<div className="space-y-3">
					{injections.map((injection) => {
						const isMorning = injection.injection_type === INJECTION_TYPES.MORNING;
						return (
							<div key={injection.id} className={containerStyles.card}>
								<div className="flex items-center justify-between">
									<div>
										<div className="flex items-center gap-2">
											<span className="text-lg">{isMorning ? "🌅" : "🌙"}</span>
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
						);
					})}
				</div>
			)}
		</PageLayout>
	);
}
