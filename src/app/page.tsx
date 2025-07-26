"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Injection } from "@/types/injection";

interface TodayStatus {
	date: string;
	morningDone: boolean;
	eveningDone: boolean;
	morningDetails: Injection | null;
	eveningDetails: Injection | null;
	allComplete: boolean;
}

export default function Home() {
	const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [userName, setUserName] = useState("");
	const [showNamePrompt, setShowNamePrompt] = useState(false);
	const [isLogging, setIsLogging] = useState(false);

	useEffect(() => {
		fetchTodayStatus();
		const interval = setInterval(fetchTodayStatus, 30000); // Refresh every 30 seconds
		return () => clearInterval(interval);
	}, []);

	const fetchTodayStatus = async () => {
		try {
			const response = await fetch("/api/injections/today");
			const data = (await response.json()) as TodayStatus;
			setTodayStatus(data);
		} catch (error) {
			console.error("Failed to fetch today status:", error);
		} finally {
			setLoading(false);
		}
	};

	const logInjection = async (type: "morning" | "evening") => {
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

			if (response.ok) {
				await fetchTodayStatus();
			}
		} catch (error) {
			console.error("Failed to log injection:", error);
		} finally {
			setIsLogging(false);
		}
	};

	const formatTime = (dateString: string | undefined) => {
		if (!dateString) return "";
		return new Date(dateString).toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
		});
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-2xl">Loading...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen p-4 max-w-md mx-auto">
			{/* Header */}
			<div className="text-center mb-8 pt-8">
				<h1 className="text-3xl font-bold mb-2">🐕 Insulin Tracker</h1>
				<p className="text-gray-600 dark:text-gray-400">
					{new Date().toLocaleDateString("en-US", {
						weekday: "long",
						year: "numeric",
						month: "long",
						day: "numeric",
					})}
				</p>
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
						autoFocus
					/>
					<button
						onClick={() => setShowNamePrompt(false)}
						className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg"
					>
						Save
					</button>
				</div>
			)}

			{/* Status Cards */}
			<div className="space-y-4 mb-8">
				{/* Morning Injection */}
				<div
					className={`p-6 rounded-xl border-2 ${
						todayStatus?.morningDone
							? "bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600"
							: "bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600"
					}`}
				>
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-xl font-semibold">Morning Dose</h2>
						<span className="text-2xl">🌅</span>
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400 mb-3">Target: ~8:00 AM</div>
					{todayStatus?.morningDone ? (
						<div>
							<div className="text-green-700 dark:text-green-400 font-semibold">✅ Completed</div>
							<div className="text-sm mt-1">
								By: {todayStatus.morningDetails?.user_name} at{" "}
								{formatTime(todayStatus.morningDetails?.injection_time)}
							</div>
						</div>
					) : (
						<button
							onClick={() => logInjection("morning")}
							disabled={isLogging}
							className="w-full py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50"
						>
							{isLogging ? "Logging..." : "Give Morning Injection"}
						</button>
					)}
				</div>

				{/* Evening Injection */}
				<div
					className={`p-6 rounded-xl border-2 ${
						todayStatus?.eveningDone
							? "bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600"
							: "bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600"
					}`}
				>
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-xl font-semibold">Evening Dose</h2>
						<span className="text-2xl">🌙</span>
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400 mb-3">Target: ~6:00 PM</div>
					{todayStatus?.eveningDone ? (
						<div>
							<div className="text-green-700 dark:text-green-400 font-semibold">✅ Completed</div>
							<div className="text-sm mt-1">
								By: {todayStatus.eveningDetails?.user_name} at{" "}
								{formatTime(todayStatus.eveningDetails?.injection_time)}
							</div>
						</div>
					) : (
						<button
							onClick={() => logInjection("evening")}
							disabled={isLogging}
							className="w-full py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50"
						>
							{isLogging ? "Logging..." : "Give Evening Injection"}
						</button>
					)}
				</div>
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
