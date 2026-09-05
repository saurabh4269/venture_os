import Link from "next/link";
import { LandingShell } from "./LandingChrome";

function CommandFrame() {
  return (
    <div className="mkt-frame" aria-hidden="true">
      <div className="mkt-frame-head">
        <span>Command</span>
        <span>Q3 &apos;24</span>
      </div>
      <div className="mkt-frame-kpis">
        <div>
          <div className="k">Active Cos</div>
          <div className="v">42</div>
        </div>
        <div>
          <div className="k">Needs Look</div>
          <div className="v">7</div>
        </div>
        <div>
          <div className="k">Coverage</div>
          <div className="v">—</div>
        </div>
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

function IcoCompanies() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M3 13.5V5.5L8 2.5l5 3V13.5" />
      <path d="M6.5 13.5v-4h3v4" />
    </svg>
  );
}
function IcoFlags() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M4 13.5V2.5" />
      <path d="M4 3.2h7.2L9.6 5.8 11.2 8.4H4" />
    </svg>
  );
}
function IcoCoverage() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M3 12.5 7.2 3.5h1.6L13 12.5" />
      <path d="M4.6 9.4h6.8" />
    </svg>
  );
}
function IcoCite() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M4.5 13.5h7a1 1 0 0 0 1-1v-8L10 2.5H4.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1z" />
      <path d="M9.5 2.5v3h3" />
    </svg>
  );
}
function IcoVerify() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M8 2.4 3.2 4.4v4.2c0 3.1 2 5.1 4.8 5.8 2.8-.7 4.8-2.7 4.8-5.8V4.4L8 2.4z" />
      <path d="M5.8 8.1 7.3 9.6 10.4 6.4" />
    </svg>
  );
}
function IcoReport() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M4 12V6" />
      <path d="M8 12V3.5" />
      <path d="M12 12V8" />
    </svg>
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
            <h1>The book for the investment team.</h1>
            <p className="mkt-sub">Command, cite, and act on the truth of your portfolio.</p>
            <div className="mkt-hero-ctas">
              <Link href="/signup" className="btn" data-testid="landing-get-started">
                Get started
              </Link>
              <Link href="/login" className="btn ghost" data-testid="landing-log-in">
                Log in
              </Link>
            </div>
          </div>
          <div className="mkt-hero-visual">
            <CommandFrame />
            <p className="mkt-schematic">Schematic of Command — not a live book.</p>
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
              <strong>AES vault</strong>
              <p>Connector keys are encrypted at rest. Status stays not connected until a health check.</p>
            </div>
          </div>
          <p className="mkt-trust-partner">
            Design partner <span>V3 Ventures</span>
          </p>
        </section>

        <section className="mkt-section" id="product">
          <p className="mkt-kicker">Product</p>
          <h2>Uncompromising Clarity</h2>
          <p className="lede mkt-lede">
            Command, Inbox, Flags, NAV, Compare, Ask, and Reports read only from confirmed facts. The parser
            proposes. A human confirms. Nothing auto-posts.
          </p>
          <div className="mkt-clarity" data-testid="mkt-clarity">
            <article>
              <div className="mkt-clarity-top">
                <span className="mkt-clarity-ico">
                  <IcoCompanies />
                </span>
                <h3>Active companies</h3>
                <div className="v">—</div>
              </div>
              <div className="mkt-clarity-status">
                <span>Empty until you confirm a row</span>
                <span className="mark">not zero</span>
              </div>
            </article>
            <article>
              <div className="mkt-clarity-top">
                <span className="mkt-clarity-ico">
                  <IcoFlags />
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
                <span className="mkt-clarity-ico">
                  <IcoCoverage />
                </span>
                <h3>Coverage</h3>
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
              <h3>Flags</h3>
              <p>Catalog detectors with evidence. No evidence, no flag. Mute and snooze survive recompute.</p>
            </article>
            <article>
              <h3>NAV</h3>
              <p>Marks, roll-up, and period lock. Unofficial until locked. We do not invent an investment date.</p>
            </article>
          </div>
        </section>

        <section className="mkt-section" id="approach">
          <p className="mkt-kicker">Approach</p>
          <h2>The Citation Engine</h2>
          <ol className="mkt-pipeline" aria-label="Book pipeline" data-testid="mkt-pipeline">
            {PIPELINE.map((s) => (
              <li key={s.stage} data-stage={s.stage}>
                <span className="mkt-pipe-dot" aria-hidden />
                <div className="mkt-pipe-body">
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
              <span className="mkt-step-ico">
                <IcoCite />
              </span>
              <strong>1. Cite</strong>
              <p>Every figure needs a source document and locator. We extract and link the page or cell. Missing stays —.</p>
            </li>
            <li>
              <span className="mkt-step-ico">
                <IcoVerify />
              </span>
              <strong>2. Verify</strong>
              <p>Confirm Inbox. Resolve units. Check flags against evidence. Corrections survive a re-parse.</p>
            </li>
            <li>
              <span className="mkt-step-ico">
                <IcoReport />
              </span>
              <strong>3. Report</strong>
              <p>Command, Flags, NAV, Ask, and Reports use only what you confirmed. Empty is empty.</p>
            </li>
          </ol>
        </section>

        <section className="mkt-section mkt-partner" id="partners">
          <p className="mkt-kicker">Case studies</p>
          <h2>Built with design partner V3 Ventures.</h2>
          <p className="lede mkt-lede">
            V3 is the design partner for the firm book. We do not publish other customer logos, and we do not show
            their portfolio as a demo. A new organisation starts empty.
          </p>
        </section>

        <section className="mkt-section" id="pricing">
          <p className="mkt-kicker">Pricing</p>
          <h2>Talk to us. No public price list.</h2>
          <p className="lede mkt-lede">
            Venture OS is with design partners first. We will not invent a seat price here. Get started and we
            will discuss whether the book fits your firm.
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

        <p className="mkt-partner-line">
          In partnership with <strong>V3 Ventures</strong>
        </p>
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
