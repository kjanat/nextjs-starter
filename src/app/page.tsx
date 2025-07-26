"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { InjectionCard } from "@/components/InjectionCard";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { INJECTION_TYPES } from "@/lib/constants";
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
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-2xl">Loading...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-xl text-red-500">Error: {error}</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen p-4 max-w-md mx-auto">
			{/* Header */}
			<div className="text-center mb-8 pt-8">
				<h1 className="text-3xl font-bold mb-2">🐕 Insulin Tracker</h1>
				<p className="text-gray-600 dark:text-gray-400">{formatFullDate(new Date())}</p>
			</div>

			{/* Name Input */}
			{showNamePrompt && (
				<div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 rounded-lg p-4 mb-6">
					<p className="text-sm mb-2">Please enter your name first:</p>
					<input
						type="text"
						value={userName}
						onChange={(e) => setUserName(e.target.value)}
						placeholder="Your name"
						className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800"
					/>
					<button
						type="button"
						onClick={() => setShowNamePrompt(false)}
						className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg"
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
						className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800"
					/>
				</div>
			)}

			{/* Navigation */}
			<div className="flex gap-2">
				<Link
					href="/history"
					className="flex-1 py-3 text-center bg-gray-200 dark:bg-gray-700 rounded-lg"
				>
					History
				</Link>
				<Link
					href="/stats"
					className="flex-1 py-3 text-center bg-gray-200 dark:bg-gray-700 rounded-lg"
				>
					Statistics
				</Link>
			</div>
		</div>
	);
}
