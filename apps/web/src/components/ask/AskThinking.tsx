"use client";

/**
 * Thinking status — Beautiful UI Thinking + beUI Agent Loading (shimmer phrases).
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { EASE_OUT, SPRING_SOFT } from "@/lib/motion-ease";

const DEFAULT_PHRASES = [
  "Searching the book",
  "Reading confirmed facts",
  "Checking locators",
  "Preparing a cited answer",
];

export function AskThinking({
  phrases = DEFAULT_PHRASES,
  interval = 2200,
}: {
  phrases?: string[];
  interval?: number;
}) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (phrases.length <= 1) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % phrases.length), interval);
    return () => window.clearInterval(id);
  }, [phrases, interval]);

  const phrase = `${phrases[i % phrases.length] ?? "Thinking"}…`;

  return (
    <div className="ask-thinking-card" role="status" aria-live="polite">
      <button
        type="button"
        className="ask-thinking-head"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ask-thinking-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="ask-thinking-copy">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={phrase}
              className="ask-thinking-phrase ask-text-shimmer"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(6px)" }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={reduce ? { duration: 0.2, ease: EASE_OUT } : SPRING_SOFT}
            >
              {phrase}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="ask-thinking-label">Thinking</span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.ul
            className="ask-thinking-steps"
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={SPRING_SOFT}
          >
            {phrases.map((p, idx) => (
              <li key={p} className={idx === i % phrases.length ? "is-on" : undefined}>
                {p}
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
