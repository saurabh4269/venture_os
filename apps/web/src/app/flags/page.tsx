"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FLAG_CATALOG } from "@venture-os/core";
import { PageHead, Panel } from "@/components/BookUI";
import { Fact, Shell, useBookSession } from "@/components/Shell";
import { api, sourcePathFor } from "@/lib/api";
import { bookErrorMessage } from "@/lib/wake";

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

type Commentary = { id: string; lane: string; body: string; periodEnd: string; createdAt?: string };

const TABS = ["open", "snoozed", "muted"] as const;

function evidenceEntries(ev: Record<string, unknown>) {
  return Object.entries(ev).filter(([k]) => k !== "sourceRefIds");
}

function sevClass(severity: string) {
  if (severity === "high") return "urgent";
  if (severity === "med") return "warning";
  return "info";
}

function exportFlags(rows: Flag[], status: string) {
  const header = ["Severity", "Company", "Reason", "Status", "Detected"];
  const lines = [
    header.join(","),
    ...rows.map((f) =>
      [f.severity, `"${f.companyName ?? ""}"`, `"${flagLabel(f.flagKey)}"`, status, f.detectedAt ?? ""].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "flags.csv";
  a.click();
}

export default function FlagsPage() {
  const { canWrite } = useBookSession();
  const [status, setStatus] = useState<(typeof TABS)[number]>("open");
  const [severity, setSeverity] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [flagKey, setFlagKey] = useState("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<FlagPayload>({ flags: [], sourceRefs: [] });
  const [openId, setOpenId] = useState<string | null>(null);
  const [take, setTake] = useState<Commentary | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function load(next = status) {
    const p = new URLSearchParams({ status: next });
    if (severity) p.set("severity", severity);
    if (companyId) p.set("companyId", companyId);
    if (flagKey) p.set("flagKey", flagKey);
    api<FlagPayload>(`/api/flags?${p.toString()}`)
      .then((nextData) => {
        setData(nextData);
        setOpenId((cur) => {
          if (cur && nextData.flags.some((f) => f.id === cur)) return cur;
          return nextData.flags[0]?.id ?? null;
        });
      })
      .catch((e: Error) => setErr(bookErrorMessage(e.message)));
  }
  useEffect(() => {
    load();
  }, [status, severity, companyId, flagKey]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return data.flags;
    return data.flags.filter((f) => {
      const hay = `${f.companyName ?? ""} ${flagLabel(f.flagKey)} ${f.flagKey}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [data.flags, q]);

  const selected = visible.find((f) => f.id === openId) ?? null;

  useEffect(() => {
    if (!selected?.companyId) {
      setTake(null);
      return;
    }
    let cancelled = false;
    api<{ commentary: Commentary[] }>(`/api/companies/${selected.companyId}`)
      .then((r) => {
        if (cancelled) return;
        const latest = [...(r.commentary ?? [])]
          .filter((n) => n.lane === "subjective" && n.body.trim())
          .sort((a, b) => String(b.createdAt ?? b.periodEnd).localeCompare(String(a.createdAt ?? a.periodEnd)))[0];
        setTake(latest ?? null);
      })
      .catch(() => {
        if (!cancelled) setTake(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.companyId]);

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

  function snooze(id: string) {
    return api(`/api/flags/${id}/snooze`, {
      method: "POST",
      body: JSON.stringify({ until: new Date(Date.now() + 14 * 86400000).toISOString() }),
    }).then(() => load());
  }

  function mute(id: string) {
    return api(`/api/flags/${id}/mute`, { method: "POST", body: "{}" }).then(() => load());
  }

  return (
    <Shell>
      <div className="page-toolbar">
        <label className="sr-only" htmlFor="flag-search">
          Search flags
        </label>
        <input
          id="flag-search"
          className="look-search"
          placeholder="Search companies, flags, citations…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="toolbar-actions">
          {visible.length > 0 && (
            <button type="button" className="btn ghost sm" onClick={() => exportFlags(visible, status)}>
              Export
            </button>
          )}
          {canWrite ? (
            <button className="btn ghost sm" onClick={recompute} disabled={busy}>
              {busy ? "Recomputing…" : "Recompute"}
            </button>
          ) : null}
        </div>
      </div>
      <PageHead
        title="Flags"
        testId="flags-ready"
        lede="Evidence queue for your portfolio. Each flag links to the source that triggered it."
      />
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      <div className="filter-bar">
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Severity">
          <option value="">Severity</option>
          <option value="high">high</option>
          <option value="med">med</option>
          <option value="low">low</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as (typeof TABS)[number])}
          aria-label="Status"
        >
          {TABS.map((s) => (
            <option key={s} value={s}>
              Status: {s}
            </option>
          ))}
        </select>
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} aria-label="Company">
          <option value="">Company</option>
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
        <span className="queue-count push">
          {visible.length} {visible.length === 1 ? "item" : "items"}
        </span>
      </div>
      {data.flags.length === 0 ? (
        <div className="empty">
          <strong>{status === "open" ? "No open flags" : `No ${status} flags`}</strong>
          {status === "open"
            ? "Either the book is quiet, or headlines are still unconfirmed."
            : `Nothing in ${status}.`}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">No flags match this search.</div>
      ) : (
        <div className="flags-split">
          <Panel flush>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Company</th>
                    <th>Reason</th>
                    <th className="hide-sm">Cite</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((f) => {
                    const cites = f.sourceRefIds ?? [];
                    return (
                      <tr
                        key={f.id}
                        className={openId === f.id ? "is-on" : undefined}
                        data-testid="flags-row"
                        onClick={() => setOpenId(f.id)}
                      >
                        <td>
                          <span className={`sev-dot ${sevClass(f.severity)}`}>
                            <i />
                            {f.severity}
                          </span>
                        </td>
                        <td>
                          {f.companyId ? (
                            <Link className="company-link" href={`/companies/${f.companyId}`} onClick={(e) => e.stopPropagation()}>
                              {f.companyName ?? "—"}
                            </Link>
                          ) : (
                            f.companyName ?? "—"
                          )}
                        </td>
                        <td>{flagLabel(f.flagKey)}</td>
                        <td className="hide-sm">
                          {cites.length === 0 ? (
                            <span className="lede">—</span>
                          ) : (
                            <div className="row" onClick={(e) => e.stopPropagation()}>
                              {cites.map((id) => (
                                <Fact key={id} display="Cite" isFact sourcePath={sourcePathFor(data.sourceRefs, id)} />
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge">{status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel
            className="flag-detail"
            kicker={
              selected ? (
                <span className={`flag-kicker ${sevClass(selected.severity)}`}>
                  {selected.severity} flag
                </span>
              ) : (
                "Evidence"
              )
            }
            title={selected ? (selected.companyName ?? "—") : "Inspect a row"}
          >
            <div data-testid="flags-detail">
              {!selected ? (
                <p className="lede">Select a row to inspect detector evidence. Nothing here is generated commentary.</p>
              ) : (
                <>
                  <p className="look-title">{flagLabel(selected.flagKey)}</p>
                  <p className="lede" style={{ marginTop: 6 }}>
                    {selected.detectedAt
                      ? `Detected ${new Date(selected.detectedAt).toLocaleString()}`
                      : "Detected time —"}
                  </p>
                  {canWrite && (
                    <div className="flag-actions">
                      {status === "open" ? (
                        <>
                          <button className="btn" type="button" onClick={() => snooze(selected.id)}>
                            Snooze 14d
                          </button>
                          <button className="btn ghost" type="button" onClick={() => mute(selected.id)}>
                            Mute
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => api(`/api/flags/${selected.id}/unmute`, { method: "POST", body: "{}" }).then(() => load())}
                        >
                          Unmute / reopen
                        </button>
                      )}
                    </div>
                  )}
                  <p className="analysis-kicker">Evidence</p>
                  <div className="lane-obj">
                    <div className="page-kicker">Objective fact</div>
                    {evidenceEntries(selected.evidence ?? {}).length === 0 ? (
                      <p className="lede">No evidence fields on this row.</p>
                    ) : (
                      evidenceEntries(selected.evidence ?? {}).map(([k, v]) => (
                        <div className="metric-row" key={k}>
                          <span>{k.replaceAll("_", " ")}</span>
                          <strong className="num">{v == null ? "—" : String(v)}</strong>
                        </div>
                      ))
                    )}
                    {(selected.sourceRefIds ?? []).length > 0 && (
                      <div className="row" style={{ marginTop: 10 }}>
                        {(selected.sourceRefIds ?? []).map((id) => (
                          <Fact key={id} display="Cite" isFact sourcePath={sourcePathFor(data.sourceRefs, id)} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="lane-sub" style={{ marginTop: 10 }}>
                    <div className="page-kicker">Subjective take</div>
                    {take ? (
                      <p>{take.body}</p>
                    ) : (
                      <p className="lede">No partner commentary on the book yet for this flag.</p>
                    )}
                  </div>
                  {selected.note ? (
                    <p className="lede" style={{ marginTop: 12 }}>
                      Note: {selected.note}
                    </p>
                  ) : null}
                  {selected.snoozedUntil ? (
                    <p className="lede">Until {new Date(selected.snoozedUntil).toLocaleDateString()}</p>
                  ) : null}
                  {selected.companyId && (
                    <p style={{ marginTop: 12 }}>
                      <Link className="lede" href={`/compare?companyIds=${selected.companyId}`}>
                        Compare
                      </Link>
                    </p>
                  )}
                </>
              )}
            </div>
          </Panel>
        </div>
      )}
    </Shell>
  );
}
