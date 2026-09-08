'use client';

import { useState } from "react";
import { MessageSquare, Send, Ban, Quote } from "lucide-react";

/**
 * Ask — suggested prompts + chat thread + cite chips; refuse pattern copy.
 * Inspired by conversational AI analytics shell (04). Cite-or-refuse.
 * Emerald = cited fact; violet = subjective only.
 */

type CiteChip = { id: string; label: string };

type Msg =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      text: string;
      kind: "cited" | "subjective" | "refuse";
      cites?: CiteChip[];
    };

const SUGGESTED = [
  "What is EXAMPLE Co runway from last filed MIS?",
  "Cite sources for portfolio coverage this quarter",
  "Summarize open flags with evidence",
];

const SEED: Msg[] = [
  {
    id: "m1",
    role: "user",
    text: "What is EXAMPLE Co cash from last month?",
  },
  {
    id: "m2",
    role: "assistant",
    kind: "refuse",
    text: "I cannot answer without a citable source. Upload or link an MIS / bank export in Sources, then ask again.",
  },
  {
    id: "m3",
    role: "user",
    text: "Using source SRC-EXAMPLE-01, what was booked revenue?",
  },
  {
    id: "m4",
    role: "assistant",
    kind: "cited",
    text: "Booked revenue for EXAMPLE Co in the cited period is shown as an EXAMPLE figure only in this scaffold — wire to vault cites before production.",
    cites: [{ id: "c1", label: "SRC-EXAMPLE-01" }],
  },
];

export default function AskCopilot() {
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [draft, setDraft] = useState("");

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", text: trimmed };
    const refuse: Msg = {
      id: `a-${Date.now()}`,
      role: "assistant",
      kind: "refuse",
      text: "Refuse pattern: no citation in context. Point me at a Sources vault file or confirm a filed metric before I answer.",
    };
    setMessages((m) => [...m, userMsg, refuse]);
    setDraft("");
  }

  return (
    <div className="min-h-full bg-[#FAFAFA] text-[#09090B]">
      <div className="mx-auto grid max-w-6xl gap-4 p-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-[#E4E4E7] bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#71717A]">
            Suggested
          </p>
          <ul className="mt-3 space-y-2">
            {SUGGESTED.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => send(s)}
                  className="w-full cursor-pointer rounded-md border border-[#E4E4E7] bg-[#FAFAFA] px-2.5 py-2 text-left text-xs font-medium transition-colors duration-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#09090B]"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[10px] leading-relaxed text-[#71717A]">
            Cite-or-refuse. Emerald chips = verified cites. Violet = subjective commentary only.
          </p>
        </aside>

        <section className="flex min-h-[480px] flex-col rounded-lg border border-[#E4E4E7] bg-white">
          <header className="flex items-center gap-2 border-b border-[#E4E4E7] px-4 py-3">
            <MessageSquare className="h-4 w-4 text-[#71717A]" strokeWidth={1.5} />
            <h1 className="text-sm font-semibold">Ask</h1>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m) => {
              if (m.role === "user") {
                return (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg bg-[#09090B] px-3 py-2 text-sm text-white">
                      {m.text}
                    </div>
                  </div>
                );
              }
              const border =
                m.kind === "cited"
                  ? "border-[#059669]/
                  : m.kind === "subjective"
                    ? "border-[#5B21B6]"
                    : "border-[#E4E4E7]";
              return (
                <div key={m.id} className="flex justify-start">
                  <div className={`max-w-[85%] rounded-lg border bg-[#FAFAFA] px-3 py-2 text-sm ${border}`}>
                    {m.kind === "refuse" && (
                      <p className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#71717A]">
                        <Ban className="h-3 w-3" strokeWidth={1.5} />
                        Refuse · no cite
                      </p>
                    )}
                    {m.kind === "subjective" && (
                      <p className="mb-1 text-[11px] font-medium text-[#5B21B6]">
                        Subjective · not a filed fact
                      </p>
                    )}
                    <p>{m.text}</p>
                    {m.cites && m.cites.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.cites.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 rounded-full border border-[#059669]/bg-white px-2 py-0.5 text-[10px] font-medium text-[#059669]"
                          >
                            <Quote className="h-2.5 w-2.5" strokeWidth={1.5} />
                            {c.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <form
            className="flex gap-2 border-t border-[#E4E4E7] p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask with a source in mind…"
              className="flex-1 rounded-md border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-2 text-sm outline-none focus:border-[#09090B]"
            />
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#09090B] px-3 py-2 text-sm font-medium text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#09090B]"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
              Send
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
