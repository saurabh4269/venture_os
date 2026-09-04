"use client";

import { useEffect, useState } from "react";
import { Shell, useBookSession } from "@/components/Shell";
import { api } from "@/lib/api";

type Item = {
  id: string;
  kind: string;
  status: string;
  confidence: number;
  companyName: string | null;
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

export default function InboxPage() {
  const { canWrite, ready: sessionReady } = useBookSession();
  const [items, setItems] = useState<Item[]>([]);
  const [periodEdits, setPeriodEdits] = useState<Record<string, { start: string; end: string }>>({});
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending");
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
        setErr(e.message);
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

  return (
    <Shell>
      <h1>Inbox</h1>
      <p className="lede">
        AI / parser proposes. You confirm, edit units or values, or reject. Nothing here is a fact until you say so.
        Re-parse creates new proposals; confirmed rows stay in the book.
      </p>
      <div className="row" style={{ margin: "12px 0" }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={s === status ? "btn sm" : "btn ghost sm"}
            data-testid={`inbox-tab-${s}`}
            onClick={() => setStatus(s)}
          >
            {s}
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
          {status === "pending"
            ? "Queue is clear. Upload a pack from Companies if you expect extracts."
            : `No ${status} rows.`}
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Kind</th>
              <th>Proposal</th>
              <th>Locator</th>
              <th>Conf.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className={i.confidence < 0.5 ? "sev-med" : undefined}>
                <td>{i.companyName ?? "—"}</td>
                <td>{i.kind}</td>
                <td>
                  {i.proposed.metricKey ?? i.proposed.label}{" "}
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
                </td>
                <td>
                  {i.locator.sheet} {i.locator.cell}
                  {i.locator.page != null ? ` p.${i.locator.page}` : ""}
                  <div className="lede">{i.locator.excerpt}</div>
                </td>
                <td>{Math.round(i.confidence * 100)}%</td>
                <td className="row">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
