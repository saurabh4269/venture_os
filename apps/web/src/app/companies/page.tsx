"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CompanyMark, EM, formatOwnership, PageHead, Panel } from "@/components/BookUI";
import { Shell, useBookSession } from "@/components/Shell";
import { api } from "@/lib/api";
import { bookErrorMessage } from "@/lib/wake";

type Company = { id: string; name: string; stage: string | null; sector: string | null; country: string | null };
type Coverage = {
  company: { id: string; name: string; stage: string | null };
  lastMis: string | null;
  ownershipPct: number | null;
  openFlags: number;
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
  const [rows, setRows] = useState<Company[]>([]);
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [own, setOwn] = useState<"all" | "has" | "missing">("all");
  const [cover, setCover] = useState<"all" | "booked" | "gap" | "review">("all");

  useEffect(() => {
    api<{ companies: Company[] }>("/api/companies")
      .then((r) => setRows(r.companies ?? []))
      .catch((e: Error) => setErr(bookErrorMessage(e.message)));
    api<{ coverage: Coverage[] }>("/api/command")
      .then((r) => setCoverage(r.coverage ?? []))
      .catch(() => setCoverage([]));
  }, []);

  const stages = useMemo(() => [...new Set(rows.map((c) => c.stage).filter(Boolean))] as string[], [rows]);
  const covById = useMemo(() => new Map(coverage.map((c) => [c.company.id, c])), [coverage]);
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
    <Shell>
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
                      flags: cov?.openFlags ? String(cov.openFlags) : EM,
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
      <div className="filter-bar">
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
          <label className="sr-only" htmlFor="cover-filter">
            Coverage
          </label>
          <select id="cover-filter" value={cover} onChange={(e) => setCover(e.target.value as typeof cover)} aria-label="Coverage">
            <option value="all">Coverage</option>
            <option value="booked">Booked</option>
            <option value="gap">Gap</option>
            <option value="review">Review</option>
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
          {canWrite ? <Link href="/companies/new">Add your first company</Link> : "Ask your Org Admin to add a company."}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">No companies match these filters.</div>
      ) : (
        <Panel flush>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Stage</th>
                  <th>Ownership</th>
                  <th>Last MIS</th>
                  <th>Flags</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  const cov = covById.get(c.id);
                  const kind = coverageKind(cov);
                  return (
                    <tr key={c.id} data-testid="companies-row">
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
                        {cov?.openFlags ? (
                          <span className={`flag-n${cov.openFlags >= 2 ? " high" : ""}`}>{cov.openFlags}</span>
                        ) : (
                          EM
                        )}
                      </td>
                      <td>
                        <span className={`status-chip ${kind}`}>{kind === "booked" ? "Booked" : kind === "gap" ? "Gap" : "Review"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="table-foot">
            Displaying {visible.length} of {rows.length} {rows.length === 1 ? "company" : "companies"}
            {filtered ? " matching current filters" : ""}. Last MIS and coverage come from confirmed book rows.
          </p>
        </Panel>
      )}
    </Shell>
  );
}
