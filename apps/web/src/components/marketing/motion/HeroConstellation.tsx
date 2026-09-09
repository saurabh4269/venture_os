"use client";

import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";

const NODES = [
  { id: "cite", label: "Cite", color: "#dbeafe", x: -38, y: -22, delay: 0.1 },
  { id: "confirm", label: "Confirm", color: "#fef3c7", x: -52, y: 18, delay: 0.22 },
  { id: "book", label: "Book", color: "#dcfce7", x: 42, y: -18, delay: 0.16 },
  { id: "flags", label: "Flags", color: "#fee2e2", x: 48, y: 24, delay: 0.28 },
  { id: "ask", label: "Ask", color: "#f3e8ff", x: -8, y: 42, delay: 0.34 },
] as const;

function HubIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 3.5 5.5 6.8v6.2c0 4.2 2.8 7 6.5 7.9 3.7-.9 6.5-3.7 6.5-7.9V6.8L12 3.5z" />
      <path d="M9 11.8 11 13.8 15 9.6" />
    </svg>
  );
}

function MiniIcon({ kind }: { kind: string }) {
  if (kind === "cite") {
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <path d="M4.5 13.5h7a1 1 0 0 0 1-1v-8L10 2.5H4.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1z" />
        <path d="M9.5 2.5v3h3" />
      </svg>
    );
  }
  if (kind === "confirm") {
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <path d="M3.5 8.2 6.4 11 12.5 4.8" />
      </svg>
    );
  }
  if (kind === "book") {
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <path d="M3 13.5V4.5l5-3 5 3v9H3z" />
        <path d="M8 1.5v12" />
      </svg>
    );
  }
  if (kind === "flags") {
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <path d="M4 13.5V2.5" />
        <path d="M4 3.2h7.2L9.6 5.8 11.2 8.4H4" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M3 12.5h10M8 3v9" />
      <path d="M5.5 6.5h5" />
    </svg>
  );
}

/** Hero network hub with floating satellite nodes and spoke fade. */
export function HeroConstellation() {
  const reduce = useReducedMotion();

  return (
    <div className="mkt-constellation" aria-hidden="true">
      <svg className="mkt-constellation-spokes" viewBox="-80 -60 160 120">
        {NODES.map((n) => (
          <motion.g
            key={n.id}
            initial={reduce ? { opacity: 0.35 } : { opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={reduce ? { duration: 0 } : { duration: 0.7, delay: n.delay, ease: [0.16, 1, 0.3, 1] }}
          >
            <line x1="0" y1="0" x2={n.x} y2={n.y} stroke="currentColor" strokeWidth="1" />
          </motion.g>
        ))}
      </svg>

      <motion.div
        className="mkt-constellation-hub"
        initial={reduce ? false : { opacity: 0, scale: 0.82 }}
        animate={
          reduce
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 1, scale: 1, y: [0, -6, 0] }
        }
        transition={
          reduce
            ? { duration: 0 }
            : {
                opacity: { type: "spring", stiffness: 260, damping: 22, delay: 0.05 },
                scale: { type: "spring", stiffness: 260, damping: 22, delay: 0.05 },
                y: { duration: 3.6, repeat: Infinity, ease: "easeInOut" },
              }
        }
      >
        <HubIcon />
      </motion.div>

      {NODES.map((n) => (
        <motion.div
          key={n.id}
          className="mkt-constellation-node"
          style={{ "--node-x": `${n.x}%`, "--node-y": `${n.y}%`, background: n.color } as CSSProperties}
          initial={reduce ? false : { opacity: 0, scale: 0.7, x: n.x * 0.3, y: n.y * 0.3 }}
          animate={
            reduce
              ? { opacity: 1, scale: 1, x: 0, y: 0 }
              : {
                  opacity: 1,
                  scale: 1,
                  x: 0,
                  y: 0,
                  transition: { type: "spring", stiffness: 220, damping: 20, delay: n.delay },
                }
          }
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -7, 0] }}
            transition={
              reduce
                ? undefined
                : { duration: 3.2 + n.delay * 2, repeat: Infinity, ease: "easeInOut", delay: n.delay }
            }
          >
            <MiniIcon kind={n.id} />
            <span className="mkt-constellation-label">{n.label}</span>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
