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
        <p className="mkt-kicker">Trust</p>
        <h1>How we work</h1>
        <p className="lede">
          Venture OS is built for investment teams who need a clear book — with sources, confirmed facts, and
          room for judgement.
        </p>

        <section id="methodology">
          <h2>Standards</h2>
          <ul>
            <li>
              <strong>Sources attached.</strong> Every displayed figure links to a file and locator in your vault.
            </li>
            <li>
              <strong>Blanks stay blank.</strong> Empty cells show —. Aggregations skip gaps. Zero means a stored zero.
            </li>
            <li>
              <strong>Propose, then confirm.</strong> Parser output lands in Inbox. A partner accepts before it joins the book.
            </li>
            <li>
              <strong>FX with context.</strong> Converted amounts include rate, date, and source.
            </li>
            <li>
              <strong>Connectors earn trust.</strong> A connector shows connected only after a successful health check.
            </li>
          </ul>
        </section>

        <section id="support">
          <h2>Access &amp; security</h2>
          <p>
            Terms and privacy are shared in writing when you join. Sessions are HttpOnly and SameSite=Lax, seven days.
            Connector keys are AES-encrypted at rest. New firms{" "}
            <Link href="/signup">get started</Link>. Existing users <Link href="/login">log in</Link>.
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
