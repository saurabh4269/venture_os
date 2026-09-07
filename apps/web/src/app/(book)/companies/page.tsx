"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { CompanyMark, EM, FilterChips, formatOwnership, PageHead, Panel } from "@/components/BookUI";
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

function bookCloseLine(d = new Date()) {
  const rest = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `Portfolio companies · book as of ${rest}`;
}

function exportVisible(
  rows: { name: string; stage: string | null; sector: string | null; ownership: string; lastMis: string; flags: string; cover: string }[],
) {
  const header = ["Company", "Stage", "Sector", "Ownership", "Last MIS", "Flags", "Coverage"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [`"${r.name}"`, r.stage ?? EM, r.sector ?? EM, r.ownership, r.lastMis, r.flags, r.cover].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "companies.csv";
  a.click();
}

export default function CompaniesPage() {
  const { canWrite } = useBookSession();
  const { data: cosData, error: cosErr } = useSWR<{ companies: Company[] }>("/api/companies", bookFetcher);
  const { data: cmdData } = useSWR<{
    coverage: Coverage[];
    sourceRefs?: { id: string; documentId: string }[];
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
      <div className="page-toolbar">
        <label className="sr-only" htmlFor="co-search">
          Search companies
        </label>
        <input
          id="co-search"
          className="look-search"
          placeholder="Search companies…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="toolbar-actions">
          {visible.length > 0 && (
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
                      lastMis: cov?.lastMis ?? EM,
                      flags: String(cov?.openFlags ?? 0),
                      cover: kind === "booked" ? "Booked" : kind === "gap" ? "Gap" : "Review",
                    };
                  }),
                )
              }
            >
              Export
            </button>
          )}
        </div>
      </div>
      <PageHead
        title="Companies"
        testId="companies-ready"
        kicker="Portfolio performance"
        lede={bookCloseLine()}
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
            <div className="meta">MIS period on book</div>
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
      <div className="filter-bar">
        <FilterChips
          label="Coverage"
          value={cover}
          onChange={(id) => setCover(id as typeof cover)}
          options={[
            { id: "all", label: "All", count: stats.names },
            { id: "booked", label: "Booked", count: stats.booked },
            { id: "gap", label: "Gap", count: stats.gap },
            { id: "review", label: "Review", count: stats.review },
          ]}
        />
        <span className="page-kicker" style={{ margin: 0 }}>
          Stage
        </span>
        <div className="tabs filter-pills" style={{ margin: 0 }} aria-label="Stage">
          {stages.length === 0 ? <span className="lede">—</span> : null}
          {stages.map((s) => (
            <button
              key={s}
              type="button"
              className={`filter-pill${stage === s ? " on" : ""}`}
              onClick={() => setStage(stage === s ? "" : s)}
            >
              {s}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="own-filter">
          Ownership
        </label>
        <select id="own-filter" value={own} onChange={(e) => setOwn(e.target.value as typeof own)} aria-label="Ownership">
          <option value="all">Ownership</option>
          <option value="has">Has booked ownership</option>
          <option value="missing">Ownership —</option>
        </select>
        {filtered && (
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
            Clear filters
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="empty">
          <strong>Empty book</strong>
          {canWrite ? <Link href="/companies/new">Create the first company</Link> : "Ask an Org Admin to add a name."}{" "}
          (15-minute path).
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">No companies match these filters.</div>
      ) : (
        <Panel title="Performance" kicker={`${visible.length} shown`} flush>
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
                    <tr key={c.id} data-testid="companies-row" className={rowClass}>
                      <td>
                        <div className="company-cell">
                          <CompanyMark name={c.name} />
                          <Link className="company-link" href={`/companies/${c.id}`}>
                            {c.name}
                          </Link>
                        </div>
                      </td>
                      <td>{c.stage ?? EM}</td>
                      <td className="num">{formatOwnership(cov?.ownershipPct)}</td>
                      <td className="lede">{cov?.lastMis ?? EM}</td>
                      <td>
                        {cov?.cash ? (
                          <Fact {...cov.cash} sourcePath={sourcePathFor(sourceRefs, cov.cash.sourceRefId)} note={cov.cash.fxNote} />
                        ) : (
                          EM
                        )}
                      </td>
                      <td>
                        {cov?.burn ? (
                          <Fact {...cov.burn} sourcePath={sourcePathFor(sourceRefs, cov.burn.sourceRefId)} note={cov.burn.fxNote} />
                        ) : (
                          EM
                        )}
                      </td>
                      <td>
                        {cov?.runway ? <Fact {...cov.runway} sourcePath={sourcePathFor(sourceRefs, cov.runway.sourceRefId)} /> : EM}
                      </td>
                      <td>
                        {cov?.openFlags ? (
                          <span className={`flag-n${cov.openFlags >= 2 ? " high" : ""}`}>{cov.openFlags}</span>
                        ) : (
                          EM
                        )}
                      </td>
                      <td>
                        <span className={`status-chip ${kind}`}>
                          {kind === "booked" ? "Booked" : kind === "gap" ? "Gap" : "Review"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="table-foot">
            Displaying {visible.length} of {rows.length} {rows.length === 1 ? "company" : "companies"}
            {filtered ? " matching current filters" : ""}. Cash, burn, and runway are booked facts — never a score.
          </p>
        </Panel>
      )}
    </>
  );
}
