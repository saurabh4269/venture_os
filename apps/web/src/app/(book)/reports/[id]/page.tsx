"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { CompanyMark, Miss, PageHead } from "@/components/BookUI";
import { IconDownload } from "@/components/Icons";
import { useBookSession } from "@/components/Shell";
import { api, downloadAuthed } from "@/lib/api";
import { bookFetcher } from "@/lib/book-data";
import { REPORT_EXPORT_FORMATS, type ReportExportFmt } from "@/lib/report-templates";
import { bookErrorMessage } from "@/lib/wake";

type ReportMetric = {
  key: string;
  label?: string;
  value: number | null;
  unit: string;
  currency?: string;
  periodEnd: string;
  sourceRefId: string;
};

type ReportPage = {
  companyId?: string;
  name: string;
  stage?: string | null;
  metrics: ReportMetric[];
  objective: string[];
  subjective: string[];
  flags?: { flagKey: string; severity: string; label?: string }[];
};

type ReportBody = {
  pages?: ReportPage[];
  periodEnd?: string | null;
  coverNote?: string | null;
  generatedFrom?: string;
};

type Report = {
  id: string;
  title: string;
  kind: string;
  createdAt: string;
  body: ReportBody;
  artifactStatus?: string;
};

function fmtMetric(m: ReportMetric) {
  if (m.value == null) return "";
  const n = Number(m.value);
  if (!Number.isFinite(n)) return String(m.value);
  if (m.unit === "percent" || m.key.includes("pct") || m.key.includes("margin")) {
    return `${(n <= 1 && n >= -1 ? n * 100 : n).toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
  }
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function ReportEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { canWrite } = useBookSession();
  const { data, error, isLoading, mutate } = useSWR<{ report: Report }>(
    id ? `/api/reports/${id}` : null,
    bookFetcher,
  );
  const report = data?.report;

  const [title, setTitle] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [pages, setPages] = useState<ReportPage[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [actionErr, setActionErr] = useState("");
  const [dlOpen, setDlOpen] = useState(false);
  const [dlBusy, setDlBusy] = useState<ReportExportFmt | "">("");
  const dlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!report) return;
    setTitle(report.title);
    setCoverNote(report.body?.coverNote ?? "");
    setPages(
      (report.body?.pages ?? []).map((p) => ({
        ...p,
        objective: [...(p.objective ?? [])],
        subjective: [...(p.subjective ?? [])],
      })),
    );
    setDirty(false);
    setSaveMsg("");
  }, [report]);

  useEffect(() => {
    if (!dlOpen) return;
    function onDoc(e: MouseEvent) {
      if (!dlRef.current?.contains(e.target as Node)) setDlOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDlOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [dlOpen]);

  const periodLabel = report?.body?.periodEnd
    ? new Date(`${report.body.periodEnd}T12:00:00`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Latest booked period";

  const err =
    actionErr || (error ? bookErrorMessage(error instanceof Error ? error.message : String(error)) : "");

  const headlineMetrics = useMemo(() => {
    const first = pages[0];
    if (!first) return [];
    const prefer = ["net_revenue", "cash", "burn", "runway_months", "gross_margin_pct"];
    const byKey = new Map(first.metrics.map((m) => [m.key, m]));
    const picked = prefer.map((k) => byKey.get(k)).filter((m): m is ReportMetric => Boolean(m));
    return picked.length ? picked : first.metrics.slice(0, 5);
  }, [pages]);

  function markDirty() {
    setDirty(true);
    setSaveMsg("");
  }

  function setLane(pageIdx: number, lane: "objective" | "subjective", text: string) {
    setPages((prev) =>
      prev.map((p, i) =>
        i === pageIdx
          ? {
              ...p,
              [lane]: text
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean),
            }
          : p,
      ),
    );
    markDirty();
  }

  async function save() {
    if (!report || !canWrite) return false;
    setSaving(true);
    setActionErr("");
    try {
      await api(`/api/reports/${report.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          coverNote: coverNote.trim() || null,
          pages: pages.map((p) => ({
            companyId: p.companyId,
            objective: p.objective,
            subjective: p.subjective,
          })),
        }),
      });
      setDirty(false);
      setSaveMsg("Saved");
      await mutate();
      return true;
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function download(fmt: ReportExportFmt) {
    if (!report) return;
    if (dirty && canWrite) {
      const ok = await save();
      if (!ok) return;
    }
    setDlBusy(fmt);
    setActionErr("");
    try {
      await downloadAuthed(`/api/reports/${report.id}/export/${fmt}`);
      setDlOpen(false);
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDlBusy("");
    }
  }

  if (isLoading && !report) {
    return <p className="lede">Loading draft…</p>;
  }
  if (err && !report) {
    return (
      <>
        <p className="sev-high" role="alert">
          {err}
        </p>
        <p className="lede">
          <Link href="/reports">Back to reports</Link>
        </p>
      </>
    );
  }
  if (!report) {
    return (
      <>
        <p className="lede">Draft not found.</p>
        <p className="lede">
          <Link href="/reports">Back to reports</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <PageHead
        title={title || report.title}
        testId="report-editor-ready"
        actions={
          <div className="report-editor-actions">
            <Link className="btn ghost sm" href="/reports">
              Drafts
            </Link>
            {canWrite ? (
              <button type="button" className="btn ghost sm" disabled={!dirty || saving} onClick={() => void save()}>
                {saving ? "Saving…" : dirty ? "Save" : saveMsg || "Saved"}
              </button>
            ) : null}
            <div className="report-dl" ref={dlRef}>
              <button
                type="button"
                className="chart-tool-btn report-dl-trigger"
                aria-label="Download report"
                aria-expanded={dlOpen}
                aria-haspopup="menu"
                title="Download"
                onClick={() => setDlOpen((o) => !o)}
              >
                <IconDownload />
              </button>
              {dlOpen ? (
                <div className="report-dl-menu" role="menu">
                  {REPORT_EXPORT_FORMATS.map((f) => (
                    <button
                      key={f.fmt}
                      type="button"
                      role="menuitem"
                      className="report-dl-item"
                      disabled={Boolean(dlBusy)}
                      onClick={() => void download(f.fmt)}
                    >
                      {dlBusy === f.fmt ? "Preparing…" : f.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        }
      />

      {err ? (
        <p className="sev-high" role="alert">
          {err}
        </p>
      ) : null}

      <div className="report-editor">
        <aside className="report-editor-side" aria-label="Draft settings">
          <label className="field">
            <span>Title</span>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                markDirty();
              }}
              disabled={!canWrite}
              aria-label="Report title"
            />
          </label>
          <label className="field">
            <span>Cover note</span>
            <textarea
              rows={4}
              value={coverNote}
              onChange={(e) => {
                setCoverNote(e.target.value);
                markDirty();
              }}
              disabled={!canWrite}
              placeholder="Optional"
              aria-label="Cover note"
            />
          </label>
        </aside>

        <article className="report-preview report-preview-live" aria-label="Report preview">
          <div className="report-preview-chrome">
            <span className="report-preview-dot" />
            <span className="report-preview-dot" />
            <span className="report-preview-dot" />
          </div>
          <div className="report-doc">
            <header className="report-doc-head">
              {pages[0] ? (
                <div className="report-doc-brand">
                  <CompanyMark name={pages[0].name} size="lg" />
                  <div>
                    <h2>{pages.length === 1 ? pages[0].name : title}</h2>
                    {pages[0].stage ? <span className="badge">{pages[0].stage}</span> : null}
                  </div>
                </div>
              ) : (
                <h2>{title}</h2>
              )}
              <dl className="report-doc-meta">
                <div>
                  <dt>Period</dt>
                  <dd>{periodLabel}</dd>
                </div>
              </dl>
            </header>

            {coverNote.trim() ? (
              <p className="report-cover-note">{coverNote.trim()}</p>
            ) : null}

            {headlineMetrics.length > 0 ? (
              <div className="report-kpi-strip" aria-label="Booked KPIs">
                {headlineMetrics.map((m) => (
                  <div key={m.key} className="report-kpi">
                    <div className="k">{m.label ?? m.key.replaceAll("_", " ")}</div>
                    <div className="v">{fmtMetric(m) || <Miss />}</div>
                    <div className="meta">{m.periodEnd ? m.periodEnd.slice(0, 10) : ""}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {pages.map((p, idx) => (
              <section key={p.companyId ?? `${p.name}-${idx}`} className="report-doc-company">
                {pages.length > 1 ? (
                  <div className="report-doc-company-head">
                    <CompanyMark name={p.name} />
                    <h3>{p.name}</h3>
                    {p.stage ? <span className="badge">{p.stage}</span> : null}
                  </div>
                ) : null}

                <div className="table-scroll">
                  <table className="table-hover">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Unit</th>
                        <th>Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.metrics.length === 0 ? (
                        <tr>
                          <td colSpan={4}>
                            <Miss />
                          </td>
                        </tr>
                      ) : (
                        p.metrics.map((m) => (
                          <tr key={`${m.key}-${m.periodEnd}-${m.sourceRefId}`}>
                            <td>{m.label ?? m.key.replaceAll("_", " ")}</td>
                            <td className="num">{fmtMetric(m) || <Miss />}</td>
                            <td className="lede">{m.unit}</td>
                            <td className="lede">{m.periodEnd ? m.periodEnd.slice(0, 10) : ""}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {(p.flags?.length ?? 0) > 0 ? (
                  <ul className="report-flag-list">
                    {p.flags!.map((f) => (
                      <li key={f.flagKey}>
                        <span className={`badge${f.severity === "high" ? " danger" : ""}`}>
                          {f.label ?? f.flagKey}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="report-lanes">
                  <label className="field">
                    <span>Objective commentary</span>
                    <textarea
                      rows={3}
                      value={p.objective.join("\n")}
                      onChange={(e) => setLane(idx, "objective", e.target.value)}
                      disabled={!canWrite}
                      placeholder=""
                    />
                  </label>
                  <label className="field">
                    <span>Subjective commentary</span>
                    <textarea
                      rows={3}
                      value={p.subjective.join("\n")}
                      onChange={(e) => setLane(idx, "subjective", e.target.value)}
                      disabled={!canWrite}
                      placeholder=""
                    />
                  </label>
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </>
  );
}
