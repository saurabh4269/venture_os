"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { ComponentProps } from "react";

type MotionCtaProps = ComponentProps<typeof Link> & {
  variant?: "primary" | "ghost";
};

/** Primary / ghost CTA with 200ms hover lift. */
export function MotionCta({ variant = "primary", className, children, ...rest }: MotionCtaProps) {
  const reduce = useReducedMotion();
  const cls = [variant === "ghost" ? "btn ghost" : "btn", "mkt-motion-cta", className].filter(Boolean).join(" ");

  if (reduce) {
    return (
      <Link className={cls} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      whileTap={{ y: 0, scale: 0.98 }}
      style={{ display: "inline-block" }}
    >
      <Link className={cls} {...rest}>
        {children}
      </Link>
    </motion.div>
  );
}
