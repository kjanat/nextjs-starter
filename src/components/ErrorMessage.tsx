interface ErrorMessageProps {
	error: string | Error | null;
	fullScreen?: boolean;
	onRetry?: () => void;
}

export function ErrorMessage({ error, fullScreen = true, onRetry }: ErrorMessageProps) {
	const containerClasses = fullScreen
		? "min-h-screen flex items-center justify-center"
		: "flex items-center justify-center py-8";

	const errorMessage = error instanceof Error ? error.message : error || "An error occurred";

	return (
		<div className={containerClasses}>
			<div className="text-center max-w-md px-4">
				<div className="text-4xl mb-4">❌</div>
				<div className="text-xl text-red-500 mb-4">Error: {errorMessage}</div>
				{onRetry && (
					<button
						type="button"
						onClick={onRetry}
						className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
					>
						Try Again
					</button>
				)}
			</div>
		</div>
	);
}
