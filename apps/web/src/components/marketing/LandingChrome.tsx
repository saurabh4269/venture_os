"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { MotionCta } from "./motion/MotionCta";

const NAV = [
  { href: "/#product", label: "Product" },
  { href: "/#approach", label: "Approach" },
  { href: "/#sources", label: "Sources" },
  { href: "/#pricing", label: "Pricing" },
] as const;

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <header className="mkt-header">
      <motion.div
        className="mkt-pill"
        initial={reduce ? false : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 26, delay: 0.05 }}
      >
        <div className="mkt-pill-inner">
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
            <ThemeToggle />
            <Link href="/login" className="mkt-login">
              Log in
            </Link>
            <MotionCta href="/signup" className="mkt-cta" data-testid="landing-header-get-started">
              Get started
            </MotionCta>
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
      </motion.div>
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
      <div className="mkt-footer-inner">
        <Link href="/" className="mkt-logo">
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
