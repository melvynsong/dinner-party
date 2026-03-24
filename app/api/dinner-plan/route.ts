import "server-only";

import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DinnerPlanRequest = {
	eventName?: unknown;
	dateTime?: unknown;
	location?: unknown;
	pax?: unknown;
	themePreference?: unknown;
};

type DinnerPlan = {
	theme: string;
	mains: number;
	carbs: number;
	vegetables: number;
	sides: number;
	desserts: number;
	drinks: number;
	notes: string;
};

function sanitizeString(value: unknown, fallback: string) {
	return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getThemeFromPreference(themePreference?: string) {
	let theme = "Nasi Lemak Night";

	if (themePreference) {
		const pref = themePreference.toLowerCase();
		if (pref.includes("japanese")) {
			theme = "Japanese Potluck Night";
		} else if (pref.includes("local") || pref.includes("nasi lemak")) {
			theme = "Local Comfort Night";
		} else if (pref.includes("peranakan")) {
			theme = "Peranakan Heritage Night";
		}
	}

	return theme;
}

function getThemeFoodSuggestions(theme: string) {
	const lowerTheme = theme.toLowerCase();

	if (lowerTheme.includes("japanese")) {
		return "Think simple Japanese dishes like karaage, gyoza, sushi rolls, potato salad, or matcha desserts.";
	}

	if (
		lowerTheme.includes("nasi lemak") ||
		lowerTheme.includes("local") ||
		lowerTheme.includes("comfort")
	) {
		return "Typical items include chicken wings, ikan bilis, otah, sambal, cucumber, and simple kueh desserts.";
	}

	if (lowerTheme.includes("peranakan")) {
		return "Good options include pongteh, chap chye, ayam dishes, and traditional kueh.";
	}

	return "Consider easy sharing dishes like roast chicken, noodles or rice, vegetables, finger sides, and simple desserts.";
}

function clampCount(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

function getBaseCounts(pax: number) {
	const safePax = clampCount(pax, 1, 50);

	let mains = Math.ceil(safePax / 4);
	let carbs = Math.max(1, Math.ceil(safePax / 8));
	let vegetables = Math.max(1, Math.ceil(safePax / 8));
	let sides = Math.ceil(safePax / 4);
	let desserts = Math.max(1, Math.ceil(safePax / 8));

	if (safePax <= 6) {
		mains = clampCount(mains, 2, 3);
		sides = Math.max(1, sides - 1);
		desserts = 1;
	} else if (safePax >= 13 && safePax <= 25) {
		sides += 1;
		mains += 1;
	} else if (safePax >= 26) {
		carbs += 1;
		vegetables += 1;
		desserts += 1;
	}

	return {
		mains: clampCount(mains, 1, 8),
		carbs: clampCount(carbs, 1, 8),
		vegetables: clampCount(vegetables, 1, 8),
		sides: clampCount(sides, 1, 8),
		desserts: clampCount(desserts, 1, 4),
		drinks: 1,
	};
}

function buildFallbackNotes(pax: number, theme: string) {
	const sizeGuide =
		pax <= 8
			? "This mix works well for a smaller group and keeps coordination easy."
			: pax <= 16
				? "This spread gives a balanced mix for a medium-sized group without making the potluck too heavy."
				: "This layout keeps a larger group practical to feed while still giving enough variety for sharing.";

	return `${sizeGuide} ${getThemeFoodSuggestions(theme)}`;
}

function fallbackPlan(pax: number, themePreference?: string): DinnerPlan {
	const theme = getThemeFromPreference(themePreference);
	const baseCounts = getBaseCounts(pax);

	return {
		theme,
		...baseCounts,
		notes: buildFallbackNotes(pax, theme),
	};
}

function normalizeCount(value: unknown, fallback: number, max: number) {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		return fallback;
	}

	return Math.min(Math.round(value), max);
}

/**
 * Strip any markdown code fences the model may have accidentally added,
 * then parse as JSON. Returns null if parsing fails.
 */
function safeParseJson(raw: string): Partial<DinnerPlan> | null {
	try {
		// Remove ```json ... ``` or ``` ... ``` wrappers if present
		const stripped = raw
			.replace(/^```(?:json)?\s*/i, "")
			.replace(/\s*```$/, "")
			.trim();

		return JSON.parse(stripped) as Partial<DinnerPlan>;
	} catch {
		console.error("PARSE_FAILED", { raw });
		return null;
	}
}

function normalizeRelativeCount(value: unknown, fallback: number, max: number) {
	const normalized = normalizeCount(value, fallback, max);
	return clampCount(normalized, Math.max(1, fallback - 1), Math.min(max, fallback + 1));
}

function normalizePlan(
	data: Partial<DinnerPlan>,
	pax: number,
	themePreference?: string,
): DinnerPlan {
	const fallback = fallbackPlan(pax, themePreference);

	return {
		theme:
			typeof data.theme === "string" && data.theme.trim()
				? data.theme.trim()
				: fallback.theme,
		mains: normalizeRelativeCount(data.mains, fallback.mains, 8),
		carbs: normalizeRelativeCount(data.carbs, fallback.carbs, 8),
		vegetables: normalizeRelativeCount(data.vegetables, fallback.vegetables, 8),
		sides: normalizeRelativeCount(data.sides, fallback.sides, 8),
		desserts: normalizeRelativeCount(data.desserts, fallback.desserts, 4),
		drinks: 1,
		notes:
			typeof data.notes === "string" && data.notes.trim()
				? data.notes.trim()
				: fallback.notes,
	};
}

async function generatePlan(input: {
	eventName: string;
	dateTime: string;
	location: string;
	pax: number;
	themePreference: string;
}): Promise<DinnerPlan> {
	const apiKey = process.env.OPENAI_API_KEY;

	console.log("DINNER_PLAN_REQUEST", {
		eventName: input.eventName,
		dateTime: input.dateTime,
		location: input.location,
		pax: input.pax,
		themePreference: input.themePreference,
		hasApiKey: Boolean(apiKey && apiKey !== "your_api_key_here"),
	});

	if (!apiKey || apiKey === "your_api_key_here") {
		console.log("USING_FALLBACK_PLAN", { reason: "missing or placeholder API key" });
		return fallbackPlan(input.pax, input.themePreference);
	}

	const client = new OpenAI({ apiKey });
	const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
	const baseCounts = getBaseCounts(input.pax);

	const response = await client.chat.completions.create({
		model,
		temperature: 0.4,
		response_format: { type: "json_object" },
		messages: [
			{
				role: "system",
				content:
					"You are helping plan a church or community potluck dinner. Respond with a raw JSON object only — no markdown, no code fences, no extra commentary. The object must have exactly these keys: theme (string), mains (number), carbs (number), vegetables (number), sides (number), desserts (number), drinks (number), notes (string). Use the provided scaled base counts as the authoritative structure. You may adjust each food count by at most plus or minus 1 if the theme or group context justifies it, but do not override the scaling logic. Keep counts practical. Enforce caps: mains <= 8, sides <= 8, desserts <= 4, drinks = 1. Keep the theme warm and realistic. Notes must be 1 to 2 short sentences with practical potluck food suggestions people can bring, using concrete examples that fit the theme. Avoid generic statements unless they are paired with actual dish ideas.",
			},
			{
				role: "user",
				content: `Create a suitable dinner party theme and recommended dish structure for this church/community dinner event.\nEvent name: ${input.eventName}\nDate & time: ${input.dateTime}\nLocation: ${input.location}\nPax: ${input.pax}\nHost notes / Theme preference: ${input.themePreference}\nBase counts to follow closely:\n- mains: ${baseCounts.mains}\n- carbs: ${baseCounts.carbs}\n- vegetables: ${baseCounts.vegetables}\n- sides: ${baseCounts.sides}\n- desserts: ${baseCounts.desserts}\n- drinks: ${baseCounts.drinks}`,
			},
		],
	});

	const content = response.choices[0]?.message?.content;

	console.log("OPENAI_RAW_RESPONSE", { content });

	if (!content) {
		console.log("USING_FALLBACK_PLAN", { reason: "empty response from model" });
		return fallbackPlan(input.pax, input.themePreference);
	}

	const parsed = safeParseJson(content);

	if (!parsed) {
		console.log("USING_FALLBACK_PLAN", { reason: "JSON parse failed" });
		return fallbackPlan(input.pax, input.themePreference);
	}

	return normalizePlan(parsed, input.pax, input.themePreference);
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as DinnerPlanRequest;
		const pax = Number(body.pax);

		if (!Number.isFinite(pax) || pax <= 0 || pax > 50) {
			return NextResponse.json(
				{ error: "pax must be a positive number between 1 and 50" },
				{ status: 400 },
			);
		}

		const input = {
			eventName: sanitizeString(body.eventName, "Dinner Party"),
			dateTime: sanitizeString(body.dateTime, "To be confirmed"),
			location: sanitizeString(body.location, "Location TBC"),
			pax: Math.round(pax),
			themePreference: sanitizeString(body.themePreference, "Church community dinner"),
		};

		const plan = await generatePlan(input);

		return NextResponse.json(plan);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("DINNER_PLAN_ERROR", { message });
		console.log("USING_FALLBACK_PLAN", { reason: "uncaught error" });
		return NextResponse.json(fallbackPlan(8));
	}
}
