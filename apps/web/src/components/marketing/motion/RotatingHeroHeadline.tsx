"use client";

import gsap from "gsap";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const PHRASES = [
  "The book for the investment team.",
  "Cite or refuse.",
  "Confirm before the book.",
] as const;

/** Mid-page headline cycles phrases with blur→sharp horizontal slide (GSAP). */
export function RotatingHeroHeadline({ className }: { className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % PHRASES.length), 4200);
    return () => window.clearInterval(id);
  }, [reduce]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduce) {
      el.textContent = PHRASES[0];
      gsap.set(el, { clearProps: "all", opacity: 1, filter: "none", x: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, x: 40, filter: "blur(12px)" },
        { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.75, ease: "power3.out" },
      );
    }, el);

    return () => ctx.revert();
  }, [index, reduce]);

  return (
    <h2 ref={ref} className={className} aria-live="polite">
      {PHRASES[reduce ? 0 : index]}
    </h2>
  );
}
