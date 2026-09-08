'use client';

import { Archive, CircleDashed, Loader2, CheckCircle2 } from "lucide-react";

/**
 * Sources — vault list with status Queued / Parsing / Ready.
 * Inspired by conversational AI citation adjacency + data-viz provenance.
 */

type Status = "Queued" | "Parsing" | "Ready";

type Doc = {
  id: string;
  name: string;
  company: string;
  status: Status;
  updated: string;
};

const DOCS: Doc[] = [
  {
    id: "d1",
    name: "EXAMPLE_MIS_2026Q1.pdf",
    company: "EXAMPLE Alpha",
    status: "Ready",
    updated: "—",
  },
  {
    id: "d2",
    name: "EXAMPLE_bank_export.csv",
    company: "EXAMPLE Beta",
    status: "Parsing",
    updated: "—",
  },
  {
    id: "d3",
    name: "EXAMPLE_cap_table.xlsx",
    company: "EXAMPLE Gamma",
    status: "Queued",
    updated: "—",
  },
];

function StatusBadge({ status }: { status: Status }) {
  if (status === "Ready") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#059669] bg-white px-2 py-0.5 text-[10px] font-medium text-[#059669]">
        <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
        Ready
      </span>
    );
  }
  if (status === "Parsing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#E4E4E7] bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-medium text-[#71717A]">
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
        Parsing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#E4E4E7] bg-white px-2 py-0.5 text-[10px] font-medium text-[#71717A]">
      <CircleDashed className="h-3 w-3" strokeWidth={1.5} />
      Queued
    </span>
  );
}

export default function SourcesVault() {
  return (
    <div className="min-h-full bg-[#FAFAFA] text-[#09090B]">
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <header className="flex items-center gap-2">
          <Archive className="h-4 w-4 text-[#71717A]" strokeWidth={1.5} />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#71717A]">
              Sources
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Vault</h1>
          </div>
        </header>

        <div className="overflow-hidden rounded-lg border border-[#E4E4E7] bg-white">
          <ul className="divide-y divide-[#E4E4E7]">
            {DOCS.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-[#71717A]">
                    {d.company} · updated {d.updated}
                  </p>
                </div>
                <StatusBadge status={d.status} />
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[10px] text-[#71717A]">
          Status pipeline Queued → Parsing → Ready · cite markers link Ask and filed metrics
        </p>
      </div>
    </div>
  );
}
