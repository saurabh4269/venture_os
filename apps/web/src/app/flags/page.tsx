"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Flag = {
  id: string;
  flagKey: string;
  severity: string;
  companyName?: string;
  evidence: Record<string, unknown>;
  status?: string;
};

function evidenceLine(ev: Record<string, unknown>) {
  return Object.entries(ev)
    .map(([k, v]) => `${k.replaceAll("_", " ")}: ${v == null ? "—" : String(v)}`)
    .join(" · ");
}

export default function FlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);

  function load() {
    api<{ flags: Flag[] }>("/api/flags").then((r) => setFlags(r.flags));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <Shell>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Flags</h1>
          <p className="lede">
            Catalog detectors only. Each row carries evidence. Missing inputs do not fire a flag. Mute and snooze
            survive recompute.
          </p>
        </div>
        <button className="btn ghost" onClick={() => api("/api/flags/refresh", { method: "POST", body: "{}" }).then(load)}>
          Recompute
        </button>
      </div>
      {flags.length === 0 ? (
        <div className="empty">No open flags — either the book is quiet, or headlines are still unconfirmed.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Flag</th>
              <th>Severity</th>
              <th>Evidence</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {flags.map((f) => (
              <tr key={f.id}>
                <td>{f.companyName ?? "—"}</td>
                <td>{f.flagKey.replaceAll("_", " ")}</td>
                <td className={`sev-${f.severity}`}>{f.severity}</td>
                <td className="lede">{evidenceLine(f.evidence ?? {})}</td>
                <td className="row">
                  <button
                    className="btn ghost sm"
                    type="button"
                    onClick={() =>
                      api(`/api/flags/${f.id}/snooze`, {
                        method: "POST",
                        body: JSON.stringify({ until: new Date(Date.now() + 14 * 86400000).toISOString() }),
                      }).then(load)
                    }
                  >
                    Snooze 14d
                  </button>
                  <button
                    className="btn ghost sm"
                    type="button"
                    onClick={() => api(`/api/flags/${f.id}/mute`, { method: "POST", body: "{}" }).then(load)}
                  >
                    Mute
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
