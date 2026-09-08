"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AskComposer } from "@/components/ask/AskComposer";
import { AskReveal } from "@/components/ask/AskReveal";
import { AskScroller } from "@/components/ask/AskScroller";
import { AskSources } from "@/components/ask/AskSources";
import { AskThinking } from "@/components/ask/AskThinking";
import { PageHead } from "@/components/BookUI";
import { useCite } from "@/components/Cite";
import { IconAsk } from "@/components/Icons";
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
  "Which companies have short runway?",
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; question: string; refused: boolean }[]>([]);

  useEffect(() => {
    api<{ companies: { id: string; name: string }[] }>("/api/companies")
      .then((r) => setCos(r.companies ?? []))
      .catch(() => setCos([]));
    api<{ queries: { id: string; question: string; refused: boolean }[] }>("/api/ask/history")
      .then((r) => setHistory(r.queries ?? []))
      .catch(() => setHistory([]));
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

  async function copyAnswer(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="ask-chat">
      <PageHead
        title="Ask"
        testId="ask-ready"
        actions={
          turns.length > 0 ? (
            <button type="button" className="btn ghost sm" onClick={resetChat}>
              New chat
            </button>
          ) : undefined
        }
      />

      <div className="ask-chat-frame">
        <AskScroller followKey={`${followKey}-${turns.length}-${busy ? 1 : 0}`} busy={busy}>
          {turns.length === 0 ? (
            <div className="ask-chat-empty">
              <div className="ask-empty-mark" aria-hidden>
                <IconAsk />
              </div>
              <strong>Ask the book</strong>
              <p className="lede">
                Confirmed metrics only. Missing evidence returns a refusal, never a guess.
              </p>
              {history.length > 0 ? (
                <div className="ask-history" aria-label="Recent questions">
                  <p className="page-kicker">Recent</p>
                  <ul>
                    {history.slice(0, 8).map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          className="ask-starter"
                          disabled={busy}
                          onClick={() => void ask(h.question)}
                        >
                          <span className="ask-starter-label">{h.question}</span>
                          {h.refused ? <span className="lede">Refused</span> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="ask-starters" role="list">
                {STARTERS.map((s, i) => (
                  <motion.button
                    key={s}
                    type="button"
                    role="listitem"
                    className="ask-starter"
                    onClick={() => void ask(s)}
                    disabled={busy}
                    initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={
                      reduce
                        ? { duration: 0.15 }
                        : { ...SPRING_SOFT, delay: 0.05 + i * 0.06 }
                    }
                  >
                    <span className="ask-starter-label">{s}</span>
                    <span className="ask-starter-go" aria-hidden>
                      →
                    </span>
                  </motion.button>
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
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                    transition={reduce ? { duration: 0.2, ease: EASE_OUT } : { type: "spring", stiffness: 420, damping: 30, mass: 0.7 }}
                    style={{ transformOrigin: t.role === "user" ? "100% 100%" : "0% 100%" }}
                    layout={!reduce}
                  >
                    <div className="ask-turn-avatar" aria-hidden>
                      {t.role === "user" ? "You" : <IconAsk />}
                    </div>
                    <div className="ask-turn-main">
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
                          <AskSources
                            citations={t.citations}
                            onOpen={(c) =>
                              openCite({
                                display: c.excerpt?.slice(0, 80) || "Source",
                                documentId: c.documentId ?? undefined,
                                sourcePath: c.documentId
                                  ? `/api/documents/${c.documentId}/file`
                                  : undefined,
                                excerpt: c.excerpt,
                              })
                            }
                          />
                        ) : null}
                        {t.role === "assistant" && !t.reveal ? (
                          <div className="ask-turn-actions">
                            <button
                              type="button"
                              className="ask-turn-action"
                              onClick={() => void copyAnswer(t.id, t.text)}
                            >
                              {copiedId === t.id ? "Copied" : "Copy"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
              {busy ? (
                <li className="ask-turn ask-turn-assistant ask-turn-thinking">
                  <div className="ask-turn-avatar" aria-hidden>
                    <IconAsk />
                  </div>
                  <div className="ask-turn-main">
                    <div className="ask-turn-role">Ask</div>
                    <div className="ask-turn-body">
                      <AskThinking />
                    </div>
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
          leading={
            <label className="ask-scope">
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
          }
        />
      </div>
    </div>
  );
}
