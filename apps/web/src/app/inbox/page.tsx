"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
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
  locator: { sheet?: string; cell?: string; excerpt?: string };
};

export default function InboxPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [unitEdits, setUnitEdits] = useState<Record<string, string>>({});

  function load() {
    api<{ items: Item[] }>("/api/inbox").then((r) => setItems(r.items));
  }
  useEffect(() => {
    load();
  }, []);

  async function confirm(item: Item) {
    const unit = unitEdits[item.id] || item.proposed.unit;
    await api(`/api/inbox/${item.id}/confirm`, {
      method: "POST",
      body: JSON.stringify({
        unit,
        currency: item.proposed.currency,
        valueNumeric: item.proposed.valueNumeric,
        metricKey: item.proposed.metricKey,
        periodStart: item.proposed.periodStart,
        periodEnd: item.proposed.periodEnd,
      }),
    });
    load();
  }

  async function reject(id: string) {
    await api(`/api/inbox/${id}/reject`, { method: "POST", body: "{}" });
    load();
  }

  return (
    <Shell>
      <h1>Inbox</h1>
      <p className="lede">
        AI / parser proposes. You confirm, edit units, or reject. Nothing here is a fact until you say so.
      </p>
      {items.length === 0 ? (
        <div className="empty">Queue is clear. Upload a pack from Companies if you expect extracts.</div>
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
              <tr key={i.id}>
                <td>{i.companyName ?? "—"}</td>
                <td>{i.kind}</td>
                <td>
                  {i.proposed.metricKey ?? i.proposed.label}{" "}
                  <strong>
                    {i.proposed.valueNumeric == null ? "—" : i.proposed.valueNumeric} {i.proposed.unit}{" "}
                    {i.proposed.currency}
                  </strong>
                  <div className="lede">{i.proposed.periodStart} – {i.proposed.periodEnd}</div>
                  {i.kind === "unit_ambiguity" && (
                    <select
                      value={unitEdits[i.id] ?? ""}
                      onChange={(e) => setUnitEdits({ ...unitEdits, [i.id]: e.target.value })}
                    >
                      <option value="">Set unit (required)</option>
                      <option value="crore">crore</option>
                      <option value="lakh">lakh</option>
                      <option value="million">million</option>
                      <option value="unit">unit</option>
                      <option value="percent">percent</option>
                    </select>
                  )}
                </td>
                <td>
                  {i.locator.sheet} {i.locator.cell}
                  <div className="lede">{i.locator.excerpt}</div>
                </td>
                <td>{Math.round(i.confidence * 100)}%</td>
                <td className="row">
                  <button className="btn sm" onClick={() => confirm(i)}>
                    Confirm
                  </button>
                  <button className="btn ghost sm" onClick={() => reject(i.id)}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
