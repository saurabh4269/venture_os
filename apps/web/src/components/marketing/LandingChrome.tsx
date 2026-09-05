"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { href: "/#platform", label: "Platform" },
  { href: "/#insights", label: "Insights" },
  { href: "/#network", label: "Network" },
  { href: "/#pricing", label: "Pricing" },
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
          <Link href="/login" className="mkt-login">Sign in</Link>
          <Button asChild className="mkt-cta">
            <Link href="/signup">Get Started</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="mkt-menu">Menu</Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Venture OS</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-4" aria-label="Marketing menu">
                {NAV.map((n) => (
                  <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="py-2">{n.label}</a>
                ))}
                <Link href="/login" onClick={() => setOpen(false)} className="py-2">Sign in</Link>
                <Button asChild onClick={() => setOpen(false)}>
                  <Link href="/signup">Get Started</Link>
                </Button>
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
          <Link href="/security">Methodology</Link>
          <a href="/#platform">Changelog</a>
          <a href="/api/health">Status</a>
        </nav>
        <p className="mkt-copy">© 2026 Venture OS. All rights reserved.</p>
      </div>
    </footer>
  );
}

export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div className="mkt" data-testid="marketing-landing">
      <a href="#main" className="skip-link">Skip to content</a>
      <LandingHeader />
      {children}
      <LandingFooter />
    </div>
  );
}
