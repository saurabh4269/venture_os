"use client";

import { useEffect, useState } from "react";
import { Shell, useBookSession } from "@/components/Shell";
import { api, downloadAuthed } from "@/lib/api";

type Report = { id: string; title: string; kind: string; createdAt: string };

const KIND_LABEL: Record<string, string> = {
  one_pager: "One-pager",
  portfolio: "Portfolio",
};

export default function ReportsPage() {
  const { canWrite } = useBookSession();
  const [rows, setRows] = useState<Report[]>([]);
  const [cos, setCos] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<"one_pager" | "portfolio" | "">("");

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
    setBusy(kind);
    try {
      await api("/api/reports", {
        method: "POST",
        body: JSON.stringify({ kind, companyId: companyId || undefined }),
      });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <Shell>
      <h1>Reports</h1>
      <p className="lede">
        Drafted from the book. One-pagers use a fixed field order (revenue, GM, cash, burn, runway, flags). Exports
        are real files (session cookie). Narrative cannot invent numbers.
      </p>
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {canWrite && (
      <div className="row">
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} aria-label="Company">
          <option value="">Select company (required for one-pager)</option>
          {cos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => draft("one_pager")} disabled={Boolean(busy)}>
          {busy === "one_pager" ? "Drafting…" : "Draft one-pager"}
        </button>
        <button className="btn ghost" onClick={() => draft("portfolio")} disabled={Boolean(busy)}>
          {busy === "portfolio" ? "Drafting…" : "Draft portfolio"}
        </button>
      </div>
      )}
      {rows.length === 0 ? (
        <div className="empty" style={{ marginTop: 18 }}>
          No drafts yet. Pick a company and draft a one-pager from confirmed facts.
        </div>
      ) : (
        <table style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Kind</th>
              <th>Created</th>
              <th>Export</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{KIND_LABEL[r.kind] ?? r.kind}</td>
                <td className="lede">{new Date(r.createdAt).toLocaleString()}</td>
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