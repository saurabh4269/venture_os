"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FLAG_CATALOG } from "@venture-os/core";
import { CompanyMark, EM } from "@/components/BookUI";
import { AskOsPanel } from "@/components/AskOsPanel";
import { IconFlagSmall, IconWarn } from "@/components/Icons";
import { Shell, useBookSession } from "@/components/Shell";
import { api } from "@/lib/api";
import { bookErrorMessage } from "@/lib/wake";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    lastMis: string | null;
    openFlags: number;
  }[];
};

type ConnectorRow = { kind: string; lastSyncAt?: string };
type PipelineStage = "SOURCE" | "PROPOSED" | "REVIEWED" | "BOOK" | "ANALYSIS";

function flagLabel(key: string) {
  return FLAG_CATALOG.find((c) => c.key === key)?.label ?? key.replaceAll("_", " ");
}

function deriveStage(row: Pulse["coverage"][number], inboxCompanyIds: Set<string>): PipelineStage {
  if (inboxCompanyIds.has(row.company.id)) return "PROPOSED";
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
  return `${Math.floor(h / 24)}d ago`;
}

function fmtCount(n: number) {
  return n > 0 ? String(n) : EM;
}

function KpiCard({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="kpi">
      <div className="k">{label}</div>
      {loading ? <Skeleton className="mt-2 h-8 w-16" /> : <div className="v">{value}</div>}
    </div>
  );
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

  useEffect(() => { load(); }, []);

  const inboxCompanyIds = useMemo(() => {
    if (!data) return new Set<string>();
    const names = new Set(data.needsALook.inbox.map((i) => i.companyName));
    return new Set(data.coverage.filter((c) => names.has(c.company.name)).map((c) => c.company.id));
  }, [data]);

  const look = useMemo(() => {
    if (!data) return [];
    const inboxByCompany = new Map<string, number>();
    for (const i of data.needsALook.inbox) {
      inboxByCompany.set(i.companyName, (inboxByCompany.get(i.companyName) ?? 0) + 1);
    }
    const inboxRows = [...inboxByCompany.entries()].map(([company, count]) => ({
      id: `inbox-${company}`,
      href: "/inbox",
      company,
      copy: count > 1 ? `${count} Inbox rows ready to review.` : "Inbox row ready to review.",
      severity: "med" as const,
      cite: false,
    }));
    return [
      ...inboxRows,
      ...data.needsALook.flags.map((f) => ({
        id: `flag-${f.id}`, href: "/flags", company: f.companyName,
        copy: `${flagLabel(f.flagKey)} (${f.severity}).`,
        severity: f.severity === "high" ? ("high" as const) : ("med" as const), cite: true,
      })),
    ];
  }, [data]);

  const pipeline = useMemo(() => {
    if (!data) return [];
    return [...data.coverage]
      .map((r) => ({ ...r, pipelineStage: deriveStage(r, inboxCompanyIds), updated: relativeUpdated(r.lastMis) }))
      .sort((a, b) => (b.lastMis ?? "").localeCompare(a.lastMis ?? ""))
      .slice(0, 8);
  }, [data, inboxCompanyIds]);

  const needsLook = look.length;
  const loading = !data && !err;
  const emptyBook = data?.pulse.companies === 0;
  const inboxPending = data?.pulse.inboxPending ?? 0;

  return (
    <Shell>
      <header className="page-head">
        <div>
          <h1 data-testid="command-ready">Command</h1>
          <p className="lede">Your portfolio at a glance — what needs attention today.</p>
        </div>
        <div className="page-actions">
          <button className="btn ghost sm" type="button" onClick={load} disabled={busy}>
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>
      {err && <p className="sev-high" role="alert">{err}</p>}

      <div className="cards cards-4 command-kpis">
        <KpiCard label="Companies" value={data ? fmtCount(data.pulse.companies) : EM} loading={loading} />
        <KpiCard label="Open flags" value={data ? fmtCount(data.pulse.openFlags) : EM} loading={loading} />
        <KpiCard label="Needs look" value={data ? fmtCount(needsLook) : EM} loading={loading} />
        <KpiCard label="Last sync" value={data ? (lastSync ? relativeUpdated(lastSync) : EM) : EM} loading={loading} />
      </div>

      {!loading && (
        <div className="command-home-grid">
          <Card className="command-needs-look" data-testid="command-needs-look">
            <CardHeader className="pb-2">
              <div className="command-card-head flex items-center justify-between gap-2">
                <CardTitle className="font-serif text-lg">
                  Needs a look{needsLook > 0 ? ` · ${needsLook}` : ""}
                </CardTitle>
                {emptyBook ? null : inboxPending > 0 ? (
                  <Link href="/inbox" className="btn ghost sm command-inbox-link" data-testid="command-open-inbox">
                    Inbox · {inboxPending}
                  </Link>
                ) : (
                  <Link href="/inbox" className="btn ghost sm command-inbox-link" data-testid="command-open-inbox">
                    Open Inbox
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {look.length === 0 ? (
                <div className="command-empty-hint space-y-2" data-testid="command-needs-look-empty">
                  {emptyBook ? (
                    <p className="lede">No companies yet. Add one when you&apos;re ready.</p>
                  ) : (
                    <p className="lede">You&apos;re up to date. Check <Link href="/inbox">Inbox</Link> after new uploads.</p>
                  )}
                </div>
              ) : (
                <ScrollArea className="max-h-80">
                  <div className="look-list" data-testid="command-look-list">
                    {look.map((item) => (
                      <div className="look-item" key={item.id} data-testid="command-look-item">
                        {item.severity === "high" ? <IconWarn className="nav-ico look-ico high" /> : <IconFlagSmall className="nav-ico look-ico" />}
                        <div>
                          <Link className="look-title company-link font-medium" href={item.href}>{item.company}</Link>
                          <div className="look-copy text-muted-foreground text-sm">{item.copy}</div>
                          {item.cite ? <Badge className="mt-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Cite</Badge> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-lg">Pipeline activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pipeline.length === 0 ? (
                <div className="command-empty-hint p-4">
                  <p className="lede">
                    {emptyBook
                      ? "Pipeline fills in after your first company and upload."
                      : "No recent pipeline activity."}
                  </p>
                </div>
              ) : (
                <div className="table-scroll command-pipeline-scroll">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="hide-sm">Source</TableHead>
                      <TableHead className="text-right hide-sm">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pipeline.map((r) => (
                      <TableRow key={r.company.id}>
                        <TableCell>
                          <div className="company-cell flex items-center gap-2">
                            <CompanyMark name={r.company.name} />
                            <div>
                              <Link className="company-link" href={`/companies/${r.company.id}`}>{r.company.name}</Link>
                              <div className="lede show-mobile-only">{r.updated}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{r.pipelineStage}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground hide-sm">Book</TableCell>
                        <TableCell className="text-right tabular-nums hide-sm">{r.updated}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <AskOsPanel />
        </div>
      )}

      {emptyBook && !loading && (
        <div className="empty command-start" data-testid="command-empty">
          <strong>Start your book</strong>
          <p className="lede">
            {canWrite
              ? "Add a company and upload your first MIS pack. Nothing posts to the book until you confirm in Inbox."
              : "Ask your Org Admin to add the first company."}
          </p>
          {canWrite ? (
            <div className="command-start-actions">
              <Link href="/companies/new" className="btn sm">Add company</Link>
              <Link href="/inbox" className="btn ghost sm">Open Inbox</Link>
            </div>
          ) : (
            <div className="command-start-actions">
              <Link href="/inbox" className="btn ghost sm">Open Inbox</Link>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
