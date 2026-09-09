"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

const QUOTES = [
  {
    id: "cite",
    role: "Investment lead",
    quote:
      "Every figure needs a source document and locator. We extract and link the page or cell. Missing stays blank.",
  },
  {
    id: "confirm",
    role: "Operating partner",
    quote: "The parser proposes. A human confirms. Nothing auto-posts to the book unless we set a threshold.",
  },
  {
    id: "refuse",
    role: "Fund accountant",
    quote: "Ask searches the book. Insufficient evidence returns a refusal, not an estimate dressed up as fact.",
  },
] as const;

function arcOffset(index: number, active: number, total: number) {
  const delta = index - active;
  return delta > total / 2 ? delta - total : delta < -total / 2 ? delta + total : delta;
}

/** Testimonial carousel with Y-rotated side cards and center focus. */
export function TestimonialCarousel() {
  const [active, setActive] = useState(1);
  const reduce = useReducedMotion();
  const quote = QUOTES[active];

  const prev = useCallback(() => setActive((i) => (i - 1 + QUOTES.length) % QUOTES.length), []);
  const next = useCallback(() => setActive((i) => (i + 1) % QUOTES.length), []);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(next, 6400);
    return () => window.clearInterval(id);
  }, [reduce, next]);

  return (
    <div className="mkt-testimonials" data-testid="mkt-testimonials">
      <div className="mkt-testimonial-stage">
        {QUOTES.map((q, i) => {
          const offset = arcOffset(i, active, QUOTES.length);
          const isCenter = offset === 0;
          const rotateY = reduce ? 0 : offset * 28;
          const scale = isCenter ? 1 : 0.88;
          const opacity = isCenter ? 1 : 0.55;
          const blur = reduce || isCenter ? 0 : 3;

          return (
            <motion.article
              key={q.id}
              className="mkt-testimonial-card"
              aria-hidden={!isCenter}
              animate={{
                x: offset * (reduce ? 0 : 108),
                rotateY,
                scale,
                opacity,
                filter: `blur(${blur}px)`,
                zIndex: isCenter ? 2 : 1,
              }}
              transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 240, damping: 26 }}
              style={{ transformPerspective: 900 }}
            >
              <div className="mkt-testimonial-avatar" aria-hidden>
                {q.role.slice(0, 1)}
              </div>
              <p className="mkt-testimonial-role">{q.role}</p>
              <p className="mkt-testimonial-quote">&ldquo;{q.quote}&rdquo;</p>
              <p className="mkt-testimonial-note">Methodology, not a customer score.</p>
            </motion.article>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={quote.id}
          className="mkt-testimonial-live"
          aria-live="polite"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
        >
          {quote.role}
        </motion.p>
      </AnimatePresence>

      <div className="mkt-arc-controls">
        <button type="button" className="mkt-arc-btn" onClick={prev} aria-label="Previous quote">
          ‹
        </button>
        <button type="button" className="mkt-arc-btn" onClick={next} aria-label="Next quote">
          ›
        </button>
      </div>
    </div>
  );
}
