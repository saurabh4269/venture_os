"use client";

import { useEffect, useState } from "react";
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
  useEffect(() => {
    api<{ documents: Doc[] }>("/api/documents").then((r) => setDocs(r.documents));
  }, []);

  return (
    <Shell>
      <h1>Vault</h1>
      <p className="lede">Company vault — MIS, board packs, transcripts. Firm library is thin. LP room is Phase 2.</p>
      {docs.length === 0 ? (
        <div className="empty">No documents. Open a company and upload.</div>
      ) : (
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
      )}
    </Shell>
  );
}
