"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

type ArcItem = {
  id: string;
  title: string;
  subtitle: string;
  glyph: string;
  color: string;
};

const SOURCES: ArcItem[] = [
  {
    id: "mis",
    title: "MIS packs",
    subtitle: "Upload XLSX or CSV. Parser proposes; you confirm.",
    glyph: "MIS",
    color: "#111111",
  },
  {
    id: "affinity",
    title: "Affinity",
    subtitle: "CRM pipeline. Not connected until health check passes.",
    glyph: "Af",
    color: "#2563eb",
  },
  {
    id: "graph",
    title: "Microsoft Graph",
    subtitle: "Email and calendar. OAuth when operator secrets are set.",
    glyph: "G",
    color: "#0078d4",
  },
  {
    id: "granola",
    title: "Granola",
    subtitle: "Meeting notes. Stub until live connector is wired.",
    glyph: "Gr",
    color: "#16a34a",
  },
  {
    id: "vault",
    title: "Sources vault",
    subtitle: "Board packs, transcripts, and files with locators.",
    glyph: "V",
    color: "#525252",
  },
];

function arcOffset(index: number, active: number, total: number) {
  const delta = index - active;
  const wrapped =
    delta > total / 2 ? delta - total : delta < -total / 2 ? delta + total : delta;
  return wrapped;
}

/** Horizontal arc carousel — center card scales up with caption crossfade. */
export function ArcCarousel() {
  const [active, setActive] = useState(2);
  const reduce = useReducedMotion();
  const item = SOURCES[active];

  const prev = useCallback(() => setActive((i) => (i - 1 + SOURCES.length) % SOURCES.length), []);
  const next = useCallback(() => setActive((i) => (i + 1) % SOURCES.length), []);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(next, 5200);
    return () => window.clearInterval(id);
  }, [reduce, next]);

  return (
    <div className="mkt-arc" data-testid="mkt-arc-carousel">
      <div className="mkt-arc-stage" role="listbox" aria-label="Source connectors">
        {SOURCES.map((s, i) => {
          const offset = arcOffset(i, active, SOURCES.length);
          const abs = Math.abs(offset);
          const isCenter = offset === 0;
          const rotate = offset * (reduce ? 0 : 14);
          const scale = isCenter ? 1.18 : abs === 1 ? 0.92 : 0.78;
          const y = abs * (reduce ? 0 : 18);
          const opacity = abs > 2 ? 0 : abs === 2 ? 0.45 : abs === 1 ? 0.72 : 1;

          return (
            <motion.button
              key={s.id}
              type="button"
              role="option"
              aria-selected={isCenter}
              className="mkt-arc-card"
              onClick={() => setActive(i)}
              animate={{
                x: offset * (reduce ? 72 : 88),
                y,
                rotate,
                scale,
                opacity,
                zIndex: isCenter ? 3 : 2 - abs,
              }}
              transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 280, damping: 28 }}
              style={{ pointerEvents: abs > 2 ? "none" : "auto" }}
            >
              <span className="mkt-arc-glyph" style={{ background: s.color }}>{s.glyph}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="mkt-arc-caption" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduce ? undefined : { opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.28 }}
          >
            <strong>{item.title}</strong>
            <p>{item.subtitle}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mkt-arc-controls">
        <button type="button" className="mkt-arc-btn" onClick={prev} aria-label="Previous source">
          ‹
        </button>
        <button type="button" className="mkt-arc-btn" onClick={next} aria-label="Next source">
          ›
        </button>
      </div>
    </div>
  );
}
