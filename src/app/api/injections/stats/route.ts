import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";
import { APP_CONFIG } from "@/lib/constants";
import { apiRateLimiter } from "@/lib/rate-limit";
import { getLastNDays } from "@/lib/utils";
import { INJECTION_TYPE } from "@/types/injection";

interface InjectionCount {
	injection_type: string;
	count: number;
}

interface UserCount {
	user_name: string;
	count: number;
}

interface DayInjections {
	date: string;
	morning_count: number;
	evening_count: number;
}

export async function GET(request: NextRequest) {
	// Check rate limit
	if (!(await apiRateLimiter.isAllowed(request))) {
		return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
	}

	const { env } = await getCloudflareContext();

	try {
		// Parallel queries for better performance
		const [totalResult, userStatsResult, typeStatsResult, weeklyDataResult] = await Promise.all([
			// Get total injections
			env.DB.prepare("SELECT COUNT(*) as count FROM injections").first(),

			// Get user statistics
			env.DB.prepare(
				`SELECT user_name, COUNT(*) as count 
				 FROM injections 
				 GROUP BY user_name
				 ORDER BY count DESC`,
			).all(),

			// Get morning/evening distribution
			env.DB.prepare(
				`SELECT injection_type, COUNT(*) as count 
				 FROM injections 
				 GROUP BY injection_type`,
			).all(),

			// Get last 7 days data in one query
			env.DB.prepare(
				`SELECT 
					DATE(injection_time) as date,
					SUM(CASE WHEN injection_type = ? THEN 1 ELSE 0 END) as morning_count,
					SUM(CASE WHEN injection_type = ? THEN 1 ELSE 0 END) as evening_count
				 FROM injections 
				 WHERE DATE(injection_time) >= DATE('now', '-' || ? || ' days')
				 GROUP BY DATE(injection_time)`,
			)
				.bind(INJECTION_TYPE.MORNING, INJECTION_TYPE.EVENING, APP_CONFIG.COMPLIANCE_DAYS)
				.all(),
		]);

		// Process weekly data for compliance calculation
		const weeklyData = (weeklyDataResult.results || []) as unknown as DayInjections[];
		const lastWeekDates = getLastNDays(APP_CONFIG.COMPLIANCE_DAYS);

		let missedDoses = 0;
		lastWeekDates.forEach((date) => {
			const dayData = weeklyData.find((d) => d.date === date);
			if (!dayData || dayData.morning_count === 0) missedDoses++;
			if (!dayData || dayData.evening_count === 0) missedDoses++;
		});

		// Calculate compliance rate
		const totalExpectedDoses = APP_CONFIG.COMPLIANCE_DAYS * APP_CONFIG.DOSES_PER_DAY;
		const actualDoses = totalExpectedDoses - missedDoses;
		const complianceRate = (actualDoses / totalExpectedDoses) * 100;

		// Process results
		const userStats: Record<string, number> = {};
		((userStatsResult.results || []) as unknown as UserCount[]).forEach((row) => {
			userStats[row.user_name] = row.count;
		});

		const typeStats = {
			morning: 0,
			evening: 0,
		};
		((typeStatsResult.results || []) as unknown as InjectionCount[]).forEach((row) => {
			if (row.injection_type === INJECTION_TYPE.MORNING) {
				typeStats.morning = row.count;
			} else if (row.injection_type === INJECTION_TYPE.EVENING) {
				typeStats.evening = row.count;
			}
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
