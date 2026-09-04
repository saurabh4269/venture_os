"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, apiUrl } from "@/lib/api";

export default function VaultPage() {
  const [docs, setDocs] = useState<{ id: string; filename: string; kind: string; companyId: string | null }[]>([]);
  useEffect(() => {
    api<{ documents: typeof docs }>("/api/documents").then((r) => setDocs(r.documents));
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
              <th>Kind</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td>
                  <a href={apiUrl(`/api/documents/${d.id}/file`)}>{d.filename}</a>
                </td>
                <td>{d.kind}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
