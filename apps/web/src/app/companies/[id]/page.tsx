"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FLAG_CATALOG, formatDualDisplay } from "@venture-os/core";
import { formatOwnership, PageHead, Panel } from "@/components/BookUI";
import { useCite } from "@/components/Cite";
import { Fact, Shell, useBookSession } from "@/components/Shell";
import { api, downloadAuthed, sourcePathFor } from "@/lib/api";
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

function flagLabel(key: string) {
  return FLAG_CATALOG.find((c) => c.key === key)?.label ?? key.replaceAll("_", " ");
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
    .map(([k, v]) => `${k.replaceAll("_", " ")}: ${v == null ? "—" : String(v)}`)
    .join(" · ");
}

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canWrite } = useBookSession();
  const openCite = useCite();
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [lane, setLane] = useState<"objective" | "subjective">("objective");
  const [currentOnly, setCurrentOnly] = useState(true);
  const [body, setBody] = useState("");
  const last = data?.metrics[0];
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [editing, setEditing] = useState(false);
  const [draftMsg, setDraftMsg] = useState("");
  const [vaultKind, setVaultKind] = useState("");
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
      }),
    });
    setEditing(false);
    load();
  }

  async function draftOnePager() {
    setDraftMsg("");
    try {
      await api("/api/reports", {
        method: "POST",
        body: JSON.stringify({ kind: "one_pager", companyId: id }),
      });
      router.push("/reports");
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
      <Shell>
        <p className="sev-high" role="alert">
          {err}
        </p>
        <p className="lede">
          <Link href="/companies">Back to companies</Link>
        </p>
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell>
        <p className="lede">Loading the book…</p>
      </Shell>
    );
  }

  const own = data.positions?.map((p) => p.ownershipPct).find((n) => n != null) ?? null;
  const latestSubjective = [...data.commentary]
    .filter((n) => n.lane === "subjective")
    .sort((a, b) => String(b.createdAt ?? b.periodEnd).localeCompare(String(a.createdAt ?? a.periodEnd)))[0];
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
  const evidence = data.sourceRefs.map((ref) => {
    const doc = data.documents.find((d) => d.id === ref.documentId);
    const loc = [ref.locator?.sheet, ref.locator?.cell].filter(Boolean).join(" ");
    const metric = data.metrics.find((m) => m.sourceRefId === ref.id);
    return {
      id: ref.id,
      source: doc?.filename ?? "Source file",
      kind: (doc?.kind ?? "other").replaceAll("_", " "),
      date: doc?.createdAt ? new Date(doc.createdAt).toLocaleDateString() : (doc?.periodEnd ?? "—"),
      cite: loc || "locator",
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
    return { key, label, state, statusLabel: state === "covered" ? "On file" : state === "stale" ? "Stale" : "Upload" };
  });

  return (
    <Shell>
      <PageHead
        title={data.company.name}
        kicker={[data.company.sector, data.company.country].filter(Boolean).join(" · ") || "Company"}
        badge={data.company.stage ? <span className="badge">{data.company.stage}</span> : undefined}
        lede={
          <>
            {data.company.legalName ? `${data.company.legalName} · ` : ""}
            {own == null ? (
              <>
                Ownership <span className="chip unfact">—</span>
              </>
            ) : (
              <>{formatOwnership(own)} ownership</>
            )}
            {" · "}
            FY start month {data.company.fyStartMonth ?? 4} (
            {data.company.fyStartMonth === 4 || data.company.fyStartMonth == null ? "Apr–Mar" : "custom"})
            {data.company.unitHint ? ` · unit hint ${data.company.unitHint}` : ""}
            {data.company.currencyHint ? ` · ${data.company.currencyHint}` : ""}
            {data.company.affinityCompanyId ? " · Affinity id on file" : ""}
          </>
        }
        actions={
          <div className="row page-actions-row">
            <Link className="btn ghost sm" href="/compare">
              Compare
            </Link>
            <Link className="btn ghost sm" href={`/ask?companyId=${id}`}>
              Ask
            </Link>
            {canWrite && (
              <a className="btn sm" href="#add-note">
                Add note
              </a>
            )}
            {canWrite && (
              <>
                <button type="button" className="chip" onClick={() => setEditing((v) => !v)}>
                  {editing ? "Close editor" : "Edit profile"}
                </button>
                <button type="button" className="chip" onClick={draftOnePager}>
                  Draft one-pager
                </button>
              </>
            )}
          </div>
        }
      />
      <div className="flag-pills">
        {data.flags.map((f) => (
          <Link key={f.id} href="/flags" className={`sev-pill ${f.severity === "high" ? "urgent" : f.severity === "med" ? "warning" : "info"}`}>
            {flagLabel(f.flagKey)}
          </Link>
        ))}
      </div>
      {draftMsg && (
        <p className="sev-high" role="alert">
          {draftMsg}
        </p>
      )}

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
          <p className="lede" style={{ gridColumn: "1 / -1" }}>
            Optional. Paste vendor ids from your connector setup. Pull from OneDrive uses the
            same parse pipeline as upload.
          </p>
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
          <div className="row company-connector-actions">
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
                  setPullMsg("OneDrive sync queued. Confirm extracts in Inbox if files were new.");
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

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <Panel title="Objective metrics" kicker="Book" className="lane-obj-panel" actions={<span className="lane-chip obj">Objective</span>}>
          <div className="metric-row">
            <span className="muted">Cash</span>
            <span>
              {data.kpi ? (
                <Fact {...data.kpi.cash} sourcePath={pathFor(data.kpi.cash.sourceRefId)} note={data.kpi.cash.fxNote} cite={citeFor(data, data.kpi.cash.sourceRefId)} />
              ) : (
                <span className="chip unfact">—</span>
              )}
            </span>
          </div>
          <div className="metric-row">
            <span className="muted">Burn (monthly)</span>
            <span>
              {data.kpi ? (
                <Fact {...data.kpi.burn} sourcePath={pathFor(data.kpi.burn.sourceRefId)} note={data.kpi.burn.fxNote} cite={citeFor(data, data.kpi.burn.sourceRefId)} />
              ) : (
                <span className="chip unfact">—</span>
              )}
            </span>
          </div>
          <div className="metric-row">
            <span className="muted">Runway (3-mo burn)</span>
            <span>
              {data.kpi ? <Fact {...data.kpi.runway} sourcePath={pathFor(data.kpi.runway.sourceRefId)} cite={citeFor(data, data.kpi.runway.sourceRefId)} /> : <span className="chip unfact">—</span>}
            </span>
          </div>
          <div className="metric-row">
            <span className="muted">Net revenue</span>
            <span>
              {revenueDual ? (
                <Fact
                  display={revenueDual.display}
                  isFact={revenueDual.isFact}
                  sourcePath={pathFor(revenue?.sourceRefId)}
                  note={revenueDual.fxNote}
                  cite={citeFor(data, revenue?.sourceRefId)}
                />
              ) : (
                <span className="chip unfact">—</span>
              )}
            </span>
          </div>
        </Panel>
        <Panel title="Partner view" kicker="Subjective" className="lane-sub-panel" actions={<span className="lane-chip sub">Judgement</span>}>
          {latestSubjective ? (
            <div className="lane-sub" style={{ margin: 0 }}>
              <p style={{ margin: "0 0 8px" }}>{latestSubjective.body}</p>
              <p className="lede" style={{ margin: 0 }}>
                Author {latestSubjective.createdBy ? `${latestSubjective.createdBy.slice(0, 8)}…` : "—"} ·{" "}
                {latestSubjective.createdAt
                  ? new Date(latestSubjective.createdAt).toLocaleDateString()
                  : latestSubjective.periodEnd}
              </p>
            </div>
          ) : (
            <p className="lede" style={{ margin: 0 }}>
              Add partner notes on the company page to see them here.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <Panel title="Evidence trail" kicker="Provenance">
          {evidence.length === 0 ? (
            <p className="lede" style={{ margin: 0 }}>
              Upload documents to build your evidence trail.
            </p>
          ) : (
            <div className="table-scroll table-scroll--compact">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Cite</th>
                </tr>
              </thead>
              <tbody>
                {evidence.map((e) => (
                  <tr key={e.id}>
                    <td>{e.source}</td>
                    <td className="lede">{e.kind}</td>
                    <td className="lede">{e.date}</td>
                    <td>
                      <button
                        type="button"
                        className="cite"
                        onClick={() =>
                          openCite({
                            display: e.source,
                            filename: e.source,
                            sourcePath: `/api/documents/${e.documentId}/file`,
                            locator: e.locator,
                            excerpt: e.excerpt,
                            periodStart: e.periodStart,
                            periodEnd: e.periodEnd,
                            confirmedBy: e.confirmedBy,
                            confirmedAt: e.confirmedAt,
                          })
                        }
                      >
                        {e.cite}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Panel>
        <Panel title="Required documentation" kicker="Coverage">
          <ul className="doc-req">
            {required.map((r) => (
              <li key={r.key} className="doc-row">
                <span>{r.label}</span>
                <span className={`cover-pill ${r.state}`}>{r.statusLabel}</span>
              </li>
            ))}
          </ul>
          <p className="lede" style={{ fontSize: 12, margin: "12px 0 0" }}>
            Only kinds this book stores: MIS, board pack, transcript. Stale is MIS older than 45 days.
          </p>
        </Panel>
      </div>

      <Panel title="Positions">
      <p className="lede">
        Booked positions only. Affinity writes ownership only after a mapped numeric field id and a successful sync.
      </p>
      {!data.positions?.length ? (
        <div className="empty">Add a fund in Settings, then onboard a company with that fund attached.</div>
      ) : (
        <div className="table-scroll table-scroll--compact">
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
                    ? "—"
                    : `${p.costBasis.toLocaleString("en-IN")} ${p.costCurrency}`}
                </td>
                <td>{p.investedAt ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      </Panel>

      <Panel title="Book">
      <label className="lede">
        <input type="checkbox" checked={currentOnly} onChange={(e) => setCurrentOnly(e.target.checked)} /> Current
        version only (highest version per metric+period)
      </label>
      {data.metrics.length === 0 ? (
        <div className="empty">
          Upload MIS and <Link href="/inbox">confirm in Inbox</Link> to populate the book.
        </div>
      ) : (
        <div className="table-scroll">
        <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                  <th>Period</th>
                  <th className="hide-sm">Locator</th>
                  <th className="hide-sm">Lane</th>
                  <th className="hide-sm">Ver.</th>
                  <th className="hide-sm">Confirmed</th>
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
                      <td>{m.metricKey}</td>
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
                      <td className="hide-sm lede">
                        {loc?.sheet} {loc?.cell}
                        {ref?.excerpt ? ` · ${ref.excerpt}` : ""}
                      </td>
                      <td className="hide-sm">{m.lane}</td>
                      <td className="hide-sm">{m.version}</td>
                      <td className="hide-sm lede">
                        {m.confirmedAt ? new Date(m.confirmedAt).toLocaleDateString() : "—"}
                        {m.confirmedBy ? ` · ${m.confirmedBy.slice(0, 8)}` : ""}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        </div>
      )}
      </Panel>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="lane-obj">
          <h3>Objective <span className="lane-chip obj">MIS</span></h3>
          {data.commentary.filter((n) => n.lane === "objective").map((n) => (
            <p key={n.id}>
              <span className="lede">{n.periodEnd} · objective</span>
              <br />
              {n.body}
            </p>
          ))}
          {data.commentary.filter((n) => n.lane === "objective").length === 0 && <p className="lede">—</p>}
        </div>
        <div className="lane-sub">
          <h3>Subjective <span className="lane-chip sub">calls / judgement</span></h3>
          {data.commentary.filter((n) => n.lane === "subjective").map((n) => (
            <p key={n.id}>
              <span className="lede">{n.periodEnd} · subjective</span>
              <br />
              {n.body}
            </p>
          ))}
          {data.commentary.filter((n) => n.lane === "subjective").length === 0 && <p className="lede">—</p>}
        </div>
      </div>

      {canWrite && (
      <form id="add-note" onSubmit={addNote} style={{ marginTop: 16 }} className="field">
        <label className="field">
          Add commentary in the lane you choose. Subjective notes are partner judgement; objective notes stay tied to
          booked facts. Period defaults to the latest booked period.
          <select value={lane} onChange={(e) => setLane(e.target.value as "objective" | "subjective")}>
            <option value="objective">Objective</option>
            <option value="subjective">Subjective</option>
          </select>
        </label>
        <div className="row company-note-dates">
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
        <button className="btn sm" type="submit">
          Save note
        </button>
      </form>
      )}

      <Panel title="Flags">
      <ul>
        {data.flags.map((f) => (
          <li key={f.id} className={`sev-${f.severity}`}>
            <Link href="/flags">{flagLabel(f.flagKey)}</Link> · {f.severity}
            {evidenceLine(f.evidence) && <div className="lede">{evidenceLine(f.evidence)}</div>}
          </li>
        ))}
        {data.flags.length === 0 && <li className="lede">All clear — no flags on this company.</li>}
      </ul>
      </Panel>

      <Panel title="Vault">
      <p className="lede">Upload XLSX, XLS, CSV, or PDF for now.</p>
      <label className="field" style={{ maxWidth: 220 }}>
        Kind
        <select value={vaultKind} onChange={(e) => setVaultKind(e.target.value)} aria-label="Vault kind">
          <option value="">All kinds</option>
          {[...new Set(data.documents.map((d) => d.kind))].map((k) => (
            <option key={k} value={k}>
              {k.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <ul>
        {data.documents
          .filter((d) => !vaultKind || d.kind === vaultKind)
          .map((d) => (
          <li key={d.id}>
            <button type="button" className="chip" onClick={() => downloadAuthed(`/api/documents/${d.id}/file`, d.filename)}>
              {d.filename}
            </button>{" "}
            · {d.kind}
            {d.periodEnd ? ` · period ${d.periodEnd}` : ""}
            {d.createdAt ? ` · ${new Date(d.createdAt).toLocaleString()}` : ""}
            {d.sha256 ? ` · sha ${d.sha256.slice(0, 10)}` : ""}
          </li>
        ))}
      </ul>
      {canWrite && <Upload companyId={id} onDone={load} />}
      </Panel>
    </Shell>
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
      setMsg(`Parse ${st}${r?.parse?.error ? ` — ${r.parse.error}` : ""}. Confirm extracts in Inbox.`);
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
          ? "This file matches one already in the vault. Extract is queued — review it in Inbox."
          : "Queued. Confirm extracts in Inbox when ready.",
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
    <form onSubmit={send} className="row company-upload-form" style={{ marginTop: 8 }}>
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
        {busy ? "Uploading…" : "Upload to vault"}
      </button>
      {msg && (
        <span className="lede">
          {msg} <Link href="/inbox">Open Inbox</Link>
        </span>
      )}
    </form>
  );
}