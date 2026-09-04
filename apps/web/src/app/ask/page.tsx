"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, downloadAuthed } from "@/lib/api";

type Res = {
  answer: string;
  refused: boolean;
  citations: { documentId: string | null; sourceRefId: string | null; excerpt: string }[];
};

export default function AskPage() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cos, setCos] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    api<{ companies: { id: string; name: string }[] }>("/api/companies").then((r) => setCos(r.companies));
    const fromUrl = new URLSearchParams(window.location.search).get("companyId");
    if (fromUrl) setCompanyId(fromUrl);
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      setRes(
        await api<Res>("/api/ask", {
          method: "POST",
          body: JSON.stringify({ question: q, companyId: companyId || undefined }),
        }),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ask failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <h1 data-testid="ask-ready">Ask</h1>
      <p className="lede">
        Grounded on FTS + booked facts. If it is not in the corpus, the system refuses. Citations must resolve. Numbers
        that are not in evidence cause a refuse.
      </p>
      <form onSubmit={send} className="field" style={{ maxWidth: 720 }}>
        <label className="field">
          Company (optional)
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">All companies</option>
            {cos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="ask-q">
          Question
          <textarea
            id="ask-q"
            data-testid="ask-question"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            rows={3}
            placeholder="What was last confirmed cash?"
            required
            minLength={3}
          />
        </label>
        <button className="btn" disabled={busy} data-testid="ask-submit">
          {busy ? "Searching the book…" : "Ask"}
        </button>
      </form>
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {res && (
        <div style={{ marginTop: 20 }}>
          {(res.refused || /will not guess/i.test(res.answer)) && (
            <div className="banner" data-testid="ask-refused" role="status">
              {res.answer}
            </div>
          )}
          {!res.refused && !/will not guess/i.test(res.answer) && (
            <p style={{ whiteSpace: "pre-wrap" }} data-testid="ask-answer">
              {res.answer}
            </p>
          )}
          <h3>Citations</h3>
          {res.citations.length === 0 && <p className="lede">None — refusal or empty evidence.</p>}
          <ul>
            {res.citations.map((c, i) => (
              <li key={i}>
                {c.documentId ? (
                  <button
                    type="button"
                    className="chip"
                    onClick={() => downloadAuthed(`/api/documents/${c.documentId}/file`)}
                  >
                    source
                  </button>
                ) : (
                  "unresolved"
                )}{" "}
                · {c.excerpt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Shell>
  );
}
