interface LoadingSpinnerProps {
	message?: string;
	fullScreen?: boolean;
}

export function LoadingSpinner({ message = "Loading...", fullScreen = true }: LoadingSpinnerProps) {
	const containerClasses = fullScreen
		? "min-h-screen flex items-center justify-center"
		: "flex items-center justify-center py-8";

	return (
		<div className={containerClasses}>
			<div className="text-center">
				<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4" />
				<div className="text-xl text-gray-600 dark:text-gray-400">{message}</div>
			</div>
		</div>
	);
}
