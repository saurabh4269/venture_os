"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FLAG_CATALOG } from "@venture-os/core";
import { CompanyMark, EM, formatOwnership, PageHead, Panel } from "@/components/BookUI";
import { IconFlagSmall, IconRefresh, IconWarn } from "@/components/Icons";
import { Fact, Shell, useBookSession } from "@/components/Shell";
import { api, sourcePathFor } from "@/lib/api";
import { bookErrorMessage } from "@/lib/wake";

type Pulse = {
  pulse: {
    companies: number;
    inboxPending: number;
    openFlags: number;
    funds: number;
    nav: { nav: { total: number | null; complete: boolean; missing: number }; unmarked: { companyName: string }[] };
    moic: number | null;
  };
  needsALook: {
    flags: { id: string; flagKey: string; severity: string; companyId: string; companyName: string }[];
    inbox: { id: string; companyName: string; kind: string }[];
  };
  coverage: {
    company: { id: string; name: string; stage: string | null };
    cash: { display: string; isFact: boolean; fxNote?: string | null; sourceRefId?: string | null };
    burn: { display: string; isFact: boolean; fxNote?: string | null; sourceRefId?: string | null };
    runway: { display: string; isFact: boolean; sourceRefId?: string | null };
    lastMis: string | null;
    ownershipPct: number | null;
    lastMark: number | null;
    lastMarkSource: string | null;
    openFlags: number;
  }[];
  sourceRefs: { id: string; documentId: string }[];
};

function flagLabel(key: string) {
  return FLAG_CATALOG.find((c) => c.key === key)?.label ?? key.replaceAll("_", " ");
}

function bookCloseLine(d = new Date()) {
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const rest = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${weekday} · ${rest} · Book as of close`;
}

function daysSince(iso: string | null) {
  if (!iso) return null;
  const n = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return Number.isFinite(n) ? n : null;
}

function coverageGap(row: Pulse["coverage"][number]) {
  return !row.lastMis;
}

function uncitedCount(coverage: Pulse["coverage"]) {
  let seen = 0;
  let uncited = 0;
  for (const r of coverage) {
    for (const f of [r.cash, r.burn, r.runway]) {
      if (f.display && f.display !== EM) {
        seen += 1;
        if (!f.isFact) uncited += 1;
      }
    }
    if (r.lastMark != null) {
      seen += 1;
      if (!r.lastMarkSource) uncited += 1;
    }
  }
  return seen === 0 ? null : uncited;
}

function pulseStatus(row: Pulse["coverage"][number]) {
  if (row.openFlags > 0) return { label: "Review", kind: "review" as const };
  if (coverageGap(row)) return { label: "Gap", kind: "gap" as const };
  return { label: "Booked", kind: "booked" as const };
}

export default function CommandPage() {
  const { canWrite } = useBookSession();
  const [data, setData] = useState<Pulse | null>(null);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("");
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setBusy(true);
    api<Pulse>("/api/command")
      .then((d) => {
        setData(d);
        setErr("");
        setRefreshedAt(new Date());
      })
      .catch((e: Error) => setErr(bookErrorMessage(e.message)))
      .finally(() => setBusy(false));
  }
  useEffect(() => {
    load();
  }, []);

  const gaps = data?.coverage.filter(coverageGap).length ?? 0;
  const uncited = data ? uncitedCount(data.coverage) : null;
  const look = useMemo(() => {
    if (!data) return [];
    return [
      ...data.needsALook.inbox.map((i) => ({
        id: `inbox-${i.id}`,
        href: "/inbox",
        company: i.companyName,
        copy: `Inbox ${i.kind.replaceAll("_", " ")} — confirm before it posts.`,
        severity: "med" as const,
        lane: null as "obj" | null,
        citeHref: "/inbox",
      })),
      ...data.needsALook.flags.map((f) => ({
        id: `flag-${f.id}`,
        href: "/flags",
        company: f.companyName,
        copy: `${flagLabel(f.flagKey)} (${f.severity}).`,
        severity: f.severity === "high" ? ("high" as const) : ("med" as const),
        lane: "obj" as const,
        citeHref: "/flags",
      })),
    ];
  }, [data]);

  const pulseRows = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    return data.coverage.filter((r) => !q || r.company.name.toLowerCase().includes(q));
  }, [data, filter]);

  function exportPulse() {
    if (!data) return;
    const header = ["Company", "Stage", "Ownership", "Last MIS", "Cash", "Burn", "Runway", "Flags", "Coverage"];
    const lines = [
      header.join(","),
      ...pulseRows.map((r) => {
        const st = pulseStatus(r);
        return [
          `"${r.company.name}"`,
          r.company.stage ?? EM,
          formatOwnership(r.ownershipPct),
          r.lastMis ?? EM,
          `"${r.cash.display}"`,
          `"${r.burn.display}"`,
          `"${r.runway.display}"`,
          String(r.openFlags),
          st.label,
        ].join(",");
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "portfolio-pulse.csv";
    a.click();
  }

  return (
    <Shell>
      <PageHead
        title="Command"
        testId="command-ready"
        kicker={bookCloseLine()}
        lede="Is the book current, and what needs a human? Pulse from booked facts only. Missing is —, never 0. Cite opens the footnote — file, locator, excerpt, period, confirmed by."
        actions={
          <>
            <span className="lede">
              Last refresh{" "}
              {refreshedAt
                ? refreshedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                : EM}
            </span>
            <button className="btn ghost sm" type="button" onClick={load} disabled={busy}>
              <span className="row" style={{ gap: 6 }}>
                <IconRefresh />
                {busy ? "Refreshing…" : "Refresh book"}
              </span>
            </button>
          </>
        }
      />
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {!data && !err && (
        <p className="lede" aria-live="polite">
          Loading the book…
        </p>
      )}
      {data && (
        <>
          <div className="cards cards-4">
            <div className="kpi">
              <div className="k">Companies</div>
              <div className="v">{data.pulse.companies}</div>
            </div>
            <div className={`kpi${data.pulse.openFlags > 0 ? " accent-warn" : ""}`}>
              <div className="k">Open flags</div>
              <div className="v">{data.pulse.openFlags}</div>
              {data.pulse.openFlags > 0 ? <div className="meta">Requires review</div> : null}
            </div>
            <div className={`kpi${gaps > 0 ? " accent-danger" : ""}`}>
              <div className="k">Coverage gaps</div>
              <div className="v">{gaps}</div>
              <div className="meta">{gaps > 0 ? "No booked MIS" : "Names with no booked MIS period"}</div>
            </div>
            <div className="kpi">
              <div className="k">Uncited figures</div>
              <div className="v">{uncited == null ? EM : uncited}</div>
              <div className="meta">Cite-or-refuse · shown values without provenance</div>
            </div>
          </div>

          <p className="lede" style={{ margin: "-8px 0 14px" }}>
            {data.pulse.companies === 0
              ? "Empty book — nothing for a human yet."
              : data.pulse.inboxPending + data.pulse.openFlags + gaps === 0
                ? "Current — no inbox and no open flags."
                : `${data.pulse.inboxPending} to confirm · ${data.pulse.openFlags} open flags · ${gaps} coverage gaps.`}
            {!data.pulse.nav.nav.complete
              ? ` NAV incomplete — ${data.pulse.nav.nav.missing} values missing.`
              : ""}
          </p>
          <div className="headline-strip">
            <span className="chip unfact">
              NAV {data.pulse.nav.nav.total == null ? EM : data.pulse.nav.nav.total.toLocaleString("en-IN")}
              {!data.pulse.nav.nav.complete ? ` · incomplete · ${data.pulse.nav.nav.missing} unmarked` : ""}
            </span>
            <span className="chip unfact">MOIC {data.pulse.moic == null ? EM : `${data.pulse.moic.toFixed(2)}x`}</span>
            <span className="chip unfact">Inbox {data.pulse.inboxPending}</span>
            <span className="chip unfact">Funds {data.pulse.funds}</span>
          </div>

          <div className="command-split">
            <Panel title="Needs a look">
              {look.length === 0 ? (
                <div className="empty" style={{ boxShadow: "none" }}>
                  {data.pulse.companies === 0
                    ? "Empty book — nothing yet needs a look."
                    : "No pending inbox rows or open flags."}
                </div>
              ) : (
                <div className="look-list">
                  {look.map((item) => (
                    <div className="look-item" key={item.id}>
                      {item.severity === "high" ? (
                        <IconWarn className="nav-ico look-ico high" />
                      ) : (
                        <IconFlagSmall className="nav-ico look-ico" />
                      )}
                      <div>
                        <Link className="look-title company-link" href={item.href}>
                          {item.company}
                        </Link>
                        <div className="look-copy">{item.copy}</div>
                        <div className="look-chips">
                          {item.lane === "obj" ? <span className="lane-chip obj">Objective</span> : null}
                        </div>
                      </div>
                      <Link className="cite" href={item.citeHref}>
                        Open
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
            <Panel title="Coverage" flush>
              {data.coverage.length === 0 ? (
                <div className="panel-body">
                  <div className="empty" style={{ boxShadow: "none" }}>
                    No coverage rows.
                  </div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Last MIS</th>
                      <th>Missing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.coverage.map((r) => {
                      const age = daysSince(r.lastMis);
                      return (
                        <tr key={r.company.id}>
                          <td>
                            <div className="company-cell">
                              <CompanyMark name={r.company.name} />
                              <Link className="company-link" href={`/companies/${r.company.id}`}>
                                {r.company.name}
                              </Link>
                            </div>
                          </td>
                          <td className="num">{age == null ? EM : `${age}d`}</td>
                          <td className={r.lastMis ? undefined : "miss"}>{r.lastMis ? EM : "MIS"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>

          {data.pulse.companies === 0 && (
            <div className="empty">
              <strong>The book is empty</strong>
              {canWrite ? (
                <>
                  <Link href="/companies/new">Add a company</Link> and upload the first MIS — about 15 minutes to a live
                  Command row. No illustrative NAV.
                </>
              ) : (
                "Ask an Org Admin to add the first name."
              )}
            </div>
          )}

          {data.coverage.length > 0 && (
            <Panel
              title="Portfolio pulse"
              actions={
                <div className="row">
                  <label className="sr-only" htmlFor="pulse-filter">
                    Filter
                  </label>
                  <input
                    id="pulse-filter"
                    placeholder="Filter"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{ width: 140 }}
                  />
                  <button className="btn ghost sm" type="button" onClick={exportPulse} disabled={pulseRows.length === 0}>
                    Export
                  </button>
                </div>
              }
              flush
            >
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Stage</th>
                      <th>Own.</th>
                      <th>Last MIS</th>
                      <th>Cash</th>
                      <th>Burn</th>
                      <th>Runway</th>
                      <th>Flags</th>
                      <th>Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pulseRows.map((r) => {
                      const st = pulseStatus(r);
                      return (
                        <tr key={r.company.id}>
                          <td>
                            <div className="company-cell">
                              <CompanyMark name={r.company.name} />
                              <Link className="company-link" href={`/companies/${r.company.id}`}>
                                {r.company.name}
                              </Link>
                            </div>
                          </td>
                          <td>{r.company.stage ? <span className="badge">{r.company.stage}</span> : EM}</td>
                          <td className="num">{formatOwnership(r.ownershipPct)}</td>
                          <td className="num">{r.lastMis ?? EM}</td>
                          <td>
                            <Fact
                              {...r.cash}
                              note={r.cash.fxNote}
                              sourcePath={sourcePathFor(data.sourceRefs, r.cash.sourceRefId)}
                            />
                          </td>
                          <td>
                            <Fact
                              {...r.burn}
                              note={r.burn.fxNote}
                              sourcePath={sourcePathFor(data.sourceRefs, r.burn.sourceRefId)}
                            />
                          </td>
                          <td>
                            <Fact {...r.runway} sourcePath={sourcePathFor(data.sourceRefs, r.runway.sourceRefId)} />
                          </td>
                          <td className="num">{r.openFlags}</td>
                          <td>
                            <span className={`status-chip ${st.kind}`}>{st.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </Shell>
  );
}
