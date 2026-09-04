"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FLAG_CATALOG } from "@venture-os/core";
import { Fact, Shell, useBookSession } from "@/components/Shell";
import { api, sourcePathFor } from "@/lib/api";

function flagLabel(key: string) {
  return FLAG_CATALOG.find((c) => c.key === key)?.label ?? key.replaceAll("_", " ");
}

type Flag = {
  id: string;
  flagKey: string;
  severity: string;
  companyId?: string;
  companyName?: string;
  evidence: Record<string, unknown>;
  status?: string;
  sourceRefIds?: string[] | null;
  note?: string | null;
  snoozedUntil?: string | null;
  detectedAt?: string | null;
};

type FlagPayload = {
  flags: Flag[];
  companies?: { id: string; name: string }[];
  catalog?: { key: string; label: string }[];
  sourceRefs: { id: string; documentId: string }[];
};

const TABS = ["open", "snoozed", "muted"] as const;

function evidenceLine(ev: Record<string, unknown>) {
  return Object.entries(ev)
    .filter(([k]) => k !== "sourceRefIds")
    .map(([k, v]) => `${k.replaceAll("_", " ")}: ${v == null ? "—" : String(v)}`)
    .join(" · ");
}

export default function FlagsPage() {
  const { canWrite } = useBookSession();
  const [status, setStatus] = useState<(typeof TABS)[number]>("open");
  const [severity, setSeverity] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [flagKey, setFlagKey] = useState("");
  const [data, setData] = useState<FlagPayload>({ flags: [], sourceRefs: [] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function load(next = status) {
    const p = new URLSearchParams({ status: next });
    if (severity) p.set("severity", severity);
    if (companyId) p.set("companyId", companyId);
    if (flagKey) p.set("flagKey", flagKey);
    api<FlagPayload>(`/api/flags?${p.toString()}`)
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }
  useEffect(() => {
    load();
  }, [status, severity, companyId, flagKey]);

  async function recompute() {
    setBusy(true);
    setErr("");
    try {
      await api("/api/flags/refresh", { method: "POST", body: "{}" });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Recompute failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 data-testid="flags-ready">Flags</h1>
          <p className="lede">
            Catalog detectors only. Each row carries evidence. Missing inputs do not fire a flag. Mute and snooze
            survive recompute. Unmute returns a row to open. Thresholds come from Settings → Flag policy (firm).
            Recompute after a save — we do not invent a silent rerun.
          </p>
        </div>
        {canWrite && (
          <button className="btn ghost" onClick={recompute} disabled={busy}>
            {busy ? "Recomputing…" : "Recompute"}
          </button>
        )}
      </div>
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      <div className="row" style={{ margin: "12px 0" }}>
        {TABS.map((s) => (
          <button
            key={s}
            type="button"
            className={s === status ? "btn sm" : "btn ghost sm"}
            onClick={() => setStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Severity">
          <option value="">All severities</option>
          <option value="high">high</option>
          <option value="med">med</option>
          <option value="low">low</option>
        </select>
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} aria-label="Company">
          <option value="">All companies</option>
          {(data.companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={flagKey} onChange={(e) => setFlagKey(e.target.value)} aria-label="Flag">
          <option value="">All flags</option>
          {(data.catalog ?? FLAG_CATALOG).map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      {data.flags.length === 0 ? (
        <div className="empty">
          {status === "open"
            ? "No open flags for this filter — either the book is quiet, or headlines are still unconfirmed."
            : `No ${status} flags.`}
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Flag</th>
              <th>Severity</th>
              <th>Detected</th>
              <th>Evidence</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.flags.map((f) => (
              <tr key={f.id}>
                <td>
                  {f.companyId ? (
                    <>
                      <Link href={`/companies/${f.companyId}`}>{f.companyName ?? "—"}</Link>
                      <div>
                        <Link className="lede" href={`/compare?companyIds=${f.companyId}`}>
                          Compare
                        </Link>
                      </div>
                    </>
                  ) : (
                    (f.companyName ?? "—")
                  )}
                </td>
                <td>{flagLabel(f.flagKey)}</td>
                <td className={`sev-${f.severity}`}>{f.severity}</td>
                <td className="lede">{f.detectedAt ? new Date(f.detectedAt).toLocaleString() : "—"}</td>
                <td className="lede">
                  {evidenceLine(f.evidence ?? {})}
                  <div className="row" style={{ marginTop: 4 }}>
                    {(f.sourceRefIds ?? []).map((id) => (
                      <Fact
                        key={id}
                        display="source"
                        isFact
                        sourcePath={sourcePathFor(data.sourceRefs, id)}
                      />
                    ))}
                  </div>
                  {f.note && <div>Note: {f.note}</div>}
                  {f.snoozedUntil && <div>Until {new Date(f.snoozedUntil).toLocaleDateString()}</div>}
                </td>
                <td className="row">
                  {canWrite && status === "open" && (
                    <>
                      <button
                        className="btn ghost sm"
                        type="button"
                        onClick={() =>
                          api(`/api/flags/${f.id}/snooze`, {
                            method: "POST",
                            body: JSON.stringify({ until: new Date(Date.now() + 14 * 86400000).toISOString() }),
                          }).then(() => load())
                        }
                      >
                        Snooze 14d
                      </button>
                      <button
                        className="btn ghost sm"
                        type="button"
                        onClick={() => api(`/api/flags/${f.id}/mute`, { method: "POST", body: "{}" }).then(() => load())}
                      >
                        Mute
                      </button>
                    </>
                  )}
                  {canWrite && status !== "open" && (
                    <button
                      className="btn ghost sm"
                      type="button"
                      onClick={() => api(`/api/flags/${f.id}/unmute`, { method: "POST", body: "{}" }).then(() => load())}
                    >
                      Unmute / reopen
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}