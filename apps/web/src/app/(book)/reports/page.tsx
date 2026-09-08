"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { CompanyCombobox, CompanyMark, Miss, PageHead, Panel } from "@/components/BookUI";
import { useBookSession } from "@/components/Shell";
import { api } from "@/lib/api";
import { bookFetcher } from "@/lib/book-data";
import {
  REPORT_KIND_LABEL,
  REPORT_TEMPLATES,
  type ReportKind,
  reportTemplate,
} from "@/lib/report-templates";
import { bookErrorMessage } from "@/lib/wake";

type ReportLite = { id: string; title: string; kind: string; createdAt: string };
type CompanyLite = {
  id: string;
  name: string;
  stage?: string | null;
  sector?: string | null;
  country?: string | null;
};

const TEMPLATE_SAMPLE_KPIS: Record<ReportKind, string[]> = {
  one_pager: ["Net revenue", "Cash", "Burn", "Runway"],
  portfolio: ["Coverage", "NAV", "MOIC", "Open flags"],
  monthly_pack: ["Period", "Cash", "Burn", "Confirm queue"],
};

export default function ReportsPage() {
  const router = useRouter();
  const { canWrite } = useBookSession();
  const { data: reportsData, error, isLoading: loading, mutate } = useSWR<{ reports: ReportLite[] }>(
    "/api/reports",
    bookFetcher,
  );
  const { data: cosData } = useSWR<{ companies: CompanyLite[] }>("/api/companies", bookFetcher);
  const rows = reportsData?.reports ?? [];
  const cos = cosData?.companies ?? [];

  const [packKind, setPackKind] = useState<ReportKind | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [companyQ, setCompanyQ] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [actionErr, setActionErr] = useState("");
  const [busy, setBusy] = useState(false);

  const err = actionErr || (error ? bookErrorMessage(error instanceof Error ? error.message : String(error)) : "");
  const pack = packKind ? reportTemplate(packKind) : null;
  const company = useMemo(() => cos.find((c) => c.id === companyId) ?? null, [cos, companyId]);
  const canGenerate = Boolean(canWrite && pack && !(pack.needsCompany && !companyId) && !busy);
  const periodLabel = periodEnd
    ? new Date(`${periodEnd}T12:00:00`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Latest booked";
  const sampleKpis = packKind ? TEMPLATE_SAMPLE_KPIS[packKind] : [];

  useEffect(() => {
    if (!packKind) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPackKind(null);
        setActionErr("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [packKind]);

  function openTemplate(kind: ReportKind) {
    setActionErr("");
    setCompanyId("");
    setCompanyQ("");
    setPeriodEnd("");
    setPackKind(kind);
  }

  function closeDrawer() {
    if (busy) return;
    setPackKind(null);
    setActionErr("");
  }

  async function createDraft() {
    if (!packKind || !pack) return;
    setActionErr("");
    if (pack.needsCompany && !companyId) {
      setActionErr("Pick a company.");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ report: { id: string } }>("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          kind: packKind,
          companyId: companyId || undefined,
          periodEnd: periodEnd || undefined,
        }),
      });
      await mutate();
      setPackKind(null);
      router.push(`/reports/${res.report.id}`);
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title="Reports" testId="reports-ready" />
      {err && !packKind && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}

      <section className="report-templates" aria-label="Report templates">
        {REPORT_TEMPLATES.map((t) => (
          <button
            key={t.kind}
            type="button"
            className="report-template-card"
            onClick={() => openTemplate(t.kind)}
          >
            <h3>{t.title}</h3>
            <p className="report-template-meta">{t.sections.join(", ")}</p>
          </button>
        ))}
      </section>

      {loading && !err && <p className="lede">Loading drafts…</p>}
      {!loading && rows.length === 0 ? (
        <div className="empty">
          <strong>No drafts yet</strong>
        </div>
      ) : !loading ? (
        <Panel title="Drafts" flush>
          <table className="table-hover">
            <thead>
              <tr>
                <th>Title</th>
                <th>Template</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="report-draft-title">
                    <Link href={`/reports/${r.id}`}>{r.title}</Link>
                  </td>
                  <td>
                    <span className="report-kind-pill">{REPORT_KIND_LABEL[r.kind] ?? r.kind}</span>
                  </td>
                  <td className="lede">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : null}

      {packKind && pack ? (
        <div className="report-compose-layer" role="dialog" aria-modal="true" aria-label={pack.title}>
          <button type="button" className="report-compose-scrim" aria-label="Close" onClick={closeDrawer} />
          <aside className="report-compose-drawer">
            <div className="report-compose-drawer-head">
              <h2>{pack.title}</h2>
              <button type="button" className="btn ghost sm" onClick={closeDrawer} disabled={busy}>
                Close
              </button>
            </div>

            {actionErr ? (
              <p className="sev-high" role="alert">
                {actionErr}
              </p>
            ) : null}

            <div className="report-compose-body">
              <article className="report-preview" aria-label={`${pack.title} preview`}>
                <div className="report-preview-chrome">
                  <span className="report-preview-dot" />
                  <span className="report-preview-dot" />
                  <span className="report-preview-dot" />
                </div>
                <div className="report-doc">
                  <header className="report-doc-head">
                    {packKind === "one_pager" && company ? (
                      <div className="report-doc-brand">
                        <CompanyMark name={company.name} size="lg" />
                        <div>
                          <h2>{company.name}</h2>
                          {company.stage ? <span className="badge">{company.stage}</span> : null}
                        </div>
                      </div>
                    ) : packKind !== "one_pager" ? (
                      <h2>{pack.title}</h2>
                    ) : null}
                    <dl className="report-doc-meta">
                      <div>
                        <dt>Period</dt>
                        <dd>{periodLabel}</dd>
                      </div>
                    </dl>
                  </header>

                  <div className="report-kpi-strip" aria-label="KPI slots">
                    {sampleKpis.map((label) => (
                      <div key={label} className="report-kpi report-kpi-template">
                        <div className="k">{label}</div>
                        <div className="v">
                          <Miss />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="report-doc-grid">
                    {pack.sections.map((section) => (
                      <div key={section} className="report-doc-block">
                        <h3>{section}</h3>
                        <div className="report-doc-skel" aria-hidden>
                          <span />
                          <span />
                          <span className="short" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <div className="report-settings" aria-label="Draft settings">
                {canWrite ? (
                  <>
                    <div className="report-settings-fields">
                      <label className="field">
                        <span>Period</span>
                        <input
                          type="date"
                          value={periodEnd}
                          onChange={(e) => setPeriodEnd(e.target.value)}
                          aria-label="Period end"
                        />
                      </label>
                      <div className="field report-company-field">
                        <span>{pack.needsCompany ? "Company" : "Focus company"}</span>
                        <CompanyCombobox
                          id="report-company"
                          companies={cos}
                          value={companyQ}
                          limit={24}
                          emptyOption={pack.needsCompany ? undefined : "All coverage"}
                          placeholder={pack.needsCompany ? "Search companies…" : "All coverage"}
                          label={pack.needsCompany ? "Company" : "Focus company"}
                          onChange={(q) => {
                            setCompanyQ(q);
                            if (!q.trim()) setCompanyId("");
                            else if (company && !company.name.toLowerCase().includes(q.trim().toLowerCase())) {
                              setCompanyId("");
                            }
                          }}
                          onPick={(c) => {
                            setCompanyId(c.id);
                            setCompanyQ(c.name);
                          }}
                          onClear={() => {
                            setCompanyId("");
                            setCompanyQ("");
                          }}
                        />
                      </div>
                    </div>

                    <div className="report-settings-actions">
                      <button
                        type="button"
                        className="btn report-generate"
                        disabled={!canGenerate}
                        onClick={() => void createDraft()}
                      >
                        {busy ? "Creating…" : "Create draft"}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="lede">Write access required to draft.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
