import "server-only";

import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ImageGenerationRequest = {
	eventName?: unknown;
	dateTime?: unknown;
	location?: unknown;
	pax?: unknown;
	themePreference?: unknown;
	theme?: unknown;
};

type ImageResponse = {
	imageBase64: string;
	mimeType: string;
	promptUsed: string;
};

function sanitizeString(value: unknown, fallback: string): string {
	return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function buildImagePrompt(input: {
	eventName: string;
	dateTime: string;
	location: string;
	pax: number;
	theme: string;
	themePreference: string;
}): string {
	const hints = getThemeHints(input.theme);

	const prompt = `A warm, minimal, clean background for a church dinner invitation. Theme mood: ${input.theme}. Host notes: ${input.themePreference}. Visual style: ${hints.style}. Color palette: ${hints.colors}. Soft lighting, tasteful composition, subtle food or decor hints, cozy atmosphere, no clutter, suitable for WhatsApp sharing, poster-like background only. Do not include any readable text or typography in the image.`;

	return prompt;
}

function getThemeHints(theme: string): { style: string; colors: string } {
	const themeLower = theme.toLowerCase();

	if (themeLower.includes("japanese")) {
		return {
			style:
				"Japanese-inspired mood with soft lantern lighting, clean wooden textures, elegant simplicity",
			colors:
				"Warm whites, soft golds, muted reds, charcoal accents, natural wood tones",
		};
	}

	if (themeLower.includes("peranakan")) {
		return {
			style:
				"Peranakan-inspired mood with subtle heritage patterns, elegant textures, warm ambient glow",
			colors:
				"Soft jewel tones, warm cream, muted teal, gentle gold accents",
		};
	}

	if (
		themeLower.includes("local") ||
		themeLower.includes("nasi lemak") ||
		themeLower.includes("comfort")
	) {
		return {
			style:
				"Warm communal mood with subtle banana leaf textures, soft food-inspired decor hints, homey comfort",
			colors:
				"Warm earth tones, terracotta, cream, muted green accents",
		};
	}

	return {
		style: "Warm and welcoming community dinner mood with simple decor hints",
		colors: "Warm neutrals, soft amber lighting, gentle accent colors",
	};
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as ImageGenerationRequest;

		const eventName = sanitizeString(body.eventName, "Community Dinner");
		const dateTime = sanitizeString(body.dateTime, "Soon");
		const location = sanitizeString(body.location, "A special location");
		const theme = sanitizeString(body.theme, "Community Gathering");
		const themePreference = sanitizeString(
			body.themePreference,
			"A warm church community dinner",
		);

		const pax = Number(body.pax);
		if (!Number.isFinite(pax) || pax <= 0) {
			return NextResponse.json(
				{ error: "pax must be a positive number" },
				{ status: 400 },
			);
		}

		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey || apiKey === "your_api_key_here") {
			console.log("IMAGE_GENERATION_SKIPPED", {
				reason: "missing or placeholder API key",
			});
			return NextResponse.json(
				{
					error:
						"Image generation requires a valid OpenAI API key. Please set OPENAI_API_KEY in .env.local",
				},
				{ status: 401 },
			);
		}

		const imagePrompt = buildImagePrompt({
			eventName,
			dateTime,
			location,
			pax,
			theme,
			themePreference,
		});

		console.log("IMAGE_GENERATION_REQUEST", {
			eventName,
			theme,
			pax,
			hasApiKey: true,
		});

		const client = new OpenAI({ apiKey });

		const response = await client.images.generate({
			model: "dall-e-3",
			prompt: imagePrompt,
			n: 1,
			size: "1024x1792", // Portrait orientation for mobile/WhatsApp
			quality: "standard",
			response_format: "b64_json",
		});

		const imageB64 = response.data?.[0]?.b64_json;
		if (!imageB64) {
			console.error("IMAGE_GENERATION_FAILED", {
				reason: "no image data returned from API",
			});
			return NextResponse.json(
				{ error: "Failed to generate image data" },
				{ status: 500 },
			);
		}

		console.log("IMAGE_GENERATION_SUCCESS", { eventName, theme });

		const result: ImageResponse = {
			imageBase64: imageB64,
			mimeType: "image/png",
			promptUsed: imagePrompt,
		};

		return NextResponse.json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("IMAGE_GENERATION_ERROR", { message });
		return NextResponse.json(
			{ error: "Failed to generate invitation image" },
			{ status: 500 },
		);
	}
}
