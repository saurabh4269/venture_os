"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Minus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { LandingShell } from "./LandingChrome";
import { HeroAtmosphere } from "./HeroAtmosphere";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const KPI_LABELS = ["Companies", "Open flags", "Needs look", "Last sync"] as const;

const PRINCIPLES = [
  {
    Icon: Check,
    tone: "emerald",
    title: "Cite everything",
    body: "Every figure needs a source document and locator. Missing stays —.",
  },
  {
    Icon: Minus,
    tone: "gray",
    title: "Dash, not zero",
    body: "Null stays null. We never coerce a blank into zero or a health score.",
  },
  {
    Icon: Shield,
    tone: "violet",
    title: "Human confirms",
    body: "Inbox rows post to the book only after a partner confirms. No auto-post.",
  },
] as const;

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
      gsap.utils.toArray<HTMLElement>(".mkt-feature-card").forEach((el) => {
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
              Portfolio OS for Monday-morning ritual: Command, what needs a look, Inbox confirm — with the file behind every number.
            </p>
            <div className="mkt-hero-ctas">
              <Button asChild size="lg" data-testid="landing-get-started">
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          </div>
          <div className="mkt-hero-visual" aria-hidden>
            <Card className="mkt-command-card shadow-md">
              <div className="mkt-command-label">Command</div>
              <div className="mkt-frame-kpis mt-4">
                {KPI_LABELS.map((label) => (
                  <div key={label}>
                    <p className="k">{label}</p>
                    <p className="v">—</p>
                  </div>
                ))}
              </div>
              <div className="mkt-kpi-chip">
                <p className="text-muted-foreground text-xs">Needs a look</p>
                <p className="v">—</p>
                <p className="src">Empty book schematic</p>
              </div>
            </Card>
            <p className="mkt-schematic">Schematic — not live data. Empty book shows —.</p>
          </div>
        </section>

        <section className="mkt-feature-row" id="product" aria-label="Product principles">
          {PRINCIPLES.map(({ Icon, tone, title, body }) => (
            <motion.div key={title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Card className="mkt-feature-card h-full text-center">
                <CardContent className="pt-8">
                  <div className={`mkt-feature-ico ${tone}`} aria-hidden>
                    <Icon className="size-5" strokeWidth={2} />
                  </div>
                  <CardTitle className="font-serif text-xl">{title}</CardTitle>
                  <p className="text-muted-foreground mt-2 text-sm">{body}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>

        <section className="mkt-section mkt-final" aria-label="Get started">
          <p className="lede mkt-lede">
            Design partners first — the book starts empty and stays honest.
          </p>
          <div className="mkt-hero-ctas">
            <Button asChild data-testid="landing-close-get-started">
              <Link href="/signup">Get started</Link>
            </Button>
            <Button asChild variant="outline" data-testid="landing-log-in">
              <Link href="/login">Log in</Link>
            </Button>
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
