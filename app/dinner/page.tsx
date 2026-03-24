"use client";

import { toPng } from "html-to-image";
import { useMemo, useRef, useState } from "react";

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

const clampCount = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const getBaseCounts = (pax: number) => {
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
};
const getThemeFoodSuggestions = (theme: string) => {
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
};

const buildFallbackNotes = (pax: number, theme: string) => {
	const sizeGuide =
		pax <= 8
			? "This mix works well for a smaller group and keeps coordination easy."
			: pax <= 16
				? "This spread gives a balanced mix for a medium-sized group without making the potluck too heavy."
				: "This layout keeps a larger group practical to feed while still giving enough variety for sharing.";

	return `${sizeGuide} ${getThemeFoodSuggestions(theme)}`;
};

const defaultPlan = (pax: number, themePreference?: string): DinnerPlan => {
	let theme = "Nasi Lemak Night";
	if (themePreference) {
		if (themePreference.toLowerCase().includes("japanese")) {
			theme = "Japanese Potluck Night";
		} else if (themePreference.toLowerCase().includes("local") || themePreference.toLowerCase().includes("nasi lemak")) {
			theme = "Local Comfort Night";
		}
	}

	const baseCounts = getBaseCounts(pax);

	return {
		theme,
		...baseCounts,
		notes: buildFallbackNotes(pax, theme),
	};
};

const formatDateLine = (dateTime: string) => {
	const eventDate = dateTime ? new Date(dateTime) : null;

	if (!eventDate || Number.isNaN(eventDate.getTime())) {
		return "To be confirmed";
	}

	return `${eventDate.toLocaleDateString([], {
		weekday: "long",
		month: "short",
		day: "numeric",
	})}, ${eventDate.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	})}`;
};

const formatWhatsappIntro = (eventName: string, dateTime: string) => {
	const eventDate = dateTime ? new Date(dateTime) : null;

	if (!eventDate || Number.isNaN(eventDate.getTime())) {
		return eventName || "Dinner party";
	}

	const day = eventDate.toLocaleDateString([], { weekday: "long" });
	const time = eventDate.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});

	return `${eventName || "Dinner party"} ${day}, ${time}`;
};

const getInvitationGradientClass = (theme: string) => {
	const lowerTheme = theme.toLowerCase();

	if (lowerTheme.includes("japanese")) {
		return "bg-gradient-to-b from-[#0a1028] via-[#2a46a8] to-[#6a4cf4]";
	}

	if (
		lowerTheme.includes("nasi lemak") ||
		lowerTheme.includes("local") ||
		lowerTheme.includes("comfort")
	) {
		return "bg-gradient-to-b from-[#104f34] via-[#c69a2d] to-[#f2e5bd]";
	}

	if (lowerTheme.includes("peranakan")) {
		return "bg-gradient-to-b from-[#0f4653] via-[#178f78] to-[#ef7e5b]";
	}

	return "bg-gradient-to-b from-[#121524] via-[#2648ba] to-[#7b58de]";
};

const addContributionSection = (
	lines: string[],
	emoji: string,
	title: string,
	count: number,
	label: string,
) => {
	if (count <= 0) {
		return;
	}

	lines.push(`${emoji} ${title}`);
	for (let index = 1; index <= count; index += 1) {
		lines.push(`- ${label} ${index} - `);
	}
	lines.push("");
};

const buildWhatsappMessage = ({
	eventName,
	dateTime,
	location,
	pax,
	plan,
}: {
	eventName: string;
	dateTime: string;
	location: string;
	pax: number;
	plan: DinnerPlan;
}) => {
	const lines: string[] = [];

	lines.push("Hi all 😊");
	lines.push("");
	lines.push(formatWhatsappIntro(eventName, dateTime));
	lines.push(`📍 ${location || "Location TBC"}`);
	lines.push("");
	lines.push(`We are expecting about ${pax} pax.`);
	lines.push("");
	lines.push(`Theme: ${plan.theme}`);
	lines.push("");

	if (plan.notes) {
		lines.push(plan.notes);
		lines.push("");
	}

	lines.push("Suggested Contribution:");
	lines.push("");
	addContributionSection(lines, "🍗", "Mains", plan.mains, "Main");
	addContributionSection(lines, "🍚", "Carbs", plan.carbs, "Carb");
	addContributionSection(lines, "🥬", "Vegetables", plan.vegetables, "Vegetable");
	addContributionSection(lines, "🍢", "Sides", plan.sides, "Side");
	addContributionSection(lines, "🍰", "Desserts", plan.desserts, "Dessert");
	addContributionSection(lines, "🥤", "Drinks / logistics", plan.drinks, "Drinks");
	lines.push("Please indicate what you would like to bring and your name 🙏");
	lines.push("");
	lines.push("Thank you everyone, and looking forward to a warm time of fellowship together 💛");

	return lines.join("\n");
};

export default function DinnerPage() {
	const invitationCardRef = useRef<HTMLDivElement | null>(null);
	const [eventName, setEventName] = useState("Friday Dinner Party");
	const [dateTime, setDateTime] = useState("2026-03-27T19:30");
	const [location, setLocation] = useState("Song's Place");
	const [pax, setPax] = useState("8");
	const [themePreference, setThemePreference] = useState("Warm local food, practical for potluck");
	const [plan, setPlan] = useState<DinnerPlan | null>(null);
	const [message, setMessage] = useState("");
	const [copied, setCopied] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [paxLimitNotice, setPaxLimitNotice] = useState(false);

	const paxCount = useMemo(() => {
		const value = Number.parseInt(pax, 10);
		if (Number.isNaN(value) || value < 1) {
			return 1;
		}

		return clampCount(value, 1, 50);
	}, [pax]);

	const handlePaxChange = (value: string) => {
		if (!value.trim()) {
			setPax("");
			setPaxLimitNotice(false);
			return;
		}

		const numeric = Number.parseInt(value, 10);
		if (Number.isNaN(numeric)) {
			setPax("1");
			setPaxLimitNotice(false);
			return;
		}

		if (numeric > 50) {
			setPax("50");
			setPaxLimitNotice(true);
			return;
		}

		setPax(String(clampCount(numeric, 1, 50)));
		setPaxLimitNotice(false);
	};

	const handleSuggestPlan = async () => {
		setIsLoading(true);
		setError("");
		setCopied(false);

		try {
			const response = await fetch("/api/dinner-plan", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					eventName,
					dateTime,
					location,
					pax: paxCount,
					themePreference,
				}),
			});

			const data = (await response.json()) as Partial<DinnerPlan> & {
				error?: string;
			};

			if (!response.ok) {
				throw new Error(data.error || "Unable to suggest a dinner plan right now.");
			}

			const newPlan: DinnerPlan = {
				theme: data.theme || defaultPlan(paxCount, themePreference).theme,
				mains: data.mains || defaultPlan(paxCount, themePreference).mains,
				carbs: data.carbs || defaultPlan(paxCount, themePreference).carbs,
				vegetables: data.vegetables || defaultPlan(paxCount, themePreference).vegetables,
				sides: data.sides || defaultPlan(paxCount, themePreference).sides,
				desserts: data.desserts || defaultPlan(paxCount, themePreference).desserts,
				drinks: data.drinks || defaultPlan(paxCount, themePreference).drinks,
				notes: data.notes || defaultPlan(paxCount, themePreference).notes,
			};

			setPlan(newPlan);
		} catch {
			setError("Sorry, we could not generate a dinner plan right now. Please try again.");
			setPlan(null);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDownloadInvitation = async () => {
		if (!invitationCardRef.current) {
			return;
		}

		setError("");
		setIsDownloading(true);

		try {
			const dataUrl = await toPng(invitationCardRef.current, {
				backgroundColor: "#0b0f1f",
				cacheBust: true,
				pixelRatio: 2,
			});

			const link = document.createElement("a");
			link.download = `${(eventName || "dinner-party").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-invitation.png`;
			link.href = dataUrl;
			link.click();
		} catch {
			setError("Sorry, we could not download the invitation card right now. Please try again.");
		} finally {
			setIsDownloading(false);
		}
	};

	const handleGenerateMessage = () => {
		const nextPlan = plan ?? defaultPlan(paxCount, themePreference);

		if (!plan) {
			setPlan(nextPlan);
		}

		const nextMessage = buildWhatsappMessage({
			eventName,
			dateTime,
			location,
			pax: paxCount,
			plan: nextPlan,
		});

		setMessage(nextMessage);
		setCopied(false);
	};

	const handleCopy = async () => {
		if (!message) {
			return;
		}

		try {
			await navigator.clipboard.writeText(message);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	};

	return (
		<main className="min-h-screen py-8 md:py-12">
			<div className="brand-shell space-y-6 md:space-y-8">
				<header className="brand-panel p-6 md:p-8">
					<p className="brand-eyebrow">Dinner Planner</p>
					<h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-50 md:text-4xl">
						Plan a church dinner event
					</h1>
					<p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300 md:text-base">
						Set the event details, generate a practical plan, create a premium invitation,
						and circulate the WhatsApp message in one flow.
					</p>
				</header>

				<section className="brand-panel p-6 md:p-8">
					<div className="space-y-6">
						<div className="space-y-1">
							<p className="brand-eyebrow">Event Details</p>
							<h2 className="text-xl font-semibold text-zinc-100">Build your dinner brief</h2>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<label className="space-y-2">
								<span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">
									Event Name
								</span>
								<input
									className="w-full rounded-2xl border border-indigo-100/20 bg-zinc-950/60 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-indigo-300/60 focus:ring-2 focus:ring-indigo-400/20"
									value={eventName}
									onChange={(event) => setEventName(event.target.value)}
									placeholder="Dinner with friends"
								/>
							</label>

							<label className="space-y-2">
								<span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">
									Date & Time
								</span>
								<input
									type="datetime-local"
									className="w-full rounded-2xl border border-indigo-100/20 bg-zinc-950/60 px-4 py-3 text-zinc-100 outline-none transition focus:border-indigo-300/60 focus:ring-2 focus:ring-indigo-400/20"
									value={dateTime}
									onChange={(event) => setDateTime(event.target.value)}
								/>
							</label>

							<label className="space-y-2">
								<span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">
									Location / Host
								</span>
								<input
									className="w-full rounded-2xl border border-indigo-100/20 bg-zinc-950/60 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-indigo-300/60 focus:ring-2 focus:ring-indigo-400/20"
									value={location}
									onChange={(event) => setLocation(event.target.value)}
									placeholder="Home / host name"
								/>
							</label>

							<label className="space-y-2">
								<span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">
									Estimated Pax
								</span>
								<input
									type="number"
									min="1"
									max="50"
									className="w-full rounded-2xl border border-indigo-100/20 bg-zinc-950/60 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-indigo-300/60 focus:ring-2 focus:ring-indigo-400/20"
									value={pax}
									onChange={(event) => handlePaxChange(event.target.value)}
									placeholder="8"
								/>
								{paxLimitNotice ? (
									<p className="text-xs text-amber-300">Maximum 50 pax for this planner</p>
								) : null}
							</label>
						</div>

						<label className="space-y-2">
							<span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">
								Theme Preference / Host Notes
							</span>
							<textarea
								className="w-full rounded-2xl border border-indigo-100/20 bg-zinc-950/60 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-indigo-300/60 focus:ring-2 focus:ring-indigo-400/20"
								value={themePreference}
								onChange={(event) => setThemePreference(event.target.value)}
								placeholder="e.g., Japanese theme, easy for families&#10;Warm local food, practical for potluck&#10;Suitable for church dinner, not too complicated"
								rows={3}
							/>
						</label>

						<div className="flex flex-col gap-3 sm:flex-row">
							<button
								type="button"
								onClick={handleSuggestPlan}
								disabled={isLoading}
								className="brand-cta-primary h-12 px-6 text-sm uppercase tracking-[0.08em] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isLoading ? "Generating Plan..." : "Suggest Dinner Plan"}
							</button>
							<button
								type="button"
								onClick={handleGenerateMessage}
								className="brand-cta-secondary h-12 px-6 text-sm uppercase tracking-[0.08em] transition hover:border-indigo-200/70 hover:bg-indigo-100/10"
							>
								Generate WhatsApp Message
							</button>
						</div>
					</div>
				</section>

				{error ? (
					<p className="rounded-2xl border border-red-200/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
						{error}
					</p>
				) : null}

				{plan ? (
					<>
						<section className="brand-panel p-6 md:p-8">
							<p className="brand-eyebrow">🎉 Guest Invitation</p>
							<h2 className="mt-1 text-xl font-semibold text-zinc-100">Guest-facing invitation card</h2>
							<div
								ref={invitationCardRef}
								className="mx-auto mt-4 w-full max-w-[23rem] p-3"
							>
								<div
									className={`relative min-h-[34rem] overflow-hidden rounded-[34px] px-8 py-12 text-center shadow-[0_28px_60px_rgba(0,0,0,0.38)] ring-1 ring-white/30 ${getInvitationGradientClass(
										plan.theme,
									)}`}
								>
									<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.28),transparent_38%),radial-gradient(circle_at_50%_115%,rgba(0,0,0,0.35),transparent_52%)]" />
									<div className="relative flex min-h-[28rem] flex-col items-center justify-between">
										<div>
											<p className="text-xs font-extrabold uppercase tracking-[0.32em] text-zinc-100/95">
												DINNER PARTY 🍽️
											</p>
											<h3 className="mt-8 text-3xl font-extrabold tracking-tight text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.35)]">
												{eventName || "Dinner Party"}
											</h3>
										</div>

										<div className="space-y-3 text-base leading-7 text-zinc-100 [text-shadow:0_1px_10px_rgba(0,0,0,0.28)]">
											<p>📅 {formatDateLine(dateTime)}</p>
											<p>📍 {location || "Location TBC"}</p>
										</div>

										<div className="w-full max-w-xs rounded-2xl border border-white/25 bg-black/20 px-4 py-4 backdrop-blur-sm">
											<p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-100/85">
												Theme
											</p>
											<p className="mt-2 text-xl font-semibold text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.22)]">
												{plan.theme}
											</p>
										</div>

										<p className="max-w-sm text-sm leading-7 text-zinc-100/95 [text-shadow:0_1px_8px_rgba(0,0,0,0.2)]">
											We’d love to have you join us for a warm evening of food and fellowship.
										</p>
									</div>
								</div>
							</div>
							<div className="mt-4 flex justify-center">
								<button
									type="button"
									onClick={handleDownloadInvitation}
									disabled={isDownloading}
									className="brand-cta-secondary h-12 px-5 text-sm uppercase tracking-[0.08em] transition hover:border-indigo-200/70 hover:bg-indigo-100/10 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{isDownloading ? "Downloading..." : "Download Invitation"}
								</button>
							</div>
						</section>

						<section className="brand-panel p-6 md:p-8">
							<div className="space-y-1">
								<p className="brand-eyebrow">🧑‍🍳 For Members (Food Coordination)</p>
								<h2 className="text-xl font-semibold text-zinc-100">Suggested Dinner Plan</h2>
							</div>
							<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
								<div className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-2">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
										Theme
									</p>
									<p className="mt-2 text-xl font-semibold text-zinc-100">{plan.theme}</p>
								</div>
								<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
										Mains
									</p>
									<p className="mt-2 text-xl font-semibold text-zinc-100">{plan.mains}</p>
								</div>
								<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
										Sides
									</p>
									<p className="mt-2 text-xl font-semibold text-zinc-100">{plan.sides}</p>
								</div>
								<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
										Carbs
									</p>
									<p className="mt-2 text-xl font-semibold text-zinc-100">{plan.carbs}</p>
								</div>
								<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
										Vegetables
									</p>
									<p className="mt-2 text-xl font-semibold text-zinc-100">{plan.vegetables}</p>
								</div>
								<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
										Desserts
									</p>
									<p className="mt-2 text-xl font-semibold text-zinc-100">{plan.desserts}</p>
								</div>
								<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
										Drinks / logistics
									</p>
									<p className="mt-2 text-xl font-semibold text-zinc-100">{plan.drinks}</p>
								</div>
								<div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2 lg:col-span-4">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
										Notes
									</p>
									<p className="mt-2 text-sm leading-7 text-zinc-200">{plan.notes}</p>
								</div>
							</div>
						</section>
					</>
				) : null}

				<section className="brand-panel p-6 md:p-8">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="brand-eyebrow">🧑‍🍳 For Members (Food Coordination)</p>
							<h2 className="mt-1 text-xl font-semibold text-zinc-100">WhatsApp Message</h2>
						</div>
						<button
							type="button"
							onClick={handleCopy}
							disabled={!message}
							className="brand-cta-secondary h-11 px-4 text-sm uppercase tracking-[0.08em] transition hover:border-indigo-200/70 hover:bg-indigo-100/10 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{copied ? "Copied" : "Copy"}
						</button>
					</div>
					<textarea
						className="mt-4 min-h-72 w-full rounded-2xl border border-indigo-100/20 bg-zinc-950/70 px-4 py-4 font-mono text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-indigo-300/60 focus:ring-2 focus:ring-indigo-400/20"
						value={message}
						onChange={(event) => setMessage(event.target.value)}
						placeholder="Generate a WhatsApp message to preview it here."
					/>
				</section>
			</div>
		</main>
	);
}
