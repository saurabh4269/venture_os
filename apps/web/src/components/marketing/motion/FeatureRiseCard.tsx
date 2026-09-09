"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

type CardVariant = "bars" | "badge" | "list";

type FeatureCard = {
  id: string;
  title: string;
  body: string;
  tag: string;
  variant: CardVariant;
};

const BAR_HEIGHTS = [0.42, 0.68, 0.55, 0.82, 0.48];
const LIST_ITEMS = ["Source locator", "Confirmed row", "Cited in Ask"];

function MicroBars({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className="mkt-mini-bars" aria-hidden="true">
      {BAR_HEIGHTS.map((h, i) => (
        <motion.div
          key={i}
          className="mkt-mini-bar"
          initial={{ scaleY: reduce ? h : 0 }}
          animate={{ scaleY: active || reduce ? h : 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.55, delay: 0.12 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: "bottom center" }}
        />
      ))}
      <span className="mkt-mini-bars-label">Schematic bars — not live NAV</span>
    </div>
  );
}

function MicroBadge({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className="mkt-mini-badge-row" aria-hidden="true">
      <motion.span
        className="mkt-mini-badge"
        initial={reduce ? false : { x: -18, opacity: 0 }}
        animate={active || reduce ? { x: 0, opacity: 1 } : { x: -18, opacity: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        Book only
      </motion.span>
      <span className="mkt-mini-badge-hint">No auto-post</span>
    </div>
  );
}

function MicroList({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  return (
    <ul className="mkt-mini-list" aria-hidden="true">
      {LIST_ITEMS.map((item, i) => (
        <motion.li
          key={item}
          initial={reduce ? false : { opacity: 0, x: -10 }}
          animate={active || reduce ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
          transition={reduce ? { duration: 0 } : { duration: 0.35, delay: 0.1 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
        >
          {item}
        </motion.li>
      ))}
    </ul>
  );
}

/** Rise feature card with inner micro-animation (bars / badge / list). */
export function FeatureRiseCard({ card }: { card: FeatureCard }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const reduce = useReducedMotion();
  const active = reduce || inView;

  return (
    <article ref={ref} className="mkt-rise-card">
      <span className="mkt-rise-tag">{card.tag}</span>
      {card.variant === "bars" ? <MicroBars active={active} /> : null}
      {card.variant === "badge" ? <MicroBadge active={active} /> : null}
      {card.variant === "list" ? <MicroList active={active} /> : null}
      <h3>{card.title}</h3>
      <p>{card.body}</p>
    </article>
  );
}
