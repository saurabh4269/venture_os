"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  CompanyCombobox,
  CompanyMark,
  formatOwnership,
  PageHead,
  Panel,
} from "@/components/BookUI";
import { KpiSparkline } from "@/components/BookCharts";
import { Fact, useBookSession } from "@/components/Shell";
import { sourcePathFor } from "@/lib/api";
import { bookFetcher } from "@/lib/book-data";
import { bookErrorMessage } from "@/lib/wake";

type Company = { id: string; name: string; stage: string | null; sector: string | null; country: string | null };
type Coverage = {
  company: { id: string; name: string; stage: string | null };
  lastMis: string | null;
  ownershipPct: number | null;
  openFlags: number;
  cash?: { display: string; isFact: boolean; fxNote?: string | null; sourceRefId?: string | null };
  burn?: { display: string; isFact: boolean; fxNote?: string | null; sourceRefId?: string | null };
  runway?: { display: string; isFact: boolean; sourceRefId?: string | null };
};

function coverageKind(row: Coverage | undefined) {
  if (!row) return "gap" as const;
  if (row.openFlags > 0) return "review" as const;
  if (!row.lastMis) return "gap" as const;
  return "booked" as const;
}

function exportVisible(
  rows: { name: string; stage: string | null; sector: string | null; ownership: string; lastMis: string; flags: string; cover: string }[],
) {
  const header = ["Company", "Stage", "Sector", "Ownership", "Last MIS", "Flags", "Coverage"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [`"${r.name}"`, r.stage ?? "", r.sector ?? "", r.ownership, r.lastMis, r.flags, r.cover].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "companies.csv";
  a.click();
}

export default function CompaniesPage() {
  const router = useRouter();
  const { canWrite } = useBookSession();
  const { data: cosData, error: cosErr } = useSWR<{ companies: Company[] }>("/api/companies", bookFetcher);
  const { data: cmdData } = useSWR<{
    coverage: Coverage[];
    sourceRefs?: { id: string; documentId: string }[];
    charts?: {
      runwayByCompany?: { companyId: string; months: number; priorMonths?: number | null }[];
    };
  }>("/api/command", bookFetcher);
  const rows = cosData?.companies ?? [];
  const coverage = cmdData?.coverage ?? [];
  const sourceRefs = cmdData?.sourceRefs ?? [];
  const err = cosErr ? bookErrorMessage(cosErr instanceof Error ? cosErr.message : String(cosErr)) : "";
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [own, setOwn] = useState<"all" | "has" | "missing">("all");
  const [cover, setCover] = useState<"all" | "booked" | "gap" | "review">("all");

  const stages = useMemo(() => [...new Set(rows.map((c) => c.stage).filter(Boolean))] as string[], [rows]);
  const covById = useMemo(() => new Map(coverage.map((c) => [c.company.id, c])), [coverage]);
  const runwaySpark = useMemo(() => {
    const m = new Map<string, Array<number | null>>();
    for (const r of cmdData?.charts?.runwayByCompany ?? []) {
      if (r.priorMonths == null || r.months == null) continue;
      m.set(r.companyId, [r.priorMonths, r.months]);
    }
    return m;
  }, [cmdData?.charts?.runwayByCompany]);
  const stats = useMemo(() => {
    let booked = 0;
    let gap = 0;
    let review = 0;
    let flags = 0;
    for (const c of rows) {
      const cov = covById.get(c.id);
      const kind = coverageKind(cov);
      if (kind === "booked") booked += 1;
      else if (kind === "gap") gap += 1;
      else review += 1;
      flags += cov?.openFlags ?? 0;
    }
    return { booked, gap, review, flags, names: rows.length };
  }, [rows, covById]);
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((c) => {
      const cov = covById.get(c.id);
      if (needle && !c.name.toLowerCase().includes(needle) && !(c.sector ?? "").toLowerCase().includes(needle)) return false;
      if (stage && c.stage !== stage) return false;
      if (own === "has" && cov?.ownershipPct == null) return false;
      if (own === "missing" && cov?.ownershipPct != null) return false;
      const kind = coverageKind(cov);
      if (cover !== "all" && kind !== cover) return false;
      return true;
    });
  }, [rows, covById, q, stage, own, cover]);

  const filtered = Boolean(q.trim() || stage || own !== "all" || cover !== "all");

  return (
    <>
      <PageHead
        title="Companies"
        testId="companies-ready"
        kicker="Portfolio performance"
        actions={
          canWrite ? (
            <Link className="btn" href="/companies/new">
              Add company
            </Link>
          ) : undefined
        }
      />
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {rows.length > 0 ? (
        <div className="cards cards-5" aria-label="Portfolio coverage summary">
          <button type="button" className={`kpi kpi-btn${cover === "all" ? " accent-forest" : ""}`} onClick={() => setCover("all")}>
            <div className="k">Names</div>
            <div className="v">{stats.names}</div>
          </button>
          <button
            type="button"
            className={`kpi kpi-btn${cover === "booked" ? " accent-forest" : ""}`}
            onClick={() => setCover(cover === "booked" ? "all" : "booked")}
          >
            <div className="k">Booked</div>
            <div className="v">{stats.booked}</div>
            <div className="meta">MIS period on book, no open flags</div>
          </button>
          <button
            type="button"
            className={`kpi kpi-btn${cover === "gap" || stats.gap > 0 ? " accent-danger" : ""}`}
            onClick={() => setCover(cover === "gap" ? "all" : "gap")}
          >
            <div className="k">Gaps</div>
            <div className="v">{stats.gap}</div>
            <div className="meta">No booked MIS</div>
          </button>
          <button
            type="button"
            className={`kpi kpi-btn${cover === "review" || stats.review > 0 ? " accent-warn" : ""}`}
            onClick={() => setCover(cover === "review" ? "all" : "review")}
          >
            <div className="k">Review</div>
            <div className="v">{stats.review}</div>
            <div className="meta">Confirm or open flags</div>
          </button>
          <Link className={`kpi kpi-link${stats.flags > 0 ? " accent-warn" : ""}`} href="/flags">
            <div className="k">Open flags</div>
            <div className="v">{stats.flags}</div>
          </Link>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <div className="empty">
          <strong>Empty book</strong>
          {canWrite ? <Link href="/companies/new">Create the first company</Link> : "Ask an Org Admin to add a name."}
        </div>
      ) : (
        <Panel
          title="Performance"
          kicker={`${visible.length} shown`}
          flush
          actions={
            visible.length > 0 ? (
              <button
                type="button"
                className="btn ghost sm"
                onClick={() =>
                  exportVisible(
                    visible.map((c) => {
                      const cov = covById.get(c.id);
                      const kind = coverageKind(cov);
                      return {
                        name: c.name,
                        stage: c.stage,
                        sector: c.sector,
                        ownership: formatOwnership(cov?.ownershipPct),
                        lastMis: cov?.lastMis ?? "",
                        flags: cov?.openFlags ? String(cov.openFlags) : "",
                        cover: kind === "booked" ? "Booked" : kind === "gap" ? "Gap" : "Review",
                      };
                    }),
                  )
                }
              >
                Export
              </button>
            ) : undefined
          }
        >
          <div className="table-tools">
            <CompanyCombobox
              companies={rows}
              value={q}
              onChange={setQ}
              onPick={(c) => router.push(`/companies/${c.id}`)}
            />
            <label className="field table-tools-field">
              <span className="sr-only">Stage</span>
              <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage">
                <option value="">All stages</option>
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="field table-tools-field">
              <span className="sr-only">Ownership</span>
              <select
                id="own-filter"
                value={own}
                onChange={(e) => setOwn(e.target.value as typeof own)}
                aria-label="Ownership"
              >
                <option value="all">Ownership</option>
                <option value="has">Has booked ownership</option>
                <option value="missing">Ownership missing</option>
              </select>
            </label>
            {filtered ? (
              <button
                type="button"
                className="linkish push"
                onClick={() => {
                  setQ("");
                  setStage("");
                  setOwn("all");
                  setCover("all");
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
          {visible.length === 0 ? (
            <div className="empty" style={{ margin: 0, border: 0, borderRadius: 0 }}>
              No companies match these filters.
            </div>
          ) : (
            <div className="table-scroll">
              <table className="table-hover">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Stage</th>
                    <th>Ownership</th>
                    <th>Last MIS</th>
                    <th>Cash</th>
                    <th>Burn</th>
                    <th>Runway</th>
                    <th>Trend</th>
                    <th>Flags</th>
                    <th>Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => {
                    const cov = covById.get(c.id);
                    const kind = coverageKind(cov);
                    const rowClass =
                      kind === "gap" ? "row-gap" : kind === "review" || (cov?.openFlags ?? 0) > 0 ? "row-flag" : undefined;
                    return (
                      <tr
                        key={c.id}
                        data-testid="companies-row"
                        className={`row-link${rowClass ? ` ${rowClass}` : ""}`}
                        tabIndex={0}
                        role="link"
                        aria-label={`Open ${c.name}`}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("a, button, input, select, textarea")) return;
                          router.push(`/companies/${c.id}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/companies/${c.id}`);
                          }
                        }}
                      >
                        <td>
                          <div className="company-cell">
                            <CompanyMark name={c.name} />
                            <span className="company-link">{c.name}</span>
                          </div>
                        </td>
                        <td>{c.stage ?? ""}</td>
                        <td className="num">{formatOwnership(cov?.ownershipPct)}</td>
                        <td className="lede">{cov?.lastMis ?? ""}</td>
                        <td>
                          {cov?.cash ? (
                            <Fact
                              {...cov.cash}
                              sourcePath={sourcePathFor(sourceRefs, cov.cash.sourceRefId)}
                              note={cov.cash.fxNote}
                            />
                          ) : null}
                        </td>
                        <td>
                          {cov?.burn ? (
                            <Fact
                              {...cov.burn}
                              sourcePath={sourcePathFor(sourceRefs, cov.burn.sourceRefId)}
                              note={cov.burn.fxNote}
                            />
                          ) : null}
                        </td>
                        <td>
                          {cov?.runway ? (
                            <Fact {...cov.runway} sourcePath={sourcePathFor(sourceRefs, cov.runway.sourceRefId)} />
                          ) : null}
                        </td>
                        <td className="companies-spark">
                          {runwaySpark.has(c.id) ? (
                            <KpiSparkline values={runwaySpark.get(c.id)!} height={28} />
                          ) : null}
                        </td>
                        <td>
                          {cov?.openFlags ? (
                            <span className={`flag-n${cov.openFlags >= 2 ? " high" : ""}`}>{cov.openFlags}</span>
                          ) : null}
                        </td>
                        <td className={`cover-plain cover-${kind}`}>
                          {kind === "booked" ? (
                            <span title="Latest MIS period is on the book">Booked</span>
                          ) : kind === "gap" ? (
                            <Link href="/confirm" title="No booked MIS period">
                              Gap
                            </Link>
                          ) : (
                            <Link
                              href={cov?.openFlags ? "/flags" : "/confirm"}
                              title={cov?.openFlags ? "Open flags" : "Rows waiting in Confirm"}
                            >
                              Review
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </>
  );
}
