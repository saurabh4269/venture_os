"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FLAG_CATALOG } from "@venture-os/core";
import { PageHead } from "@/components/BookUI";
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

function sevClass(severity: string) {
  if (severity === "high") return "urgent";
  if (severity === "med") return "warning";
  return "info";
}

export default function FlagsPage() {
  const { canWrite } = useBookSession();
  const [status, setStatus] = useState<(typeof TABS)[number]>("open");
  const [severity, setSeverity] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [flagKey, setFlagKey] = useState("");
  const [data, setData] = useState<FlagPayload>({ flags: [], sourceRefs: [] });
  const [openId, setOpenId] = useState<string | null>(null);
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
      <PageHead
        title="Flags"
        testId="flags-ready"
        lede="Evidence queue · open items require a cite. Catalog detectors only — missing inputs do not fire a flag."
        actions={
          canWrite ? (
            <button className="btn ghost" onClick={recompute} disabled={busy}>
              {busy ? "Recomputing…" : "Recompute"}
            </button>
          ) : undefined
        }
      />
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      <div className="tabs filter-pills" aria-label="Status">
        {TABS.map((s) => (
          <button key={s} type="button" className={`filter-pill${s === status ? " on" : ""}`} onClick={() => setStatus(s)}>
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
        <span className="page-kicker" style={{ margin: 0 }}>
          {data.flags.length} {data.flags.length === 1 ? "item" : "items"}
        </span>
      </div>
      {data.flags.length === 0 ? (
        <div className="empty">
          <strong>{status === "open" ? "No open flags" : `No ${status} flags`}</strong>
          {status === "open"
            ? "Either the book is quiet, or headlines are still unconfirmed."
            : `Nothing in ${status}.`}
        </div>
      ) : (
        <div className="triage">
          <div className="triage-row" style={{ background: "transparent", boxShadow: "none", border: 0, padding: "0 14px" }}>
            <div className="page-kicker">Severity</div>
            <div className="page-kicker">Company</div>
            <div className="page-kicker">Reason</div>
            <div className="page-kicker hide-sm">Cite</div>
            <div className="page-kicker hide-sm">Status</div>
            <div className="page-kicker">Actions</div>
          </div>
          {data.flags.map((f) => {
            const cites = f.sourceRefIds ?? [];
            return (
              <article className="triage-row" key={f.id}>
                <div>
                  <span className={`sev-pill ${sevClass(f.severity)}`}>{f.severity}</span>
                </div>
                <div>
                  {f.companyId ? (
                    <Link className="look-title company-link" href={`/companies/${f.companyId}`}>
                      {f.companyName ?? "—"}
                    </Link>
                  ) : (
                    <span className="look-title">{f.companyName ?? "—"}</span>
                  )}
                </div>
                <div>
                  <button type="button" className="look-title" style={{ background: "none", border: 0, padding: 0, textAlign: "left" }} onClick={() => setOpenId(openId === f.id ? null : f.id)}>
                    {flagLabel(f.flagKey)}
                  </button>
                  {openId === f.id && (
                    <div className="look-copy" style={{ marginTop: 8 }}>
                      {evidenceLine(f.evidence ?? {}) || "No evidence fields on this row."}
                      {f.note ? <div>Note: {f.note}</div> : null}
                      {f.snoozedUntil ? <div>Until {new Date(f.snoozedUntil).toLocaleDateString()}</div> : null}
                      {f.detectedAt ? <div>Detected {new Date(f.detectedAt).toLocaleString()}</div> : null}
                      <p className="lede" style={{ marginTop: 6 }}>
                        No generated analysis. Subjective takes are not invented from a detector.
                      </p>
                    </div>
                  )}
                </div>
                <div className="hide-sm">
                  {cites.length === 0 ? (
                    <span className="lede">—</span>
                  ) : (
                    <div className="row">
                      {cites.map((id) => (
                        <Fact key={id} display="source" isFact sourcePath={sourcePathFor(data.sourceRefs, id)} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="hide-sm">
                  <span className="badge">{status}</span>
                </div>
                <div className="row">
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
                  {f.companyId && (
                    <Link className="lede" href={`/compare?companyIds=${f.companyId}`}>
                      Compare
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
