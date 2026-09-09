'use client';

import { Check, FileSearch, X } from "lucide-react";

/**
 * Confirm — approval rows with evidence chip.
 * Inspired by conversational AI HITL + social/ecommerce row actions.
 * LLM proposes; human confirms. No auto-commit.
 */

type Item = {
  id: string;
  title: string;
  summary: string;
  evidence: string;
  company: string;
};

const QUEUE: Item[] = [
  {
    id: "q1",
    title: "Book burn for EXAMPLE Alpha",
    summary: "Proposed write from MIS parse · awaiting human confirm",
    evidence: "SRC-EXAMPLE-14",
    company: "EXAMPLE Alpha",
  },
  {
    id: "q2",
    title: "Update runway months · EXAMPLE Beta",
    summary: "Derived from cash + burn proposal",
    evidence: "SRC-EXAMPLE-22",
    company: "EXAMPLE Beta",
  },
  {
    id: "q3",
    title: "Reject empty mark",
    summary: "Agent suggested mark without cite — keep rejected",
    evidence: "—",
    company: "EXAMPLE Gamma",
  },
];

export default function ConfirmQueue() {
  return (
    <div className="min-h-full bg-[#FAFAFA] text-[#09090B]">
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <header>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#71717A]">
            Confirm
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Approval inbox</h1>
          <p className="mt-1 text-xs text-[#71717A]">
            Human-in-the-loop · toast after accept/reject when wired
          </p>
        </header>

        <ul className="space-y-3">
          {QUEUE.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-[#E4E4E7] bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-[#71717A]">{item.summary}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-medium text-[#71717A]">
                      {item.company}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#059669]/bg-white px-2 py-0.5 text-[10px] font-medium text-[#059669]">
                      <FileSearch className="h-2.5 w-2.5" strokeWidth={1.5} />
                      Evidence {item.evidence}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] px-2.5 py-1.5 text-xs font-medium transition-colors duration-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#09090B]"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Reject
                  </button>
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-[#09090B] px-2.5 py-1.5 text-xs font-medium text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#09090B]"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Confirm
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
