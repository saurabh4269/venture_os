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
import { Button } from "@/components/ui/button";
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
    <Card>
      <CardContent className="pt-4">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
        {loading ? <Skeleton className="mt-2 h-8 w-16" /> : <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>}
      </CardContent>
    </Card>
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
    return [
      ...data.needsALook.inbox.map((i) => ({
        id: `inbox-${i.id}`, href: "/inbox", company: i.companyName,
        copy: `Inbox ${i.kind.replaceAll("_", " ")} — confirm before it posts.`,
        severity: "med" as const, cite: false,
      })),
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

  return (
    <Shell>
      <header className="page-head">
        <div>
          <h1 data-testid="command-ready">Command</h1>
          <p className="lede">Is the book current, and what needs a human?</p>
        </div>
        <div className="page-actions">
          <Button variant="outline" size="sm" type="button" onClick={load} disabled={busy}>
            {busy ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </header>
      {err && <p className="sev-high" role="alert">{err}</p>}

      <div className="command-kpis mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Companies" value={data ? fmtCount(data.pulse.companies) : EM} loading={loading} />
        <KpiCard label="Open flags" value={data ? fmtCount(data.pulse.openFlags) : EM} loading={loading} />
        <KpiCard label="Needs look" value={data ? fmtCount(needsLook) : EM} loading={loading} />
        <KpiCard label="Last sync" value={data ? (lastSync ? relativeUpdated(lastSync) : EM) : EM} loading={loading} />
      </div>

      {data && (
        <div className="command-home-grid">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-lg">
                Needs a Look{needsLook > 0 ? ` · ${needsLook}` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {look.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {data.pulse.companies === 0 ? "Empty book — nothing yet needs a look." : "No pending inbox rows or open flags."}
                </p>
              ) : (
                <ScrollArea className="max-h-80">
                  <div className="look-list">
                    {look.map((item) => (
                      <div className="look-item" key={item.id}>
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
              <CardTitle className="font-serif text-lg">Pipeline Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pipeline.length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm">No companies on the book yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pipeline.map((r) => (
                      <TableRow key={r.company.id}>
                        <TableCell>
                          <div className="company-cell flex items-center gap-2">
                            <CompanyMark name={r.company.name} />
                            <Link className="company-link" href={`/companies/${r.company.id}`}>{r.company.name}</Link>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.pipelineStage === "REVIEWED" ? "default" : "secondary"}>{r.pipelineStage}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">Book</TableCell>
                        <TableCell className="text-right tabular-nums">{r.updated}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <AskOsPanel />
        </div>
      )}

      {data?.pulse.companies === 0 && (
        <Card className="mt-4">
          <CardContent className="py-8 text-center">
            <strong className="font-serif text-lg">The book is empty</strong>
            <p className="text-muted-foreground mt-2 text-sm">
              {canWrite ? (
                <><Link href="/companies/new" className="text-foreground underline">Add a company</Link> and upload the first MIS. No illustrative NAV.</>
              ) : "Ask an Org Admin to add the first name."}
            </p>
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}
