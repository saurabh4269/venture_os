"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FLAG_CATALOG, formatDualDisplay, metricByKey } from "@venture-os/core";
import { CompanyMark, formatOwnership, Miss, PageHead, PageTabs, Panel } from "@/components/BookUI";
import { CompanyMetricHistoryChart } from "@/components/BookCharts";
import { useCite } from "@/components/Cite";
import { Fact, useBookSession } from "@/components/Shell";
import { api, downloadAuthed, sourcePathFor } from "@/lib/api";
import { titleCaseKind } from "@/lib/format";
import { bookErrorMessage } from "@/lib/wake";

type Data = {
  company: {
    id: string;
    name: string;
    legalName?: string | null;
    stage: string | null;
    sector: string | null;
    country: string | null;
    fyStartMonth?: number | null;
    unitHint?: string | null;
    currencyHint?: string | null;
    onedriveFolderId?: string | null;
    onedriveFolderPath?: string | null;
    affinityCompanyId?: string | null;
    granolaLink?: string | null;
    revenueDefinition?: string | null;
    lastRoundLabel?: string | null;
    lastRoundAt?: string | null;
    postMoney?: number | null;
    postMoneyCurrency?: string | null;
  };
  metrics: {
    id: string;
    metricKey: string;
    valueNumeric: number | null;
    unit: string;
    currency: string;
    periodStart: string;
    periodEnd: string;
    sourceRefId: string;
    version: number;
    lane: string;
    valueEur: number | null;
    fxRate: number | null;
    fxDate: string | null;
    fxSource: string | null;
    confirmedBy?: string | null;
    confirmedAt?: string | null;
  }[];
  commentary: {
    id: string;
    lane: string;
    body: string;
    periodEnd: string;
    createdBy?: string;
    createdAt?: string;
  }[];
  documents: {
    id: string;
    filename: string;
    kind: string;
    createdAt?: string;
    sha256?: string | null;
    periodStart?: string | null;
    periodEnd?: string | null;
  }[];
  flags: { id: string; flagKey: string; severity: string; evidence: Record<string, unknown> }[];
  sourceRefs: { id: string; documentId: string; excerpt: string | null; locator?: { sheet?: string; cell?: string } }[];
  positions?: {
    id: string;
    fundName: string;
    instrument: string;
    ownershipPct: number | null;
    costBasis: number | null;
    costCurrency: string;
    investedAt: string | null;
  }[];
  kpi?: {
    cash: { display: string; isFact: boolean; fxNote?: string | null; sourceRefId?: string | null };
    burn: { display: string; isFact: boolean; fxNote?: string | null; sourceRefId?: string | null };
    runway: { display: string; isFact: boolean; sourceRefId?: string | null };
  };
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "book", label: "Book" },
  { id: "commentary", label: "Commentary" },
  { id: "flags", label: "Flags" },
  { id: "sources", label: "Sources" },
  { id: "links", label: "Links" },
] as const;

function flagLabel(key: string) {
  return FLAG_CATALOG.find((c) => c.key === key)?.label ?? titleCaseKind(key);
}

function metricLabel(key: string) {
  return metricByKey(key)?.label ?? titleCaseKind(key);
}

function runwayAccent(display?: string) {
  if (!display) return "";
  const m = display.match(/([\d.]+)\s*mo/i);
  if (!m) return "";
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return "";
  if (n < 3) return " accent-danger";
  if (n < 6) return " accent-warn";
  return "";
}

function citeFor(data: Data, refId?: string | null) {
  const ref = data.sourceRefs.find((r) => r.id === refId);
  const doc = ref ? data.documents.find((d) => d.id === ref.documentId) : undefined;
  const metric = refId ? data.metrics.find((m) => m.sourceRefId === refId) : undefined;
  return {
    filename: doc?.filename,
    locator: ref?.locator,
    excerpt: ref?.excerpt,
    periodStart: metric?.periodStart,
    periodEnd: metric?.periodEnd,
    confirmedBy: metric?.confirmedBy,
    confirmedAt: metric?.confirmedAt,
  };
}

function evidenceLine(ev: Record<string, unknown> | undefined) {
  if (!ev) return "";
  return Object.entries(ev)
    .filter(([k]) => k !== "sourceRefIds")
    .map(([k, v]) => (v == null || v === "" ? titleCaseKind(k) : `${titleCaseKind(k)}: ${String(v)}`))
    .join(" · ");
}

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canWrite } = useBookSession();
  const openCite = useCite();
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("overview");
  const [lane, setLane] = useState<"objective" | "subjective">("objective");
  const [currentOnly, setCurrentOnly] = useState(true);
  const [body, setBody] = useState("");
  const last = data?.metrics[0];
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [editing, setEditing] = useState(false);
  const [draftMsg, setDraftMsg] = useState("");
  const [sourceKind, setSourceKind] = useState("");
  const [mapMsg, setMapMsg] = useState("");
  const [pullMsg, setPullMsg] = useState("");

  function load() {
    api<Data>(`/api/companies/${id}`)
      .then((d) => {
        setErr("");
        setData(d);
        const m = d.metrics[0];
        if (m) {
          setPeriodStart((p) => p || m.periodStart);
          setPeriodEnd((p) => p || m.periodEnd);
        } else {
          const today = new Date().toISOString().slice(0, 10);
          setPeriodStart((p) => p || today.slice(0, 8) + "01");
          setPeriodEnd((p) => p || today);
        }
      })
      .catch((e: Error) =>
        setErr(e.message.includes("company_not_found") ? "Company not found." : bookErrorMessage(e.message)),
      );
  }
  useEffect(() => {
    load();
  }, [id]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/commentary", {
      method: "POST",
      body: JSON.stringify({
        companyId: id,
        periodStart: periodStart || last?.periodStart,
        periodEnd: periodEnd || last?.periodEnd,
        lane,
        body,
        sourceKind: "human",
      }),
    });
    setBody("");
    load();
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api(`/api/companies/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: String(fd.get("name") || ""),
        legalName: String(fd.get("legalName") || "") || undefined,
        sector: String(fd.get("sector") || "") || undefined,
        stage: String(fd.get("stage") || "") || undefined,
        fyStartMonth: Number(fd.get("fyStartMonth")),
        unitHint: String(fd.get("unitHint") || "") || undefined,
        currencyHint: String(fd.get("currencyHint") || "") || undefined,
        onedriveFolderId: String(fd.get("onedriveFolderId") || "") || undefined,
        onedriveFolderPath: String(fd.get("onedriveFolderPath") || "") || undefined,
        affinityCompanyId: String(fd.get("affinityCompanyId") || "") || undefined,
        granolaLink: String(fd.get("granolaLink") || "") || undefined,
        revenueDefinition: String(fd.get("revenueDefinition") || "") || undefined,
        lastRoundLabel: String(fd.get("lastRoundLabel") || "") || undefined,
        lastRoundAt: String(fd.get("lastRoundAt") || "") || undefined,
        postMoney: (() => {
          const raw = String(fd.get("postMoney") || "").trim();
          if (!raw) return null;
          return Number(raw);
        })(),
        postMoneyCurrency: String(fd.get("postMoneyCurrency") || "") || undefined,
      }),
    });
    setEditing(false);
    load();
  }

  async function draftOnePager() {
    setDraftMsg("");
    try {
      const res = await api<{ report: { id: string } }>("/api/reports", {
        method: "POST",
        body: JSON.stringify({ kind: "one_pager", companyId: id }),
      });
      router.push(`/reports/${res.report.id}`);
    } catch (e) {
      setDraftMsg(e instanceof Error ? e.message : "Draft failed");
    }
  }

  async function draftCommentary(targetLane: "objective" | "subjective") {
    setDraftMsg("");
    try {
      await api("/api/commentary/draft", {
        method: "POST",
        body: JSON.stringify({
          companyId: id,
          lane: targetLane,
          periodStart: periodStart || last?.periodStart,
          periodEnd: periodEnd || last?.periodEnd,
        }),
      });
      setDraftMsg(`${titleCaseKind(targetLane)} draft queued in Confirm. Review before book write.`);
      router.push("/confirm");
    } catch (e) {
      setDraftMsg(e instanceof Error ? e.message : "Draft failed");
    }
  }

  function pathFor(refId?: string | null) {
    return sourcePathFor(data?.sourceRefs, refId);
  }

  const bookRows = useMemo(() => {
    if (!data) return [];
    if (!currentOnly) return data.metrics;
    const map = new Map<string, (typeof data.metrics)[number]>();
    for (const m of data.metrics) {
      const k = `${m.metricKey}|${m.periodEnd}`;
      const cur = map.get(k);
      if (!cur || m.version > cur.version) map.set(k, m);
    }
    return [...map.values()];
  }, [data, currentOnly]);

  if (err) {
    return (
    <><p className="sev-high" role="alert">
          {err}
        </p>
        <p className="lede">
          <Link href="/companies">Back to companies</Link>
        </p>
    </>
  );
  }
  if (!data) {
    return (
    <><p className="lede">Loading…</p>
    </>
  );
  }

  const revenue = bookRows.find((m) => m.metricKey === "net_revenue");
  const revenueDual = revenue
    ? formatDualDisplay({
        value: revenue.valueNumeric,
        sourceRefId: revenue.sourceRefId,
        unit: revenue.unit as never,
        currency: revenue.currency as never,
        valueEur: revenue.valueEur,
        fxRate: revenue.fxRate,
        fxDate: revenue.fxDate,
        fxSource: revenue.fxSource,
      })
    : null;

  const historyPoints = (() => {
    const periods = [
      ...new Set(
        bookRows
          .filter((m) => m.lane === "objective" && ["cash", "burn", "net_revenue"].includes(m.metricKey))
          .map((m) => m.periodEnd.slice(0, 10)),
      ),
    ].sort();
    return periods.map((periodEnd) => {
      const at = (key: string) =>
        bookRows.find((m) => m.metricKey === key && m.periodEnd.slice(0, 10) === periodEnd && m.lane === "objective")
          ?.valueNumeric ?? null;
      return {
        periodEnd,
        cash: at("cash"),
        burn: at("burn"),
        revenue: at("net_revenue"),
      };
    });
  })();
  const evidence = data.sourceRefs.map((ref) => {
    const doc = data.documents.find((d) => d.id === ref.documentId);
    const loc = [ref.locator?.sheet, ref.locator?.cell].filter(Boolean).join(" ");
    const metric = data.metrics.find((m) => m.sourceRefId === ref.id);
    return {
      id: ref.id,
      source: doc?.filename ?? "Source file",
      kind: titleCaseKind(doc?.kind ?? "other"),
      date: doc?.createdAt ? new Date(doc.createdAt).toLocaleDateString() : (doc?.periodEnd ?? ""),
      cite: loc,
      documentId: ref.documentId,
      excerpt: ref.excerpt,
      locator: ref.locator,
      periodStart: metric?.periodStart,
      periodEnd: metric?.periodEnd,
      confirmedBy: metric?.confirmedBy,
      confirmedAt: metric?.confirmedAt,
    };
  });
  const required = (
    [
      ["mis", "MIS"],
      ["board_pack", "Board pack"],
      ["transcript", "Transcript"],
    ] as const
  ).map(([key, label]) => {
    const docs = data.documents.filter((d) => d.kind === key);
    let state: "covered" | "missing" | "stale" = "missing";
    if (docs.length) {
      const newest = Math.max(...docs.map((d) => (d.createdAt ? new Date(d.createdAt).getTime() : 0)));
      state = key === "mis" && newest > 0 && Date.now() - newest > 45 * 86_400_000 ? "stale" : "covered";
    }
    return { key, label, state };
  });

  return (
    <><PageHead
        mark={<CompanyMark name={data.company.name} size="lg" />}
        title={data.company.name}
        kicker={[data.company.sector, data.company.country].filter(Boolean).join(" · ") || "Company"}
        badge={data.company.stage ? <span className="badge">{data.company.stage}</span> : undefined}
        actions={
          <div className="row">
            <Link className="btn ghost sm" href="/compare">
              Compare
            </Link>
            {canWrite && (
              <>
                <button type="button" className="btn ghost sm" onClick={() => { setTab("links"); setEditing((v) => !v); }}>
                  {editing ? "Close editor" : "Edit profile"}
                </button>
                <button type="button" className="btn ghost sm" onClick={draftOnePager}>
                  Draft one-pager
                </button>
              </>
            )}
          </div>
        }
      />
      {data.flags.length > 0 && (
        <div className="flag-pills">
          {data.flags.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`sev-pill ${f.severity === "high" ? "urgent" : f.severity === "med" ? "warning" : "info"}`}
              onClick={() => setTab("flags")}
            >
              {flagLabel(f.flagKey)}
            </button>
          ))}
        </div>
      )}
      {draftMsg && (
        <p className="sev-high" role="alert">
          {draftMsg}
        </p>
      )}

      <PageTabs tabs={[...TABS]} current={tab} onChange={setTab} />

      {tab === "overview" && (
        <>
          <div className="cards cards-4 company-kpi-strip" aria-label="Objective metrics">
            <div className="kpi accent-forest">
              <div className="k">Cash</div>
              <div className="v company-kpi-v">
                {data.kpi ? (
                  <Fact
                    {...data.kpi.cash}
                    sourcePath={pathFor(data.kpi.cash.sourceRefId)}
                    note={data.kpi.cash.fxNote}
                    cite={citeFor(data, data.kpi.cash.sourceRefId)}
                  />
                ) : (
                  <Miss />
                )}
              </div>
            </div>
            <div className="kpi">
              <div className="k">Burn</div>
              <div className="v company-kpi-v">
                {data.kpi ? (
                  <Fact
                    {...data.kpi.burn}
                    sourcePath={pathFor(data.kpi.burn.sourceRefId)}
                    note={data.kpi.burn.fxNote}
                    cite={citeFor(data, data.kpi.burn.sourceRefId)}
                  />
                ) : (
                  <Miss />
                )}
              </div>
            </div>
            <div className={`kpi${runwayAccent(data.kpi?.runway.display)}`}>
              <div className="k">Runway</div>
              <div className="v company-kpi-v">
                {data.kpi ? (
                  <Fact
                    {...data.kpi.runway}
                    sourcePath={pathFor(data.kpi.runway.sourceRefId)}
                    cite={citeFor(data, data.kpi.runway.sourceRefId)}
                  />
                ) : (
                  <Miss />
                )}
              </div>
            </div>
            <div className="kpi">
              <div className="k">Net revenue</div>
              <div className="v company-kpi-v">
                {revenueDual ? (
                  <Fact
                    display={revenueDual.display}
                    isFact={revenueDual.isFact}
                    sourcePath={pathFor(revenue?.sourceRefId)}
                    note={revenueDual.fxNote}
                    cite={citeFor(data, revenue?.sourceRefId)}
                  />
                ) : (
                  <Miss />
                )}
              </div>
              {data.flags.length > 0 ? (
                <div className="meta">
                  <button type="button" className="linkish" onClick={() => setTab("flags")}>
                    {data.flags.length} open flag{data.flags.length === 1 ? "" : "s"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <Panel title="Booked trend">
            <CompanyMetricHistoryChart points={historyPoints} />
          </Panel>

          <Panel title="Positions">
            {!data.positions?.length ? (
              <div className="empty">No positions.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Fund</th>
                    <th>Instrument</th>
                    <th>Ownership</th>
                    <th>Cost</th>
                    <th>Invested</th>
                  </tr>
                </thead>
                <tbody>
                  {data.positions.map((p) => (
                    <tr key={p.id}>
                      <td>{p.fundName}</td>
                      <td>{p.instrument}</td>
                      <td>{formatOwnership(p.ownershipPct)}</td>
                      <td>
                        {p.costBasis == null
                          ? ""
                          : `${p.costBasis.toLocaleString("en-IN")} ${p.costCurrency}`}
                      </td>
                      <td>{p.investedAt ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <div className="grid-2" style={{ marginBottom: 16 }}>
            <Panel title="Evidence trail">
              {evidence.length === 0 ? (
                <p className="lede" style={{ margin: 0 }}>
                  No citations yet. <Link href="/confirm">Confirm</Link> an extract.
                </p>
              ) : (
                <table className="table-hover">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Locator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidence.map((e) => {
                      const open = () =>
                        openCite({
                          display: e.source,
                          filename: e.source,
                          documentId: e.documentId,
                          sourcePath: `/api/documents/${e.documentId}/file`,
                          locator: e.locator,
                          excerpt: e.excerpt,
                          periodStart: e.periodStart,
                          periodEnd: e.periodEnd,
                          confirmedBy: e.confirmedBy,
                          confirmedAt: e.confirmedAt,
                        });
                      return (
                        <tr
                          key={e.id}
                          className="cite-row"
                          tabIndex={0}
                          role="button"
                          aria-label={`Open source ${e.source}`}
                          onClick={open}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              open();
                            }
                          }}
                        >
                          <td>{e.source}</td>
                          <td className="lede">{e.kind}</td>
                          <td className="lede">{e.date}</td>
                          <td className="lede">{e.cite || <Miss />}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Panel>
            <Panel title="Required docs">
              <ul className="doc-req">
                {required.map((r) => (
                  <li key={r.key} className="doc-row">
                    <span>{r.label}</span>
                    <span className={`cover-pill ${r.state}`}>{r.state}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      )}

      {tab === "book" && (
        <Panel title="Book">
          <label className="lede">
            <input type="checkbox" checked={currentOnly} onChange={(e) => setCurrentOnly(e.target.checked)} /> Current
            version only
          </label>
          {data.metrics.length === 0 ? (
            <div className="empty">
              No facts. <Link href="/confirm">Confirm</Link> extracts.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                  <th>Period</th>
                  <th>Locator</th>
                  <th>Lane</th>
                  <th>Ver.</th>
                  <th>Confirmed</th>
                </tr>
              </thead>
              <tbody>
                {bookRows.map((m) => {
                  const ref = data.sourceRefs.find((r) => r.id === m.sourceRefId);
                  const loc = ref?.locator;
                  const dual = formatDualDisplay({
                    value: m.valueNumeric,
                    sourceRefId: m.sourceRefId,
                    unit: m.unit as never,
                    currency: m.currency as never,
                    valueEur: m.valueEur,
                    fxRate: m.fxRate,
                    fxDate: m.fxDate,
                    fxSource: m.fxSource,
                  });
                  return (
                    <tr key={m.id}>
                      <td>{metricLabel(m.metricKey)}</td>
                      <td>
                        <Fact
                          display={dual.display}
                          isFact={dual.isFact}
                          sourcePath={ref ? `/api/documents/${ref.documentId}/file` : undefined}
                          note={dual.fxNote}
                          cite={citeFor(data, m.sourceRefId)}
                        />
                      </td>
                      <td>{m.periodEnd}</td>
                      <td className="lede">
                        {loc?.sheet} {loc?.cell}
                        {ref?.excerpt ? ` · ${ref.excerpt}` : ""}
                      </td>
                      <td>{titleCaseKind(m.lane)}</td>
                      <td>{m.version}</td>
                      <td className="lede">
                        {m.confirmedAt ? new Date(m.confirmedAt).toLocaleDateString() : <Miss />}
                        {m.confirmedBy ? ` · ${m.confirmedBy.slice(0, 8)}` : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      {tab === "commentary" && (
        <>
          <div className="grid-2" style={{ marginTop: 8 }}>
            <div className="lane-obj">
              <h3>Objective <span className="lane-chip obj">MIS</span></h3>
              {data.commentary.filter((n) => n.lane === "objective").map((n) => (
                <p key={n.id}>
                  <span className="lede">{n.periodEnd} · objective</span>
                  <br />
                  {n.body}
                </p>
              ))}
              {data.commentary.filter((n) => n.lane === "objective").length === 0 && <p className="lede">No objective notes.</p>}
            </div>
            <div className="lane-sub">
              <h3>Subjective <span className="lane-chip sub">judgement</span></h3>
              {data.commentary.filter((n) => n.lane === "subjective").map((n) => (
                <p key={n.id}>
                  <span className="lede">{n.periodEnd} · subjective</span>
                  <br />
                  {n.body}
                </p>
              ))}
              {data.commentary.filter((n) => n.lane === "subjective").length === 0 && <p className="lede">No subjective notes.</p>}
            </div>
          </div>

          {canWrite && (
            <form id="add-note" onSubmit={addNote} style={{ marginTop: 16 }} className="field">
              <label className="field">
                Add note
                <select value={lane} onChange={(e) => setLane(e.target.value as "objective" | "subjective")}>
                  <option value="objective">Objective</option>
                  <option value="subjective">Subjective</option>
                </select>
              </label>
              <div className="row">
                <label className="field">
                  Period start
                  <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
                </label>
                <label className="field">
                  Period end
                  <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
                </label>
              </div>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={3} />
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <button className="btn sm" type="submit">
                  Save note
                </button>
                <button className="btn ghost sm" type="button" onClick={() => draftCommentary("objective")}>
                  Propose objective draft
                </button>
                <button className="btn ghost sm" type="button" onClick={() => draftCommentary("subjective")}>
                  Propose call draft
                </button>
              </div>
              {draftMsg ? <p className="lede">{draftMsg}</p> : null}
            </form>
          )}
        </>
      )}

      {tab === "flags" && (
        <Panel title="Flags">
          <ul>
            {data.flags.map((f) => (
              <li key={f.id} className={`sev-${f.severity}`}>
                <Link href="/flags">{flagLabel(f.flagKey)}</Link> · {f.severity}
                {evidenceLine(f.evidence) && <div className="lede">{evidenceLine(f.evidence)}</div>}
              </li>
            ))}
            {data.flags.length === 0 && <li className="lede">No open flags.</li>}
          </ul>
        </Panel>
      )}

      {tab === "sources" && (
        <Panel title="Sources">
          <label className="field" style={{ maxWidth: 220 }}>
            Kind
            <select value={sourceKind} onChange={(e) => setSourceKind(e.target.value)} aria-label="Source kind">
              <option value="">All kinds</option>
              {[...new Set(data.documents.map((d) => d.kind))].map((k) => (
                <option key={k} value={k}>
                  {titleCaseKind(k)}
                </option>
              ))}
            </select>
          </label>
          <ul>
            {data.documents
              .filter((d) => !sourceKind || d.kind === sourceKind)
              .map((d) => (
              <li key={d.id}>
                <button type="button" className="btn ghost sm" onClick={() => downloadAuthed(`/api/documents/${d.id}/file`, d.filename)}>
                  {d.filename}
                </button>{" "}
                · {titleCaseKind(d.kind)}
                {d.periodEnd ? ` · period ${d.periodEnd}` : ""}
                {d.createdAt ? ` · ${new Date(d.createdAt).toLocaleString()}` : ""}
                {d.sha256 ? ` · sha ${d.sha256.slice(0, 10)}` : ""}
              </li>
            ))}
          </ul>
          {data.documents.length === 0 && <div className="empty">No documents.</div>}
          {canWrite && <Upload companyId={id} onDone={load} />}
        </Panel>
      )}

      {tab === "links" && (
        <>
          {editing && canWrite && (
            <form onSubmit={saveProfile} className="grid-2" style={{ maxWidth: 720, marginBottom: 16 }}>
              <label className="field">
                Name
                <input name="name" defaultValue={data.company.name} required />
              </label>
              <label className="field">
                Legal name
                <input name="legalName" defaultValue={data.company.legalName ?? ""} />
              </label>
              <label className="field">
                Sector
                <input name="sector" defaultValue={data.company.sector ?? ""} />
              </label>
              <label className="field">
                Stage
                <input name="stage" defaultValue={data.company.stage ?? ""} />
              </label>
              <label className="field">
                FY start month
                <input name="fyStartMonth" type="number" min={1} max={12} defaultValue={data.company.fyStartMonth ?? 4} />
              </label>
              <label className="field">
                Unit hint
                <input name="unitHint" defaultValue={data.company.unitHint ?? ""} placeholder="crore" />
              </label>
              <label className="field">
                Currency hint
                <input name="currencyHint" defaultValue={data.company.currencyHint ?? ""} placeholder="INR" />
              </label>
              <label className="field">
                OneDrive folder id
                <input name="onedriveFolderId" defaultValue={data.company.onedriveFolderId ?? ""} />
              </label>
              <label className="field">
                OneDrive folder path
                <input name="onedriveFolderPath" defaultValue={data.company.onedriveFolderPath ?? ""} placeholder="/MIS" />
              </label>
              <label className="field">
                Affinity company id
                <input name="affinityCompanyId" defaultValue={data.company.affinityCompanyId ?? ""} placeholder="numeric" />
              </label>
              <label className="field">
                Granola note id
                <input name="granolaLink" defaultValue={data.company.granolaLink ?? ""} placeholder="not_…" />
              </label>
              <label className="field">
                Revenue definition
                <select name="revenueDefinition" defaultValue={data.company.revenueDefinition ?? "unspecified"}>
                  <option value="unspecified">Unspecified</option>
                  <option value="net">Net</option>
                  <option value="gross">Gross</option>
                  <option value="gmv">GMV</option>
                  <option value="gst_inclusive">GST inclusive</option>
                  <option value="gst_exclusive">GST exclusive</option>
                </select>
              </label>
              <label className="field">
                Last round
                <input name="lastRoundLabel" defaultValue={data.company.lastRoundLabel ?? ""} placeholder="Series A" />
              </label>
              <label className="field">
                Last round date
                <input name="lastRoundAt" type="date" defaultValue={data.company.lastRoundAt ?? ""} />
              </label>
              <label className="field">
                Post-money
                <input name="postMoney" type="number" step="any" defaultValue={data.company.postMoney ?? ""} />
              </label>
              <label className="field">
                Post-money currency
                <input name="postMoneyCurrency" defaultValue={data.company.postMoneyCurrency ?? ""} placeholder="INR" />
              </label>
              <button className="btn sm" type="submit">
                Save profile
              </button>
            </form>
          )}

          {canWrite && (
            <form
              className="grid-2"
              style={{ maxWidth: 720, marginBottom: 16 }}
              onSubmit={async (e) => {
                e.preventDefault();
                setMapMsg("");
                const fd = new FormData(e.currentTarget);
                try {
                  await api(`/api/companies/${id}/connector-mapping`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      onedriveFolderId: String(fd.get("onedriveFolderId") || ""),
                      onedriveFolderPath: String(fd.get("onedriveFolderPath") || ""),
                      affinityCompanyId: String(fd.get("affinityCompanyId") || ""),
                      granolaLink: String(fd.get("granolaLink") || ""),
                    }),
                  });
                  setMapMsg("Connector mapping saved.");
                  load();
                } catch (ex) {
                  setMapMsg(ex instanceof Error ? ex.message : "Could not save mapping");
                }
              }}
            >
              <h2 style={{ gridColumn: "1 / -1" }}>Connector mapping</h2>
              <label className="field">
                OneDrive folder id
                <input name="onedriveFolderId" defaultValue={data.company.onedriveFolderId ?? ""} data-testid="map-onedrive-id" />
              </label>
              <label className="field">
                OneDrive folder path
                <input name="onedriveFolderPath" defaultValue={data.company.onedriveFolderPath ?? ""} data-testid="map-onedrive-path" />
              </label>
              <label className="field">
                Affinity company id
                <input name="affinityCompanyId" defaultValue={data.company.affinityCompanyId ?? ""} data-testid="map-affinity-id" />
              </label>
              <label className="field">
                Granola note id
                <input name="granolaLink" defaultValue={data.company.granolaLink ?? ""} data-testid="map-granola-link" />
              </label>
              <div className="row">
                <button className="btn sm" type="submit">
                  Save mapping
                </button>
                <button
                  className="btn ghost sm"
                  type="button"
                  onClick={async () => {
                    setPullMsg("");
                    try {
                      await api("/api/connectors/onedrive/sync", {
                        method: "POST",
                        body: JSON.stringify({ companyId: id }),
                      });
                      setPullMsg("OneDrive sync queued.");
                      load();
                    } catch (ex) {
                      setPullMsg(ex instanceof Error ? ex.message : "Pull failed");
                    }
                  }}
                >
                  Pull from OneDrive
                </button>
              </div>
              {mapMsg && <p className="lede">{mapMsg}</p>}
              {pullMsg && <p className="lede">{pullMsg}</p>}
            </form>
          )}
          {!canWrite && <p className="lede">No connector edits for this role.</p>}
        </>
      )}
    </>
  );
}

function Upload({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function pollParse(documentId: string) {
    for (let i = 0; i < 20; i++) {
      const r = await api<{ parse: { status: string; error?: string | null } | null }>(
        `/api/documents/${documentId}`,
      ).catch(() => null);
      const st = r?.parse?.status ?? "queued";
      setMsg(`Parse ${st}${r?.parse?.error ? `: ${r.parse.error}` : ""}.`);
      if (st === "done" || st === "error") return;
      await new Promise((ok) => setTimeout(ok, 800));
    }
  }
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData(e.currentTarget);
      const res = await api<{ duplicateOf?: string | null; document?: { id: string } }>(
        `/api/companies/${companyId}/documents`,
        { method: "POST", body: fd },
      );
      setMsg(
        res.duplicateOf
          ? "Same SHA already stored. Confirm extracts."
          : "Queued. Confirm extracts; nothing auto-posts.",
      );
      if (res.document?.id) await pollParse(res.document.id);
      onDone();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={send} className="row" style={{ marginTop: 8 }}>
      <label className="sr-only" htmlFor="kind">
        Document kind
      </label>
      <select id="kind" name="kind" defaultValue="mis">
        <option value="mis">MIS</option>
        <option value="board_pack">Board pack</option>
        <option value="transcript">Transcript</option>
        <option value="mark_memo">Mark memo</option>
        <option value="other">Other</option>
      </select>
      <input type="file" name="file" required accept=".xlsx,.xls,.csv,.pdf" aria-label="File" />
      <button className="btn sm" type="submit" disabled={busy}>
        {busy ? "Uploading…" : "Upload"}
      </button>
      {msg && (
        <span className="lede">
          {msg} <Link href="/confirm">Confirm</Link>
        </span>
      )}
    </form>
  );
}
