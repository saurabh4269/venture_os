"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead, Panel } from "@/components/BookUI";
import { Shell } from "@/components/Shell";
import { api, downloadAuthed } from "@/lib/api";
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
  const [docs, setDocs] = useState<Doc[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<{ documents: Doc[] }>("/api/documents")
      .then((r) => setDocs(r.documents ?? []))
      .catch((e: Error) => setErr(bookErrorMessage(e.message)));
  }, []);

  return (
    <Shell>
      <PageHead
        title="Vault"
        testId="vault-ready"
        lede="Company vault for MIS, board packs, and transcripts. Upload here, then confirm in Inbox."
      />
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {docs.length === 0 ? (
        <div className="empty">
          <strong>Vault is empty</strong>
          <p className="lede" style={{ margin: "8px 0 12px" }}>
            Upload MIS or board packs from a company page, then confirm rows in Inbox.
          </p>
          <div className="row vault-empty-actions">
            <Link href="/companies" className="btn ghost sm">View companies</Link>
            <Link href="/companies/new" className="btn sm">Add company</Link>
          </div>
        </div>
      ) : (
        <Panel flush>
        <div className="table-scroll table-scroll--compact">
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
        </div>
        </Panel>
      )}
    </Shell>
  );
}
