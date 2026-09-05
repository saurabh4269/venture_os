"use client";

import Link from "next/link";
import { Building2, FileCheck, Flag, LineChart, ShieldCheck } from "lucide-react";
import { LandingShell } from "./LandingChrome";

const KPI_LABELS = ["Companies", "Open flags", "Needs look", "Last sync"] as const;

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

const PIPELINE = [
  { stage: 1, name: "Source", body: "Vault — MIS, board packs, transcripts." },
  { stage: 2, name: "Proposed", body: "Inbox — parser output, not yet the book." },
  { stage: 3, name: "Reviewed", body: "Flags and units checked against evidence." },
  { stage: 4, name: "Book", body: "Confirmed facts with file and locator." },
  { stage: 5, name: "Analysis", body: "Ask, reports, and compare — book only." },
] as const;

export function MarketingLanding() {
  return (
    <LandingShell>
      <main id="main">
        <section className="mkt-hero">
          <div className="mkt-hero-copy">
            <h1>
              The book for the investment team.
            </h1>
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
            <p className="mkt-schematic">Schematic of Command — not a live book. Empty shows —.</p>
          </div>
        </section>

        <section className="mkt-trust" id="trust" aria-label="Trust">
          <p className="mkt-trust-kicker">Institutional portfolio management for VCs</p>
          <div className="mkt-trust-grid">
            <div>
              <strong>Cite or refuse</strong>
              <p>Every figure needs a source. Ask refuses when the book has no evidence.</p>
            </div>
            <div>
              <strong>Missing is —</strong>
              <p>Null stays null. We never coerce a blank into zero or a health score.</p>
            </div>
            <div>
              <strong>Human confirms</strong>
              <p>Inbox rows post to the book only after a partner confirms. No auto-post.</p>
            </div>
          </div>
          <p className="mkt-trust-partner">
            Design partner <span>V3 Ventures</span>
          </p>
        </section>

        <section className="mkt-section" id="product">
          <p className="mkt-kicker">Product</p>
          <h2>Uncompromising clarity</h2>
          <p className="lede mkt-lede">
            Command, Inbox, Flags, NAV, Compare, Ask, and Reports read only from confirmed facts. The parser
            proposes. A human confirms. Nothing auto-posts.
          </p>
          <div className="mkt-clarity" data-testid="mkt-clarity">
            <article>
              <div className="mkt-clarity-top">
                <span className="mkt-clarity-ico" aria-hidden>
                  <Building2 className="size-4" strokeWidth={1.5} />
                </span>
                <h3>Companies</h3>
                <div className="v">—</div>
              </div>
              <div className="mkt-clarity-status">
                <span>Empty until you confirm a row</span>
                <span className="mark">not zero</span>
              </div>
            </article>
            <article>
              <div className="mkt-clarity-top">
                <span className="mkt-clarity-ico" aria-hidden>
                  <Flag className="size-4" strokeWidth={1.5} />
                </span>
                <h3>Open flags</h3>
                <div className="v">—</div>
              </div>
              <div className="mkt-clarity-status">
                <span>No evidence, no flag</span>
                <span className="mark warn">catalog only</span>
              </div>
            </article>
            <article>
              <div className="mkt-clarity-top">
                <span className="mkt-clarity-ico" aria-hidden>
                  <LineChart className="size-4" strokeWidth={1.5} />
                </span>
                <h3>Needs look</h3>
                <div className="v">—</div>
              </div>
              <div className="mkt-clarity-status">
                <span>Missing stays missing</span>
                <span className="mark gap">gap</span>
              </div>
            </article>
          </div>
          <div className="mkt-cards">
            <article>
              <h3>Command</h3>
              <p>Fund pulse from booked names. Coverage gaps stay visible. Incomplete NAV says how many values are missing.</p>
            </article>
            <article>
              <h3>Inbox</h3>
              <p>Extracts wait here. Confirm, edit units, or reject. A row is not a fact until you say so.</p>
            </article>
            <article>
              <h3>Cite or refuse</h3>
              <p>Ask searches the book. Insufficient evidence returns a refusal — not an estimate.</p>
            </article>
            <article>
              <h3>Dual commentary</h3>
              <p>Objective from MIS. Subjective from calls and judgement. The lanes stay separate.</p>
            </article>
            <article>
              <h3>Reports</h3>
              <p>PDF, PPTX, and XLSX from the book on demand. No invented headline numbers.</p>
            </article>
            <article>
              <h3>Vault</h3>
              <p>Source documents with locator. Connector keys encrypted at rest — not connected until healthCheck.</p>
            </article>
          </div>
          <ol className="mkt-pipeline" aria-label="Book pipeline">
            {PIPELINE.map((step) => (
              <li key={step.name} data-stage={step.stage}>
                <span className="mkt-pipe-dot" aria-hidden />
                <div className="mkt-pipe-body">
                  <span className="mkt-stage">Stage {step.stage}</span>
                  <span className="mkt-stage-name">{step.name}</span>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mkt-section" id="how">
          <p className="mkt-kicker">How partners use it</p>
          <h2>Three steps to a live row.</h2>
          <ol className="mkt-steps">
            <li>
              <span className="mkt-step-ico" aria-hidden><FileCheck className="size-5" strokeWidth={1.5} /></span>
              <strong>1. Cite</strong>
              <p>Every figure needs a source document and locator. Missing stays —.</p>
            </li>
            <li>
              <span className="mkt-step-ico" aria-hidden><ShieldCheck className="size-5" strokeWidth={1.5} /></span>
              <strong>2. Verify</strong>
              <p>Confirm Inbox. Resolve units. Check flags against evidence. Corrections survive a re-parse.</p>
            </li>
            <li>
              <span className="mkt-step-ico" aria-hidden><LineChart className="size-5" strokeWidth={1.5} /></span>
              <strong>3. Report</strong>
              <p>Command, Flags, NAV, Ask, and Reports use only what you confirmed. Empty is empty.</p>
            </li>
          </ol>
        </section>

        <section className="mkt-section mkt-soft-close" id="pricing" aria-label="Pricing">
          <p className="mkt-kicker">Pricing</p>
          <h2>Talk to us. No public price list.</h2>
          <p className="lede mkt-lede">
            Venture OS is with design partners first. We will not invent a seat price here. The organisation starts empty.
          </p>
          <p className="mkt-soft-login">
            Already on the book?{" "}
            <Link href="/login" data-testid="landing-log-in">Log in</Link>
          </p>
        </section>

        <p className="mkt-partner-line">
          In partnership with <strong>V3 Ventures</strong> — we do not publish other customer logos or seed illustrative NAV.
        </p>
      </main>
    </LandingShell>
  );
}
