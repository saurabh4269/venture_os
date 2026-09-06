import type { Metadata } from "next";
import Link from "next/link";
import { LandingShell } from "@/components/marketing/LandingChrome";

export const metadata: Metadata = {
  title: "How we work — Venture OS",
  description: "Sources, confirmed facts, encrypted connectors, and clear empty states for VC portfolio teams.",
};

export default function SecurityPage() {
  return (
    <LandingShell testId="security-ready">
      <main id="main" className="mkt-legal">
        <p className="mkt-kicker">Standards</p>
        <h1>How we work</h1>
        <p className="lede">
          A clear book for the investment team — sources on every figure, confirmed facts, and a separate lane for judgement.
        </p>

        <section id="methodology" className="mkt-legal-cards">
          <article className="mkt-legal-card">
            <h2>Sources attached</h2>
            <p>Every displayed figure links to a file and locator in your vault.</p>
          </article>
          <article className="mkt-legal-card">
            <h2>Blanks stay blank</h2>
            <p>Empty cells show —. Aggregations skip gaps. Zero means a stored zero.</p>
          </article>
          <article className="mkt-legal-card">
            <h2>You confirm</h2>
            <p>Parser output lands in Inbox. A partner accepts before it joins the book.</p>
          </article>
          <article className="mkt-legal-card">
            <h2>FX with context</h2>
            <p>Converted amounts include rate, date, and source.</p>
          </article>
          <article className="mkt-legal-card">
            <h2>Connectors stay honest</h2>
            <p>A connector shows connected only after a successful health check.</p>
          </article>
        </section>

        <section id="support">
          <h2>Access</h2>
          <p>
            Terms and privacy are shared in writing when you join. Sessions last seven days. Connector keys are
            encrypted at rest. New firms <Link href="/signup">get started</Link>. Existing users{" "}
            <Link href="/login">log in</Link>.
          </p>
        </section>
        <p className="mkt-soft-login mkt-legal-back">
          <Link href="/">← Back to Venture OS</Link>
          {" · "}
          <Link href="/blog">Notes</Link>
        </p>
      </main>
    </LandingShell>
  );
}
