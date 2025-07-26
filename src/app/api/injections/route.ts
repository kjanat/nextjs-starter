import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";
import type { Injection } from "@/types/injection";

export async function GET(request: NextRequest) {
	const { env } = await getCloudflareContext();

	const url = new URL(request.url);
	const date = url.searchParams.get("date");

	try {
		let query = "SELECT * FROM injections";
		const params: string[] = [];

		if (date) {
			query += " WHERE DATE(injection_time) = DATE(?)";
			params.push(date);
		}

		query += " ORDER BY injection_time DESC";

		const result = await env.DB.prepare(query)
			.bind(...params)
			.all();

		return Response.json({ injections: result.results });
	} catch (error) {
		console.error("Database error:", error);
		return Response.json({ error: "Failed to fetch injections" }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	const { env } = await getCloudflareContext();

	try {
		const injection: Injection = await request.json();

		const result = await env.DB.prepare(
			"INSERT INTO injections (user_name, injection_time, injection_type, notes) VALUES (?, ?, ?, ?)",
		)
			.bind(
				injection.user_name,
				injection.injection_time,
				injection.injection_type,
				injection.notes || null,
			)
			.run();

		return Response.json({
			success: true,
			id: result.meta.last_row_id,
		});
	} catch (error) {
		console.error("Database error:", error);
		return Response.json({ error: "Failed to log injection" }, { status: 500 });
	}
}
