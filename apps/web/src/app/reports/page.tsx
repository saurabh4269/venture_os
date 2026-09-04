"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, apiUrl } from "@/lib/api";

type Report = { id: string; title: string; kind: string; createdAt: string };

export default function ReportsPage() {
  const [rows, setRows] = useState<Report[]>([]);
  const [cos, setCos] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState("");

  function load() {
    api<{ reports: Report[] }>("/api/reports").then((r) => setRows(r.reports));
    api<{ companies: { id: string; name: string }[] }>("/api/companies").then((r) => setCos(r.companies));
  }
  useEffect(() => {
    load();
  }, []);

  async function draft(kind: "one_pager" | "portfolio") {
    await api("/api/reports", {
      method: "POST",
      body: JSON.stringify({ kind, companyId: companyId || undefined }),
    });
    load();
  }

  return (
    <Shell>
      <h1>Reports</h1>
      <p className="lede">Drafted from the book. Exports are real files. Narrative cannot invent numbers.</p>
      <div className="row">
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          <option value="">All companies (portfolio)</option>
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
                  <a key={fmt} className="chip" href={apiUrl(`/api/reports/${r.id}/export/${fmt}`)}>
                    {fmt.toUpperCase()}
                  </a>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}
