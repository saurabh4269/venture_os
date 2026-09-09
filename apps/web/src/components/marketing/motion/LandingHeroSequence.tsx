"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { HeroConstellation } from "../HeroConstellation";
import { FeatureRiseCard } from "./FeatureRiseCard";
import { MotionCta } from "./MotionCta";
import { RotatingHeroHeadline } from "./RotatingHeroHeadline";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const FEATURE_CARDS = [
  {
    id: "coverage",
    title: "Coverage schematic",
    body: "Schematic Command view. Labels show gaps; we do not invent portfolio KPIs.",
    tag: "Schematic",
    variant: "bars" as const,
  },
  {
    id: "book",
    title: "Real-time book state",
    body: "Command reads confirmed rows only. Incomplete NAV says how many values are missing.",
    tag: "Book only",
    variant: "badge" as const,
  },
  {
    id: "cite",
    title: "Access cited insights",
    body: "Ask and reports cite locators. Insufficient evidence returns a refusal.",
    tag: "Cite or refuse",
    variant: "list" as const,
  },
];

function useNarrowPin() {
  const [narrow, setNarrow] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 960px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow;
}

/** Reversible scroll morph: hero zoom/blur/fade → rise section slide-up → card parallax spread. */
export function LandingHeroSequence() {
  const reduce = useReducedMotion();
  const narrow = useNarrowPin();
  const staticStack = Boolean(reduce || narrow);
  const pinRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const riseRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const pin = pinRef.current;
    const hero = heroRef.current;
    const rise = riseRef.current;
    if (!pin || !hero || !rise) return;

    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];

    if (staticStack) {
      gsap.set([hero, rise, ...cards], { clearProps: "all" });
      gsap.set(hero, { opacity: 1, scale: 1, filter: "none" });
      gsap.set(rise, { y: 0, opacity: 1 });
      gsap.set(cards, { scale: 1, x: 0, y: 0, opacity: 1, filter: "none" });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(rise, { y: "40vh", opacity: 0.4 });
      gsap.set(cards, { scale: 0.72, opacity: 0, y: 48, x: 0, filter: "blur(8px)" });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: "+=140%",
          scrub: 0.65,
          pin: true,
          anticipatePin: 1,
        },
      });

      tl.to(
        hero,
        {
          scale: 1.14,
          filter: "blur(10px)",
          opacity: 0,
          duration: 0.45,
          ease: "power2.in",
        },
        0,
      );

      tl.to(
        rise,
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: "power3.out",
        },
        0.18,
      );

      tl.to(
        cards,
        {
          scale: 1,
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.35,
          stagger: 0.08,
          ease: "power3.out",
        },
        0.32,
      );

      const spreadX = [-36, 0, 36];
      const spreadY = [-10, -14, -10];
      cards.forEach((card, i) => {
        tl.to(
          card,
          {
            x: spreadX[i],
            y: spreadY[i],
            duration: 0.32,
            ease: "power2.out",
          },
          0.58,
        );
      });
    }, pin);

    return () => ctx.revert();
  }, [staticStack]);

  return (
    <div
      ref={pinRef}
      className={`mkt-hero-pin${staticStack ? " is-static" : ""}`}
      data-testid="mkt-hero-sequence"
    >
      <section ref={heroRef} className="mkt-hero mkt-hero-centered mkt-hero-layer">
        <HeroConstellation />
        <div className="mkt-hero-copy">
          <h1>The book for the investment team.</h1>
          <p className="mkt-sub">Command, cite, and act on the truth of your portfolio.</p>
          <div className="mkt-hero-ctas">
            <MotionCta href="/signup" data-testid="landing-get-started">
              Get started
            </MotionCta>
            <MotionCta href="/login" variant="ghost" data-testid="landing-log-in">
              Log in
            </MotionCta>
          </div>
        </div>
        <div className="mkt-hero-fade" aria-hidden>
          <span className="mkt-fade-tile mkt-fade-a" />
          <span className="mkt-fade-tile mkt-fade-b" />
          <span className="mkt-fade-tile mkt-fade-c" />
        </div>
      </section>

      <section ref={riseRef} className="mkt-rise-section mkt-rise-layer" aria-label="Product motion">
        <RotatingHeroHeadline className="mkt-rise-headline" />
        <p className="mkt-rise-sub">
          Investment teams use Venture OS to standardize packs, confirm facts, and run rituals from one book.
        </p>
        <div className="mkt-rise-grid">
          {FEATURE_CARDS.map((card, i) => (
            <div
              key={card.id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="mkt-rise-card-wrap"
            >
              <FeatureRiseCard card={card} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
