"use client";

/**
 * Word reveal for Ask answers — beUI Text Reveal (spring + blur), book-calm.
 * Calls onTick while revealing so the scroller can follow the live edge.
 */
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import { EASE_OUT } from "@/lib/motion-ease";

function tokens(text: string) {
  return text.match(/\S+\s*|\s+/g) ?? [text];
}

export function AskReveal({
  text,
  onTick,
  onDone,
  stagger = 0.028,
}: {
  text: string;
  onTick?: () => void;
  onDone?: () => void;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  const parts = useMemo(() => tokens(text), [text]);
  const doneRef = useRef(false);
  const tickRef = useRef(onTick);
  const doneCb = useRef(onDone);
  tickRef.current = onTick;
  doneCb.current = onDone;

  useEffect(() => {
    doneRef.current = false;
    if (reduce) {
      doneCb.current?.();
      return;
    }
    const totalMs = Math.min(4200, 180 + parts.length * stagger * 1000);
    const tickEvery = Math.max(80, totalMs / Math.max(parts.length, 1));
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      tickRef.current?.();
      if (n >= parts.length) {
        window.clearInterval(id);
        if (!doneRef.current) {
          doneRef.current = true;
          doneCb.current?.();
        }
      }
    }, tickEvery);
    const finish = window.setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        doneCb.current?.();
      }
    }, totalMs + 80);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(finish);
    };
  }, [parts, reduce, stagger, text]);

  if (reduce) {
    return <p className="body ask-reveal">{text}</p>;
  }

  return (
    <p className="body ask-reveal">
      {parts.map((part, index) => (
        <motion.span
          key={`${index}-${part.slice(0, 8)}`}
          className="ask-reveal-unit"
          initial={{ opacity: 0, y: "35%", filter: "blur(8px)" }}
          animate={{ opacity: 1, y: "0%", filter: "blur(0px)" }}
          transition={{
            y: { type: "spring", stiffness: 160, damping: 28, mass: 1, delay: index * stagger },
            opacity: { duration: 0.45, ease: EASE_OUT, delay: index * stagger },
            filter: { duration: 0.55, ease: EASE_OUT, delay: index * stagger },
          }}
        >
          {part}
        </motion.span>
      ))}
    </p>
  );
}
