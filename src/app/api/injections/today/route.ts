import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";
import { apiRateLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
	// Check rate limit
	if (!(await apiRateLimiter.isAllowed(request))) {
		return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
	}

	const { env } = await getCloudflareContext();

	try {
		const today = new Date().toISOString().split("T")[0];

		const result = await env.DB.prepare(
			`SELECT injection_type, injection_time, user_name 
       FROM injections 
       WHERE DATE(injection_time) = DATE(?)
       ORDER BY injection_time DESC`,
		)
			.bind(today)
			.all();

		const injections = result.results as Array<{
			injection_type: string;
			injection_time: string;
			user_name: string;
		}>;
		const morningDone = injections.some((i) => i.injection_type === "morning");
		const eveningDone = injections.some((i) => i.injection_type === "evening");

		const morningInjection = injections.find((i) => i.injection_type === "morning");
		const eveningInjection = injections.find((i) => i.injection_type === "evening");

		return Response.json({
			date: today,
			morningDone,
			eveningDone,
			morningDetails: morningInjection || null,
			eveningDetails: eveningInjection || null,
			allComplete: morningDone && eveningDone,
		});
	} catch (error) {
		console.error("Database error:", error);
		return Response.json({ error: "Failed to fetch today status" }, { status: 500 });
	}
}
