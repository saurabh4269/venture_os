"use client";

import { useEffect, useState } from "react";
import { useCite } from "@/components/Cite";
import { IconAsk } from "@/components/Icons";
import { api } from "@/lib/api";
import { bookErrorMessage } from "@/lib/wake";

type Res = {
  answer: string;
  refused: boolean;
  citations: { documentId: string | null; sourceRefId: string | null; excerpt: string }[];
};

export function AskFab({ companyId }: { companyId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`ask-fab${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-controls="ask-panel"
        aria-label="Ask"
        data-testid="ask-fab"
        onClick={() => setOpen((v) => !v)}
      >
        <IconAsk className="ask-fab-ico" />
      </button>
      {open ? <AskPanel companyId={companyId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function AskPanel({ companyId: initialCompanyId, onClose }: { companyId?: string; onClose: () => void }) {
  const openCite = useCite();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cos, setCos] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState(initialCompanyId ?? "");

  useEffect(() => {
    api<{ companies: { id: string; name: string }[] }>("/api/companies")
      .then((r) => setCos(r.companies ?? []))
      .catch(() => setCos([]));
    const fromUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("companyId") : null;
    if (!initialCompanyId && fromUrl) setCompanyId(fromUrl);
  }, [initialCompanyId]);

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
    } catch (ex) {
      setErr(ex instanceof Error ? bookErrorMessage(ex.message) : "Ask failed");
    } finally {
      setBusy(false);
    }
  }

  const refused = Boolean(res && (res.refused || /will not guess/i.test(res.answer)));

  return (
    <div className="ask-panel-layer" role="presentation" onClick={onClose}>
      <aside
        id="ask-panel"
        className="ask-panel"
        role="dialog"
        aria-label="Ask"
        data-testid="ask-ready"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ask-panel-head">
          <strong>Ask</strong>
          <button type="button" className="btn ghost sm" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>
        <form onSubmit={send} className="ask-panel-form">
          <label className="field">
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
            <label className="sr-only" htmlFor="ask-panel-q">
              Question
            </label>
            <textarea
              id="ask-panel-q"
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
        </form>
        {err ? (
          <p className="sev-high" role="alert">
            {err}
          </p>
        ) : null}
        {res && refused ? (
          <div className="ask-answer" data-testid="ask-refused" role="status">
            <p className="body">{res.answer}</p>
          </div>
        ) : null}
        {res && !refused ? (
          <div className="ask-answer" data-testid="ask-answer">
            <p className="body">{res.answer}</p>
            {res.citations.length ? (
              <ul className="ask-cites">
                {res.citations.map((c, i) => (
                  <li key={`${c.documentId}-${i}`}>
                    <button
                      type="button"
                      className="cite"
                      onClick={() =>
                        openCite({
                          display: c.excerpt?.slice(0, 80) || "Source",
                          documentId: c.documentId ?? undefined,
                          sourcePath: c.documentId ? `/api/documents/${c.documentId}/file` : undefined,
                          excerpt: c.excerpt,
                        })
                      }
                    >
                      Cite {i + 1}
                    </button>
                    <span className="lede">{c.excerpt}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
