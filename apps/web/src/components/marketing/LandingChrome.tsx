"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { href: "/security", label: "How we work" },
  { href: "/blog", label: "Notes" },
] as const;

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="mkt-header">
      <div className="mkt-header-inner">
        <Link href="/" className="mkt-logo">Venture OS</Link>
        <nav className="mkt-nav" aria-label="Marketing">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}>{n.label}</a>
          ))}
        </nav>
        <div className="mkt-header-actions">
          <Link href="/login" className="btn ghost sm mkt-login-btn" data-testid="landing-header-login">
            Log in
          </Link>
          <Link href="/signup" className="btn mkt-cta" data-testid="landing-header-get-started">
            Get started
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button type="button" className="mkt-menu btn ghost sm">Menu</button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Venture OS</SheetTitle>
              </SheetHeader>
              <nav className="mkt-mobile-nav" aria-label="Marketing menu">
                {NAV.map((n) => (
                  <a key={n.href} href={n.href} onClick={() => setOpen(false)}>{n.label}</a>
                ))}
                <Link href="/login" onClick={() => setOpen(false)} className="btn ghost">
                  Log in
                </Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="btn">
                  Get started
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="mkt-footer" role="contentinfo">
      <div className="mkt-footer-inner">
        <Link href="/" className="mkt-logo">Venture OS</Link>
        <nav className="mkt-foot-links" aria-label="Footer">
          <Link href="/security">How we work</Link>
          <Link href="/blog">Notes</Link>
          <a href="/api/health">Status</a>
        </nav>
        <p className="mkt-copy">© 2026 Venture OS. All rights reserved.</p>
      </div>
    </footer>
  );
}

export function LandingShell({
  children,
  testId = "marketing-landing",
}: {
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div className="mkt" data-testid={testId}>
      <a href="#main" className="skip-link">Skip to content</a>
      <LandingHeader />
      {children}
      <LandingFooter />
    </div>
  );
}
