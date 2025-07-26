// Utility functions for dynamic class names
export function cn(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(" ");
}

// Injection card styles
export const getInjectionCardClasses = (isCompleted: boolean): string => {
	const baseClasses = "p-6 rounded-xl border-2 transition-colors";

	if (isCompleted) {
		return cn(
			baseClasses,
			"bg-green-50 dark:bg-green-900/20",
			"border-green-400 dark:border-green-600",
		);
	}

	return cn(baseClasses, "bg-red-50 dark:bg-red-900/20", "border-red-400 dark:border-red-600");
};

// Button styles
export const buttonStyles = {
	primary: cn(
		"px-4 py-2 rounded-lg font-semibold transition-colors",
		"bg-blue-500 text-white hover:bg-blue-600",
		"disabled:opacity-50 disabled:cursor-not-allowed",
	),
	secondary: cn(
		"px-4 py-2 rounded-lg transition-colors",
		"bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600",
	),
	danger: cn(
		"px-4 py-2 rounded-lg font-semibold transition-colors",
		"bg-red-500 text-white hover:bg-red-600",
		"disabled:opacity-50 disabled:cursor-not-allowed",
	),
};

// Input styles
export const inputStyles = cn(
	"w-full px-4 py-2 rounded-lg",
	"border border-gray-300 dark:border-gray-600",
	"bg-white dark:bg-gray-800",
	"focus:outline-none focus:ring-2 focus:ring-blue-500",
);

// Alert styles
export const alertStyles = {
	warning: cn(
		"p-4 rounded-lg",
		"bg-yellow-100 dark:bg-yellow-900/20",
		"border border-yellow-400 dark:border-yellow-600",
	),
	error: cn(
		"p-4 rounded-lg",
		"bg-red-50 dark:bg-red-900/20",
		"border border-red-400 dark:border-red-600",
	),
};

// Container styles
export const containerStyles = {
	card: "bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4",
	section: "bg-gray-50 dark:bg-gray-800 rounded-xl p-6",
};
