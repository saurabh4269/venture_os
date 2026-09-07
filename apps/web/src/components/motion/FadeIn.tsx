"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { SPRING_SOFT } from "@/lib/motion-ease";

/** Soft enter for lists / context cards. Skips transform when reduced-motion. */
export function FadeIn({
  children,
  className,
  delay = 0,
  y = 6,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0.15 } : { ...SPRING_SOFT, delay }}
    >
      {children}
    </motion.div>
  );
}
