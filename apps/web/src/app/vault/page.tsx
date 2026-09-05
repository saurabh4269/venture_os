"use client";

import { useEffect, useState } from "react";
import { PageHead, Panel } from "@/components/BookUI";
import { Shell } from "@/components/Shell";
import { api, downloadAuthed } from "@/lib/api";

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
  const [docs, setDocs] = useState<Doc[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<{ documents: Doc[] }>("/api/documents")
      .then((r) => setDocs(r.documents ?? []))
      .catch((e: Error) => setErr(e.message));
  }, []);

  return (
    <Shell>
      <PageHead
        title="Vault"
        lede="Source files. Upload here, confirm in Inbox, then they become book facts. Firm library is thin. LP room is Phase 2."
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
                  <button type="button" className="chip" onClick={() => downloadAuthed(`/api/documents/${d.id}/file`, d.filename)}>
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
    </Shell>
  );
}
