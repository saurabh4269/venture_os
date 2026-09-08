"use client";

import Link from "next/link";
import useSWR from "swr";
import { Miss, PageHead } from "@/components/BookUI";
import { downloadAuthed } from "@/lib/api";
import { bookFetcher } from "@/lib/book-data";
import { titleCaseKind } from "@/lib/format";
import { bookErrorMessage } from "@/lib/wake";

type Doc = {
  id: string;
  filename: string;
  kind: string;
  companyId: string | null;
  companyName?: string | null;
  parseStatus?: string;
  parseError?: string | null;
  parsePhase?: string;
  parsePhaseLabel?: string;
};

function extOf(filename: string) {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? "";
}

function thumbKind(filename: string, kind: string) {
  const ext = extOf(filename);
  if (ext === "pdf" || kind.includes("board") || kind.includes("pack")) return "pdf";
  if (ext === "csv") return "csv";
  if (ext === "xlsx" || ext === "xls" || kind === "mis") return "sheet";
  if (kind.includes("transcript") || kind.includes("granola")) return "note";
  return "file";
}

function thumbLabel(kind: string) {
  if (kind === "pdf") return "PDF";
  if (kind === "csv") return "CSV";
  if (kind === "sheet") return "XLS";
  if (kind === "note") return "NOTE";
  return "FILE";
}

export default function SourcesPage() {
  const { data, error } = useSWR<{ documents: Doc[] }>("/api/documents", bookFetcher);
  const docs = data?.documents ?? [];
  const err = error ? bookErrorMessage(error instanceof Error ? error.message : String(error)) : "";

  return (
    <>
      <PageHead title="Sources" kicker="MIS, board packs, transcripts" />
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {docs.length === 0 ? (
        <div className="empty">
          <strong>No documents</strong>
          Open a company and upload. Confirm rows before they enter the book.
        </div>
      ) : (
        <div className="source-grid">
          {docs.map((d) => {
            const thumb = thumbKind(d.filename, d.kind);
            return (
              <article
                key={d.id}
                className={`source-card${d.parsePhase === "stalled" ? " is-stalled" : ""}`}
              >
                <button
                  type="button"
                  className={`source-thumb source-thumb-${thumb}`}
                  onClick={() => downloadAuthed(`/api/documents/${d.id}/file`, d.filename)}
                  aria-label={`Download ${d.filename}`}
                >
                  <span className="source-thumb-sheet" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="source-thumb-badge">{thumbLabel(thumb)}</span>
                </button>
                <div className="source-card-body">
                  <button
                    type="button"
                    className="source-card-title"
                    onClick={() => downloadAuthed(`/api/documents/${d.id}/file`, d.filename)}
                  >
                    {d.filename}
                  </button>
                  <div className="source-card-meta">
                    {d.companyId && d.companyName ? (
                      <Link href={`/companies/${d.companyId}`}>{d.companyName}</Link>
                    ) : (
                      <Miss />
                    )}
                    <span>{titleCaseKind(d.kind)}</span>
                  </div>
                  <div className="source-card-parse">
                    {d.parsePhaseLabel || d.parseStatus ? (
                      <span className={`parse-phase parse-phase-${d.parsePhase ?? "unknown"}`}>
                        {d.parsePhaseLabel ?? d.parseStatus}
                      </span>
                    ) : (
                      <Miss />
                    )}
                    {d.parsePhase === "stalled" ? (
                      <div className="lede">Running over 10 minutes with no finish.</div>
                    ) : null}
                    {d.parseError ? <div className="sev-high">{d.parseError}</div> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
