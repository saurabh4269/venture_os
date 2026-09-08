"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { FLAG_CATALOG } from "@venture-os/core";
import { CompanyMark, EM, formatOwnership, PageHead, Panel } from "@/components/BookUI";
import {
  CashByCompanyChart,
  CoverageMixChart,
  FundRollupBars,
  KpiSparkline,
  PortfolioSeriesChart,
  RunwayUrgencyStrip,
} from "@/components/BookCharts";
import { IconFlagSmall, IconRefresh, IconWarn } from "@/components/Icons";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { FadeIn } from "@/components/motion/FadeIn";
import { Fact, useBookSession } from "@/components/Shell";
import { sourcePathFor } from "@/lib/api";
import { bookFetcher } from "@/lib/book-data";
import { bookErrorMessage } from "@/lib/wake";

type Pulse = {
  pulse: {
    companies: number;
    inboxPending: number;
    openFlags: number;
    funds: number;
    nav: { nav: { total: number | null; complete: boolean; missing: number }; unmarked: { companyName: string }[] };
    moic: number | null;
    irr: number | null;
  };
  fundOperating?: {
    fundId: string;
    fundName: string;
    companies: number;
    cashSum: number | null;
    burnSum: number | null;
    revenueSum: number | null;
    coverage: { cash: number; burn: number; revenue: number; of: number };
  }[];
  charts?: {
    coverageMix: { booked: number; gap: number; review: number };
    cashByCompany: { companyId: string; name: string; cash: number; periodEnd: string }[];
    runwayByCompany: {
      companyId: string;
      name: string;
      months: number;
      priorMonths?: number | null;
      deltaMonths?: number | null;
      periodEnd: string;
      priorPeriodEnd?: string | null;
    }[];
    portfolioSeries: {
      periodEnd: string;
      cashSum: number | null;
      revenueSum: number | null;
      burnSum: number | null;
      cashN: number;
      revenueN: number;
      burnN: number;
    }[];
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
    lastRoundLabel: string | null;
    lastRoundAt: string | null;
    irr: { display: string; isFact: boolean; sourceRefId?: string | null };
    revenueTrend: { display: string; isFact: boolean; sourceRefId?: string | null };
    netRevenue: { display: string; isFact: boolean; fxNote?: string | null; sourceRefId?: string | null };
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

function pulseStatus(row: Pulse["coverage"][number], pendingConfirm: boolean) {
  if (pendingConfirm) return { label: "Confirm", kind: "review" as const };
  if (row.openFlags > 0) return { label: "Review", kind: "review" as const };
  if (coverageGap(row)) return { label: "Gap", kind: "gap" as const };
  return { label: "Booked", kind: "booked" as const };
}

function coverageSource(row: Pulse["coverage"][number], pendingConfirm: boolean) {
  if (pendingConfirm) return "Confirm queue";
  if (row.lastMis) return "Booked MIS";
  return "";
}

function runwayMonths(display: string) {
  const m = display.match(/([\d.]+)\s*mo/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function runwayTint(display: string) {
  const mo = runwayMonths(display);
  if (mo == null) return null;
  if (mo < 3) return "danger" as const;
  if (mo < 6) return "warn" as const;
  return null;
}

export default function CommandPage() {
  const { canWrite } = useBookSession();
  const [filter, setFilter] = useState("");
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<Pulse>("/api/command", bookFetcher);
  const err = error ? bookErrorMessage(error instanceof Error ? error.message : String(error)) : "";
  const busy = isLoading || isValidating;
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  useEffect(() => {
    if (data) setRefreshedAt(new Date());
  }, [data]);

  function load() {
    void mutate();
  }

  const gaps = data?.coverage.filter(coverageGap).length ?? 0;
  const uncited = data ? uncitedCount(data.coverage) : null;
  const look = useMemo(() => {
    if (!data) return [];
    const inboxByCompany = new Map<string, { count: number; kinds: string[] }>();
    for (const i of data.needsALook.inbox) {
      const cur = inboxByCompany.get(i.companyName) ?? { count: 0, kinds: [] };
      cur.count += 1;
      if (cur.kinds.length < 3) cur.kinds.push(i.kind.replaceAll("_", " "));
      inboxByCompany.set(i.companyName, cur);
    }
    const inboxRows = [...inboxByCompany.entries()].map(([company, { count, kinds }]) => ({
      id: `inbox-${company}`,
      href: "/confirm",
      company,
      copy:
        count > 1
          ? `${count} rows ready to confirm${kinds.length ? ` · ${kinds.join(", ")}` : ""}.`
          : `${kinds[0] ?? "row"} pending confirm.`,
      severity: "med" as const,
    }));
    return [
      ...inboxRows,
      ...data.needsALook.flags.map((f) => ({
        id: `flag-${f.id}`,
        href: "/flags",
        company: f.companyName,
        copy: `${flagLabel(f.flagKey)} (${f.severity}).`,
        severity: f.severity === "high" ? ("high" as const) : ("med" as const),
      })),
    ];
  }, [data]);

  const pendingConfirmNames = useMemo(() => {
    if (!data) return new Set<string>();
    return new Set(data.needsALook.inbox.map((i) => i.companyName));
  }, [data]);

  const pulseRows = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    return data.coverage.filter((r) => !q || r.company.name.toLowerCase().includes(q));
  }, [data, filter]);

  function exportPulse() {
    if (!data) return;
    const header = ["Company", "Stage", "Ownership", "Last MIS", "Source", "Cash", "Burn", "Runway", "Flags", "Coverage"];
    const lines = [
      header.join(","),
      ...pulseRows.map((r) => {
        const pending = pendingConfirmNames.has(r.company.name);
        const st = pulseStatus(r, pending);
        return [
          `"${r.company.name}"`,
          r.company.stage ?? "",
          formatOwnership(r.ownershipPct),
          r.lastMis ?? "",
          `"${coverageSource(r, pending)}"`,
          `"${r.cash.display}"`,
          `"${r.burn.display}"`,
          `"${r.runway.display}"`,
          r.openFlags ? String(r.openFlags) : "",
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
    <><PageHead
        title="Command"
        testId="command-ready"
        kicker={bookCloseLine()}
        actions={
          <>
            <span className="lede">
              {refreshedAt
                ? refreshedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                : ""}
            </span>
            <button className="btn ghost sm" type="button" onClick={load} disabled={busy}>
              <span className="row" style={{ gap: 6 }}>
                <IconRefresh />
                {busy ? "…" : "Refresh"}
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
          {(() => {
            const attention = data.pulse.inboxPending + data.pulse.openFlags + gaps;
            const verdictKind =
              data.pulse.companies === 0 ? "gap" : attention > 0 ? (gaps > 0 || data.pulse.openFlags > 0 ? "gap" : "attention") : "ok";
            const verdictTitle =
              data.pulse.companies === 0
                ? "Empty book."
                : attention === 0
                  ? "Book is current."
                  : "Needs a human.";
            const verdictDetail =
              data.pulse.companies === 0
                ? "Add a company and confirm the first MIS."
                : attention === 0
                  ? "No confirm queue and no open flags."
                  : "Confirm queue, flags, or coverage gaps need attention.";
            const navNote = !data.pulse.nav.nav.complete
              ? `NAV incomplete (${data.pulse.nav.nav.missing} unmarked).`
              : null;
            return (
              <div className={`verdict is-${verdictKind}`} role="status">
                <div className="verdict-copy">
                  {verdictTitle}
                  <p className="lede">
                    {verdictDetail}
                    {navNote ? ` ${navNote}` : ""}
                  </p>
                </div>
                <div className="verdict-actions">
                  {data.pulse.inboxPending > 0 ? (
                    <Link className="btn sm" href="/confirm">
                      Confirm ({data.pulse.inboxPending})
                    </Link>
                  ) : null}
                  {data.pulse.openFlags > 0 ? (
                    <Link className="btn ghost sm" href="/flags">
                      Flags ({data.pulse.openFlags})
                    </Link>
                  ) : null}
                  {data.pulse.companies === 0 && canWrite ? (
                    <Link className="btn sm" href="/companies/new">
                      Add company
                    </Link>
                  ) : null}
                  {!data.pulse.nav.nav.complete ? (
                    <Link className="btn ghost sm" href="/nav">
                      NAV
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })()}

          <div className="cards cards-6">
            <div className="kpi">
              <div className="k">Companies</div>
              <div className="v">
                <AnimatedNumber value={data.pulse.companies} />
              </div>
            </div>
            <div className={`kpi${data.pulse.inboxPending > 0 ? " accent-warn" : ""}`}>
              <Link className="kpi-link" href="/confirm">
                <div className="k">To confirm</div>
                <div className="v">
                  <AnimatedNumber value={data.pulse.inboxPending} />
                </div>
              </Link>
            </div>
            <div className={`kpi${data.pulse.openFlags > 0 ? " accent-warn" : ""}`}>
              <Link className="kpi-link" href="/flags">
                <div className="k">Open flags</div>
                <div className="kpi-row">
                  <div className="v">
                    <AnimatedNumber value={data.pulse.openFlags} />
                  </div>
                </div>
                {data.pulse.openFlags > 0 ? <div className="meta">Requires review</div> : null}
              </Link>
            </div>
            <div className={`kpi${gaps > 0 ? " accent-danger" : ""}`}>
              <div className="k">Coverage gaps</div>
              <div className="v">
                <AnimatedNumber value={gaps} />
              </div>
              <div className="meta">{gaps > 0 ? "No booked MIS" : "All names have a period"}</div>
            </div>
            <div className={`kpi kpi-with-spark${!data.pulse.nav.nav.complete ? " accent-warn" : " accent-forest"}`}>
              <Link className="kpi-link" href="/nav">
                <div className="kpi-body">
                  <div className="k">NAV</div>
                  <div className="v">
                    {data.pulse.nav.nav.total == null ? "" : data.pulse.nav.nav.total.toLocaleString("en-IN")}
                  </div>
                  <div className="meta">
                    {!data.pulse.nav.nav.complete ? `Incomplete · ${data.pulse.nav.nav.missing} unmarked` : "As booked"}
                  </div>
                </div>
                <KpiSparkline values={(data.charts?.portfolioSeries ?? []).map((r) => r.cashSum)} />
              </Link>
            </div>
            <div className="kpi kpi-with-spark">
              <div className="kpi-body">
                <div className="k">MOIC</div>
                <div className="v">{data.pulse.moic == null ? "" : `${data.pulse.moic.toFixed(2)}x`}</div>
                <div className="meta">
                  IRR {data.pulse.irr == null ? "" : `${(data.pulse.irr * 100).toFixed(1)}%`}
                  {uncited != null && uncited > 0 ? ` · ${uncited} uncited` : ""}
                </div>
              </div>
              <KpiSparkline values={(data.charts?.portfolioSeries ?? []).map((r) => r.revenueSum)} />
            </div>
          </div>

          <Panel
            title="Needs a look"
            kicker={look.length ? `${look.length} items` : undefined}
            actions={
              look.length > 0 ? (
                <Link className="btn ghost sm" href="/confirm">
                  Open Confirm
                </Link>
              ) : null
            }
          >
            {look.length === 0 ? (
              <div className="empty" style={{ boxShadow: "none" }}>
                {data.pulse.companies === 0
                  ? "No companies yet. Add one when you are ready."
                  : "You are up to date. Check Confirm after new uploads."}
              </div>
            ) : (
              <div className="look-list">
                {look.map((item, i) => (
                  <FadeIn key={item.id} delay={Math.min(i, 6) * 0.04}>
                    <Link className="look-item" href={item.href}>
                      {item.severity === "high" ? (
                        <IconWarn className="nav-ico look-ico high" />
                      ) : (
                        <IconFlagSmall className="nav-ico look-ico" />
                      )}
                      <div>
                        <div className="look-title">{item.company}</div>
                        <div className="look-copy">{item.copy}</div>
                      </div>
                    </Link>
                  </FadeIn>
                ))}
              </div>
            )}
          </Panel>

          {data.charts && data.pulse.companies > 0 ? (
            <>
              <Panel title="Runway" className="runway-strip-panel">
                <RunwayUrgencyStrip rows={data.charts.runwayByCompany ?? []} />
              </Panel>
              <div className="chart-grid chart-grid-command">
                <Panel title="Coverage mix" className="coverage-mix-panel">
                  <CoverageMixChart {...data.charts.coverageMix} />
                </Panel>
                <Panel title="Cash by company" className="chart-span-2">
                  <CashByCompanyChart rows={data.charts.cashByCompany} />
                </Panel>
                <Panel title="Portfolio trend" className="chart-span-2">
                  <PortfolioSeriesChart rows={data.charts.portfolioSeries} />
                </Panel>
              </div>
            </>
          ) : null}

          {data.pulse.companies === 0 && (
            <div className="empty">
              <strong>The book is empty</strong>
              {canWrite ? (
                <>
                  <Link href="/companies/new">Add a company</Link> and upload the first MIS. No illustrative NAV.
                </>
              ) : (
                "Ask an Org Admin to add the first name."
              )}
            </div>
          )}

          {(data.fundOperating?.length ?? 0) > 0 && (
            <Panel title="Fund operating rollup" flush>
              <div className="chart-grid chart-grid-fund">
                <div className="panel-body">
                  <FundRollupBars rows={data.fundOperating!} />
                </div>
                <div className="table-scroll">
                  <table className="table-hover">
                    <thead>
                      <tr>
                        <th>Fund</th>
                        <th>Names</th>
                        <th>Cash Σ</th>
                        <th>Burn Σ</th>
                        <th>Revenue Σ</th>
                        <th>Coverage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.fundOperating!.map((f) => (
                        <tr key={f.fundId}>
                          <td>{f.fundName}</td>
                          <td className="num">{f.companies}</td>
                          <td className="num">{f.cashSum == null ? "" : f.cashSum.toLocaleString("en-IN")}</td>
                          <td className="num">{f.burnSum == null ? "" : f.burnSum.toLocaleString("en-IN")}</td>
                          <td className="num">{f.revenueSum == null ? "" : f.revenueSum.toLocaleString("en-IN")}</td>
                          <td className="num">
                            {f.coverage.cash}/{f.coverage.of} cash · {f.coverage.burn}/{f.coverage.of} burn
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Panel>
          )}

          {data.coverage.length > 0 && (
            <Panel title="Portfolio pulse" flush>
              <div className="table-tools">
                <label className="field table-tools-field">
                  <span className="sr-only">Filter companies</span>
                  <input
                    id="pulse-filter"
                    placeholder="Filter companies"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    aria-label="Filter companies"
                  />
                </label>
                <button
                  className="btn ghost sm push"
                  type="button"
                  onClick={exportPulse}
                  disabled={pulseRows.length === 0}
                >
                  Export
                </button>
              </div>
              <div className="table-scroll">
                <table className="table-hover">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Stage</th>
                      <th>Own.</th>
                      <th>Last MIS</th>
                      <th>Revenue</th>
                      <th>Cash</th>
                      <th>Burn</th>
                      <th>Runway</th>
                      <th>Flags</th>
                      <th>Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pulseRows.map((r) => {
                      const pending = pendingConfirmNames.has(r.company.name);
                      const st = pulseStatus(r, pending);
                      const tint = runwayTint(r.runway.display);
                      const rowClass =
                        st.kind === "gap" ? "row-gap" : r.openFlags > 0 || st.kind === "review" ? "row-flag" : undefined;
                      return (
                        <tr key={r.company.id} className={rowClass}>
                          <td>
                            <div className="company-cell">
                              <CompanyMark name={r.company.name} />
                              <Link className="company-link" href={`/companies/${r.company.id}`}>
                                {r.company.name}
                              </Link>
                            </div>
                          </td>
                          <td>{r.company.stage ?? ""}</td>
                          <td className="num">{formatOwnership(r.ownershipPct)}</td>
                          <td className="num">{r.lastMis ?? ""}</td>
                          <td>
                            <Fact
                              {...r.netRevenue}
                              note={r.netRevenue.fxNote}
                              sourcePath={sourcePathFor(data.sourceRefs, r.netRevenue.sourceRefId)}
                            />
                          </td>
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
                            {tint ? (
                              <span className={`cell-tint ${tint}`}>
                                <Fact {...r.runway} sourcePath={sourcePathFor(data.sourceRefs, r.runway.sourceRefId)} />
                              </span>
                            ) : (
                              <Fact {...r.runway} sourcePath={sourcePathFor(data.sourceRefs, r.runway.sourceRefId)} />
                            )}
                          </td>
                          <td className="num">
                            {r.openFlags ? (
                              <span className={`flag-n${r.openFlags >= 2 ? " high" : ""}`}>{r.openFlags}</span>
                            ) : (
                              ""
                            )}
                          </td>
                          <td className={`cover-plain cover-${st.kind}`}>{st.label}</td>
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
    </>
  );
}
