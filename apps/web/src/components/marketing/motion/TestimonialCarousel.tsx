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

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 96 : -96,
    opacity: 0,
    filter: dir > 0 ? "blur(0px)" : "blur(8px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -96 : 96,
    opacity: 0,
    filter: dir > 0 ? "blur(8px)" : "blur(0px)",
  }),
};

/** Testimonial carousel — exit left+blur, enter from right sharp. */
export function TestimonialCarousel() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const reduce = useReducedMotion();
  const quote = QUOTES[active];

  const go = useCallback((next: number) => {
    setDirection(next > active ? 1 : -1);
    setActive(next);
  }, [active]);

  const prev = useCallback(() => {
    go((active - 1 + QUOTES.length) % QUOTES.length);
  }, [active, go]);

  const next = useCallback(() => {
    go((active + 1) % QUOTES.length);
  }, [active, go]);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setDirection(1);
      setActive((i) => (i + 1) % QUOTES.length);
    }, 6400);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className="mkt-testimonials" data-testid="mkt-testimonials">
      <div className="mkt-testimonial-stage">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.article
            key={quote.id}
            className="mkt-testimonial-card mkt-testimonial-card-solo"
            custom={direction}
            variants={reduce ? undefined : slideVariants}
            initial={reduce ? false : "enter"}
            animate="center"
            exit={reduce ? undefined : "exit"}
            transition={reduce ? { duration: 0.15 } : { duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mkt-testimonial-avatar" aria-hidden>
              {quote.role.slice(0, 1)}
            </div>
            <p className="mkt-testimonial-role">{quote.role}</p>
            <p className="mkt-testimonial-quote">&ldquo;{quote.quote}&rdquo;</p>
            <p className="mkt-testimonial-note">Methodology, not a customer score.</p>
          </motion.article>
        </AnimatePresence>
      </div>

      <p className="mkt-testimonial-live" aria-live="polite">{quote.role}</p>

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
