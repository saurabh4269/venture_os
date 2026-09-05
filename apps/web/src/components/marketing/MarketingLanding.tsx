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
        </section>

        <section className="mkt-section" id="product">
          <p className="mkt-kicker">Product</p>
          <h2>The morning ritual, on one book.</h2>
          <p className="lede mkt-lede">
            Command, Inbox, Flags, NAV, Compare, Ask, and Reports read only from confirmed facts. The parser
            proposes. A human confirms. Nothing auto-posts.
          </p>
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
          <h2>Source to analysis, with a human at the gate.</h2>
          <ol className="mkt-pipeline" aria-label="Book pipeline">
            <li>
              <span>Source</span>
              Vault — MIS, board packs, transcripts.
            </li>
            <li>
              <span>Proposed</span>
              Inbox — parser output, not yet the book.
            </li>
            <li>
              <span>Reviewed</span>
              Flags and units checked against evidence.
            </li>
            <li>
              <span>Book</span>
              Confirmed facts with file and locator.
            </li>
            <li>
              <span>Analysis</span>
              Ask, reports, and compare — book only.
            </li>
          </ol>
        </section>

        <section className="mkt-section" id="how">
          <p className="mkt-kicker">How partners use it</p>
          <h2>Three steps to a live row.</h2>
          <ol className="mkt-steps">
            <li>
              <strong>1 · Open a company</strong>
              <p>Add the name, then upload an MIS pack. Connectors stay not connected until a health check succeeds.</p>
            </li>
            <li>
              <strong>2 · Confirm Inbox</strong>
              <p>Resolve units. Confirm or reject. Missing stays missing. Corrections survive a re-parse.</p>
            </li>
            <li>
              <strong>3 · Read the book</strong>
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
            Venture OS is with design partners first. We will not invent a seat price here. Request access and we
            will discuss whether the book fits your firm.
          </p>
          <div className="mkt-hero-ctas">
            <Link href="/signup" className="btn">
              Request access
            </Link>
            <a href="/security" className="btn ghost">
              Trust &amp; methodology
            </a>
          </div>
        </section>

        <section className="mkt-final">
          <h2>Open the book.</h2>
          <p className="mkt-sub">The organisation starts empty. We will not seed illustrative NAV.</p>
          <div className="mkt-hero-ctas">
            <Link href="/signup" className="btn">
              Get started
            </Link>
            <Link href="/login" className="btn ghost">
              Log in
            </Link>
          </div>
        </section>
      </main>
    </LandingShell>
  );
}
