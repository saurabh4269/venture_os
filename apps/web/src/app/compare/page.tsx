"use client";

import { useEffect, useState } from "react";
import { Fact, Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Cell = { display: string; isFact: boolean; periodEnd?: string | null };
type Data = {
  metrics: string[];
  matrix: { company: { id: string; name: string }; cells: Record<string, Cell> }[];
};

export default function ComparePage() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    api<Data>("/api/compare").then(setData);
  }, []);

  return (
    <Shell>
      <h1>Compare</h1>
      <p className="lede">Confirmed book only. No imputation, no peer-average fill. Empty cell is —.</p>
      {!data || data.matrix.length === 0 ? (
        <div className="empty">Add companies and confirm metrics to compare.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Company</th>
              {data.metrics.map((m) => (
                <th key={m}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.matrix.map((row) => (
              <tr key={row.company.id}>
                <td>{row.company.name}</td>
                {data.metrics.map((m) => (
                  <td key={m}>
                    <Fact {...row.cells[m]!} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
