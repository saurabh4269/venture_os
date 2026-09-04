"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Fact, Shell, useBookSession } from "@/components/Shell";
import { api, sourcePathFor } from "@/lib/api";

type Pulse = {
  pulse: {
    companies: number;
    inboxPending: number;
    openFlags: number;
    funds: number;
    nav: { nav: { total: number | null; complete: boolean; missing: number }; unmarked: { companyName: string }[] };
    moic: number | null;
  };
  needsALook: {
    flags: { id: string; flagKey: string; severity: string; companyId: string; companyName: string }[];
    inbox: { id: string; companyName: string; kind: string }[];
  };
  coverage: {
    company: { id: string; name: string; stage: string | null };
    cash: { display: string; isFact: boolean; fxNote?: string | null; sourceRefId?: string | null };
    burn: { display: string; isFact: boolean; fxNote?: string | null; sourceRefId?: string | null };
    runway: { display: string; isFact: boolean; sourceRefId?: string | null };
    lastMis: string | null;
    ownershipPct: number | null;
    lastMark: number | null;
    lastMarkSource: string | null;
    openFlags: number;
  }[];
  sourceRefs: { id: string; documentId: string }[];
};

export default function CommandPage() {
  const { canWrite } = useBookSession();
  const [data, setData] = useState<Pulse | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<Pulse>("/api/command")
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, []);

  return (
    <Shell>
      <h1>Command</h1>
      <p className="lede">
        Fund pulse and what needs a look. Headlines are booked facts only. Missing is — , never 0. Runway uses cash /
        average of the last three reported burns. Click a chip to download the source (session cookie).
      </p>
      {err && <p className="sev-high">{err}</p>}
      {!data && !err && <p className="lede">Loading the book…</p>}
      {data && (
        <>
          <div className="cards" style={{ marginTop: 18 }}>
            <div className="card">
              <div className="k">Names</div>
              <div className="v">{data.pulse.companies}</div>
            </div>
            <div className="card">
              <div className="k">NAV (as-of)</div>
              <div className="v">
                {data.pulse.nav.nav.total == null ? "—" : data.pulse.nav.nav.total.toLocaleString("en-IN")}
              </div>
              {!data.pulse.nav.nav.complete && (
                <div className="lede">Incomplete — {data.pulse.nav.nav.missing} unmarked</div>
              )}
            </div>
            <div className="card">
              <div className="k">MOIC</div>
              <div className="v">{data.pulse.moic == null ? "—" : `${data.pulse.moic.toFixed(2)}x`}</div>
            </div>
            <div className="card">
              <div className="k">Needs a look</div>
              <div className="v">{data.pulse.inboxPending + data.pulse.openFlags}</div>
              <div className="lede">
                {data.pulse.inboxPending} inbox · {data.pulse.openFlags} flags
              </div>
            </div>
          </div>

          {(data.needsALook.inbox.length > 0 || data.needsALook.flags.length > 0) && (
            <div className="empty" style={{ marginTop: 8 }}>
              <strong>Needs a look</strong>
              <ul>
                {data.needsALook.inbox.map((i) => (
                  <li key={i.id}>
                    <Link href="/inbox">{i.companyName}</Link> · inbox {i.kind}
                  </li>
                ))}
                {data.needsALook.flags.map((f) => (
                  <li key={f.id}>
                    <Link href="/flags">{f.companyName}</Link> · {f.flagKey.replaceAll("_", " ")} ({f.severity})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.pulse.companies === 0 && (
            <div className="empty">
              No companies in this organisation.{" "}
              {canWrite ? (
                <>
                  <Link href="/companies/new">Add a company</Link> and upload the first MIS — about 15 minutes to a live
                  Command row.
                </>
              ) : (
                "Ask an Org Admin to add the first name."
              )}
            </div>
          )}

          {data.coverage.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Stage</th>
                  <th>Own.</th>
                  <th>Last MIS</th>
                  <th>Cash</th>
                  <th>Burn</th>
                  <th>Runway</th>
                  <th>Mark</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {data.coverage.map((r) => (
                  <tr key={r.company.id}>
                    <td>
                      <Link href={`/companies/${r.company.id}`}>{r.company.name}</Link>
                    </td>
                    <td>{r.company.stage ?? "—"}</td>
                    <td>{r.ownershipPct == null ? "—" : `${(r.ownershipPct * 100).toFixed(1)}%`}</td>
                    <td>{r.lastMis ?? "—"}</td>
                    <td>
                      <Fact
                        {...r.cash}
                        note={r.cash.fxNote}
                        sourcePath={sourcePathFor(data.sourceRefs, r.cash.sourceRefId)}
                      />
                    </td>
                    <td>
                      <Fact
                        {...r.burn}
                        note={r.burn.fxNote}
                        sourcePath={sourcePathFor(data.sourceRefs, r.burn.sourceRefId)}
                      />
                    </td>
                    <td>
                      <Fact {...r.runway} sourcePath={sourcePathFor(data.sourceRefs, r.runway.sourceRefId)} />
                    </td>
                    <td>
                      <Fact
                        display={r.lastMark == null ? "—" : String(r.lastMark)}
                        isFact={Boolean(r.lastMarkSource && r.lastMark != null)}
                        sourcePath={sourcePathFor(data.sourceRefs, r.lastMarkSource)}
                      />
                    </td>
                    <td>{r.openFlags}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </Shell>
  );
}
