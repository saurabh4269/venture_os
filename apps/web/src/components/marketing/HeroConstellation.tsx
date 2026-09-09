"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconAffinity,
  IconBalloon,
  IconBulb,
  IconCheck,
  IconEyes,
  IconGranola,
  IconOneDrive,
  IconShield,
} from "./MarketingIcons";

const HERO_PATHS = [
  "M450 190 L220 90 L140 180",
  "M450 190 L220 280 L360 310",
  "M450 190 L680 80 L790 160",
  "M450 190 L700 270 L540 320",
  "M450 190 L300 70",
  "M450 190 L600 70",
  "M450 190 L130 240",
] as const;

const NODES = [
  { className: "mkt-node mkt-node-hub", depth: 0.18, child: <IconCheck /> },
  { className: "mkt-node mkt-node-bulb", depth: 0.42, child: <IconBulb /> },
  { className: "mkt-node mkt-node-balloon", depth: 0.55, child: <IconBalloon /> },
  { className: "mkt-node mkt-node-shield", depth: 0.4, child: <IconShield /> },
  { className: "mkt-node mkt-node-eyes", depth: 0.5, child: <IconEyes /> },
  { className: "mkt-node mkt-node-face mkt-node-face-a", depth: 0.28, child: "V" },
  { className: "mkt-node mkt-node-face mkt-node-face-b", depth: 0.32, child: "O" },
  { className: "mkt-node mkt-node-chip mkt-node-od", depth: 0.62, child: <IconOneDrive size={28} /> },
  { className: "mkt-node mkt-node-chip mkt-node-af", depth: 0.6, child: <IconAffinity size={28} /> },
  { className: "mkt-node mkt-node-chip mkt-node-gr", depth: 0.58, child: <IconGranola size={28} /> },
] as const;

function FlowDot({ path, dur, delay }: { path: string; dur: string; delay: string }) {
  return (
    <circle className="mkt-flow-dot" r="3.6" fill="var(--mkt-purple)" opacity="0.95">
      <animateMotion dur={dur} begin={delay} repeatCount="indefinite" path={path} />
    </circle>
  );
}

export function HeroConstellation() {
  const root = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    let raf = 0;
    const tick = () => {
      setShift((s) => ({
        x: s.x + (target.current.x - s.x) * 0.08,
        y: s.y + (target.current.y - s.y) * 0.08,
      }));
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={root}
      className="mkt-constellation"
      aria-hidden="true"
      onMouseMove={(e) => {
        const box = root.current?.getBoundingClientRect();
        if (!box) return;
        target.current = {
          x: ((e.clientX - box.left) / box.width - 0.5) * 22,
          y: ((e.clientY - box.top) / box.height - 0.5) * 16,
        };
      }}
      onMouseLeave={() => {
        target.current = { x: 0, y: 0 };
      }}
    >
      <svg className="mkt-constellation-lines" viewBox="0 0 900 420" preserveAspectRatio="xMidYMid meet">
        {HERO_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
        <circle cx="220" cy="90" r="4" />
        <circle cx="140" cy="180" r="4" />
        <circle cx="220" cy="280" r="4" />
        <circle cx="680" cy="80" r="4" />
        <circle cx="790" cy="160" r="4" />
        <circle cx="700" cy="270" r="4" />
        <circle cx="300" cy="70" r="4" />
        <circle cx="600" cy="70" r="4" />
        {HERO_PATHS.map((d, i) => (
          <FlowDot key={`dot-${d}`} path={d} dur={`${3.2 + (i % 3) * 0.4}s`} delay={`${i * 0.35}s`} />
        ))}
      </svg>
      {NODES.map((n) => (
        <div
          key={n.className}
          className="mkt-node-shift"
          style={{ transform: `translate(${shift.x * n.depth}px, ${shift.y * n.depth}px)` }}
        >
          <div className={n.className}>{n.child}</div>
        </div>
      ))}
    </div>
  );
}
