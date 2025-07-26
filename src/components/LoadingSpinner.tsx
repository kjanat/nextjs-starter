import { memo } from "react";
import { cn } from "@/lib/styles";

type SpinnerSize = "sm" | "md" | "lg";

interface LoadingSpinnerProps {
	message?: string;
	fullScreen?: boolean;
	size?: SpinnerSize;
	className?: string;
	spinnerClassName?: string;
	messageClassName?: string;
}

const sizeClasses: Record<SpinnerSize, { spinner: string; text: string }> = {
	sm: { spinner: "h-4 w-4 border", text: "text-sm" },
	md: { spinner: "h-8 w-8 border-2", text: "text-base" },
	lg: { spinner: "h-12 w-12 border-2", text: "text-xl" },
};

export const LoadingSpinner = memo<LoadingSpinnerProps>(
	({
		message = "Loading...",
		fullScreen = true,
		size = "md",
		className,
		spinnerClassName,
		messageClassName,
	}) => {
		const sizeConfig = sizeClasses[size];

		return (
			<div
				className={cn(
					fullScreen
						? "min-h-screen flex items-center justify-center"
						: "flex items-center justify-center py-8",
					className,
				)}
				role="status"
				aria-live="polite"
				aria-busy="true"
			>
				<div className="text-center">
					<div
						className={cn(
							"inline-block animate-spin rounded-full border-blue-500 border-transparent",
							sizeConfig.spinner,
							"border-b-blue-500 border-r-blue-500",
							spinnerClassName,
						)}
						aria-hidden="true"
					/>
					{message && (
						<p
							className={cn(
								"mt-4 text-gray-600 dark:text-gray-400",
								sizeConfig.text,
								messageClassName,
							)}
						>
							<span className="sr-only">Loading:</span> {message}
						</p>
					)}
				</div>
			</div>
		);
	},
);

LoadingSpinner.displayName = "LoadingSpinner";
