"use client";

/**
 * Collapsible sources — beUI Citations / Beautiful UI Streaming Text "N sources".
 * Opens the cite drawer for real locators; never invents evidence.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { ContextCard } from "@/components/BookUI";
import { EASE_OUT, SPRING_SOFT } from "@/lib/motion-ease";

export type AskCitation = {
  documentId: string | null;
  sourceRefId: string | null;
  excerpt: string;
};

export function AskSources({
  citations,
  onOpen,
}: {
  citations: AskCitation[];
  onOpen: (c: AskCitation, index: number) => void;
}) {
  const reduce = useReducedMotion();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  if (!citations.length) return null;

  return (
    <div className="ask-sources">
      <button
        type="button"
        className={`ask-sources-toggle${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ask-sources-count">{citations.length}</span>
        <span>{citations.length === 1 ? "source" : "sources"}</span>
        <motion.span
          className="ask-sources-chevron"
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : SPRING_SOFT}
        >
          ▾
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.ul
            id={panelId}
            className="ask-cites"
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={reduce ? { duration: 0.15, ease: EASE_OUT } : { ...SPRING_SOFT, opacity: { duration: 0.2 } }}
          >
            {citations.map((c, i) => (
              <li key={`${c.documentId ?? "x"}-${i}`}>
                <ContextCard
                  kicker={`Source ${i + 1}`}
                  body={c.excerpt || "Source excerpt"}
                  onOpen={
                    c.documentId || c.excerpt
                      ? () => onOpen(c, i)
                      : undefined
                  }
                />
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
