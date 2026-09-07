"use client";

import useSWR from "swr";
import { PageHead, Panel } from "@/components/BookUI";
import { downloadAuthed } from "@/lib/api";
import { bookFetcher } from "@/lib/book-data";
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

export default function SourcesPage() {
  const { data, error } = useSWR<{ documents: Doc[] }>("/api/documents", bookFetcher);
  const docs = data?.documents ?? [];
  const err = error ? bookErrorMessage(error instanceof Error ? error.message : String(error)) : "";

  return (
    <>
      <PageHead title="Sources" />
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {docs.length === 0 ? (
        <div className="empty">
          <strong>No files</strong>
        </div>
      ) : (
        <Panel flush>
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Company</th>
                <th>Kind</th>
                <th>Parse</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className={d.parsePhase === "stalled" ? "parse-stalled" : undefined}>
                  <td>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => downloadAuthed(`/api/documents/${d.id}/file`, d.filename)}
                    >
                      {d.filename}
                    </button>
                  </td>
                  <td>{d.companyName ?? "—"}</td>
                  <td>{d.kind}</td>
                  <td>
                    <span className={`parse-phase parse-phase-${d.parsePhase ?? "unknown"}`}>
                      {d.parsePhaseLabel ?? d.parseStatus ?? "—"}
                    </span>
                    {d.parsePhase === "stalled" ? (
                      <div className="lede">Running &gt;10m with no finish — check worker / Redis.</div>
                    ) : null}
                    {d.parseError ? <div className="sev-high">{d.parseError}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
