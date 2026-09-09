'use client';

import { useState } from "react";
import { Flag, Hash } from "lucide-react";

/**
 * Flags — list + detail with rounded evidence numbers.
 * Inspired by data-viz / social / ecommerce alert callouts.
 */

type FlagItem = {
  id: string;
  title: string;
  severity: "high" | "med" | "low";
  company: string;
  detail: string;
  evidenceNos: number[];
};

const FLAGS: FlagItem[] = [
  {
    id: "f1",
    title: "EXAMPLE · MIS coverage drop",
    severity: "high",
    company: "EXAMPLE Alpha",
    detail: "Filed period missing relative to prior cadence. Do not invent fill values.",
    evidenceNos: [12, 14],
  },
  {
    id: "f2",
    title: "EXAMPLE · Burn outlier",
    severity: "med",
    company: "EXAMPLE Beta",
    detail: "Variance vs trailing median — confirm before book write.",
    evidenceNos: [22],
  },
  {
    id: "f3",
    title: "EXAMPLE · Parse warning",
    severity: "low",
    company: "EXAMPLE Gamma",
    detail: "Source still Parsing; flag is informational until Ready.",
    evidenceNos: [31, 32, 33],
  },
];

function severityClass(s: FlagItem["severity"]) {
  if (s === "high") return "border-[#09090B] text-[#09090B]";
  if (s === "med") return "border-[#71717A] text-[#71717A]";
  return "border-[#E4E4E7] text-[#71717A]";
}

export default function FlagsPanel() {
  const [activeId, setActiveId] = useState(FLAGS[0]?.id ?? "");
  const active = FLAGS.find((f) => f.id === activeId) ?? FLAGS[0];

  return (
    <div className="min-h-full bg-[#FAFAFA] text-[#09090B]">
      <div className="mx-auto grid max-w-6xl gap-4 p-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-lg border border-[#E4E4E7] bg-white">
          <header className="flex items-center gap-2 border-b border-[#E4E4E7] px-4 py-3">
            <Flag className="h-4 w-4 text-[#71717A]" strokeWidth={1.5} />
            <h1 className="text-sm font-semibold">Open flags</h1>
          </header>
          <ul className="divide-y divide-[#E4E4E7]">
            {FLAGS.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(f.id)}
                  className={`w-full cursor-pointer px-4 py-3 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#09090B] ${
                    f.id === active?.id ? "bg-[#FAFAFA]" : "hover:bg-[#FAFAFA]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{f.title}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${severityClass(f.severity)}`}
                    >
                      {f.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#71717A]">{f.company}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-[#E4E4E7] bg-white p-5">
          {active ? (
            <>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#71717A]">
                Detail
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">{active.title}</h2>
              <p className="mt-1 text-xs text-[#71717A]">{active.company}</p>
              <p className="mt-4 text-sm leading-relaxed">{active.detail}</p>
              <div className="mt-6">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#71717A]">
                  Evidence numbers
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {active.evidenceNos.map((n) => (
                    <span
                      key={n}
                      className="inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-full border border-[#059669] bg-white px-2.5 text-xs font-semibold tabular-nums text-[#059669]"
                    >
                      <Hash className="h-3 w-3" strokeWidth={1.5} />
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#71717A]">No flags</p>
          )}
        </section>
      </div>
    </div>
  );
}
