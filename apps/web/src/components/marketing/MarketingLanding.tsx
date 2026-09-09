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

function IconBulb() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .9 1.7h5.4c.1-.7.4-1.3.9-1.7A6 6 0 0 0 12 3z" />
    </svg>
  );
}
function IconBalloon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <ellipse cx="12" cy="10" rx="6" ry="7.2" />
      <path d="M12 17c0 2-1.2 4.5-1.2 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 5 6v6c0 4.2 2.8 7 7 8.4C16.2 19 19 16.2 19 12V6l-7-3z" />
      <path d="M12 8v5M10.2 14.2 12 16l3.2-3.4" />
    </svg>
  );
}
function IconEyes() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
      <ellipse cx="8" cy="12" rx="3.4" ry="4" />
      <ellipse cx="16" cy="12" rx="3.4" ry="4" />
      <circle cx="8.6" cy="12.4" r="1.2" fill="#111" />
      <circle cx="16.6" cy="12.4" r="1.2" fill="#111" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#fff" strokeWidth="2.4">
      <circle cx="12" cy="12" r="8.2" />
      <path d="m8.4 12.2 2.4 2.4 4.8-5" />
    </svg>
  );
}

function HeroConstellation() {
  return (
    <div className="mkt-constellation" aria-hidden="true">
      <svg className="mkt-constellation-lines" viewBox="0 0 900 420" preserveAspectRatio="xMidYMid meet">
        <path d="M450 190 L220 90 L140 180 L220 280 L360 310" />
        <path d="M450 190 L680 80 L790 160 L700 270 L540 320" />
        <circle cx="220" cy="90" r="4" />
        <circle cx="140" cy="180" r="4" />
        <circle cx="220" cy="280" r="4" />
        <circle cx="680" cy="80" r="4" />
        <circle cx="790" cy="160" r="4" />
        <circle cx="700" cy="270" r="4" />
      </svg>
      <div className="mkt-node mkt-node-hub">
        <IconCheck />
      </div>
      <div className="mkt-node mkt-node-bulb">
        <IconBulb />
      </div>
      <div className="mkt-node mkt-node-balloon">
        <IconBalloon />
      </div>
      <div className="mkt-node mkt-node-shield">
        <IconShield />
      </div>
      <div className="mkt-node mkt-node-eyes">
        <IconEyes />
      </div>
      <div className="mkt-node mkt-node-face mkt-node-face-a">V</div>
      <div className="mkt-node mkt-node-face mkt-node-face-b">O</div>
    </div>
  );
}

function EmptyKpis() {
  return (
    <div className="mkt-mini-kpis" aria-hidden="true">
      {["Active companies", "Open flags", "Coverage"].map((label) => (
        <div key={label}>
          <span>{label}</span>
          <i />
        </div>
      ))}
    </div>
  );
}

export function MarketingLanding() {
  return (
    <LandingShell>
      <main id="main">
        <section className="mkt-hero">
          <HeroConstellation />
          <h1>The book for the investment team.</h1>
          <p className="mkt-sub">Command, cite, and act on the truth of your portfolio.</p>
          <div className="mkt-hero-ctas">
            <Link href="/signup" className="btn mkt-coral" data-testid="landing-get-started">
              Get started
            </Link>
            <Link href="/login" className="btn ghost" data-testid="landing-log-in">
              Log in
            </Link>
          </div>
        </section>

        <section className="mkt-sheet" id="product" aria-labelledby="product-heading">
          <p className="mkt-kicker">Product</p>
          <h2 id="product-heading">Uncompromising Clarity</h2>
          <p className="mkt-lede">
            Command, Confirm, Flags, NAV, Compare, Ask, and Reports read only from confirmed facts. The parser
            proposes. A human confirms.
          </p>
          <div className="mkt-audience">
            <article>
              <div className="mkt-audience-art mkt-art-bars" aria-hidden>
                <b />
                <b />
                <b />
                <b />
              </div>
              <h3>For the investment team</h3>
              <p>One book. Coverage stays visible. Missing stays blank.</p>
            </article>
            <article>
              <div className="mkt-audience-art mkt-art-ring" aria-hidden>
                <span>Cite or refuse</span>
              </div>
              <h3>For partners</h3>
              <p>Ask searches the book. No evidence returns a refusal, not an estimate.</p>
            </article>
            <article>
              <div className="mkt-audience-art mkt-art-shield" aria-hidden>
                <IconShield />
              </div>
              <h3>For operators</h3>
              <p>Confirm is the write-gate. Nothing auto-posts unless you set a threshold.</p>
            </article>
          </div>
          <div className="mkt-wide">
            <article>
              <h3>Active companies</h3>
              <p>Empty until you confirm a row. Not zero.</p>
              <EmptyKpis />
            </article>
            <article>
              <h3>Needs a look</h3>
              <p>No evidence, no flag. Catalog only.</p>
              <p className="mkt-wide-clear">Clear.</p>
            </article>
          </div>
        </section>

        <section className="mkt-section" id="features">
          <p className="mkt-kicker">Features</p>
          <h2>Built around the book.</h2>
          <div className="mkt-bento">
            {FEATURES.map((card, i) => (
              <article key={card.name}>
                <span className="mkt-feat-num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{card.name}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mkt-section" id="approach">
          <p className="mkt-kicker">Resources</p>
          <h2>The Citation Engine</h2>
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
          <p className="mkt-kicker">How it is used</p>
          <h2>Three steps to a live row.</h2>
          <ol className="mkt-steps">
            <li>
              <span className="mkt-step-num">01</span>
              <strong>1. Cite</strong>
              <p>Every figure needs a source document and locator. Missing stays blank.</p>
            </li>
            <li>
              <span className="mkt-step-num">02</span>
              <strong>2. Verify</strong>
              <p>Confirm the queue. Resolve units. Check flags against evidence.</p>
            </li>
            <li>
              <span className="mkt-step-num">03</span>
              <strong>3. Report</strong>
              <p>Command, Flags, NAV, Ask, and Reports use only what you confirmed.</p>
            </li>
          </ol>
        </section>

        <section className="mkt-sheet" id="trust" aria-label="Trust">
          <div className="mkt-gear" aria-hidden />
          <h2>Sources you already have.</h2>
          <p className="mkt-lede">
            Upload MIS, board packs, and transcripts. Live connectors stay not connected until a health check.
          </p>
          <div className="mkt-tools">
            {[
              { name: "XLSX", body: "MIS packs" },
              { name: "CSV", body: "Exports" },
              { name: "PDF", body: "Board decks" },
              { name: "Confirm", body: "Write-gate" },
              { name: "Ask", body: "Cite or refuse" },
            ].map((t, i) => (
              <div key={t.name} className={`mkt-tool mkt-tool-${i}`}>
                <strong>{t.name}</strong>
                <span>{t.body}</span>
              </div>
            ))}
          </div>
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
        </section>

        <section className="mkt-section mkt-pricing" id="pricing">
          <p className="mkt-kicker">Pricing</p>
          <h2>Talk to us. No public price list.</h2>
          <p className="mkt-lede">
            Venture OS is with design partners first. We will not invent a seat price here. Get started and we
            will discuss whether the book fits your firm.
          </p>
          <div className="mkt-hero-ctas">
            <Link href="/signup" className="btn mkt-coral">
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
              <Link href="/signup" className="btn mkt-coral">
                Get started
              </Link>
              <Link href="/login" className="btn ghost">
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>
    </LandingShell>
  );
}
