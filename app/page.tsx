import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen py-10 md:py-16">
      <div className="brand-shell space-y-6 md:space-y-8">
        <section className="brand-panel px-6 py-10 md:px-10 md:py-14">
          <div className="flex flex-wrap items-center gap-3">
            <p className="brand-eyebrow">Dinner Party Planner</p>
            <span className="rounded-full border border-indigo-200/20 bg-indigo-300/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-indigo-100">
              Beta
            </span>
          </div>
          <div className="mt-5 max-w-3xl space-y-5">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-zinc-50 md:text-6xl">
              Plan community dinners with confidence.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
              Build a complete event plan, create a share-ready invitation, and generate a
              WhatsApp coordination message in one polished mobile-first flow.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dinner"
              className="brand-cta-primary inline-flex h-12 items-center justify-center px-6 text-sm tracking-wide transition hover:brightness-110"
            >
              Start Planning
            </Link>
            <p className="inline-flex h-12 items-center rounded-2xl border border-indigo-200/20 bg-indigo-100/5 px-5 text-sm text-zinc-300">
              Built for warm, practical gatherings.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="brand-panel-soft p-5">
            <p className="brand-eyebrow">Step 1</p>
            <h2 className="mt-3 text-lg font-semibold text-zinc-100">Generate dinner plan</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Set event details and receive a practical theme plus dish structure sized to your pax.
            </p>
          </article>
          <article className="brand-panel-soft p-5">
            <p className="brand-eyebrow">Step 2</p>
            <h2 className="mt-3 text-lg font-semibold text-zinc-100">Create invitation card</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Present a premium invitation card and download it instantly for WhatsApp sharing.
            </p>
          </article>
          <article className="brand-panel-soft p-5">
            <p className="brand-eyebrow">Step 3</p>
            <h2 className="mt-3 text-lg font-semibold text-zinc-100">Send coordination message</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Copy a structured contribution message with clean sections ready for group chat.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
