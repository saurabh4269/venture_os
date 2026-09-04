"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, downloadAuthed } from "@/lib/api";

type Report = { id: string; title: string; kind: string; createdAt: string };

export default function ReportsPage() {
  const [rows, setRows] = useState<Report[]>([]);
  const [cos, setCos] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [err, setErr] = useState("");

  function load() {
    api<{ reports: Report[] }>("/api/reports").then((r) => setRows(r.reports));
    api<{ companies: { id: string; name: string }[] }>("/api/companies").then((r) => setCos(r.companies));
  }
  useEffect(() => {
    load();
  }, []);

  async function draft(kind: "one_pager" | "portfolio") {
    setErr("");
    if (kind === "one_pager" && !companyId) {
      setErr("Pick a company for a one-pager. We will not invent a name.");
      return;
    }
    await api("/api/reports", {
      method: "POST",
      body: JSON.stringify({ kind, companyId: companyId || undefined }),
    });
    load();
  }

  return (
    <Shell>
      <h1>Reports</h1>
      <p className="lede">Drafted from the book. Exports are real files (session cookie). Narrative cannot invent numbers.</p>
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      <div className="row">
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} aria-label="Company">
          <option value="">Select company (required for one-pager)</option>
          {cos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => draft("one_pager")}>
          Draft one-pager
        </button>
        <button className="btn ghost" onClick={() => draft("portfolio")}>
          Draft portfolio
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="empty" style={{ marginTop: 18 }}>
          No drafts yet.
        </div>
      ) : (
        <table style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Kind</th>
              <th>Export</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.kind}</td>
                <td className="row">
                  {(["pdf", "pptx", "xlsx"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      className="chip"
                      onClick={() => downloadAuthed(`/api/reports/${r.id}/export/${fmt}`)}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
