'use client';

import { FileBarChart, FileSpreadsheet, FileText, Sparkles } from "lucide-react";

/**
 * Reports — three Generate cards (partner-ready shells that cite Sources).
 * Inspired by data-viz report grammar + social/ecommerce export modules.
 */

const CARDS = [
  {
    id: "lp",
    title: "LP update",
    blurb: "Period narrative + cited KPIs. Duration picker when wired.",
    icon: FileText,
  },
  {
    id: "nav",
    title: "NAV pack",
    blurb: "Bridge summary with provenance to Sources vault files.",
    icon: FileBarChart,
  },
  {
    id: "mis",
    title: "MIS rollup",
    blurb: "Company coverage grid. Empty cells stay — not zero.",
    icon: FileSpreadsheet,
  },
];

export default function ReportsHub() {
  return (
    <div className="min-h-full bg-[#FAFAFA] text-[#09090B]">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <header>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#71717A]">
            Reports
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Generate</h1>
          <p className="mt-1 text-xs text-[#71717A]">
            Shells only · cite Sources · no marketing slide chrome
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {CARDS.map(({ id, title, blurb, icon: Icon }) => (
            <article
              key={id}
              className="flex flex-col rounded-lg border border-[#E4E4E7] bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-[#71717A]" strokeWidth={1.5} />
                <span className="text-[10px] font-medium uppercase tracking-wide text-[#71717A]">
                  EXAMPLE
                </span>
              </div>
              <h2 className="mt-4 text-base font-semibold">{title}</h2>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-[#71717A]">{blurb}</p>
              <button
                type="button"
                className="mt-5 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#09090B] px-3 py-2 text-sm font-medium text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#09090B]"
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                Generate
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
