export function formatTime(dateString: string | undefined): string {
	if (!dateString) return "";
	return new Date(dateString).toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});
}

export function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}

export function formatFullDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export function getToday(): string {
	return new Date().toISOString().split("T")[0];
}

export function getLastNDays(days: number): string[] {
	const dates: string[] = [];
	const now = new Date();

	for (let i = 0; i < days; i++) {
		const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
		dates.push(date.toISOString().split("T")[0]);
	}

	return dates;
}
