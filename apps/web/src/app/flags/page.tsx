"use client";

import { useEffect, useState } from "react";
import { Fact, Shell, useBookSession } from "@/components/Shell";
import { api, sourcePathFor } from "@/lib/api";

type Flag = {
  id: string;
  flagKey: string;
  severity: string;
  companyName?: string;
  evidence: Record<string, unknown>;
  status?: string;
  sourceRefIds?: string[] | null;
  note?: string | null;
  snoozedUntil?: string | null;
};

type FlagPayload = { flags: Flag[]; sourceRefs: { id: string; documentId: string }[] };

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
  const [data, setData] = useState<FlagPayload>({ flags: [], sourceRefs: [] });

  function load(next = status) {
    api<FlagPayload>(`/api/flags?status=${next}`).then(setData);
  }
  useEffect(() => {
    load();
  }, [status]);

  return (
    <Shell>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Flags</h1>
          <p className="lede">
            Catalog detectors only. Each row carries evidence. Missing inputs do not fire a flag. Mute and snooze
            survive recompute. Unmute returns a row to open.
          </p>
        </div>
        {canWrite && (
          <button className="btn ghost" onClick={() => api("/api/flags/refresh", { method: "POST", body: "{}" }).then(() => load())}>
            Recompute
          </button>
        )}
      </div>
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
      {data.flags.length === 0 ? (
        <div className="empty">
          {status === "open"
            ? "No open flags — either the book is quiet, or headlines are still unconfirmed."
            : `No ${status} flags.`}
        </div>
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
            {data.flags.map((f) => (
              <tr key={f.id}>
                <td>{f.companyName ?? "—"}</td>
                <td>{f.flagKey.replaceAll("_", " ")}</td>
                <td className={`sev-${f.severity}`}>{f.severity}</td>
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
