"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconAffinity,
  IconDrive,
  IconGranola,
  IconOneDrive,
  IconXlsx,
  IconZoho,
} from "./MarketingIcons";

const CONNECTORS = [
  { name: "OneDrive", body: "Microsoft Graph files", Icon: IconOneDrive },
  { name: "Affinity", body: "Company map", Icon: IconAffinity },
  { name: "Granola", body: "Call notes", Icon: IconGranola },
  { name: "Zoho", body: "CRM records", Icon: IconZoho },
  { name: "Google Drive", body: "Shared files", Icon: IconDrive },
  { name: "Excel", body: "MIS packs", Icon: IconXlsx },
] as const;

const N = CONNECTORS.length;
const STEP = 0.5;

function wrapRel(rel: number) {
  while (rel > N / 2) rel -= N;
  while (rel < -N / 2) rel += N;
  return rel;
}

function shortestToward(from: number, to: number) {
  let d = ((to - from) % N) + N;
  d %= N;
  if (d > N / 2) d -= N;
  return from + d;
}

function pose(rel: number, bob: number) {
  const a = rel * STEP;
  const dist = Math.abs(rel);
  return {
    x: Math.sin(a) * 268,
    y: (1 - Math.cos(a)) * 82 + bob,
    rotate: a * 36,
    scale: 1.26 - Math.min(dist, 2.2) * 0.15,
    opacity: dist > 2.25 ? 0 : 1,
    z: Math.round(24 - dist * 8),
  };
}

export function ConnectorArc() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [offset, setOffset] = useState(0);
  const [clock, setClock] = useState(0);
  const offsetRef = useRef(0);
  const reduceRef = useRef(false);

  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceRef.current) {
      offsetRef.current = active;
      setOffset(active);
      return;
    }
    let raf = 0;
    const tick = (t: number) => {
      const dest = shortestToward(offsetRef.current, active);
      const next = offsetRef.current + (dest - offsetRef.current) * 0.11;
      offsetRef.current = next;
      setOffset(next);
      setClock(t);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [active]);

  useEffect(() => {
    if (paused || reduceRef.current) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % N);
    }, 2200);
    return () => window.clearInterval(id);
  }, [paused]);

  const current = CONNECTORS[active];

  return (
    <div
      className="mkt-tools-stage"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mkt-tools" role="list" aria-label="Sources">
        {CONNECTORS.map((t, i) => {
          const rel = wrapRel(i - offset);
          const bob = reduceRef.current ? 0 : Math.sin(clock / 520 + i * 1.15) * 5;
          const p = pose(rel, bob);
          const on = i === active;
          return (
            <button
              key={t.name}
              type="button"
              role="listitem"
              className={`mkt-tool${on ? " is-on" : ""}`}
              aria-pressed={on}
              aria-hidden={p.opacity < 0.08}
              tabIndex={p.opacity < 0.08 ? -1 : 0}
              aria-label={`${t.name}: ${t.body}`}
              style={{
                transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rotate}deg) scale(${p.scale})`,
                opacity: p.opacity,
                zIndex: p.z,
              }}
              onClick={() => setActive(i)}
              onFocus={() => setActive(i)}
            >
              <span className="mkt-tool-ico">
                <t.Icon size={42} />
              </span>
            </button>
          );
        })}
      </div>
      <p className="mkt-tool-caption" key={current.name}>
        <strong>{current.name}</strong>
        <span>{current.body}</span>
      </p>
    </div>
  );
}
