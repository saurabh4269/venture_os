"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ContextCard } from "@/components/BookUI";
import { useCite } from "@/components/Cite";
import { IconAsk } from "@/components/Icons";
import { BusyDots } from "@/components/motion/BusyDots";
import { api } from "@/lib/api";
import { EASE_OUT, SPRING_PANEL } from "@/lib/motion-ease";
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
      <AnimatePresence>{open ? <AskPanel companyId={companyId} onClose={() => setOpen(false)} /> : null}</AnimatePresence>
    </>
  );
}

function AskPanel({ companyId: initialCompanyId, onClose }: { companyId?: string; onClose: () => void }) {
  const openCite = useCite();
  const reduce = useReducedMotion();
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
    <motion.div
      className="ask-panel-layer"
      role="presentation"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.12 : 0.2, ease: EASE_OUT }}
    >
      <motion.aside
        id="ask-panel"
        className="ask-panel"
        role="dialog"
        aria-label="Ask"
        data-testid="ask-ready"
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
        transition={reduce ? { duration: 0.15 } : SPRING_PANEL}
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
          {busy ? <BusyDots label="Searching confirmed facts…" className="ask-busy" /> : null}
        </form>
        {err ? (
          <p className="sev-high" role="alert">
            {err}
          </p>
        ) : null}
        {res && refused ? (
          <div className="ask-answer" data-testid="ask-refused" role="status">
            <p className="body">{res.answer || "Not enough confirmed evidence to answer."}</p>
          </div>
        ) : null}
        {res && !refused ? (
          <div className="ask-answer" data-testid="ask-answer">
            <p className="body">{res.answer}</p>
            {res.citations.length ? (
              <ul className="ask-cites">
                {res.citations.map((c, i) => (
                  <li key={`${c.documentId}-${i}`}>
                    <ContextCard
                      kicker={`Source ${i + 1}`}
                      body={c.excerpt || "Source excerpt"}
                      onOpen={
                        c.documentId || c.excerpt
                          ? () =>
                              openCite({
                                display: c.excerpt?.slice(0, 80) || "Source",
                                documentId: c.documentId ?? undefined,
                                sourcePath: c.documentId ? `/api/documents/${c.documentId}/file` : undefined,
                                excerpt: c.excerpt,
                              })
                          : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lede">No citations returned.</p>
            )}
          </div>
        ) : null}
      </motion.aside>
    </motion.div>
  );
}
