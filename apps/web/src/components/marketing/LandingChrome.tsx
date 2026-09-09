"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { useState, type ReactNode } from "react";

const NAV = [
  { href: "/#product", label: "Product" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#approach", label: "Resources" },
] as const;

function LogoMark() {
  return (
    <span className="mkt-logo-mark" aria-hidden>
      <svg viewBox="0 0 24 24" width="18" height="18">
        <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="3.2" strokeDasharray="40 12" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      </svg>
    </span>
  );
}

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="mkt-header">
      <div className="mkt-header-inner">
        <Link href="/" className="mkt-logo">
          <LogoMark />
          Venture OS
        </Link>
        <nav className="mkt-nav" aria-label="Marketing">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="mkt-header-actions">
          <ThemeToggle />
          <Link href="/login" className="mkt-login">
            Log in
          </Link>
          <Link href="/signup" className="btn mkt-cta">
            Get started
          </Link>
          <button
            type="button"
            className="mkt-menu"
            aria-expanded={open}
            aria-controls="mkt-mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mkt-mobile-nav" className="mkt-mobile" aria-label="Marketing menu">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)}>
              {n.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            Log in
          </Link>
          <Link href="/signup" className="btn" onClick={() => setOpen(false)}>
            Get started
          </Link>
        </nav>
      ) : null}
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-footer-sheet">
        <div className="mkt-footer-grid">
          <p className="mkt-footer-tag">
            Venture OS is the book for the investment team — cite or refuse, all in one place.
          </p>
          <div>
            <strong>Product</strong>
            <a href="/#product">Command</a>
            <a href="/#features">Confirm</a>
            <a href="/#approach">Ask</a>
          </div>
          <div>
            <strong>Features</strong>
            <a href="/#features">Flags</a>
            <a href="/#approach">Citation</a>
            <a href="/#trust">Coverage</a>
          </div>
          <div>
            <strong>Pricing</strong>
            <a href="/#pricing">Talk to us</a>
          </div>
          <div>
            <strong>Resources</strong>
            <a href="/#trust">Methodology</a>
            <Link href="/security">Security</Link>
            <Link href="/login">Log in</Link>
          </div>
        </div>
        <p className="mkt-footer-blur" aria-hidden>
          Venture OS
        </p>
      </div>
      <div className="mkt-footer-inner">
        <Link href="/" className="mkt-logo">
          <LogoMark />
          Venture OS
        </Link>
        <p className="mkt-copy">© 2026 Venture OS. Institutional portfolio management.</p>
        <nav className="mkt-foot-links" aria-label="On this page">
          <a href="/#trust">Methodology</a>
          <a href="/#pricing">Support</a>
          <Link href="/login">Log in</Link>
        </nav>
        <p className="mkt-legal-line">Institutional-grade data. Figures cited or refused.</p>
      </div>
    </footer>
  );
}

export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div className="mkt" data-testid="marketing-landing">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <LandingHeader />
      {children}
      <LandingFooter />
    </div>
  );
}
