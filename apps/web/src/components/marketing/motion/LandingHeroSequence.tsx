"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { BlurHeadline } from "./BlurHeadline";
import { FeatureRiseCard } from "./FeatureRiseCard";
import { HeroConstellation } from "./HeroConstellation";
import { MotionCta } from "./MotionCta";
import { RotatingHeroHeadline } from "./RotatingHeroHeadline";

gsap.registerPlugin(ScrollTrigger);

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

/** Reversible scroll morph: hero zoom/blur/fade → rise section slide-up → card parallax spread. */
export function LandingHeroSequence() {
  const reduce = useReducedMotion();
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

    if (reduce) {
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

      // 0:01–0:02 — hero zooms, blurs, fades
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

      // 0:02–0:03 — rise section slides up
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

      // 0:02–0:03 — cards scale-in stagger
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

      // 0:03 — parallax spread outward from cluster
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
  }, [reduce]);

  return (
    <div ref={pinRef} className="mkt-hero-pin" data-testid="mkt-hero-sequence">
      <section ref={heroRef} className="mkt-hero mkt-hero-centered mkt-hero-layer">
        <HeroConstellation />
        <div className="mkt-hero-copy">
          <BlurHeadline as="h1" className="mkt-hero-title">
            The book for the investment team.
          </BlurHeadline>
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
