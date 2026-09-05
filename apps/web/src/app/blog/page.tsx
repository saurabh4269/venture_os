import type { Metadata } from "next";
import Link from "next/link";
import { LandingShell } from "@/components/marketing/LandingChrome";

export const metadata: Metadata = {
  title: "Notes — Venture OS",
  description: "Build notes on sources, inbox confirm, and clear empty states.",
};

export default function BlogPage() {
  return (
    <LandingShell testId="blog-ready">
      <main id="main" className="mkt-legal">
        <p className="mkt-kicker">Notes</p>
        <h1>Build notes</h1>
        <p className="lede">
          Short posts on sources, inbox confirm, and clear empty states — written for teams who run real books.
        </p>
        <section>
          <h2>You confirm</h2>
          <p>
            Parser output lands in Inbox. A partner confirms before anything posts to the book — keeping the audit
            trail clean.
          </p>
        </section>
        <section>
          <h2>Blanks stay blank</h2>
          <p>
            If a cell is empty, the book shows —. That keeps Command and Ask grounded in what you have actually
            confirmed.
          </p>
        </section>
        <p className="mkt-soft-login mkt-legal-back">
          <Link href="/">← Back to Venture OS</Link>
          {" · "}
          <Link href="/security#methodology">Standards</Link>
        </p>
      </main>
    </LandingShell>
  );
}
