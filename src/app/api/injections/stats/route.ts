import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
	const { env } = await getCloudflareContext();

	try {
		const now = new Date();

		// Get total injections
		const totalResult = await env.DB.prepare("SELECT COUNT(*) as count FROM injections").first();

		// Get user statistics
		const userStatsResult = await env.DB.prepare(
			`SELECT user_name, COUNT(*) as count 
       FROM injections 
       GROUP BY user_name`,
		).all();

		// Get morning/evening distribution
		const typeStatsResult = await env.DB.prepare(
			`SELECT injection_type, COUNT(*) as count 
       FROM injections 
       GROUP BY injection_type`,
		).all();

		// Calculate missed doses (last 7 days)
		const lastWeekDates = [];
		for (let i = 0; i < 7; i++) {
			const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
			lastWeekDates.push(date.toISOString().split("T")[0]);
		}

		let missedDoses = 0;
		for (const date of lastWeekDates) {
			const dayResult = await env.DB.prepare(
				`SELECT injection_type 
         FROM injections 
         WHERE DATE(injection_time) = DATE(?)`,
			)
				.bind(date)
				.all();

			const injections = dayResult.results as Array<{ injection_type: string }>;
			const hasMorning = injections.some((i) => i.injection_type === "morning");
			const hasEvening = injections.some((i) => i.injection_type === "evening");

			if (!hasMorning) missedDoses++;
			if (!hasEvening) missedDoses++;
		}

		// Calculate compliance rate (last 7 days)
		const totalExpectedDoses = 14; // 2 per day * 7 days
		const actualDoses = totalExpectedDoses - missedDoses;
		const complianceRate = (actualDoses / totalExpectedDoses) * 100;

		// Process results
		const userStats: Record<string, number> = {};
		(userStatsResult.results as Array<{ user_name: string; count: number }>).forEach((row) => {
			userStats[row.user_name] = row.count;
		});

		const typeStats = {
			morning: 0,
			evening: 0,
		};
		(typeStatsResult.results as Array<{ injection_type: string; count: number }>).forEach((row) => {
			if (row.injection_type === "morning") typeStats.morning = row.count;
			if (row.injection_type === "evening") typeStats.evening = row.count;
		});

		return Response.json({
			totalInjections: (totalResult as { count: number })?.count || 0,
			morningInjections: typeStats.morning,
			eveningInjections: typeStats.evening,
			missedDoses,
			userStats,
			lastWeekCompliance: Math.round(complianceRate),
		});
	} catch (error) {
		console.error("Database error:", error);
		return Response.json({ error: "Failed to fetch statistics" }, { status: 500 });
	}
}
