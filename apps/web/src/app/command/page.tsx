"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FLAG_CATALOG } from "@venture-os/core";
import { CompanyMark, EM, Panel } from "@/components/BookUI";
import { AskOsPanel } from "@/components/AskOsPanel";
import { IconFlagSmall, IconWarn } from "@/components/Icons";
import { Shell, useBookSession } from "@/components/Shell";
import { api } from "@/lib/api";
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
    cash: { display: string; isFact: boolean };
    burn: { display: string; isFact: boolean };
    runway: { display: string; isFact: boolean };
    lastMis: string | null;
    ownershipPct: number | null;
    openFlags: number;
  }[];
};

type ConnectorRow = { kind: string; lastSyncAt?: string };

const PIPELINE_STAGES = ["SOURCE", "PROPOSED", "REVIEWED", "BOOK", "ANALYSIS"] as const;
type PipelineStage = (typeof PIPELINE_STAGES)[number];

function flagLabel(key: string) {
  return FLAG_CATALOG.find((c) => c.key === key)?.label ?? key.replaceAll("_", " ");
}

function deriveStage(row: Pulse["coverage"][number], inboxNames: Set<string>): PipelineStage {
  if (inboxNames.has(row.company.id)) return "PROPOSED";
  if (row.openFlags > 0) return "REVIEWED";
  if (row.lastMis) return "BOOK";
  return "SOURCE";
}

function relativeUpdated(iso: string | null) {
  if (!iso) return EM;
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "<1h ago";
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmtCount(n: number) {
  return n > 0 ? String(n) : EM;
}

export default function CommandPage() {
  const { canWrite } = useBookSession();
  const [data, setData] = useState<Pulse | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    setBusy(true);
    Promise.all([
      api<Pulse>("/api/command"),
      api<{ connectors: ConnectorRow[] }>("/api/connectors").catch(() => ({ connectors: [] })),
    ])
      .then(([d, c]) => {
        setData(d);
        const syncs = c.connectors.map((x) => x.lastSyncAt).filter(Boolean) as string[];
        setLastSync(syncs.length ? syncs.sort().reverse()[0]! : null);
        setErr("");
      })
      .catch((e: Error) => setErr(bookErrorMessage(e.message)))
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    load();
  }, []);

  const inboxCompanyIds = useMemo(() => {
    if (!data) return new Set<string>();
    const names = new Set(data.needsALook.inbox.map((i) => i.companyName));
    return new Set(data.coverage.filter((c) => names.has(c.company.name)).map((c) => c.company.id));
  }, [data]);

  const look = useMemo(() => {
    if (!data) return [];
    return [
      ...data.needsALook.inbox.map((i) => ({
        id: `inbox-${i.id}`,
        href: "/inbox",
        company: i.companyName,
        copy: `Inbox ${i.kind.replaceAll("_", " ")} — confirm before it posts.`,
        severity: "med" as const,
        cite: false,
      })),
      ...data.needsALook.flags.map((f) => ({
        id: `flag-${f.id}`,
        href: "/flags",
        company: f.companyName,
        copy: `${flagLabel(f.flagKey)} (${f.severity}).`,
        severity: f.severity === "high" ? ("high" as const) : ("med" as const),
        cite: true,
      })),
    ];
  }, [data]);

  const pipeline = useMemo(() => {
    if (!data) return [];
    return [...data.coverage]
      .map((r) => ({
        ...r,
        pipelineStage: deriveStage(r, inboxCompanyIds),
        updated: relativeUpdated(r.lastMis),
      }))
      .sort((a, b) => (b.lastMis ?? "").localeCompare(a.lastMis ?? ""))
      .slice(0, 8);
  }, [data, inboxCompanyIds]);

  const needsLook = look.length;

  return (
    <Shell>
      <header className="page-head">
        <div>
          <h1 data-testid="command-ready">Command</h1>
          <p className="lede">Is the book current, and what needs a human?</p>
        </div>
        <div className="page-actions">
          <button className="btn ghost sm" type="button" onClick={load} disabled={busy}>
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>
      {err && <p className="sev-high" role="alert">{err}</p>}
      {!data && !err && <p className="lede" aria-live="polite">Loading the book…</p>}
      {data && (
        <>
          <div className="cards cards-4 command-kpis">
            <div className="kpi">
              <div className="k">Companies</div>
              <div className="v">{fmtCount(data.pulse.companies)}</div>
            </div>
            <div className="kpi">
              <div className="k">Open flags</div>
              <div className="v">{fmtCount(data.pulse.openFlags)}</div>
            </div>
            <div className="kpi">
              <div className="k">Needs look</div>
              <div className="v">{fmtCount(needsLook)}</div>
            </div>
            <div className="kpi">
              <div className="k">Last sync</div>
              <div className="v" style={{ fontSize: lastSync ? 20 : 28 }}>
                {lastSync ? relativeUpdated(lastSync) : EM}
              </div>
            </div>
          </div>

          <div className="command-home-grid">
            <Panel title={`Needs a Look${needsLook > 0 ? ` · ${needsLook}` : ""}`}>
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
                        <Link className="look-title company-link" href={item.href}>{item.company}</Link>
                        <div className="look-copy">{item.copy}</div>
                        {item.cite ? (
                          <div className="look-chips">
                            <span className="cite">Cite</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Pipeline Activity" flush>
              {pipeline.length === 0 ? (
                <div className="panel-body">
                  <div className="empty" style={{ boxShadow: "none" }}>No companies on the book yet.</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Stage</th>
                      <th>Source</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipeline.map((r) => (
                      <tr key={r.company.id}>
                        <td>
                          <div className="company-cell">
                            <CompanyMark name={r.company.name} />
                            <Link className="company-link" href={`/companies/${r.company.id}`}>
                              {r.company.name}
                            </Link>
                          </div>
                        </td>
                        <td>
                          <span className={`stage-chip${r.pipelineStage === "REVIEWED" ? " reviewed" : ""}`}>
                            {r.pipelineStage}
                          </span>
                        </td>
                        <td className="lede" style={{ fontSize: 13 }}>Book</td>
                        <td className="num">{r.updated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <AskOsPanel />
          </div>

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
        </>
      )}
    </Shell>
  );
}
