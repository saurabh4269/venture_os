"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Panel, EM } from "@/components/BookUI";
import { api } from "@/lib/api";
import { bookErrorMessage } from "@/lib/wake";

type AskRes = {
  answer: string;
  refused: boolean;
  citations: { documentId: string | null; sourceRefId: string | null; excerpt: string }[];
};

export function AskOsPanel() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<AskRes | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const next = await api<AskRes>("/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: q.trim() }),
      });
      setRes(next);
    } catch (ex) {
      setErr(ex instanceof Error ? bookErrorMessage(ex.message) : "Ask failed");
    } finally {
      setBusy(false);
    }
  }

  const refused = Boolean(res && (res.refused || /will not guess/i.test(res.answer)));

  return (
    <Panel title="Ask OS" className="ask-os">
      <div className="ask-os-messages">
        {!res && !err && (
          <p className="lede" style={{ fontSize: 13 }}>
            Ask from the book. Insufficient evidence returns a refusal.
          </p>
        )}
        {q && res ? (
          <>
            <div className="ask-os-q">{q}</div>
            <div className="ask-os-a" data-testid={refused ? "ask-refused" : undefined}>
              {res.answer}
              {!refused && res.citations.length > 0 ? (
                <div className="ask-os-entity">
                  <kbd>Extracted entity</kbd>
                  <button type="button" className="cite" style={{ marginLeft: 8 }}>
                    Cite
                  </button>
                  <div style={{ marginTop: 6, color: "var(--muted)" }}>
                    {res.citations[0]?.excerpt || EM}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
        {err ? <p className="sev-high" role="alert">{err}</p> : null}
      </div>
      <form className="ask-os-input" onSubmit={send}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask anything…"
          aria-label="Ask question"
          data-testid="ask-question"
          minLength={3}
          required
        />
        <button className="btn sm" type="submit" disabled={busy} data-testid="ask-submit" aria-label="Send">
          <ArrowUpRight size={16} />
        </button>
      </form>
      <Link href="/ask" className="lede" style={{ fontSize: 12, marginTop: 8, display: "inline-block" }}>
        Open full Ask →
      </Link>
    </Panel>
  );
}
