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

/** Five visible seats on a CoreShift-style upward arc. */
function pose(rel: number, bob: number) {
  const a = rel * 0.46;
  const dist = Math.abs(rel);
  return {
    x: Math.sin(a) * 248,
    y: (1 - Math.cos(a)) * 128 + bob,
    rotate: a * 40,
    scale: dist < 0.28 ? 1.3 : 1 - Math.min(dist, 2) * 0.05,
    opacity: dist > 2.2 ? 0 : 1,
    z: Math.round(32 - dist * 8),
  };
}

function stylePose(p: ReturnType<typeof pose>, dist: number, reduce: boolean) {
  return {
    transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${p.rotate.toFixed(1)}deg) scale(${p.scale.toFixed(2)})`,
    opacity: p.opacity,
    zIndex: p.z,
    filter: reduce || dist < 0.28 ? "none" : `blur(${Math.min(dist, 2).toFixed(1)}px)`,
  };
}

export function ConnectorArc() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [offset, setOffset] = useState(0);
  const [clock, setClock] = useState(0);
  const [mounted, setMounted] = useState(false);
  const offsetRef = useRef(0);
  const reduceRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceRef.current) {
      offsetRef.current = active;
      setOffset(active);
      return;
    }
    let raf = 0;
    const tick = (t: number) => {
      const dest = shortestToward(offsetRef.current, active);
      const next = offsetRef.current + (dest - offsetRef.current) * 0.1;
      offsetRef.current = next;
      setOffset(next);
      setClock(t);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [active, mounted]);

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
          const bob = mounted && !reduceRef.current ? Math.sin(clock / 540 + i * 1.2) * 4 : 0;
          const p = pose(rel, bob);
          const dist = Math.abs(rel);
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
              style={stylePose(p, dist, !mounted || reduceRef.current)}
              onClick={() => setActive(i)}
              onFocus={() => {
                setActive(i);
                setPaused(true);
              }}
            >
              <span className="mkt-tool-ico">
                <t.Icon size={44} />
              </span>
            </button>
          );
        })}
      </div>
      <p className="mkt-tool-caption" key={current.name}>
        <strong>{current.name}</strong>
        <span>{current.body}</span>
      </p>
      <button
        type="button"
        className="mkt-tools-pause"
        aria-pressed={paused}
        onClick={() => setPaused((v) => !v)}
      >
        {paused ? "Play" : "Pause"}
      </button>
    </div>
  );
}
