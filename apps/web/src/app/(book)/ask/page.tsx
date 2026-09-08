"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AskComposer } from "@/components/ask/AskComposer";
import { AskReveal } from "@/components/ask/AskReveal";
import { AskScroller } from "@/components/ask/AskScroller";
import { AskThinking } from "@/components/ask/AskThinking";
import { ContextCard, PageHead } from "@/components/BookUI";
import { useCite } from "@/components/Cite";
import { api } from "@/lib/api";
import { EASE_OUT, SPRING_SOFT } from "@/lib/motion-ease";
import { bookErrorMessage } from "@/lib/wake";

type AskRes = {
  answer: string;
  refused: boolean;
  citations: { documentId: string | null; sourceRefId: string | null; excerpt: string }[];
};

type Turn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  refused?: boolean;
  citations?: AskRes["citations"];
  /** Progressive reveal for the newest assistant turn. */
  reveal?: boolean;
};

const STARTERS = [
  "What is the latest confirmed cash?",
  "Which companies have runway under 6 months?",
  "Summarise open flags with evidence.",
];

export default function AskPage() {
  const openCite = useCite();
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cos, setCos] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [followKey, setFollowKey] = useState(0);

  useEffect(() => {
    api<{ companies: { id: string; name: string }[] }>("/api/companies")
      .then((r) => setCos(r.companies ?? []))
      .catch(() => setCos([]));
    const fromUrl = new URLSearchParams(window.location.search).get("companyId");
    if (fromUrl) setCompanyId(fromUrl);
  }, []);

  function bumpFollow() {
    setFollowKey((n) => n + 1);
  }

  async function ask(question: string) {
    const text = question.trim();
    if (text.length < 3 || busy) return;
    const userTurn: Turn = { id: `u-${Date.now()}`, role: "user", text };
    setTurns((t) => [...t, userTurn]);
    setQ("");
    setBusy(true);
    setErr("");
    bumpFollow();
    try {
      const followUpHint =
        turns.length > 0
          ? `Prior exchange (for follow-up context only; answer only from evidence):\n${turns
              .slice(-4)
              .map((t) => `${t.role === "user" ? "Q" : "A"}: ${t.text}`)
              .join("\n")}\n\nFollow-up: ${text}`
          : text;
      const next = await api<AskRes>("/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: followUpHint, companyId: companyId || undefined }),
      });
      const refused = Boolean(next.refused || /will not guess/i.test(next.answer));
      setTurns((t) => [
        ...t.map((x) => (x.reveal ? { ...x, reveal: false } : x)),
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: next.answer || (refused ? "Not enough confirmed evidence to answer." : ""),
          refused,
          citations: next.citations,
          reveal: !reduce,
        },
      ]);
      bumpFollow();
    } catch (e) {
      setErr(e instanceof Error ? bookErrorMessage(e.message) : "Ask failed");
    } finally {
      setBusy(false);
    }
  }

  function resetChat() {
    setTurns([]);
    setErr("");
    setQ("");
    bumpFollow();
  }

  return (
    <div className="ask-chat">
      <PageHead
        title="Ask"
        testId="ask-ready"
        kicker="Cite-or-refuse over confirmed book facts"
        actions={
          turns.length > 0 ? (
            <button type="button" className="btn ghost sm" onClick={resetChat}>
              New chat
            </button>
          ) : undefined
        }
      />

      <div className="ask-chat-toolbar">
        <label className="field table-tools-field">
          <span className="sr-only">Company scope</span>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} aria-label="Company scope">
            <option value="">All companies</option>
            {cos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <p className="lede ask-chat-hint">Answers need locators. Missing evidence returns a refusal, not a guess.</p>
      </div>

      <div className="ask-chat-frame">
        <AskScroller followKey={`${followKey}-${turns.length}-${busy ? 1 : 0}`} busy={busy}>
          {turns.length === 0 ? (
            <div className="ask-chat-empty">
              <strong>Ask the book</strong>
              <p className="lede">
                Start with a confirmed metric, flag, or coverage question. Follow-ups stay in this thread.
              </p>
              <div className="ask-starters">
                {STARTERS.map((s) => (
                  <button key={s} type="button" className="ask-starter" onClick={() => void ask(s)} disabled={busy}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="ask-thread">
              <AnimatePresence initial={false}>
                {turns.map((t) => (
                  <motion.li
                    key={t.id}
                    className={`ask-turn ask-turn-${t.role}${t.refused ? " is-refused" : ""}`}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, filter: "blur(4px)" }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={reduce ? { duration: 0.2, ease: EASE_OUT } : SPRING_SOFT}
                    layout={!reduce}
                  >
                    <div className="ask-turn-role">{t.role === "user" ? "You" : "Ask"}</div>
                    <div
                      className="ask-turn-body"
                      data-testid={t.role === "assistant" ? (t.refused ? "ask-refused" : "ask-answer") : undefined}
                    >
                      {t.role === "assistant" && t.reveal ? (
                        <AskReveal
                          text={t.text}
                          onTick={bumpFollow}
                          onDone={() =>
                            setTurns((cur) => cur.map((x) => (x.id === t.id ? { ...x, reveal: false } : x)))
                          }
                        />
                      ) : (
                        <p className="body">{t.text}</p>
                      )}
                      {t.role === "assistant" && t.citations?.length && !t.reveal ? (
                        <ul className="ask-cites">
                          {t.citations.map((c, i) => (
                            <li key={`${t.id}-${c.documentId}-${i}`}>
                              <ContextCard
                                kicker={`Source ${i + 1}`}
                                body={c.excerpt || "Source excerpt"}
                                onOpen={
                                  c.documentId || c.excerpt
                                    ? () =>
                                        openCite({
                                          display: c.excerpt?.slice(0, 80) || "Source",
                                          documentId: c.documentId ?? undefined,
                                          sourcePath: c.documentId
                                            ? `/api/documents/${c.documentId}/file`
                                            : undefined,
                                          excerpt: c.excerpt,
                                        })
                                    : undefined
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
              {busy ? (
                <li className="ask-turn ask-turn-assistant ask-turn-thinking">
                  <div className="ask-turn-role">Ask</div>
                  <div className="ask-turn-body">
                    <AskThinking />
                  </div>
                </li>
              ) : null}
            </ul>
          )}
        </AskScroller>

        {err ? (
          <p className="sev-high ask-chat-err" role="alert">
            {err}
          </p>
        ) : null}

        <AskComposer
          value={q}
          onChange={setQ}
          onSubmit={() => void ask(q)}
          busy={busy}
          placeholder={turns.length ? "Ask a follow-up…" : "Ask about confirmed cash, runway, flags…"}
        />
      </div>
    </div>
  );
}
