"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Fact, Shell } from "@/components/Shell";
import { api, apiUrl } from "@/lib/api";

type Data = {
  company: { id: string; name: string; stage: string | null; sector: string | null; country: string | null };
  metrics: {
    id: string;
    metricKey: string;
    valueNumeric: number | null;
    unit: string;
    currency: string;
    periodEnd: string;
    sourceRefId: string;
    version: number;
    lane: string;
  }[];
  commentary: { id: string; lane: string; body: string; periodEnd: string }[];
  documents: { id: string; filename: string; kind: string }[];
  flags: { id: string; flagKey: string; severity: string; evidence: unknown }[];
  sourceRefs: { id: string; documentId: string; excerpt: string | null }[];
};

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [lane, setLane] = useState<"objective" | "subjective">("subjective");
  const [body, setBody] = useState("");

  function load() {
    api<Data>(`/api/companies/${id}`).then(setData);
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
        periodStart: "2025-08-01",
        periodEnd: "2025-08-31",
        lane,
        body,
      }),
    });
    setBody("");
    load();
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
        {data.company.sector ?? "—"} · {data.company.stage ?? "—"} · {data.company.country ?? "—"} · FY Apr–Mar unless
        overridden
      </p>

      <h2>Book</h2>
      {data.metrics.length === 0 ? (
        <div className="empty">No confirmed facts. Upload MIS and confirm Inbox.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Period</th>
              <th>Lane</th>
              <th>Ver.</th>
            </tr>
          </thead>
          <tbody>
            {data.metrics.map((m) => {
              const ref = data.sourceRefs.find((r) => r.id === m.sourceRefId);
              return (
                <tr key={m.id}>
                  <td>{m.metricKey}</td>
                  <td>
                    <Fact
                      display={
                        m.valueNumeric == null ? "—" : `${m.valueNumeric} ${m.unit} ${m.currency}`
                      }
                      isFact={Boolean(m.sourceRefId && m.valueNumeric != null)}
                      href={ref ? apiUrl(`/api/documents/${ref.documentId}/file`) : undefined}
                    />
                  </td>
                  <td>{m.periodEnd}</td>
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
            <p key={n.id}>{n.body}</p>
          ))}
          {data.commentary.filter((n) => n.lane === "objective").length === 0 && <p className="lede">—</p>}
        </div>
        <div className="lane-sub">
          <h3>Subjective (calls / judgement)</h3>
          {data.commentary.filter((n) => n.lane === "subjective").map((n) => (
            <p key={n.id}>{n.body}</p>
          ))}
          {data.commentary.filter((n) => n.lane === "subjective").length === 0 && <p className="lede">—</p>}
        </div>
      </div>

      <form onSubmit={addNote} style={{ marginTop: 16 }} className="field">
        <label className="field">
          Add commentary (stored in the selected lane only)
          <select value={lane} onChange={(e) => setLane(e.target.value as "objective" | "subjective")}>
            <option value="objective">Objective</option>
            <option value="subjective">Subjective</option>
          </select>
        </label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={3} />
        <button className="btn sm" type="submit">
          Save note
        </button>
      </form>

      <h2>Flags</h2>
      <ul>
        {data.flags.map((f) => (
          <li key={f.id} className={`sev-${f.severity}`}>
            {f.flagKey} · {f.severity}
          </li>
        ))}
        {data.flags.length === 0 && <li className="lede">No open flags.</li>}
      </ul>

      <h2>Vault</h2>
      <ul>
        {data.documents.map((d) => (
          <li key={d.id}>
            <a href={apiUrl(`/api/documents/${d.id}/file`)}>{d.filename}</a> · {d.kind}
          </li>
        ))}
      </ul>
      <Upload companyId={id} onDone={load} />
    </Shell>
  );
}

function Upload({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api(`/api/companies/${companyId}/documents`, { method: "POST", body: fd });
    onDone();
  }
  return (
    <form onSubmit={send} className="row" style={{ marginTop: 8 }}>
      <input type="hidden" name="kind" value="mis" />
      <input type="file" name="file" required accept=".xlsx,.xls,.csv,.pdf" />
      <button className="btn sm" type="submit">
        Upload to vault
      </button>
    </form>
  );
}
