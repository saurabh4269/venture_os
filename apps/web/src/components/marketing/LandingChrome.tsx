"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

const NAV = [
  { href: "/#product", label: "Product" },
  { href: "/#approach", label: "Approach" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#partners", label: "Case Studies" },
] as const;

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="mkt-header">
      <div className="mkt-header-inner">
        <Link href="/" className="mkt-logo">
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
          <Link href="/login" className="mkt-login">
            Log in
          </Link>
          <Link href="/signup" className="btn mkt-cta">
            Request access
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
            Request access
          </Link>
        </nav>
      ) : null}
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-footer-inner">
        <Link href="/" className="mkt-logo">
          Venture OS
        </Link>
        <p className="mkt-copy">© 2026 Venture OS. Institutional portfolio management.</p>
        <nav className="mkt-foot-links" aria-label="Legal">
          <a href="/security#terms">Terms</a>
          <a href="/security#privacy">Privacy</a>
          <a href="/security#methodology">Methodology</a>
          <a href="/security#support">Support</a>
        </nav>
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
