"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LandingShell } from "./LandingChrome";
import { HeroAtmosphere } from "./HeroAtmosphere";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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
      <main id="main" className="relative">
        <HeroAtmosphere />
        <section className="mkt-hero" ref={heroRef}>
          <div className="mkt-hero-copy">
            <h1>
              Truth you can <span className="cite-word">cite.</span>
            </h1>
            <p className="mkt-sub">
              Portfolio OS that refuses to invent numbers. Precision-engineered for conviction.
            </p>
            <div className="mkt-hero-ctas">
              <Button asChild size="lg" data-testid="landing-get-started">
                <Link href="/signup">Get Started +</Link>
              </Button>
              <Button asChild variant="outline" size="lg" data-testid="landing-log-in">
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
          <div className="mkt-hero-visual">
            <Card className="mkt-command-card shadow-md">
              <CardHeader className="pb-2">
                <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-wider">
                  Command active
                </Badge>
              </CardHeader>
              <CardContent>
                <Card className="absolute bottom-5 right-5 w-56 shadow-sm">
                  <CardContent className="p-3 text-sm">
                    <p className="text-muted-foreground text-xs">Schematic — not live data</p>
                    <p className="font-medium">Every figure needs a cite</p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
            <p className="mkt-schematic">Schematic of Command — not a live book.</p>
          </div>
        </section>

        <section className="mkt-feature-row" id="platform" aria-label="Platform principles">
          {[
            { icon: "✓", tone: "emerald", title: "Cite Everything", body: "Every figure needs a source document and locator. Missing stays —." },
            { icon: "—", tone: "gray", title: "Dash, Not Zero.", body: "Null stays null. We never coerce a blank into zero or a health score." },
            { icon: "🔒", tone: "violet", title: "Secure Vault.", body: "Connector keys are AES-encrypted at rest. Not connected until healthCheck." },
          ].map((f) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Card className="mkt-feature-card h-full text-center">
                <CardContent className="pt-8">
                  <div className={`mkt-feature-ico ${f.tone}`} aria-hidden>{f.icon}</div>
                  <CardTitle className="font-serif text-xl">{f.title}</CardTitle>
                  <p className="text-muted-foreground mt-2 text-sm">{f.body}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>

        <section className="mkt-section" id="insights">
          <h2>Precision Architecture.</h2>
          <p className="lede mkt-lede">Tools designed to surface verifiable truth, immediately.</p>
          <div className="mkt-arch-grid">
            <Card className="mkt-arch-card">
              <CardHeader>
                <CardTitle className="font-serif">Omnipresent Command</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mkt-search-mock">
                  <span>Acme Corp Q3 Burn Rate</span>
                  <kbd>⌘K</kbd>
                </div>
                <div className="mkt-loading-mock">
                  <span aria-hidden>◌</span>
                  Searching unstructured filings…
                </div>
              </CardContent>
            </Card>
            <Card className="mkt-arch-card">
              <CardHeader>
                <CardTitle className="font-serif">Review updates instantly.</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mkt-inbox-mock">
                  <strong>Financial Update: your company</strong>
                  <span className="text-muted-foreground text-sm">Parser output — confirm before it posts.</span>
                </div>
                <div className="mkt-inbox-actions">
                  <Button size="sm">Agree</Button>
                  <Button size="sm" variant="outline">Reject</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mkt-refuse-band" id="network" aria-label="Ask refuse">
          <div className="mkt-refuse-inner">
            <div>
              <h2>Ask. Refuse.</h2>
              <p>This AI refuses to generate answers it cannot verify.</p>
            </div>
            <Card className="mkt-chat-mock border-zinc-800 bg-zinc-900 text-white">
              <CardContent className="p-6">
                <div className="mkt-chat-q">What was the post-money valuation of series B?</div>
                <div className="mkt-chat-a">
                  The Series B post-money valuation was $250M.
                  <Badge className="ml-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">CITE</Badge>
                </div>
                <Separator className="my-3 bg-zinc-700" />
                <div className="text-xs text-zinc-400">Illustration only — not portfolio data.</div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mkt-section" id="pricing">
          <h2>Talk to us. No public price list.</h2>
          <p className="lede mkt-lede">
            Venture OS is with design partners first. Get started and we will discuss whether the book fits your firm.
          </p>
          <div className="mkt-hero-ctas">
            <Button asChild><Link href="/signup">Get Started</Link></Button>
            <Button asChild variant="outline"><Link href="/login">Log in</Link></Button>
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
