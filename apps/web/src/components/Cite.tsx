"use client";

import { createContext, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { downloadAuthed } from "@/lib/api";

export type CitePayload = {
  display?: string;
  sourcePath?: string;
  filename?: string;
  locator?: { sheet?: string; cell?: string; page?: number } | null;
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

export function CiteProvider({ children }: { children: ReactNode }) {
  const [cite, setCite] = useState<CitePayload | null>(null);
  const titleId = useId();

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
      ? [cite.periodStart, cite.periodEnd].filter(Boolean).join(" – ")
      : null;

  return (
    <CiteContext.Provider value={setCite}>
      {children}
      {cite && (
        <div className="cite-layer" role="presentation">
          <button type="button" className="cite-scrim" aria-label="Close citation" onClick={() => setCite(null)} />
          <aside className="cite-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
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
                <dd>{cite.filename ?? (cite.sourcePath ? "Vault file" : "—")}</dd>
              </div>
              <div>
                <dt>Locator</dt>
                <dd>{loc ?? "—"}</dd>
              </div>
              <div>
                <dt>Excerpt</dt>
                <dd>{cite.excerpt?.trim() || "—"}</dd>
              </div>
              <div>
                <dt>Period</dt>
                <dd>{period ?? "—"}</dd>
              </div>
              <div>
                <dt>Confirmed</dt>
                <dd>
                  {cite.confirmedAt || cite.confirmedBy
                    ? [cite.confirmedAt ? new Date(cite.confirmedAt).toLocaleString() : null, cite.confirmedBy ? cite.confirmedBy.slice(0, 8) : null]
                        .filter(Boolean)
                        .join(" · ")
                    : "—"}
                </dd>
              </div>
            </dl>
            <p className="lede" style={{ margin: "12px 0 0" }}>
              Footnote from the book. Missing fields stay — ; we will not invent a locator.
            </p>
            {cite.sourcePath ? (
              <button
                type="button"
                className="btn sm"
                style={{ marginTop: 14 }}
                onClick={() => downloadAuthed(cite.sourcePath!, cite.filename)}
              >
                Open source file
              </button>
            ) : (
              <p className="lede" style={{ marginTop: 14 }}>
                No file attached to this citation.
              </p>
            )}
          </aside>
        </div>
      )}
    </CiteContext.Provider>
  );
}
