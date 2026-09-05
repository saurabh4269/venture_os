"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHead, Panel } from "@/components/BookUI";
import { Shell, useBookSession } from "@/components/Shell";
import { api } from "@/lib/api";

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
  const rest = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `Portfolio companies · book as of ${rest}`;
}

export default function CompaniesPage() {
  const { canWrite } = useBookSession();
  const [rows, setRows] = useState<Company[]>([]);
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [err, setErr] = useState("");
  const [stage, setStage] = useState("");
  const [own, setOwn] = useState<"all" | "has" | "missing">("all");
  const [cover, setCover] = useState<"all" | "booked" | "gap" | "review">("all");

  useEffect(() => {
    api<{ companies: Company[] }>("/api/companies")
      .then((r) => setRows(r.companies ?? []))
      .catch((e: Error) => setErr(e.message));
    api<{ coverage: Coverage[] }>("/api/command")
      .then((r) => setCoverage(r.coverage ?? []))
      .catch(() => setCoverage([]));
  }, []);

  const stages = useMemo(() => [...new Set(rows.map((c) => c.stage).filter(Boolean))] as string[], [rows]);
  const covById = useMemo(() => new Map(coverage.map((c) => [c.company.id, c])), [coverage]);
  const visible = useMemo(() => {
    return rows.filter((c) => {
      const cov = covById.get(c.id);
      if (stage && c.stage !== stage) return false;
      if (own === "has" && (cov?.ownershipPct == null)) return false;
      if (own === "missing" && cov?.ownershipPct != null) return false;
      const kind = coverageKind(cov);
      if (cover !== "all" && kind !== cover) return false;
      return true;
    });
  }, [rows, covById, stage, own, cover]);

  const filtered = Boolean(stage || own !== "all" || cover !== "all");

  return (
    <Shell>
      <PageHead
        title="Companies"
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
      {rows.length > 0 && (
        <div className="row" style={{ marginBottom: 14 }}>
          <div className="tabs filter-pills" aria-label="Stage">
            <button type="button" className={`filter-pill${!stage ? " on" : ""}`} onClick={() => setStage("")}>
              All stages
            </button>
            {stages.map((s) => (
              <button key={s} type="button" className={`filter-pill${stage === s ? " on" : ""}`} onClick={() => setStage(s)}>
                {s}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="own-filter">
            Ownership
          </label>
          <select id="own-filter" value={own} onChange={(e) => setOwn(e.target.value as typeof own)} aria-label="Ownership">
            <option value="all">Ownership: all</option>
            <option value="has">Has booked ownership</option>
            <option value="missing">Ownership —</option>
          </select>
          <label className="sr-only" htmlFor="cover-filter">
            Coverage
          </label>
          <select id="cover-filter" value={cover} onChange={(e) => setCover(e.target.value as typeof cover)} aria-label="Coverage">
            <option value="all">Coverage: all</option>
            <option value="booked">Booked</option>
            <option value="gap">Gap</option>
            <option value="review">Review</option>
          </select>
          {filtered && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => {
                setStage("");
                setOwn("all");
                setCover("all");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      {rows.length === 0 ? (
        <div className="empty">
          <strong>Empty book</strong>
          {canWrite ? <Link href="/companies/new">Create the first company</Link> : "Ask an Org Admin to add a name."}{" "}
          (15-minute path).
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
                    <tr key={c.id}>
                      <td>
                        <Link className="company-link" href={`/companies/${c.id}`}>
                          {c.name}
                        </Link>
                        {c.sector ? <div className="lede">{c.sector}</div> : null}
                      </td>
                      <td>{c.stage ? <span className="badge">{c.stage}</span> : <span className="lede">—</span>}</td>
                      <td>{cov?.ownershipPct == null ? "—" : `${cov.ownershipPct}%`}</td>
                      <td className="lede">{cov?.lastMis ?? "—"}</td>
                      <td>{cov?.openFlags ? cov.openFlags : "—"}</td>
                      <td>
                        <span className={`status-chip ${kind}`}>{kind === "booked" ? "Booked" : kind === "gap" ? "Gap" : "Review"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {rows.length > 0 && (
        <p className="lede" style={{ marginTop: 12 }}>
          Displaying {visible.length} of {rows.length} {rows.length === 1 ? "company" : "companies"}
          {filtered ? " matching current filters" : ""}. Coverage is Booked / Gap / Review from evidence — not a score.
        </p>
      )}
    </Shell>
  );
}
