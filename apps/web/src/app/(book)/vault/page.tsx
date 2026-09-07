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
};

export default function VaultPage() {
  const { data, error } = useSWR<{ documents: Doc[] }>("/api/documents", bookFetcher);
  const docs = data?.documents ?? [];
  const err = error ? bookErrorMessage(error instanceof Error ? error.message : String(error)) : "";

  return (
    <>
      <PageHead
        title="Vault"
        lede="Company vault — MIS, board packs, and transcripts. Upload here, confirm in Inbox. A firm library and LP room are not in this release."
      />
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {docs.length === 0 ? (
        <div className="empty">
          <strong>No documents</strong>
          Open a company and upload.
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
                <tr key={d.id}>
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
                    {d.parseStatus ?? "—"}
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
