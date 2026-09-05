"use client";

import Link from "next/link";
import { FileCheck, ShieldCheck, LineChart } from "lucide-react";
import { LandingShell } from "./LandingChrome";

const KPI_LABELS = ["Companies", "Open flags", "Needs look", "Last sync"] as const;

const NOTES = [
  {
    title: "Cite or refuse",
    body: "Every figure needs a source. Ask says no when the book has no evidence.",
    href: "/security",
    label: "Read methodology",
  },
  {
    title: "Missing is —",
    body: "Null stays null. We never turn a blank cell into zero or a health score.",
    href: "/security",
    label: "How we handle gaps",
  },
  {
    title: "Human confirms",
    body: "Inbox rows post only after a partner confirms. Nothing auto-posts.",
    href: "/blog",
    label: "Notes from the build",
  },
] as const;

const STEPS = [
  { title: "Upload", body: "Drop MIS or board packs. Parser proposes — nothing posts yet." },
  { title: "Confirm", body: "Review Inbox. Fix units. Accept or reject each row." },
  { title: "Command", body: "See what needs a look. Every number links to the file." },
] as const;

function CommandFrame() {
  return (
    <div className="mkt-frame" aria-hidden="true">
      <div className="mkt-frame-head">
        <span>Command</span>
        <span>Empty book</span>
      </div>
      <div className="mkt-frame-kpis mkt-frame-kpis-4">
        {KPI_LABELS.map((label) => (
          <div key={label}>
            <div className="k">{label}</div>
            <div className="v">—</div>
          </div>
        ))}
      </div>
      <div className="mkt-frame-rows">
        <i style={{ width: "92%" }} />
        <i style={{ width: "74%" }} />
        <i style={{ width: "83%" }} />
        <i style={{ width: "58%" }} />
      </div>
    </div>
  );
}

export function MarketingLanding() {
  return (
    <LandingShell>
      <main id="main">
        <section className="mkt-hero">
          <div className="mkt-hero-copy">
            <h1>The book for the investment team.</h1>
            <p className="mkt-sub">
              Command, <span className="cite-word">cite</span>, and act on portfolio truth — with the file behind every number.
            </p>
            <div className="mkt-hero-ctas">
              <Link href="/signup" className="btn" data-testid="landing-get-started">
                Get started
              </Link>
            </div>
          </div>
          <div className="mkt-hero-visual">
            <CommandFrame />
            <p className="mkt-schematic">Schematic — not live data. Empty book shows —.</p>
          </div>
        </section>

        <section className="mkt-section" id="notes" aria-label="Notes">
          <p className="mkt-kicker">Notes</p>
          <div className="mkt-notes" data-testid="mkt-notes">
            {NOTES.map((note) => (
              <article key={note.title} className="mkt-note-card">
                <h2>{note.title}</h2>
                <p>{note.body}</p>
                <Link href={note.href} className="mkt-note-link">{note.label} →</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mkt-section" id="how" aria-label="How it works">
          <p className="mkt-kicker">How it works</p>
          <h2>Three steps. Plain English.</h2>
          <ol className="mkt-steps mkt-steps-plain">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <strong>{i + 1}. {step.title}</strong>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mkt-section mkt-soft-close" id="pricing" aria-label="Pricing">
          <p className="mkt-kicker">Pricing</p>
          <h2>Talk to us. No public price list.</h2>
          <p className="lede mkt-lede">
            The organisation starts empty. We will not invent a seat price here.
          </p>
          <p className="mkt-soft-login">
            Already on the book?{" "}
            <Link href="/login" data-testid="landing-log-in">Log in</Link>
          </p>
        </section>

        <p className="mkt-partner-line">
          Built with a design partner. We don&apos;t publish client logos or fake NAV.
        </p>
      </main>
    </LandingShell>
  );
}
