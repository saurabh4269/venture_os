"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

/** Headline enters with horizontal blur→sharp slide. Optional scroll re-trigger. */
export function BlurHeadline({
  children,
  className,
  scrollTrigger = false,
  as = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  scrollTrigger?: boolean;
  as?: "h1" | "h2" | "h3" | "p";
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) {
      if (el) gsap.set(el, { clearProps: "all", opacity: 1, filter: "none", x: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      const from = { opacity: 0, x: 48, filter: "blur(14px)" };
      const to = { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.85, ease: "power3.out" };

      if (scrollTrigger) {
        gsap.fromTo(el, from, {
          ...to,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      } else {
        gsap.fromTo(el, from, to);
      }
    }, el);

    return () => ctx.revert();
  }, [reduce, scrollTrigger]);

  const Tag = as;
  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}
