"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell, useBookSession } from "@/components/Shell";
import { api } from "@/lib/api";

export default function CompaniesPage() {
  const { canWrite } = useBookSession();
  const [rows, setRows] = useState<{ id: string; name: string; stage: string | null; sector: string | null; country: string | null }[]>([]);

  useEffect(() => {
    api<{ companies: typeof rows }>("/api/companies").then((r) => setRows(r.companies));
  }, []);

  return (
    <Shell>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Companies</h1>
          <p className="lede">Coverage. Add a name, upload MIS, confirm inbox — then it appears on Command.</p>
        </div>
        {canWrite && (
          <Link className="btn" href="/companies/new">
            Add company
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="empty" style={{ marginTop: 20 }}>
          Empty book. {canWrite ? <Link href="/companies/new">Create the first company</Link> : "Ask an Org Admin to add a name."} (15-minute path).
        </div>
      ) : (
        <table style={{ marginTop: 18 }}>
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
      )}
    </Shell>
  );
}
