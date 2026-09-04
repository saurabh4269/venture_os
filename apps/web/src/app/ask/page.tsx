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
  const [cos, setCos] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    api<{ companies: { id: string; name: string }[] }>("/api/companies").then((r) => setCos(r.companies));
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      setRes(
        await api<Res>("/api/ask", {
          method: "POST",
          body: JSON.stringify({ question: q, companyId: companyId || undefined }),
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <h1>Ask</h1>
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
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          rows={3}
          placeholder="What was last confirmed cash?"
          required
          minLength={3}
        />
        <button className="btn" disabled={busy}>
          {busy ? "Searching…" : "Ask"}
        </button>
      </form>
      {res && (
        <div style={{ marginTop: 20 }}>
          {res.refused && <div className="banner">{res.answer}</div>}
          {!res.refused && <p style={{ whiteSpace: "pre-wrap" }}>{res.answer}</p>}
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
