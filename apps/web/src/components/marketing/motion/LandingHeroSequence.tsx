"use client";

import { HeroConstellation } from "../HeroConstellation";
import { FeatureRiseCard } from "./FeatureRiseCard";
import { MotionCta } from "./MotionCta";
import { RotatingHeroHeadline } from "./RotatingHeroHeadline";

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

/** Hero + rise cards in document flow so theme and CTAs stay clickable after scroll. */
export function LandingHeroSequence() {
  return (
    <div className="mkt-hero-pin is-static" data-testid="mkt-hero-sequence">
      <section className="mkt-hero mkt-hero-centered mkt-hero-layer">
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

      <section className="mkt-rise-section mkt-rise-layer" aria-label="Product motion">
        <RotatingHeroHeadline className="mkt-rise-headline" />
        <p className="mkt-rise-sub">
          Investment teams use Venture OS to standardize packs, confirm facts, and run rituals from one book.
        </p>
        <div className="mkt-rise-grid">
          {FEATURE_CARDS.map((card) => (
            <div key={card.id} className="mkt-rise-card-wrap">
              <FeatureRiseCard card={card} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
