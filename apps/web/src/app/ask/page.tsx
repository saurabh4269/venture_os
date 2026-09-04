"use client";

import { useState } from "react";
import { Shell } from "@/components/Shell";
import { api, apiUrl } from "@/lib/api";

type Res = {
  answer: string;
  refused: boolean;
  citations: { documentId: string | null; sourceRefId: string | null; excerpt: string }[];
};

export default function AskPage() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      setRes(await api<Res>("/api/ask", { method: "POST", body: JSON.stringify({ question: q }) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <h1>Ask</h1>
      <p className="lede">
        Grounded on FTS + booked facts. If it is not in the corpus, the system refuses. Citations must resolve.
      </p>
      <form onSubmit={send} className="field" style={{ maxWidth: 720 }}>
        <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={3} placeholder="What was last confirmed cash?" required />
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
                  <a href={apiUrl(`/api/documents/${c.documentId}/file`)}>source</a>
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
