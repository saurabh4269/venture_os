"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Miss, PageHead } from "@/components/BookUI";
import { IconSearch } from "@/components/Icons";
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

type ThumbKind = "pdf" | "csv" | "sheet" | "note" | "file";

const TYPE_FILTERS: { id: "all" | ThumbKind; label: string }[] = [
  { id: "all", label: "All types" },
  { id: "sheet", label: "Spreadsheets" },
  { id: "csv", label: "CSV" },
  { id: "pdf", label: "PDF / packs" },
  { id: "note", label: "Notes" },
  { id: "file", label: "Other" },
];

function extOf(filename: string) {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? "";
}

function thumbKind(filename: string, kind: string): ThumbKind {
  const ext = extOf(filename);
  if (ext === "pdf" || kind.includes("board") || kind.includes("pack")) return "pdf";
  if (ext === "csv") return "csv";
  if (ext === "xlsx" || ext === "xls" || kind === "mis") return "sheet";
  if (kind.includes("transcript") || kind.includes("granola")) return "note";
  return "file";
}

function thumbSrc(kind: ThumbKind) {
  return `/source-thumbs/${kind}.svg`;
}

export default function SourcesPage() {
  const { data, error } = useSWR<{ documents: Doc[] }>("/api/documents", bookFetcher);
  const docs = data?.documents ?? [];
  const err = error ? bookErrorMessage(error instanceof Error ? error.message : String(error)) : "";
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPE_FILTERS)[number]["id"]>("all");

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return docs.filter((d) => {
      const thumb = thumbKind(d.filename, d.kind);
      if (type !== "all" && thumb !== type) return false;
      if (!needle) return true;
      const hay = `${d.filename} ${d.companyName ?? ""} ${d.kind}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [docs, q, type]);

  const filtered = Boolean(q.trim() || type !== "all");

  return (
    <>
      <PageHead title="Sources" kicker="MIS, board packs, transcripts" />
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}

      {docs.length > 0 ? (
        <div className="table-tools">
          <label className="field table-tools-field source-search">
            <span className="sr-only">Search sources</span>
            <IconSearch className="source-search-ico" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search file or company…"
              aria-label="Search by file name or company"
            />
          </label>
          <label className="field table-tools-field">
            <span className="sr-only">File type</span>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="Filter by file type">
              {TYPE_FILTERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          {filtered ? (
            <button
              type="button"
              className="linkish"
              onClick={() => {
                setQ("");
                setType("all");
              }}
            >
              Clear
            </button>
          ) : null}
          <span className="lede table-tools-count">
            {visible.length} of {docs.length}
          </span>
        </div>
      ) : null}

      {docs.length === 0 ? (
        <div className="empty">
          <strong>No documents</strong>
          Open a company and upload. Confirm rows before they enter the book.
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <strong>No sources match</strong>
          Try another file name, company, or file type.
        </div>
      ) : (
        <div className="source-grid">
          {visible.map((d) => {
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
                  {/* eslint-disable-next-line @next/next/no-img-element -- static decorative thumbs */}
                  <img
                    className="source-thumb-img"
                    src={thumbSrc(thumb)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
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
