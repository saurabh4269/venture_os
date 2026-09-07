"use client";

import { useEffect, useState } from "react";
import { canHighlightSource, colToLetter } from "@venture-os/core";
import { api } from "@/lib/api";

type SheetPreview = {
  sheet: string;
  sheets: string[];
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
  highlight: { row: number; col: number; a1: string } | null;
  values: (string | number | null)[][];
};

type PagePreview = {
  page: number;
  pageCount: number;
  text: string;
  canHighlight: boolean;
};

export function SourceViewer(props: {
  documentId: string;
  locator?: { sheet?: string; cell?: string; page?: number; excerpt?: string } | null;
}) {
  const gate = canHighlightSource(props.locator ?? null);
  const [err, setErr] = useState("");
  const [sheet, setSheet] = useState<SheetPreview | null>(null);
  const [page, setPage] = useState<PagePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const jumpKind = gate.ok ? gate.kind : null;

  useEffect(() => {
    if (!jumpKind) {
      setSheet(null);
      setPage(null);
      setErr("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr("");
    const run = async () => {
      try {
        if (jumpKind === "cell") {
          const q = new URLSearchParams();
          if (props.locator?.sheet) q.set("sheet", props.locator.sheet);
          if (props.locator?.cell) q.set("cell", props.locator.cell);
          const data = await api<{ preview: SheetPreview }>(
            `/api/documents/${props.documentId}/preview/sheet?${q}`,
          );
          if (!cancelled) setSheet(data.preview);
        } else {
          const pg = props.locator?.page ?? 1;
          const data = await api<PagePreview>(
            `/api/documents/${props.documentId}/preview/page?page=${pg}`,
          );
          if (!cancelled) setPage(data);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "preview_failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [props.documentId, props.locator?.sheet, props.locator?.cell, props.locator?.page, jumpKind]);

  if (!gate.ok) {
    return (
      <div className="cite-viewer muted">
        <p className="lede">Jump unavailable. Locator incomplete ({gate.reason.replaceAll("_", " ")}).</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cite-viewer">
        <p className="lede">Loading source…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="cite-viewer">
        <p className="sev-high" role="alert">
          {err}
        </p>
      </div>
    );
  }

  if (sheet) {
    return (
      <div className="cite-viewer">
        <p className="lede">
          Sheet <strong>{sheet.sheet}</strong>
          {sheet.highlight ? ` · ${sheet.highlight.a1}` : ""}
        </p>
        <div className="cite-grid-wrap">
          <table className="cite-grid">
            <thead>
              <tr>
                <th />
                {Array.from({ length: sheet.colEnd - sheet.colStart + 1 }, (_, i) => (
                  <th key={i}>{colToLetter(sheet.colStart + i)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.values.map((row, ri) => {
                const r = sheet.rowStart + ri;
                return (
                  <tr key={r}>
                    <th>{r}</th>
                    {row.map((cell, ci) => {
                      const c = sheet.colStart + ci;
                      const on =
                        sheet.highlight && sheet.highlight.row === r && sheet.highlight.col === c;
                      return (
                        <td key={c} className={on ? "cite-hl" : undefined}>
                          {cell == null || cell === "" ? "" : String(cell)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (page) {
    return (
      <div className="cite-viewer">
        <p className="lede">
          Page {page.page} of {page.pageCount}
        </p>
        {props.locator?.excerpt ? <p className="cite-excerpt">{props.locator.excerpt}</p> : null}
        <pre className="cite-page-text">{page.text || ""}</pre>
      </div>
    );
  }

  return null;
}
