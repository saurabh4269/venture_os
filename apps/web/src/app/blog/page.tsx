import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Notes — Venture OS",
  description: "Build notes and product thinking. No invented portfolio data.",
};

export default function BlogPage() {
  return (
    <div className="mkt">
      <main className="mkt-legal">
      <p className="mkt-kicker">Notes</p>
      <h1>Build notes</h1>
      <p className="lede">
        Short posts on cite-or-refuse, inbox confirm, and honest empty states. No client names, no fake NAV.
      </p>
      <section>
        <h2>Human confirms</h2>
        <p>
          Parser output lands in Inbox. A partner confirms before anything posts to the book. Auto-post would break
          the audit trail.
        </p>
      </section>
      <section>
        <h2>Missing is —</h2>
        <p>
          If a cell is blank, the book shows —. We do not coerce null into zero, a health score, or an Ask answer.
        </p>
      </section>
      <p className="mkt-soft-login">
        <Link href="/">← Back to Venture OS</Link>
      </p>
      </main>
    </div>
  );
}
