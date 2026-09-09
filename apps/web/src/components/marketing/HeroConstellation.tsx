"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconAffinity,
  IconAsk,
  IconBook,
  IconCheck,
  IconCite,
  IconConfirm,
  IconFlags,
} from "./MarketingIcons";

const W = 800;
const H = 360;
const HUB = { x: 400, y: 168 };

const NODES = [
  { id: "hub", x: HUB.x, y: HUB.y, tier: "hub" as const, depth: 0.12, delay: "0s", child: <IconCheck /> },
  { id: "cite", x: 248, y: 72, tier: "near" as const, depth: 0.32, delay: "0.08s", child: <IconCite /> },
  { id: "confirm", x: 548, y: 64, tier: "near" as const, depth: 0.34, delay: "0.14s", child: <IconConfirm /> },
  { id: "book", x: 148, y: 188, tier: "far" as const, depth: 0.48, delay: "0.2s", child: <IconBook /> },
  { id: "flags", x: 662, y: 176, tier: "far" as const, depth: 0.5, delay: "0.26s", child: <IconFlags /> },
  { id: "ask", x: 318, y: 292, tier: "near" as const, depth: 0.28, delay: "0.32s", child: <IconAsk /> },
  { id: "affinity", x: 538, y: 286, tier: "far" as const, depth: 0.46, delay: "0.38s", child: <IconAffinity size={22} /> },
] as const;

export function HeroConstellation() {
  const root = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const target = useRef({ x: 0, y: 0 });
  const reduceRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!mounted || reduceRef.current) return;
    let raf = 0;
    const tick = () => {
      setShift((s) => ({
        x: s.x + (target.current.x - s.x) * 0.1,
        y: s.y + (target.current.y - s.y) * 0.1,
      }));
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [mounted]);

  return (
    <div
      ref={root}
      className="mkt-constellation"
      aria-hidden="true"
      onMouseMove={(e) => {
        const box = root.current?.getBoundingClientRect();
        if (!box) return;
        target.current = {
          x: ((e.clientX - box.left) / box.width - 0.5) * 16,
          y: ((e.clientY - box.top) / box.height - 0.5) * 12,
        };
      }}
      onMouseLeave={() => {
        target.current = { x: 0, y: 0 };
      }}
    >
      <svg className="mkt-constellation-lines" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {NODES.filter((n) => n.id !== "hub").map((n) => (
          <g key={n.id}>
            <path d={`M${HUB.x} ${HUB.y} L${n.x} ${n.y}`} />
            <circle cx={n.x} cy={n.y} r="3" />
          </g>
        ))}
      </svg>
      {NODES.map((n) => {
        const px = Math.max(-8, Math.min(8, shift.x * n.depth));
        const py = Math.max(-8, Math.min(8, shift.y * n.depth));
        return (
          <div
            key={n.id}
            className={`mkt-node-shift mkt-node-tier-${n.tier}`}
            style={{
              left: `${((n.x / W) * 100).toFixed(2)}%`,
              top: `${((n.y / H) * 100).toFixed(2)}%`,
              transform: `translate(calc(-50% + ${px.toFixed(1)}px), calc(-50% + ${py.toFixed(1)}px))`,
              ["--enter-delay" as string]: n.delay,
            }}
          >
            <div className={`mkt-node mkt-node-${n.id}`}>{n.child}</div>
          </div>
        );
      })}
    </div>
  );
}
