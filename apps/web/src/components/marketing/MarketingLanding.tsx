import Link from "next/link";
import { LandingShell } from "./LandingChrome";

const FEATURES = [
  {
    name: "Command",
    body: "Fund pulse from booked names. Coverage gaps stay visible. Incomplete NAV says how many values are missing.",
  },
  {
    name: "Confirm",
    body: "Extracts wait here. Confirm, edit units, or reject. A row is not a fact until you say so.",
  },
  {
    name: "Cite or refuse",
    body: "Ask searches the book. Insufficient evidence returns a refusal, not an estimate.",
  },
  {
    name: "Dual commentary",
    body: "Objective from MIS. Subjective from calls and judgement. The lanes stay separate.",
  },
  {
    name: "Flags",
    body: "Catalog detectors with evidence. No evidence, no flag. Mute and snooze survive recompute.",
  },
  {
    name: "NAV",
    body: "Marks, roll-up, and period lock. Unofficial until locked. We do not invent an investment date.",
  },
] as const;

const PIPELINE = [
  { stage: 1, name: "Source", body: "Sources: MIS, board packs, transcripts." },
  { stage: 2, name: "Proposed", body: "Confirm: parser output, not yet the book." },
  { stage: 3, name: "Reviewed", body: "Flags and units checked against evidence." },
  { stage: 4, name: "Book", body: "Confirmed facts with file and locator." },
  { stage: 5, name: "Analysis", body: "Ask, reports, and compare. Book only." },
] as const;

function CommandStage() {
  return (
    <div className="mkt-dash" aria-hidden="true">
      <aside className="mkt-dash-rail">
        <span className="mkt-dash-logo">V</span>
        <ul>
          <li className="on">Command</li>
          <li>Flags</li>
          <li>NAV</li>
          <li>Compare</li>
        </ul>
      </aside>
      <div className="mkt-dash-main">
        <div className="mkt-dash-top">
          <span>Command</span>
          <span>New organisation</span>
        </div>
        <div className="mkt-dash-kpis">
          {["Active companies", "Open flags", "Coverage"].map((label) => (
            <div key={label}>
              <div className="k">{label}</div>
              <div className="v" />
            </div>
          ))}
        </div>
        <div className="mkt-dash-panels">
          <div className="mkt-dash-panel">
            <div className="mkt-dash-lab">
              <span>Runway</span>
              <span>Missing</span>
            </div>
            <i className="mkt-dash-bar" style={{ width: "32%" }} />
            <div className="mkt-dash-lab muted">
              <span>Cash</span>
              <span>Missing</span>
            </div>
            <i className="mkt-dash-bar faint" style={{ width: "54%" }} />
          </div>
          <aside className="mkt-dash-panel">
            <div className="mkt-dash-lab">
              <span>Needs a look</span>
              <span className="ok">Clear</span>
            </div>
            <p>Clear.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function MarketingLanding() {
  return (
    <LandingShell>
      <main id="main">
        <section className="mkt-hero">
          <p className="mkt-eyebrow">The portfolio operating system</p>
          <h1>
            The book for the <em>investment team.</em>
          </h1>
          <p className="mkt-sub">Command, cite, and act on the truth of your portfolio.</p>
          <div className="mkt-hero-ctas">
            <Link href="/signup" className="btn" data-testid="landing-get-started">
              Get started
            </Link>
            <Link href="/login" className="btn ghost" data-testid="landing-log-in">
              Log in
            </Link>
          </div>
          <div className="mkt-trust-pills" aria-label="Principles">
            <span>Cite or refuse</span>
            <span>Missing stays blank</span>
            <span>AES vault</span>
          </div>
        </section>

        <section className="mkt-product-stage" id="product" aria-labelledby="product-heading">
          <div className="mkt-stage-copy">
            <p className="mkt-eyebrow">One source of truth</p>
            <h2 id="product-heading">
              Uncompromising <em>Clarity</em>
            </h2>
          </div>
          <CommandStage />
          <p className="mkt-schematic">Schematic of Command, not a live book.</p>
        </section>

        <section className="mkt-section" id="trust" aria-label="Trust">
          <p className="mkt-kicker">Trust</p>
          <div className="mkt-clarity" data-testid="mkt-clarity">
            <article>
              <h3>Active companies</h3>
              <div className="v" />
              <div className="mkt-clarity-status">
                <span>Empty until you confirm a row</span>
                <span className="mark">not zero</span>
              </div>
            </article>
            <article>
              <h3>Open flags</h3>
              <div className="v" />
              <div className="mkt-clarity-status">
                <span>No evidence, no flag</span>
                <span className="mark warn">catalog only</span>
              </div>
            </article>
            <article>
              <h3>Coverage</h3>
              <div className="v" />
              <div className="mkt-clarity-status">
                <span>Missing stays missing</span>
                <span className="mark gap">gap</span>
              </div>
            </article>
          </div>
          <div className="mkt-bento">
            {FEATURES.map((card, i) => (
              <article key={card.name} className={i === 0 || i === 5 ? "is-ink" : undefined}>
                <span className="mkt-feat-num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{card.name}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mkt-section" id="approach">
          <p className="mkt-kicker">Approach</p>
          <h2>
            The Citation <em>Engine</em>
          </h2>
          <ol className="mkt-pipeline" aria-label="Book pipeline" data-testid="mkt-pipeline">
            {PIPELINE.map((s) => (
              <li key={s.stage} data-stage={s.stage}>
                <span className="mkt-pipe-dot" aria-hidden />
                <div className="mkt-pipe-body">
                  <span className="mkt-stage-num">{String(s.stage).padStart(2, "0")}</span>
                  <span className="mkt-stage">Stage {s.stage}</span>
                  <span className="mkt-stage-name">{s.name}</span>
                  {s.body}
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
              <span className="mkt-step-num">01</span>
              <strong>1. Cite</strong>
              <p>Every figure needs a source document and locator. We extract and link the page or cell. Missing stays blank.</p>
            </li>
            <li>
              <span className="mkt-step-num">02</span>
              <strong>2. Verify</strong>
              <p>Confirm the queue. Resolve units. Check flags against evidence. Corrections survive a re-parse.</p>
            </li>
            <li>
              <span className="mkt-step-num">03</span>
              <strong>3. Report</strong>
              <p>Command, Flags, NAV, Ask, and Reports use only what you confirmed. Empty is empty.</p>
            </li>
          </ol>
        </section>

        <section className="mkt-section mkt-partner" id="partners">
          <p className="mkt-kicker">Empty book</p>
          <h2>A new organisation starts empty.</h2>
          <p className="lede mkt-lede">
            We do not publish customer logos or invent portfolio figures for marketing. Command stays blank until
            your firm confirms its first pack.
          </p>
        </section>

        <section className="mkt-section mkt-pricing" id="pricing">
          <p className="mkt-kicker">Pricing</p>
          <h2>Talk to us. No public price list.</h2>
          <p className="lede mkt-lede">
            Venture OS is with design partners first. We will not invent a seat price here. Get started and we
            will discuss whether the book fits your firm, with an empty book until you confirm facts.
          </p>
          <div className="mkt-hero-ctas">
            <Link href="/signup" className="btn">
              Get started
            </Link>
            <Link href="/login" className="btn ghost">
              Log in
            </Link>
          </div>
        </section>

        <section className="mkt-final">
          <div className="mkt-final-panel" data-testid="mkt-final-panel">
            <h2>Ready for institutional clarity?</h2>
            <p>The organisation starts empty. We will not seed illustrative NAV.</p>
            <div className="mkt-hero-ctas">
              <Link href="/signup" className="btn mkt-final-btn">
                Get started
              </Link>
              <Link href="/login" className="btn mkt-final-ghost">
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>
    </LandingShell>
  );
}
