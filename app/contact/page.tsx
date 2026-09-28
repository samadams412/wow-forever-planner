import type { Metadata } from "next";

// Update this value if the community feedback form changes.
const GOOGLE_FORM_EMBED_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfJFb88fn6C35jVGBxE0xuY9gvHUjfKxIJvthesQKxM9vWa5w/viewform?embedded=true";

export const metadata: Metadata = {
  title: "Community Feedback & Bug Reports",
  description:
    "Report incorrect recipe data, bugs, or suggestions for the Forevercraft planner.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent sm:text-3xl">
          Community Feedback &amp; Bug Reports
        </h1>
        <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
          Found incorrect recipe data, run into a bug, or have an idea to improve Forevercraft? Send it our way
          using the form below.
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
        <iframe
          title="Forevercraft community feedback and bug report form"
          src={GOOGLE_FORM_EMBED_URL}
          className="block h-[1050px] w-full border-0 bg-white"
          loading="lazy"
        >
          Loading…
        </iframe>
      </div>
    </main>
  );
}
