"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead, Panel } from "@/components/BookUI";
import { Shell, useBookSession } from "@/components/Shell";
import { api } from "@/lib/api";

export default function CompaniesPage() {
  const { canWrite } = useBookSession();
  const [rows, setRows] = useState<{ id: string; name: string; stage: string | null; sector: string | null; country: string | null }[]>([]);

  const [err, setErr] = useState("");
  useEffect(() => {
    api<{ companies: typeof rows }>("/api/companies")
      .then((r) => setRows(r.companies ?? []))
      .catch((e: Error) => setErr(e.message));
  }, []);

  return (
    <Shell>
      <PageHead
        title="Companies"
        lede="Coverage. Add a name, upload MIS, confirm inbox — then it appears on Command."
        actions={
          canWrite ? (
            <Link className="btn" href="/companies/new">
              Add company
            </Link>
          ) : undefined
        }
      />
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      {rows.length === 0 ? (
        <div className="empty">
          <strong>Empty book</strong>
          {canWrite ? <Link href="/companies/new">Create the first company</Link> : "Ask an Org Admin to add a name."}{" "}
          (15-minute path).
        </div>
      ) : (
        <Panel flush>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Sector</th>
              <th>Stage</th>
              <th>Country</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/companies/${c.id}`}>{c.name}</Link>
                </td>
                <td>{c.sector ?? "—"}</td>
                <td>{c.stage ?? "—"}</td>
                <td>{c.country ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </Panel>
      )}
    </Shell>
  );
}
