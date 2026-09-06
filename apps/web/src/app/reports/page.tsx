"use client";

import { useEffect, useState } from "react";
import { PageHead, Panel } from "@/components/BookUI";
import { Shell, useBookSession } from "@/components/Shell";
import { api, downloadAuthed } from "@/lib/api";
import { bookErrorMessage } from "@/lib/wake";

type Report = { id: string; title: string; kind: string; createdAt: string };

const KIND_LABEL: Record<string, string> = {
  one_pager: "One-pager",
  portfolio: "Portfolio",
  monthly_pack: "Monthly pack",
};

export default function ReportsPage() {
  const { canWrite } = useBookSession();
  const [rows, setRows] = useState<Report[]>([]);
  const [cos, setCos] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<"one_pager" | "portfolio" | "monthly_pack" | "">("");
  const [periodEnd, setPeriodEnd] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  function load() {
    setRefreshing(true);
    Promise.all([
      api<{ reports: Report[] }>("/api/reports").then((r) => setRows(r.reports)),
      api<{ companies: { id: string; name: string }[] }>("/api/companies").then((r) => setCos(r.companies)),
    ])
      .catch((e: Error) => setErr(bookErrorMessage(e.message)))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }
  useEffect(() => {
    load();
  }, []);

  async function draft(kind: "one_pager" | "portfolio" | "monthly_pack") {
    setErr("");
    if (kind === "one_pager" && !companyId) {
      setErr("Pick a company for a one-pager.");
      return;
    }
    setBusy(kind);
    try {
      await api("/api/reports", {
        method: "POST",
        body: JSON.stringify({ kind, companyId: companyId || undefined, periodEnd: periodEnd || undefined }),
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
      <PageHead
        title="Reports"
        testId="reports-ready"
        lede="Draft from the confirmed book. One-pagers need a company. Monthly packs keep objective and subjective columns apart."
      />
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {canWrite && (
      <div className="row reports-draft-row">
        <label className="field">
          Period end
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            data-testid="reports-period"
          />
        </label>
        <label className="field">
          Company
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            data-testid="reports-company"
          >
            <option value="">Select company (required for one-pager)</option>
            {cos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn sm"
          data-testid="reports-draft-one-pager"
          onClick={() => draft("one_pager")}
          disabled={Boolean(busy)}
        >
          {busy === "one_pager" ? "Drafting…" : "Draft one-pager"}
        </button>
        <button className="btn ghost sm" onClick={() => draft("portfolio")} disabled={Boolean(busy)}>
          {busy === "portfolio" ? "Drafting…" : "Draft portfolio"}
        </button>
        <button className="btn ghost sm" onClick={() => draft("monthly_pack")} disabled={Boolean(busy)}>
          {busy === "monthly_pack" ? "Drafting…" : "Draft monthly pack"}
        </button>
      </div>
      )}
      {loading && !err && rows.length === 0 && <p className="lede">Loading the book…</p>}
      {refreshing && rows.length > 0 && (
        <p className="lede" role="status" aria-live="polite">Refreshing…</p>
      )}
      {!loading && rows.length === 0 ? (
        <div className="empty">
          <strong>Ready to draft</strong>
          Pick a company and draft a one-pager, or draft the monthly pack from confirmed facts.
        </div>
      ) : !loading ? (
        <Panel flush>
        <div className="table-scroll table-scroll--compact">
        <table>
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
                <td className="reports-export-row">
                  {(["pdf", "pptx", "xlsx"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      className="chip"
                      data-testid={`reports-export-${fmt}`}
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
        </div>
        </Panel>
      ) : null}
    </Shell>
  );
}