"use client";

import { useEffect, useState } from "react";
import { ContextCard, PageHead } from "@/components/BookUI";
import { useCite } from "@/components/Cite";
import { BusyDots } from "@/components/motion/BusyDots";

import { api } from "@/lib/api";
import { titleCaseKind } from "@/lib/format";
import { bookErrorMessage } from "@/lib/wake";

type Res = {
  answer: string;
  refused: boolean;
  citations: { documentId: string | null; sourceRefId: string | null; excerpt: string }[];
};

type Doc = { id: string; filename: string; kind: string; createdAt?: string | null; companyName?: string | null };

export default function AskPage() {
  const openCite = useCite();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cos, setCos] = useState<{ id: string; name: string }[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [history, setHistory] = useState<{ question: string; refused: boolean; createdAt?: string }[]>([]);

  useEffect(() => {
    api<{ companies: { id: string; name: string }[] }>("/api/companies")
      .then((r) => setCos(r.companies ?? []))
      .catch(() => setCos([]));
    api<{ documents: Doc[] }>("/api/documents")
      .then((r) => setDocs(r.documents ?? []))
      .catch(() => setDocs([]));
    api<{ queries: { question: string; refused: boolean; createdAt?: string }[] }>("/api/ask/history")
      .then((r) => setHistory(r.queries ?? []))
      .catch(() => setHistory([]));
    const fromUrl = new URLSearchParams(window.location.search).get("companyId");
    if (fromUrl) setCompanyId(fromUrl);
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const next = await api<Res>("/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: q, companyId: companyId || undefined }),
      });
      setRes(next);
      api<{ queries: { question: string; refused: boolean; createdAt?: string }[] }>("/api/ask/history")
        .then((r) => setHistory(r.queries ?? []))
        .catch(() => undefined);
    } catch (e) {
      setErr(e instanceof Error ? bookErrorMessage(e.message) : "Ask failed");
    } finally {
      setBusy(false);
    }
  }

  const refused = Boolean(res && (res.refused || /will not guess/i.test(res.answer)));

  return (
    <><div className="ask-hero">
        <PageHead title="Ask" testId="ask-ready" lede="Cite-or-refuse over confirmed book facts." />
        <form onSubmit={send}>
          <label className="field" style={{ textAlign: "left" }}>
            <span className="sr-only">Company</span>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} aria-label="Company">
              <option value="">All companies</option>
              {cos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="ask-bar">
            <label className="sr-only" htmlFor="ask-q">
              Question
            </label>
            <textarea
              id="ask-q"
              data-testid="ask-question"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              rows={2}
              placeholder="Last confirmed cash?"
              required
              minLength={3}
            />
            <button className="btn" disabled={busy} data-testid="ask-submit" aria-label={busy ? "Searching" : "Ask"}>
              {busy ? "…" : "Ask"}
            </button>
          </div>
          {busy ? <BusyDots label="Searching confirmed facts…" className="ask-busy" /> : null}
        </form>
      </div>
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {res && refused && (
        <div className="ask-answer" data-testid="ask-refused" role="status">
          <p className="body">{res.answer || "Not enough confirmed evidence to answer."}</p>
        </div>
      )}
      {res && !refused && (
        <div className="ask-answer">
          <p className="body" data-testid="ask-answer">
            {res.answer}
          </p>
          {res.citations.length === 0 ? (
            <p className="lede">No citations returned.</p>
          ) : (
            <div className="ask-prov">
              {res.citations.map((c, i) => {
                const doc = c.documentId ? docs.find((d) => d.id === c.documentId) : undefined;
                return (
                  <ContextCard
                    key={`${c.documentId ?? "x"}-${i}`}
                    kicker={doc?.filename ?? "Source file"}
                    body={
                      <>
                        {doc?.companyName ? `${doc.companyName} · ` : ""}
                        {doc?.kind ? titleCaseKind(doc.kind) : ""}
                        {c.excerpt ? ` · ${c.excerpt.slice(0, 140)}` : ""}
                      </>
                    }
                    onOpen={
                      c.documentId || c.excerpt
                        ? () =>
                            openCite({
                              display: doc?.filename ?? "Ask citation",
                              documentId: c.documentId ?? undefined,
                              sourcePath: c.documentId ? `/api/documents/${c.documentId}/file` : undefined,
                              excerpt: c.excerpt,
                            })
                        : undefined
                    }
                    action={!c.documentId && !c.excerpt ? <span className="lede">unresolved</span> : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
      {history.length > 0 && (
        <div className="ask-related">
          <p className="page-kicker">Recent</p>
          {history.slice(0, 8).map((h, i) => (
            <button
              key={`${h.question}-${i}`}
              type="button"
              onClick={() => {
                setQ(h.question);
                setRes(null);
              }}
            >
              {h.question}
              {h.refused ? " · refused" : ""}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
