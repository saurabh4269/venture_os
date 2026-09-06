"use client";

import Link from "next/link";
import { LandingShell } from "./LandingChrome";

const KPI_LABELS = ["Companies", "Open flags", "Needs look", "Last sync"] as const;

const NOTES = [
  {
    title: "Sources attached",
    body: "Every figure links to the file and cell it came from.",
    href: "/security",
    label: "How we work",
  },
  {
    title: "Blanks stay blank",
    body: "Empty cells show —. Your book only shows numbers you have confirmed.",
    href: "/security",
    label: "Data standards",
  },
  {
    title: "You confirm",
    body: "New rows land in Inbox. A partner accepts before they join the book.",
    href: "/blog",
    label: "Notes from the build",
  },
] as const;

const STEPS = [
  { title: "Upload", body: "Add MIS or board packs. We propose rows for your review." },
  { title: "Confirm", body: "Check Inbox. Fix units. Accept what belongs in the book." },
  { title: "Command", body: "See what needs attention. Open any number to its source file." },
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
        <i className="mkt-frame-bar mkt-frame-bar-1" />
        <i className="mkt-frame-bar mkt-frame-bar-2" />
        <i className="mkt-frame-bar mkt-frame-bar-3" />
        <i className="mkt-frame-bar mkt-frame-bar-4" />
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
              <Link href="/login" className="btn ghost" data-testid="landing-hero-login">
                Log in
              </Link>
            </div>
          </div>
          <div className="mkt-hero-visual">
            <CommandFrame />
            <p className="mkt-schematic">Example layout — your book starts empty.</p>
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
          <h2>Three steps</h2>
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
          <h2>Talk to us about seats for your team.</h2>
          <p className="lede mkt-lede">
            Every firm starts with an empty book. We tailor pricing to your team size and workflow.
          </p>
          <p className="mkt-soft-login">
            Already on the book?{" "}
            <Link href="/login" data-testid="landing-log-in">Log in</Link>
          </p>
        </section>

        <p className="mkt-partner-line">
          Built alongside investment teams who run real portfolio books.
        </p>
      </main>
    </LandingShell>
  );
}
