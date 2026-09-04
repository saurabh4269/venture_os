"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Fact, Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Pulse = {
  pulse: {
    companies: number;
    inboxPending: number;
    openFlags: number;
    funds: number;
    nav: { nav: { total: number | null; complete: boolean; missing: number }; unmarked: { companyName: string }[] };
    moic: number | null;
  };
  needsALook: { flags: { id: string; flagKey: string; severity: string; companyId: string }[]; inbox: { id: string }[] };
  coverage: {
    company: { id: string; name: string; stage: string | null };
    cash: { display: string; isFact: boolean; fxNote?: string | null };
    burn: { display: string; isFact: boolean; fxNote?: string | null };
    runway: { display: string; isFact: boolean };
    lastMis: string | null;
    ownershipPct: number | null;
    lastMark: number | null;
    lastMarkSource: string | null;
    openFlags: number;
  }[];
};

export default function CommandPage() {
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
      <p className="lede">Fund pulse and what needs a look. Headlines are booked facts only. Missing is — , never 0.</p>
      {err && <p className="sev-high">{err}</p>}
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
              <div className="v">
                {data.pulse.inboxPending + data.pulse.openFlags}
              </div>
              <div className="lede">
                {data.pulse.inboxPending} inbox · {data.pulse.openFlags} flags
              </div>
            </div>
          </div>

          {data.pulse.companies === 0 && (
            <div className="empty">
              No companies in this organisation.{" "}
              <Link href="/companies/new">Add a company</Link> and upload the first MIS — about 15 minutes to a live
              Command row.
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
                      <Fact {...r.cash} note={r.cash.fxNote} />
                    </td>
                    <td>
                      <Fact {...r.burn} note={r.burn.fxNote} />
                    </td>
                    <td>
                      <Fact {...r.runway} />
                    </td>
                    <td>
                      <Fact
                        display={r.lastMark == null ? "—" : String(r.lastMark)}
                        isFact={Boolean(r.lastMarkSource && r.lastMark != null)}
                      />
                    </td>
                    <td>{r.openFlags || "—"}</td>
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
