"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import { InjectionCard } from "@/components/InjectionCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageLayout } from "@/components/PageLayout";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { INJECTION_TYPES } from "@/lib/constants";
import { alertStyles, buttonStyles, inputStyles } from "@/lib/styles";
import { formatFullDate } from "@/lib/utils";

export default function Home() {
	const { todayStatus, loading, error, refetch } = useTodayStatus();
	const [userName, setUserName] = useState("");
	const [showNamePrompt, setShowNamePrompt] = useState(false);
	const [isLogging, setIsLogging] = useState(false);

	const logInjection = useCallback(
		async (type: "morning" | "evening") => {
			if (!userName.trim()) {
				setShowNamePrompt(true);
				return;
			}

			setIsLogging(true);
			try {
				const response = await fetch("/api/injections", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						user_name: userName,
						injection_time: new Date().toISOString(),
						injection_type: type,
					}),
				});

				if (!response.ok) {
					throw new Error(`Failed to log injection: ${response.statusText}`);
				}

				await refetch();
			} catch (err) {
				console.error("Failed to log injection:", err);
				alert("Failed to log injection. Please try again.");
			} finally {
				setIsLogging(false);
			}
		},
		[userName, refetch],
	);

	if (loading) {
		return <LoadingSpinner message="Loading today's status..." />;
	}

	if (error) {
		return <ErrorMessage error={error} onRetry={refetch} />;
	}

	return (
		<PageLayout title="Insulin Tracker" icon="🐕" subtitle={formatFullDate(new Date())}>
			{/* Name Input */}
			{showNamePrompt && (
				<div className={`${alertStyles.warning} mb-6`}>
					<p className="text-sm mb-2">Please enter your name first:</p>
					<input
						type="text"
						value={userName}
						onChange={(e) => setUserName(e.target.value)}
						placeholder="Your name"
						className={inputStyles}
					/>
					<button
						type="button"
						onClick={() => setShowNamePrompt(false)}
						className={`mt-2 ${buttonStyles.primary}`}
					>
						Save
					</button>
				</div>
			)}

			{/* Status Cards */}
			<div className="space-y-4 mb-8">
				<InjectionCard
					type={INJECTION_TYPES.MORNING}
					isCompleted={todayStatus?.morningDone || false}
					injectionDetails={todayStatus?.morningDetails || null}
					onLogInjection={() => logInjection(INJECTION_TYPES.MORNING)}
					isLogging={isLogging}
				/>
				<InjectionCard
					type={INJECTION_TYPES.EVENING}
					isCompleted={todayStatus?.eveningDone || false}
					injectionDetails={todayStatus?.eveningDetails || null}
					onLogInjection={() => logInjection(INJECTION_TYPES.EVENING)}
					isLogging={isLogging}
				/>
			</div>

			{/* Quick Name Input */}
			{!showNamePrompt && (
				<div className="mb-6">
					<input
						type="text"
						value={userName}
						onChange={(e) => setUserName(e.target.value)}
						placeholder="Enter your name"
						className={inputStyles}
					/>
				</div>
			)}

			{/* Navigation */}
			<div className="flex gap-2">
				<Link href="/history" className={`flex-1 py-3 text-center ${buttonStyles.secondary}`}>
					History
				</Link>
				<Link href="/stats" className={`flex-1 py-3 text-center ${buttonStyles.secondary}`}>
					Statistics
				</Link>
			</div>
		</PageLayout>
	);
}
