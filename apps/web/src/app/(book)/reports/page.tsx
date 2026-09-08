"use client";

import { useState } from "react";
import useSWR from "swr";
import { PageHead, Panel } from "@/components/BookUI";
import { useBookSession } from "@/components/Shell";
import { api, downloadAuthed } from "@/lib/api";
import { bookFetcher } from "@/lib/book-data";
import { bookErrorMessage } from "@/lib/wake";

type Report = { id: string; title: string; kind: string; createdAt: string };

const KIND_LABEL: Record<string, string> = {
  one_pager: "One-pager",
  portfolio: "Portfolio",
  monthly_pack: "Monthly pack",
};

const PACKS = [
  {
    kind: "one_pager" as const,
    title: "One-pager",
    body: "Single-company brief from booked metrics and evidence. Pick the name first.",
    needsCompany: true,
  },
  {
    kind: "portfolio" as const,
    title: "Portfolio pack",
    body: "Fund-wide snapshot across confirmed coverage. Company optional for a focus name.",
    needsCompany: false,
  },
  {
    kind: "monthly_pack" as const,
    title: "Monthly pack",
    body: "Ritual close pack for the period. Uses the book only — no invented cells.",
    needsCompany: false,
  },
];

export default function ReportsPage() {
  const { canWrite } = useBookSession();
  const { data: reportsData, error, isLoading: loading, mutate } = useSWR<{ reports: Report[] }>(
    "/api/reports",
    bookFetcher,
  );
  const { data: cosData } = useSWR<{ companies: { id: string; name: string }[] }>("/api/companies", bookFetcher);
  const rows = reportsData?.reports ?? [];
  const cos = cosData?.companies ?? [];
  const [companyId, setCompanyId] = useState("");
  const [actionErr, setActionErr] = useState("");
  const [busy, setBusy] = useState<"one_pager" | "portfolio" | "monthly_pack" | "">("");
  const [periodEnd, setPeriodEnd] = useState("");
  const err = actionErr || (error ? bookErrorMessage(error instanceof Error ? error.message : String(error)) : "");

  function load() {
    void mutate();
  }

  async function draft(kind: "one_pager" | "portfolio" | "monthly_pack") {
    setActionErr("");
    if (kind === "one_pager" && !companyId) {
      setActionErr("Pick a company for a one-pager. We will not invent a name.");
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
      setActionErr(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <PageHead title="Reports" testId="reports-ready" kicker="Packs from the book" />
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}

      {canWrite && (
        <section className="report-build" aria-label="Draft packs">
          <div className="table-tools">
            <label className="field table-tools-field">
              <span className="sr-only">Period end</span>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                aria-label="Period end"
              />
            </label>
            <label className="field table-tools-field">
              <span className="sr-only">Company</span>
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} aria-label="Company">
                <option value="">Company (required for one-pager)</option>
                {cos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="report-pack-grid">
            {PACKS.map((p) => (
              <article key={p.kind} className="report-pack-card">
                <h3>{p.title}</h3>
                <p className="lede">{p.body}</p>
                <button
                  type="button"
                  className={p.kind === "one_pager" ? "btn" : "btn ghost"}
                  disabled={Boolean(busy) || (p.needsCompany && !companyId)}
                  onClick={() => draft(p.kind)}
                >
                  {busy === p.kind ? "Drafting…" : `Draft ${p.title.toLowerCase()}`}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {loading && !err && <p className="lede">Loading the book…</p>}
      {!loading && rows.length === 0 ? (
        <div className="empty">
          <strong>No drafts yet</strong>
          Choose a pack above. Exports stay blank where the book has no fact.
        </div>
      ) : !loading ? (
        <Panel title="Recent drafts" flush>
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
                  <td className="row">
                    {(["pdf", "pptx", "xlsx"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        className="btn ghost sm"
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
        </Panel>
      ) : null}
    </>
  );
}
