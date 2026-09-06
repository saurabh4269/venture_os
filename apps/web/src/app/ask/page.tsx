"use client";

import { useEffect, useState } from "react";
import { PageHead } from "@/components/BookUI";
import { useCite } from "@/components/Cite";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
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
    <Shell>
      <div className="ask-hero">
        <PageHead
          title="Ask"
          testId="ask-ready"
          kicker="Institutional research"
          lede="Answers from your confirmed book, with citations you can open. Ask works best when your vault has recent files."
        />
        <form onSubmit={send}>
          <label className="field ask-company-field">
            Company (optional)
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
              placeholder="What was last confirmed cash?"
              required
              minLength={3}
            />
            <button className="btn" disabled={busy} data-testid="ask-submit" aria-label={busy ? "Searching the book" : "Ask"}>
              {busy ? "…" : "Ask"}
            </button>
          </div>
        </form>
      </div>
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {res && refused && (
        <div className="ask-answer ask-answer--refused" data-testid="ask-refused" role="status">
          <p className="page-kicker">Need more sources</p>
          <p className="body">{res.answer}</p>
          <p className="lede ask-answer-foot">
            Upload more files or confirm Inbox rows to give Ask more to work with.
          </p>
        </div>
      )}
      {res && !refused && (
        <div className="ask-answer" data-testid="ask-answer-card">
          <p className="page-kicker">From the book</p>
          <p className="body" data-testid="ask-answer">
            {res.answer}
          </p>
          <p className="page-kicker ask-answer-section">Provenance</p>
          {res.citations.length === 0 ? (
            <p className="lede">Citations will appear when the answer is grounded in the book.</p>
          ) : (
            <div className="ask-prov">
              {res.citations.map((c, i) => {
                const doc = c.documentId ? docs.find((d) => d.id === c.documentId) : undefined;
                return (
                  <article key={`${c.documentId ?? "x"}-${i}`}>
                    {c.documentId || c.excerpt ? (
                      <button
                        type="button"
                        className="cite"
                        onClick={() =>
                          openCite({
                            display: doc?.filename ?? "Ask citation",
                            sourcePath: c.documentId ? `/api/documents/${c.documentId}/file` : undefined,
                            excerpt: c.excerpt,
                          })
                        }
                      >
                        Cite
                      </button>
                    ) : (
                      <span className="lede">unresolved</span>
                    )}
                    <div className="look-title ask-prov-filename">
                      {doc?.filename ?? "Source file"}
                    </div>
                    <p className="lede">
                      {doc?.companyName ? `${doc.companyName} · ` : ""}
                      {doc?.kind ? doc.kind.replaceAll("_", " ") : "—"}
                      {c.excerpt ? ` · ${c.excerpt.slice(0, 140)}` : ""}
                    </p>
                  </article>
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
              {h.refused ? " · needs more evidence" : ""}
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}
