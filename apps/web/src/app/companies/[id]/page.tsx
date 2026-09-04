"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Fact, Shell, useBookSession } from "@/components/Shell";
import { api, downloadAuthed, sourcePathFor } from "@/lib/api";

type Data = {
  company: {
    id: string;
    name: string;
    stage: string | null;
    sector: string | null;
    country: string | null;
    fyStartMonth?: number | null;
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
  }[];
  commentary: { id: string; lane: string; body: string; periodEnd: string }[];
  documents: { id: string; filename: string; kind: string }[];
  flags: { id: string; flagKey: string; severity: string; evidence: unknown }[];
  sourceRefs: { id: string; documentId: string; excerpt: string | null; locator?: { sheet?: string; cell?: string } }[];
  kpi?: {
    cash: { display: string; isFact: boolean; fxNote?: string | null; sourceRefId?: string | null };
    burn: { display: string; isFact: boolean; fxNote?: string | null; sourceRefId?: string | null };
    runway: { display: string; isFact: boolean; sourceRefId?: string | null };
  };
};

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const { canWrite } = useBookSession();
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [lane, setLane] = useState<"objective" | "subjective">("objective");
  const [currentOnly, setCurrentOnly] = useState(true);
  const [body, setBody] = useState("");
  const last = data?.metrics[0];
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  function load() {
    api<Data>(`/api/companies/${id}`)
      .then((d) => {
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
      .catch((e: Error) => setErr(e.message));
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
        <p className="sev-high">{err}</p>
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell>
        <p className="lede">Loading company…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1>{data.company.name}</h1>
      <p className="lede">
        {data.company.sector ?? "—"} · {data.company.stage ?? "—"} · {data.company.country ?? "—"} · FY start month{" "}
        {data.company.fyStartMonth ?? 4} ({data.company.fyStartMonth === 4 || data.company.fyStartMonth == null ? "Apr–Mar" : "custom"})
      </p>
      <p className="lede">
        <Link href="/compare">Compare</Link> · <Link href="/ask">Ask</Link> · <Link href="/inbox">Inbox</Link> ·{" "}
        <Link href="/flags">Flags</Link>
      </p>

      {data.kpi && (
        <div className="cards">
          <div className="card">
            <div className="k">Cash</div>
            <div className="v">
              <Fact {...data.kpi.cash} sourcePath={pathFor(data.kpi.cash.sourceRefId)} note={data.kpi.cash.fxNote} />
            </div>
          </div>
          <div className="card">
            <div className="k">Burn</div>
            <div className="v">
              <Fact {...data.kpi.burn} sourcePath={pathFor(data.kpi.burn.sourceRefId)} note={data.kpi.burn.fxNote} />
            </div>
          </div>
          <div className="card">
            <div className="k">Runway (3-mo burn)</div>
            <div className="v">
              <Fact {...data.kpi.runway} sourcePath={pathFor(data.kpi.runway.sourceRefId)} />
            </div>
          </div>
        </div>
      )}

      <h2>Book</h2>
      <label className="lede">
        <input type="checkbox" checked={currentOnly} onChange={(e) => setCurrentOnly(e.target.checked)} /> Current
        version only (highest version per metric+period)
      </label>
      {data.metrics.length === 0 ? (
        <div className="empty">No confirmed facts. Upload MIS and confirm Inbox.</div>
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
            </tr>
          </thead>
          <tbody>
            {bookRows.map((m) => {
              const ref = data.sourceRefs.find((r) => r.id === m.sourceRefId);
              const loc = ref?.locator;
              return (
                <tr key={m.id}>
                  <td>{m.metricKey}</td>
                  <td>
                    <Fact
                      display={m.valueNumeric == null ? "—" : `${m.valueNumeric} ${m.unit} ${m.currency}`}
                      isFact={Boolean(m.sourceRefId && m.valueNumeric != null)}
                      sourcePath={ref ? `/api/documents/${ref.documentId}/file` : undefined}
                      note={
                        m.fxRate && m.fxDate && m.fxSource
                          ? `${m.valueEur == null ? "—" : `EUR ${m.valueEur}`} @ ${m.fxRate} on ${m.fxDate} (${m.fxSource})`
                          : m.valueNumeric == null
                            ? null
                            : "EUR — (no FX triple)"
                      }
                    />
                  </td>
                  <td>{m.periodEnd}</td>
                  <td className="lede">
                    {loc?.sheet} {loc?.cell}
                    {ref?.excerpt ? ` · ${ref.excerpt}` : ""}
                  </td>
                  <td>{m.lane}</td>
                  <td>{m.version}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="grid-2" style={{ marginTop: 24 }}>
        <div className="lane-obj">
          <h3>Objective (MIS)</h3>
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
          <h3>Subjective (calls / judgement)</h3>
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
      <form onSubmit={addNote} style={{ marginTop: 16 }} className="field">
        <label className="field">
          Add commentary (stored in the selected lane only). Subjective notes here are human judgement — MIS extracts
          cannot be confirmed as subjective. Period defaults to the latest booked period, not a hardcoded month.
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
        <button className="btn sm" type="submit">
          Save note
        </button>
      </form>
      )}

      <h2>Flags</h2>
      <ul>
        {data.flags.map((f) => (
          <li key={f.id} className={`sev-${f.severity}`}>
            <Link href="/flags">{f.flagKey.replaceAll("_", " ")}</Link> · {f.severity}
          </li>
        ))}
        {data.flags.length === 0 && <li className="lede">No open flags.</li>}
      </ul>

      <h2>Vault</h2>
      <ul>
        {data.documents.map((d) => (
          <li key={d.id}>
            <button type="button" className="chip" onClick={() => downloadAuthed(`/api/documents/${d.id}/file`, d.filename)}>
              {d.filename}
            </button>{" "}
            · {d.kind}
          </li>
        ))}
      </ul>
      {canWrite && <Upload companyId={id} onDone={load} />}
    </Shell>
  );
}

function Upload({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData(e.currentTarget);
      const res = await api<{ duplicateOf?: string | null }>(`/api/companies/${companyId}/documents`, {
        method: "POST",
        body: fd,
      });
      setMsg(
        res.duplicateOf
          ? "Same SHA as a vault file already stored. Extract queued — confirm Inbox; do not treat as a new source."
          : "Queued. Confirm extracts in Inbox — nothing auto-posts.",
      );
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
        {busy ? "Uploading…" : "Upload to vault"}
      </button>
      {msg && <span className="lede">{msg}</span>}
    </form>
  );
}
