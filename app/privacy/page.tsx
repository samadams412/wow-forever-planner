import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Forevercraft handles privacy-focused site analytics and information submitted through community feedback forms.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Forevercraft",
    description:
      "How Forevercraft handles site analytics, feedback submissions, and data sharing.",
    url: "/privacy",
    siteName: "Forevercraft",
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-10">
        <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent sm:text-3xl">
          Privacy Policy
        </h1>
        <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
          Forevercraft respects your privacy. This page explains what information is handled when you use
          forevercraft.app and why.
        </p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed text-foreground-muted">
        <section aria-labelledby="analytics-heading">
          <h2 id="analytics-heading" className="mb-2 font-heading text-lg font-semibold text-foreground">
            Site analytics
          </h2>
          <p>
            We use Vercel Analytics to understand, in aggregate, how the site is used and to improve it.
            It collects lightweight telemetry such as browser type, operating system, general location,
            and page views. This analytics data is designed to be privacy-focused and is not used to
            track you across the web.
          </p>
        </section>

        <section aria-labelledby="feedback-heading">
          <h2 id="feedback-heading" className="mb-2 font-heading text-lg font-semibold text-foreground">
            Feedback and bug reports
          </h2>
          <p>
            If you submit feedback or a bug report through our Google Form, Google receives the
            information you choose to provide, such as a description of the issue and, optionally, a
            contact email. We use those details only to review, respond to, and address your feedback
            or reported issue.
          </p>
        </section>

        <section aria-labelledby="sharing-heading">
          <h2 id="sharing-heading" className="mb-2 font-heading text-lg font-semibold text-foreground">
            Data sharing
          </h2>
          <p>
            We never sell your information or share it with advertisers. The essential service providers
            involved in operating this site are Vercel, which hosts the site and provides analytics, and
            Google, which provides the feedback form. Information submitted through the form is handled
            by Google so we can receive and review it.
          </p>
        </section>

        <section aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="mb-2 font-heading text-lg font-semibold text-foreground">
            Questions about privacy?
          </h2>
          <p>
            If you have a privacy question or request, please reach out through our{" "}
            <Link href="/contact" className="text-accent underline underline-offset-4 hover:text-foreground">
              feedback and contact form
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
