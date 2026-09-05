"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHead } from "@/components/BookUI";
import { useCite } from "@/components/Cite";
import { Shell, useBookSession } from "@/components/Shell";
import { api } from "@/lib/api";
import { bookErrorMessage } from "@/lib/wake";

type Item = {
  id: string;
  kind: string;
  status: string;
  confidence: number;
  companyName: string | null;
  createdAt?: string | null;
  proposed: {
    metricKey?: string;
    valueNumeric?: number | null;
    unit?: string;
    currency?: string;
    periodStart?: string;
    periodEnd?: string;
    excerpt?: string;
    label?: string;
  };
  locator: { sheet?: string; cell?: string; page?: number; excerpt?: string };
};

const STATUSES = ["pending", "confirmed", "edited", "rejected"] as const;
type KindFilter = "all" | "flags" | "docs" | "mentions";

function severityOf(item: Item): "urgent" | "warning" | "info" {
  if (item.kind === "unit_ambiguity" || item.proposed.unit === "unknown") return "urgent";
  if (item.confidence < 0.5) return "warning";
  return "info";
}

function relTime(iso?: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60_000))}m`;
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function InboxPage() {
  const { canWrite, ready: sessionReady } = useBookSession();
  const openCite = useCite();
  const [items, setItems] = useState<Item[]>([]);
  const [periodEdits, setPeriodEdits] = useState<Record<string, { start: string; end: string }>>({});
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [unitEdits, setUnitEdits] = useState<Record<string, string>>({});
  const [valueEdits, setValueEdits] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [listReady, setListReady] = useState(false);

  function load(next = status) {
    return api<{ items: Item[] }>(`/api/inbox?status=${next}`)
      .then((r) => {
        setItems(r.items);
        setErr("");
        setListReady(true);
      })
      .catch((e: Error) => {
        setErr(bookErrorMessage(e.message));
        setListReady(true);
      });
  }
  useEffect(() => {
    if (!sessionReady) return;
    setListReady(false);
    void load();
  }, [status, sessionReady]);

  useEffect(() => {
    if (!sessionReady || status !== "pending" || items.length > 0) return;
    const id = window.setInterval(() => {
      void load();
    }, 1500);
    return () => window.clearInterval(id);
  }, [status, sessionReady, items.length]);

  async function confirm(item: Item) {
    const unit = unitEdits[item.id] || item.proposed.unit;
    if ((item.kind === "unit_ambiguity" || unit === "unknown") && !unitEdits[item.id]) {
      setErr("Set the unit before confirming — we will not guess lakh vs crore.");
      return;
    }
    const raw = valueEdits[item.id];
    const valueNumeric =
      raw === undefined || raw === ""
        ? item.proposed.valueNumeric
        : raw === "—"
          ? null
          : Number(raw);
    setBusy(item.id);
    setErr("");
    try {
      await api(`/api/inbox/${item.id}/confirm`, {
        method: "POST",
        body: JSON.stringify({
          unit,
          currency: item.proposed.currency,
          valueNumeric,
          metricKey: item.proposed.metricKey,
          periodStart: periodEdits[item.id]?.start || item.proposed.periodStart,
          periodEnd: periodEdits[item.id]?.end || item.proposed.periodEnd,
          note: notes[item.id] || undefined,
        }),
      });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setBusy(null);
    }
  }

  async function reject(id: string) {
    setBusy(id);
    try {
      await api(`/api/inbox/${id}/reject`, { method: "POST", body: "{}" });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(null);
    }
  }

  const flagsCount = items.filter((i) => i.kind === "unit_ambiguity" || i.proposed.unit === "unknown").length;
  const docsCount = items.length - flagsCount;
  const visible = useMemo(() => {
    const rows =
      kindFilter === "flags"
        ? items.filter((i) => i.kind === "unit_ambiguity" || i.proposed.unit === "unknown")
        : kindFilter === "docs"
          ? items.filter((i) => i.kind !== "unit_ambiguity" && i.proposed.unit !== "unknown")
          : kindFilter === "mentions"
            ? []
            : items;
    const rank = { urgent: 0, warning: 1, info: 2 };
    return [...rows].sort((a, b) => rank[severityOf(a)] - rank[severityOf(b)]);
  }, [items, kindFilter]);

  return (
    <Shell>
      <PageHead
        title="Inbox"
        lede="Proposed extracts — confirm to write the book. Sorted by severity. Nothing here is a fact until you say so."
      />
      <div className="tabs filter-pills" aria-label="Status">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={`filter-pill${s === status ? " on" : ""}`}
            data-testid={`inbox-tab-${s}`}
            onClick={() => setStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="tabs filter-pills" aria-label="Kind filter">
        {(
          [
            ["all", "All", String(items.length)] as const,
            ["flags", "Flags", String(flagsCount)] as const,
            ["docs", "Docs", String(docsCount)] as const,
            ["mentions", "Mentions", "—"] as const,
          ]
        ).map(([k, label, count]) => (
          <button
            key={k}
            type="button"
            className={`filter-pill${k === kindFilter ? " on" : ""}`}
            onClick={() => setKindFilter(k)}
          >
            {label}
            <span className="filter-count">{count}</span>
          </button>
        ))}
      </div>
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {listReady && (
        <p className="lede" data-testid="inbox-ready" data-inbox-count={items.length} data-inbox-status={status}>
          {items.length} {status} {items.length === 1 ? "row" : "rows"} — confirm before anything posts to the book.
        </p>
      )}
      {items.length === 0 ? (
        <div className="empty" data-testid="inbox-empty">
          <strong>{status === "pending" ? "Queue is clear" : `No ${status} rows`}</strong>
          {status === "pending"
            ? "Upload a pack from Companies if you expect extracts."
            : `Nothing in ${status}.`}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          {kindFilter === "mentions"
            ? "Mentions are not connected. This book does not invent @-notifications."
            : "No rows in this filter."}
        </div>
      ) : (
        <div className="triage">
          <div className="triage-row triage-head">
            <div className="page-kicker">Severity</div>
            <div className="page-kicker">Entity</div>
            <div className="page-kicker">Summary</div>
            <div className="page-kicker hide-sm">Cite</div>
            <div className="page-kicker hide-sm">Time</div>
            <div className="page-kicker hide-sm">Owner</div>
            <div className="page-kicker">Actions</div>
          </div>
          {visible.map((i) => {
            const sev = severityOf(i);
            const loc = [i.locator.sheet, i.locator.cell, i.locator.page != null ? `p.${i.locator.page}` : null]
              .filter(Boolean)
              .join(" ");
            return (
              <article className="triage-row" key={i.id} data-testid="inbox-row">
                <div>
                  <span className={`sev-pill ${sev}`}>{sev}</span>
                </div>
                <div className="look-title">{i.companyName ?? "—"}</div>
                <div>
                  <div>
                    {i.proposed.metricKey ?? i.proposed.label ?? i.kind.replaceAll("_", " ")}{" "}
                    {status === "pending" && canWrite ? (
                      <input
                        aria-label="Value"
                        style={{ width: 80 }}
                        value={valueEdits[i.id] ?? (i.proposed.valueNumeric ?? "")}
                        onChange={(e) => setValueEdits({ ...valueEdits, [i.id]: e.target.value })}
                      />
                    ) : (
                      <strong>
                        {i.proposed.valueNumeric == null ? "—" : i.proposed.valueNumeric} {i.proposed.unit}{" "}
                        {i.proposed.currency}
                      </strong>
                    )}
                  </div>
                  {status === "pending" && canWrite ? (
                    <div className="row" style={{ marginTop: 4 }}>
                      <input
                        type="date"
                        aria-label="Period start"
                        value={periodEdits[i.id]?.start ?? i.proposed.periodStart ?? ""}
                        onChange={(e) =>
                          setPeriodEdits({
                            ...periodEdits,
                            [i.id]: {
                              start: e.target.value,
                              end: periodEdits[i.id]?.end ?? i.proposed.periodEnd ?? "",
                            },
                          })
                        }
                      />
                      <input
                        type="date"
                        aria-label="Period end"
                        value={periodEdits[i.id]?.end ?? i.proposed.periodEnd ?? ""}
                        onChange={(e) =>
                          setPeriodEdits({
                            ...periodEdits,
                            [i.id]: {
                              start: periodEdits[i.id]?.start ?? i.proposed.periodStart ?? "",
                              end: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  ) : (
                    <div className="lede">
                      {i.proposed.periodStart} – {i.proposed.periodEnd}
                    </div>
                  )}
                  {(i.kind === "unit_ambiguity" || !i.proposed.unit || i.proposed.unit === "unknown") &&
                    status === "pending" &&
                    canWrite && (
                      <select
                        value={unitEdits[i.id] ?? ""}
                        onChange={(e) => setUnitEdits({ ...unitEdits, [i.id]: e.target.value })}
                        aria-label="Unit"
                      >
                        <option value="">Set unit (required)</option>
                        <option value="crore">crore</option>
                        <option value="lakh">lakh</option>
                        <option value="million">million</option>
                        <option value="unit">unit</option>
                        <option value="percent">percent</option>
                      </select>
                    )}
                  {status === "pending" && canWrite && (
                    <input
                      placeholder="Correction note (if you edit)"
                      value={notes[i.id] ?? ""}
                      onChange={(e) => setNotes({ ...notes, [i.id]: e.target.value })}
                      aria-label="Correction note"
                      style={{ marginTop: 4, width: "100%" }}
                    />
                  )}
                </div>
                <div className="hide-sm">
                  {loc || i.locator.excerpt || i.proposed.excerpt ? (
                    <button
                      type="button"
                      className="cite"
                      onClick={() =>
                        openCite({
                          display: i.proposed.metricKey ?? i.proposed.label ?? i.kind,
                          locator: i.locator,
                          excerpt: i.locator.excerpt ?? i.proposed.excerpt,
                          periodStart: i.proposed.periodStart,
                          periodEnd: i.proposed.periodEnd,
                        })
                      }
                    >
                      {loc || "Cite"}
                    </button>
                  ) : (
                    <span className="lede">—</span>
                  )}
                </div>
                <div className="hide-sm num">{relTime(i.createdAt)}</div>
                <div className="hide-sm lede">—</div>
                <div className="row">
                  {status === "pending" && canWrite && (
                    <>
                      <button
                        className="btn sm"
                        disabled={busy === i.id}
                        onClick={() => confirm(i)}
                        data-testid="inbox-confirm"
                      >
                        Confirm
                      </button>
                      <button
                        className="btn ghost sm"
                        disabled={busy === i.id}
                        onClick={() => reject(i.id)}
                        data-testid="inbox-reject"
                      >
                        Reject
                      </button>
                    </>
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
