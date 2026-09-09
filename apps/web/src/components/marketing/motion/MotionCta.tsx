"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { ComponentProps } from "react";

type MotionCtaProps = ComponentProps<typeof Link> & {
  variant?: "primary" | "ghost";
};

/** Primary / ghost CTA with 200ms hover lift. Primary stays coral on the public landing. */
export function MotionCta({ variant = "primary", className, children, ...rest }: MotionCtaProps) {
  const reduce = useReducedMotion();
  const cls = [
    variant === "ghost" ? "btn ghost" : "btn mkt-coral",
    "mkt-motion-cta",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const link = (
    <Link className={cls} {...rest}>
      {children}
    </Link>
  );

  if (reduce) return link;

  return (
    <motion.div
      className="mkt-motion-cta-wrap"
      whileHover={{ y: -2, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      whileTap={{ y: 0, scale: 0.98 }}
    >
      {link}
    </motion.div>
  );
}
