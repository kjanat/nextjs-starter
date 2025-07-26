import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";
import { sanitizeNotes, sanitizeUserName, validateInjectionData } from "@/lib/validation";

export async function GET(request: NextRequest) {
	const { env } = await getCloudflareContext();

	const url = new URL(request.url);
	const date = url.searchParams.get("date");

	try {
		let query = "SELECT * FROM injections";
		const params: string[] = [];

		if (date) {
			// Validate date format
			const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
			if (!dateRegex.test(date)) {
				return Response.json({ error: "Invalid date format" }, { status: 400 });
			}

			query += " WHERE DATE(injection_time) = DATE(?)";
			params.push(date);
		}

		query += " ORDER BY injection_time DESC LIMIT 100"; // Add limit for performance

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
		const data = await request.json();

		// Validate injection data
		if (!validateInjectionData(data)) {
			return Response.json({ error: "Invalid injection data" }, { status: 400 });
		}

		// Sanitize input
		const sanitizedData = {
			user_name: sanitizeUserName(data.user_name),
			injection_time: data.injection_time,
			injection_type: data.injection_type,
			notes: sanitizeNotes(data.notes),
		};

		const result = await env.DB.prepare(
			"INSERT INTO injections (user_name, injection_time, injection_type, notes) VALUES (?, ?, ?, ?)",
		)
			.bind(
				sanitizedData.user_name,
				sanitizedData.injection_time,
				sanitizedData.injection_type,
				sanitizedData.notes,
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
