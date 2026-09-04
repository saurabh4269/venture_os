"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

type Settings = {
  settings: { fyStartMonth: number; baseCurrency: string; displayCurrency: string } | null;
  connectors: { kind: string; status: string }[];
};

export default function SettingsPage() {
  const [data, setData] = useState<Settings | null>(null);
  const [funds, setFunds] = useState<{ id: string; name: string }[]>([]);
  const [fundName, setFundName] = useState("");
  const [invite, setInvite] = useState({ email: "", role: "analyst" });

  function load() {
    api<Settings>("/api/settings").then(setData);
    api<{ funds: { id: string; name: string }[] }>("/api/funds").then((r) => setFunds(r.funds));
  }
  useEffect(() => {
    load();
  }, []);

  async function addFund(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/funds", { method: "POST", body: JSON.stringify({ name: fundName }) });
    setFundName("");
    load();
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    await authClient.organization.inviteMember({ email: invite.email, role: invite.role as "member" });
  }

  return (
    <Shell>
      <h1>Organisation</h1>
      <p className="lede">FY defaults to April–March. Dual display is INR crore + EUR when an FX triple exists.</p>

      {data?.settings && (
        <p>
          FY start month {data.settings.fyStartMonth} · {data.settings.baseCurrency} / {data.settings.displayCurrency}
        </p>
      )}

      <h2>Connectors</h2>
      <table>
        <thead>
          <tr>
            <th>System</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {(data?.connectors ?? []).map((c) => (
            <tr key={c.kind}>
              <td>{c.kind}</td>
              <td>{c.status === "not_connected" ? "not connected" : c.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="lede">
        OneDrive, Affinity, and Granola are stubs. We will not show a last-sync time until OAuth exists. LP / ILPA room
        is Phase 2.
      </p>

      <h2>Funds</h2>
      <ul>
        {funds.map((f) => (
          <li key={f.id}>{f.name}</li>
        ))}
      </ul>
      <form onSubmit={addFund} className="row">
        <input value={fundName} onChange={(e) => setFundName(e.target.value)} placeholder="Fund name" required />
        <button className="btn sm">Add fund</button>
      </form>

      <h2>Invite</h2>
      <form onSubmit={inviteMember} className="row">
        <input
          type="email"
          value={invite.email}
          onChange={(e) => setInvite({ ...invite, email: e.target.value })}
          placeholder="analyst@firm"
          required
        />
        <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
          <option value="org_admin">Org Admin</option>
          <option value="partner">Partner</option>
          <option value="analyst">Analyst</option>
          <option value="viewer">Viewer</option>
        </select>
        <button className="btn sm">Send invite</button>
      </form>
    </Shell>
  );
}
