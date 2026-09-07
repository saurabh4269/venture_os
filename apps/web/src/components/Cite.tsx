"use client";

import { createContext, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { canHighlightSource } from "@venture-os/core";
import { downloadAuthed } from "@/lib/api";
import { SourceViewer } from "@/components/SourceViewer";
import { EASE_OUT, SPRING_PANEL } from "@/lib/motion-ease";

export type CitePayload = {
  display?: string;
  sourcePath?: string;
  documentId?: string;
  filename?: string;
  locator?: {
    sheet?: string;
    cell?: string;
    page?: number;
    excerpt?: string;
    bbox?: [number, number, number, number];
  } | null;
  excerpt?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
};

const CiteContext = createContext<(cite: CitePayload) => void>(() => undefined);

export function useCite() {
  return useContext(CiteContext);
}

function locatorLine(loc?: CitePayload["locator"]) {
  if (!loc) return null;
  const parts = [loc.sheet, loc.cell, loc.page != null ? `p.${loc.page}` : null].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

function documentIdFromPath(path?: string): string | undefined {
  if (!path) return undefined;
  const m = path.match(/\/api\/documents\/([^/]+)/);
  return m?.[1];
}

export function CiteProvider({ children }: { children: ReactNode }) {
  const [cite, setCite] = useState<CitePayload | null>(null);
  const titleId = useId();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!cite) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCite(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cite]);

  const loc = locatorLine(cite?.locator);
  const period =
    cite?.periodStart || cite?.periodEnd
      ? [cite.periodStart, cite.periodEnd].filter(Boolean).join(" · ")
      : null;
  const documentId = cite?.documentId ?? documentIdFromPath(cite?.sourcePath);
  const gate = canHighlightSource(cite?.locator ?? null);

  return (
    <CiteContext.Provider value={setCite}>
      {children}
      <AnimatePresence>
        {cite ? (
          <motion.div className="cite-layer" role="presentation" key="cite" initial={false}>
            <motion.button
              type="button"
              className="cite-scrim"
              aria-label="Close citation"
              onClick={() => setCite(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0.12 : 0.22, ease: EASE_OUT }}
            />
            <motion.aside
              className="cite-drawer cite-drawer-wide"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={reduce ? { opacity: 0 } : { x: "100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "100%" }}
              transition={reduce ? { duration: 0.15, ease: EASE_OUT } : SPRING_PANEL}
            >
              <header className="cite-drawer-head">
                <div>
                  <p className="page-kicker">Citation</p>
                  <h2 id={titleId}>{cite.display ?? "Source"}</h2>
                </div>
                <button type="button" className="btn ghost sm" onClick={() => setCite(null)}>
                  Close
                </button>
              </header>
              <dl className="cite-dl">
                <div>
                  <dt>Source file</dt>
                  <dd>{cite.filename ?? (cite.sourcePath ? "Source file" : "")}</dd>
                </div>
                <div>
                  <dt>Locator</dt>
                  <dd>{loc ?? ""}</dd>
                </div>
                <div>
                  <dt>Jump</dt>
                  <dd>{gate.ok ? `Ready (${gate.kind})` : `Unavailable · ${gate.reason.replaceAll("_", " ")}`}</dd>
                </div>
                <div>
                  <dt>Excerpt</dt>
                  <dd>
                    {(() => {
                      const text = cite.excerpt?.trim() || cite.locator?.excerpt?.trim();
                      return text ? <div className="cite-excerpt-card">{text}</div> : "";
                    })()}
                  </dd>
                </div>
                <div>
                  <dt>Period</dt>
                  <dd>{period ?? ""}</dd>
                </div>
                <div>
                  <dt>Confirmed</dt>
                  <dd>
                    {cite.confirmedAt || cite.confirmedBy
                      ? [
                          cite.confirmedAt ? new Date(cite.confirmedAt).toLocaleString() : null,
                          cite.confirmedBy ? cite.confirmedBy.slice(0, 8) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : ""}
                  </dd>
                </div>
              </dl>

              {documentId ? (
                <SourceViewer documentId={documentId} locator={cite.locator} />
              ) : (
                <p className="lede" style={{ marginTop: 12 }}>
                  No document id on this citation. Download only.
                </p>
              )}

              {cite.sourcePath ? (
                <button
                  type="button"
                  className="btn sm"
                  style={{ marginTop: 14 }}
                  onClick={() => downloadAuthed(cite.sourcePath!, cite.filename)}
                >
                  Download source file
                </button>
              ) : (
                <p className="lede" style={{ marginTop: 14 }}>
                  No file attached to this citation.
                </p>
              )}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </CiteContext.Provider>
  );
}
