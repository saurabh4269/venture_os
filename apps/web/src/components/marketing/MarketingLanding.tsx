"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LandingShell } from "./LandingChrome";

function CommandMock() {
  return (
    <div className="mkt-command-card" aria-hidden="true">
      <div className="mkt-command-label">Command active</div>
      <div className="mkt-kpi-chip">
        <div className="src">Schematic — not live data</div>
        <div className="v">Every figure needs a cite</div>
      </div>
    </div>
  );
}

export function MarketingLanding() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !heroRef.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(".mkt-hero-copy > *", {
        y: 24,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power2.out",
      });
      gsap.from(".mkt-hero-visual", {
        x: 32,
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
        ease: "power2.out",
      });
      gsap.utils.toArray<HTMLElement>(".mkt-feature-card, .mkt-arch-card").forEach((el) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: "top 85%" },
          y: 20,
          opacity: 0,
          duration: 0.5,
          ease: "power2.out",
        });
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <LandingShell>
      <main id="main">
        <section className="mkt-hero" ref={heroRef}>
          <div className="mkt-hero-copy">
            <h1>
              Truth you can <span className="cite-word">cite.</span>
            </h1>
            <p className="mkt-sub">
              Portfolio OS that refuses to invent numbers. Precision-engineered for conviction.
            </p>
            <div className="mkt-hero-ctas">
              <Link href="/signup" className="btn" data-testid="landing-get-started">
                Get Started <span aria-hidden>+</span>
              </Link>
              <Link href="/login" className="btn ghost" data-testid="landing-log-in">
                Log in
              </Link>
            </div>
          </div>
          <div className="mkt-hero-visual">
            <CommandMock />
            <p className="mkt-schematic">Schematic of Command — not a live book.</p>
          </div>
        </section>

        <section className="mkt-feature-row" id="platform" aria-label="Platform principles">
          <article className="mkt-feature-card">
            <div className="mkt-feature-ico emerald" aria-hidden>✓</div>
            <h3>Cite Everything</h3>
            <p>Every figure needs a source document and locator. Missing stays —.</p>
          </article>
          <article className="mkt-feature-card">
            <div className="mkt-feature-ico gray" aria-hidden>—</div>
            <h3>Dash, Not Zero.</h3>
            <p>Null stays null. We never coerce a blank into zero or a health score.</p>
          </article>
          <article className="mkt-feature-card">
            <div className="mkt-feature-ico violet" aria-hidden>🔒</div>
            <h3>Secure Vault.</h3>
            <p>Connector keys are AES-encrypted at rest. Not connected until healthCheck.</p>
          </article>
        </section>

        <section className="mkt-section" id="insights">
          <h2>Precision Architecture.</h2>
          <p className="lede mkt-lede">Tools designed to surface verifiable truth, immediately.</p>
          <div className="mkt-arch-grid">
            <article className="mkt-arch-card">
              <h3>Omnipresent Command</h3>
              <div className="mkt-search-mock">
                <span>Acme Corp Q3 Burn Rate</span>
                <kbd>⌘K</kbd>
              </div>
              <div className="mkt-loading-mock">
                <span aria-hidden>◌</span>
                Searching unstructured filings…
              </div>
            </article>
            <article className="mkt-arch-card">
              <h3>Review updates instantly.</h3>
              <div className="mkt-inbox-mock">
                <strong>Financial Update: your company</strong>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>Parser output — confirm before it posts.</span>
              </div>
              <div className="mkt-inbox-actions">
                <span className="btn sm">Agree</span>
                <span className="btn ghost sm">Reject</span>
              </div>
            </article>
          </div>
        </section>

        <section className="mkt-refuse-band" id="network" aria-label="Ask refuse">
          <div className="mkt-refuse-inner">
            <div>
              <h2>Ask. Refuse.</h2>
              <p>This AI refuses to generate answers it cannot verify.</p>
            </div>
            <div className="mkt-chat-mock" aria-hidden="true">
              <div className="mkt-chat-q">What was the post-money valuation of series B?</div>
              <div className="mkt-chat-a">
                The Series B post-money valuation was $250M.
                <span className="cite-inline">CITE</span>
              </div>
              <div className="mkt-chat-src">Illustration only — not portfolio data.</div>
            </div>
          </div>
        </section>

        <section className="mkt-section" id="pricing">
          <h2>Talk to us. No public price list.</h2>
          <p className="lede mkt-lede">
            Venture OS is with design partners first. Get started and we will discuss whether the book fits your
            firm.
          </p>
          <div className="mkt-hero-ctas">
            <Link href="/signup" className="btn">Get Started</Link>
            <Link href="/login" className="btn ghost">Log in</Link>
          </div>
        </section>

        <section className="mkt-trust" id="trust" aria-label="Trust">
          <p className="mkt-trust-kicker">Design partner</p>
          <p className="mkt-trust-partner">
            Built with <span>V3 Ventures</span> — we do not publish other customer logos or seed illustrative NAV.
          </p>
        </section>
      </main>
    </LandingShell>
  );
}
