import type { Metadata } from "next";
import Link from "next/link";
import { LandingShell } from "@/components/marketing/LandingChrome";

export const metadata: Metadata = {
  title: "Trust & methodology — Venture OS",
  description: "Cite or refuse, AES-backed connector vault, and honest empty states. No invented certifications.",
};

export default function SecurityPage() {
  return (
    <LandingShell>
      <main id="main" className="mkt-legal">
        <p className="mkt-kicker">Trust</p>
        <h1>Methodology, not a badge wall.</h1>
        <p className="lede">
          We do not claim SOC 2 or ISO here. What the product actually does: cite or refuse, encrypt connector
          keys at rest, and isolate organisations in the database.
        </p>

        <section id="methodology">
          <h2>Methodology</h2>
          <ul>
            <li>
              <strong>Cite or refuse.</strong> A figure without a source file and locator is not displayed as fact.
              Ask refuses when retrieval is empty.
            </li>
            <li>
              <strong>Missing is —.</strong> Null stays null. Aggregations skip blanks. Zero is only a stored zero.
            </li>
            <li>
              <strong>Propose, then confirm.</strong> The model never writes objective financial facts into the book.
            </li>
            <li>
              <strong>FX is a triple.</strong> Converted displays need rate, date, and source — or they refuse.
            </li>
            <li>
              <strong>Connectors stay honest.</strong> Saved keys are not “connected”. A health check must succeed.
            </li>
          </ul>
        </section>

        <section id="support">
          <h2>Support</h2>
          <p>
            There is no public Terms or Privacy route yet — those are sent in writing with design-partner access.
            Sessions are HttpOnly, SameSite=Lax, seven days. Connector keys are AES-encrypted at rest. New firms{" "}
            <Link href="/signup">get started</Link>. Existing users <Link href="/login">log in</Link>.
          </p>
        </section>
      </main>
    </LandingShell>
  );
}
