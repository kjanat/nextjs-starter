"use client";

import { Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorMessage } from "@/components/ErrorMessage";
import { InjectionDashboard } from "@/components/InjectionDashboard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageLayout } from "@/components/PageLayout";
import { formatFullDate } from "@/lib/utils";

export default function Home() {
	return (
		<ErrorBoundary
			fallback={(error, reset) => (
				<ErrorMessage error={error} onRetry={reset} title="Failed to load dashboard" icon="🚨" />
			)}
		>
			<PageLayout title="Insulin Tracker" icon="🐕" subtitle={formatFullDate(new Date())}>
				<Suspense fallback={<LoadingSpinner message="Loading dashboard..." />}>
					<InjectionDashboard />
				</Suspense>
			</PageLayout>
		</ErrorBoundary>
	);
}
