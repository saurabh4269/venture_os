import type { Transition } from "motion/react";

/** beUI-inspired springs — weighty enough to feel alive, calm enough for the book. */
export const SPRING_INDICATOR: Transition = {
  type: "spring",
  stiffness: 170,
  damping: 24,
  mass: 1.2,
};

export const SPRING_PANEL: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 36,
  mass: 0.9,
};

export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 28,
  mass: 0.8,
};

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
