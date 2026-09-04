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
};

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
          <p className="lede">Catalog detectors only. Each row carries evidence. Missing inputs do not fire a flag.</p>
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
            </tr>
          </thead>
          <tbody>
            {flags.map((f) => (
              <tr key={f.id}>
                <td>{f.companyName ?? "—"}</td>
                <td>{f.flagKey}</td>
                <td className={`sev-${f.severity}`}>{f.severity}</td>
                <td>
                  <code style={{ fontSize: 12 }}>{JSON.stringify(f.evidence)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
