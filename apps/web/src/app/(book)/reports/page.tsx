"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { CompanyMark, Miss, PageHead, Panel } from "@/components/BookUI";
import { IconEdit } from "@/components/Icons";
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

const TEMPLATE_SAMPLE_KPIS: Record<ReportKind, { label: string; hint: string }[]> = {
  one_pager: [
    { label: "Net revenue", hint: "Booked period" },
    { label: "Cash", hint: "Booked period" },
    { label: "Burn", hint: "Booked period" },
    { label: "Runway", hint: "Cash ÷ burn" },
  ],
  portfolio: [
    { label: "Coverage", hint: "Names with MIS" },
    { label: "NAV", hint: "As booked" },
    { label: "MOIC", hint: "As booked" },
    { label: "Open flags", hint: "Catalog only" },
  ],
  monthly_pack: [
    { label: "Period", hint: "Ritual close" },
    { label: "Cash Σ", hint: "Booked sum" },
    { label: "Burn Σ", hint: "Booked sum" },
    { label: "Confirm queue", hint: "Pending rows" },
  ],
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
    : "Latest booked period";
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
      setActionErr("Pick a company for a one-pager. We will not invent a name.");
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
      <PageHead
        title="Reports"
        testId="reports-ready"
        kicker="Templates from the book"
        lede="Pick a template to configure and create a draft. Edit and download from the draft screen — nothing is invented to fill blanks."
      />
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
            <p className="page-kicker">{t.eyebrow}</p>
            <h3>{t.title}</h3>
            <p className="lede">{t.body}</p>
            <ul className="report-template-sections" aria-label="Sections">
              {t.sections.slice(0, 4).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="report-template-formats">
              Export · {t.formats.map((f) => f.toUpperCase()).join(" · ")}
            </p>
          </button>
        ))}
      </section>

      {loading && !err && <p className="lede">Loading drafts…</p>}
      {!loading && rows.length === 0 ? (
        <div className="empty">
          <strong>No drafts yet</strong>
          Open a template card to configure scope and create a draft. Missing stays blank.
        </div>
      ) : !loading ? (
        <Panel title="Recent drafts" kicker="Open to edit" flush>
          <table className="table-hover">
            <thead>
              <tr>
                <th>Title</th>
                <th>Template</th>
                <th>Created</th>
                <th className="num">Edit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="report-draft-title">{r.title}</td>
                  <td>
                    <span className="report-kind-pill">{REPORT_KIND_LABEL[r.kind] ?? r.kind}</span>
                  </td>
                  <td className="lede">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="num">
                    <Link
                      className="chart-tool-btn report-edit-btn"
                      href={`/reports/${r.id}`}
                      aria-label={`Edit ${r.title}`}
                      title="Open draft"
                    >
                      <IconEdit />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : null}

      {packKind && pack ? (
        <div className="report-compose-layer" role="dialog" aria-modal="true" aria-label={`${pack.title} composer`}>
          <button type="button" className="report-compose-scrim" aria-label="Close template" onClick={closeDrawer} />
          <aside className="report-compose-drawer">
            <div className="report-compose-drawer-head">
              <div>
                <p className="page-kicker">{pack.eyebrow}</p>
                <h2>{pack.title}</h2>
                <p className="lede">{pack.body}</p>
              </div>
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
              <article className="report-preview" aria-label={`${pack.title} template`}>
                <div className="report-preview-chrome">
                  <span className="report-preview-dot" />
                  <span className="report-preview-dot" />
                  <span className="report-preview-dot" />
                  <span className="report-template-badge">Template preview</span>
                  <span className="page-kicker">{pack.eyebrow}</span>
                </div>
                <div className="report-doc">
                  <header className="report-doc-head">
                    {packKind === "one_pager" && company ? (
                      <div className="report-doc-brand">
                        <CompanyMark name={company.name} size="lg" />
                        <div>
                          <p className="page-kicker">
                            {[company.sector, company.country].filter(Boolean).join(" · ") || "Company"}
                          </p>
                          <h2>{company.name}</h2>
                          {company.stage ? <span className="badge">{company.stage}</span> : null}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="page-kicker">{pack.eyebrow}</p>
                        <h2>{pack.title}</h2>
                        <p className="lede">
                          {packKind === "one_pager"
                            ? "Select a company below to personalize the cover."
                            : "Layout filled only from confirmed book rows when you create a draft."}
                        </p>
                      </div>
                    )}
                    <dl className="report-doc-meta">
                      <div>
                        <dt>Period</dt>
                        <dd>{periodLabel}</dd>
                      </div>
                      <div>
                        <dt>Source</dt>
                        <dd>Book only</dd>
                      </div>
                      <div>
                        <dt>Missing</dt>
                        <dd>Shown blank</dd>
                      </div>
                    </dl>
                  </header>

                  <div className="report-kpi-strip" aria-label="Sample KPI slots">
                    {sampleKpis.map((k) => (
                      <div key={k.label} className="report-kpi report-kpi-template">
                        <div className="k">{k.label}</div>
                        <div className="v">
                          <Miss label="Filled at draft time" />
                        </div>
                        <div className="meta">{k.hint}</div>
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
                        <p className="lede">
                          {packKind === "one_pager" && !company ? (
                            <>
                              Waiting on company · <Miss label="Not selected" />
                            </>
                          ) : (
                            "Structure only — values appear after you create a draft from the book."
                          )}
                        </p>
                      </div>
                    ))}
                  </div>

                  <footer className="report-doc-foot">
                    <span>Not a saved file yet</span>
                    <span>{pack.title}</span>
                  </footer>
                </div>
              </article>

              <div className="report-settings" aria-label="Template settings">
                <div className="report-settings-head">
                  <p className="page-kicker">Configure</p>
                  <h3>Scope</h3>
                  <p className="lede">Set period and company, then create an editable draft.</p>
                </div>

                <ul className="report-template-outline">
                  {pack.sections.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>

                {canWrite ? (
                  <>
                    <div className="report-settings-fields">
                      <label className="field">
                        <span>Time period</span>
                        <input
                          type="date"
                          value={periodEnd}
                          onChange={(e) => setPeriodEnd(e.target.value)}
                          aria-label="Period end"
                        />
                        <span className="field-hint">Leave empty for the latest booked period on each metric.</span>
                      </label>
                      <label className="field">
                        <span>
                          Companies{pack.needsCompany ? " · required" : " · optional focus"}
                        </span>
                        <select
                          value={companyId}
                          onChange={(e) => setCompanyId(e.target.value)}
                          aria-label="Company"
                        >
                          <option value="">{pack.needsCompany ? "Select company…" : "All coverage (no focus)"}</option>
                          {cos.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {company ? (
                          <span className="report-company-chip">
                            <CompanyMark name={company.name} />
                            <span>{company.name}</span>
                          </span>
                        ) : null}
                      </label>
                    </div>

                    <div className="report-settings-actions">
                      <button
                        type="button"
                        className="btn report-generate"
                        disabled={!canGenerate}
                        onClick={() => void createDraft()}
                      >
                        {busy ? "Creating draft…" : "Create draft · open editor"}
                      </button>
                      <p className="lede">
                        Draft opens full-screen so you can edit commentary and download PDF, PPTX, or XLSX.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="lede">Drafting needs write access. You can still open existing drafts.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
