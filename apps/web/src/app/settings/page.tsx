"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FLAG_CATALOG } from "@venture-os/core";
import { Shell, useBookSession } from "@/components/Shell";
import { api } from "@/lib/api";
import { connectorLabel } from "@/lib/connectors";
import { friendlyAuthError, ROLE_LABEL, ROLES, roleLabel } from "@/lib/roles";

type Settings = {
  settings: { fyStartMonth: number; baseCurrency: string; displayCurrency: string } | null;
  connectors: { kind: string; status: string }[];
  flagPolicy?: { key: string; label: string; defaultThreshold: number; threshold?: number }[];
};

type Member = { id: string; userId: string; role: string; email: string | null; name: string | null };
type Invite = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: string;
  acceptUrl: string;
};

export default function SettingsPage() {
  const { isAdmin, canWrite } = useBookSession();
  const [data, setData] = useState<Settings | null>(null);
  const [funds, setFunds] = useState<
    { id: string; name: string; vintage?: number | null; currency?: string; committedCapital?: number | null }[]
  >([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [fundForm, setFundForm] = useState({ name: "", vintage: "", currency: "INR", committedCapital: "" });
  const [invite, setInvite] = useState({ email: "", role: "analyst" });
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteErr, setInviteErr] = useState("");
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState(false);
  const [policyDraft, setPolicyDraft] = useState<Record<string, string>>({});
  const [policyMsg, setPolicyMsg] = useState("");
  const [loadErr, setLoadErr] = useState("");

  function load() {
    setLoadErr("");
    api<Settings>("/api/settings")
      .then((s) => {
        setData(s);
        const next: Record<string, string> = {};
        for (const f of s.flagPolicy ?? []) {
          next[f.key] = String(f.threshold ?? f.defaultThreshold);
        }
        if (!s.flagPolicy?.length) {
          for (const f of FLAG_CATALOG) next[f.key] = String(f.defaultThreshold);
        }
        setPolicyDraft(next);
      })
      .catch((e: Error) => setLoadErr(e.message));
    api<{
      funds: { id: string; name: string; vintage?: number | null; currency?: string; committedCapital?: number | null }[];
    }>("/api/funds").then((r) => setFunds(r.funds));
    api<{ members: Member[] }>("/api/members").then((r) => setMembers(r.members));
    api<{ invitations: Invite[] }>("/api/invitations")
      .then((r) => setInvites(r.invitations))
      .catch(() => setInvites([]));
  }
  useEffect(() => {
    load();
  }, []);

  async function addFund(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/funds", {
      method: "POST",
      body: JSON.stringify({
        name: fundForm.name,
        vintage: fundForm.vintage ? Number(fundForm.vintage) : undefined,
        currency: fundForm.currency || undefined,
        committedCapital: fundForm.committedCapital ? Number(fundForm.committedCapital) : undefined,
      }),
    });
    setFundForm({ name: "", vintage: "", currency: "INR", committedCapital: "" });
    load();
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    setInviteErr("");
    setInviteMsg("");
    setBusy(true);
    try {
      const res = await api<{ acceptUrl: string }>("/api/invitations", {
        method: "POST",
        body: JSON.stringify(invite),
      });
      setInviteMsg(
        `Invite created. Email delivery is not connected — copy the link and send it to ${invite.email}.`,
      );
      setCopied(res.acceptUrl);
      setInvite({ email: "", role: "analyst" });
      load();
    } catch (ex) {
      setInviteErr(friendlyAuthError(ex instanceof Error ? ex.message : "Invite failed"));
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
    } catch {
      setCopied(url);
    }
  }

  const pending = invites.filter((i) => i.status === "pending");

  return (
    <Shell>
      <h1>Settings</h1>
      <p className="lede">
        FY defaults to April–March. Dual display is INR crore + EUR when an FX triple exists. Primary ingest path is
        Microsoft OneDrive (not connected) — use the company vault until OAuth exists.
      </p>

      {data?.settings && !isAdmin && (
        <p className="lede">
          FY starts month {data.settings.fyStartMonth}. Base {data.settings.baseCurrency} · display{" "}
          {data.settings.displayCurrency}. Org Admin can change this.
        </p>
      )}
      {data?.settings && isAdmin && (
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await api("/api/settings", {
              method: "POST",
              body: JSON.stringify({
                fyStartMonth: Number(fd.get("fyStartMonth")),
                baseCurrency: String(fd.get("baseCurrency")),
                displayCurrency: String(fd.get("displayCurrency")),
              }),
            });
            load();
          }}
        >
          <label className="field">
            FY start month
            <input name="fyStartMonth" type="number" min={1} max={12} defaultValue={data.settings.fyStartMonth} />
          </label>
          <label className="field">
            Base
            <input name="baseCurrency" defaultValue={data.settings.baseCurrency} />
          </label>
          <label className="field">
            Display
            <input name="displayCurrency" defaultValue={data.settings.displayCurrency} />
          </label>
          <button className="btn sm" type="submit">
            Save FY
          </button>
        </form>
      )}
      <h2>Mapping</h2>
      <p className="lede">
        Firm metric dictionary and company mapping profiles are stubs. We will not invent OneDrive folder IDs or
        Affinity field names. Unit/currency hints live on each company profile.
      </p>

      <h2>People</h2>
      {members.length === 0 ? (
        <div className="empty">No members loaded.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.name ?? "—"}</td>
                <td>{m.email ?? "—"}</td>
                <td>
                  {isAdmin ? (
                    <select
                      aria-label={`Role for ${m.email ?? m.name}`}
                      value={m.role}
                      onChange={async (e) => {
                        await api(`/api/members/${m.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ role: e.target.value }),
                        });
                        load();
                      }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    roleLabel(m.role)
                  )}
                </td>
                {isAdmin && (
                  <td>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={async () => {
                        await api(`/api/members/${m.id}`, { method: "DELETE" });
                        load();
                      }}
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Invite</h2>
      <p className="lede">
        Locked roles: Org Admin, Partner, Analyst, Viewer. Viewer cannot write or confirm. There is no email
        sender yet — copy the accept link.
      </p>
      {isAdmin ? (
      <form onSubmit={inviteMember} className="row">
        <label className="sr-only" htmlFor="invite-email">
          Invite email
        </label>
        <input
          id="invite-email"
          type="email"
          value={invite.email}
          onChange={(e) => setInvite({ ...invite, email: e.target.value })}
          placeholder="analyst@firm"
          autoComplete="off"
          required
        />
        <label className="sr-only" htmlFor="invite-role">
          Role
        </label>
        <select
          id="invite-role"
          value={invite.role}
          onChange={(e) => setInvite({ ...invite, role: e.target.value })}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <button className="btn sm" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create invite"}
        </button>
      </form>
      ) : (
        <p className="lede">Only Org Admin can create invites.</p>
      )}
      {inviteErr && (
        <p className="sev-high" role="alert">
          {inviteErr}
        </p>
      )}
      {inviteMsg && (
        <p className="lede" role="status">
          {inviteMsg}
        </p>
      )}

      {pending.length > 0 && (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Pending</th>
              <th>Role</th>
              <th>Expires</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pending.map((i) => (
              <tr key={i.id}>
                <td>{i.email}</td>
                <td>{roleLabel(i.role)}</td>
                <td>{new Date(i.expiresAt).toLocaleDateString()}</td>
                <td>
                  <button className="btn ghost sm" type="button" onClick={() => copy(i.acceptUrl)}>
                    {copied === i.acceptUrl ? "Copied" : "Copy link"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Connectors</h2>
      <p className="lede">
        Primary path: Microsoft OneDrive (not connected) → use{" "}
        <Link href="/vault">Vault upload</Link>. Subjective auto-draft waits on Granola. Ownership edits stay manual
        until Affinity connects. We will not show a last-sync time. Domain auto-join and SMTP are not connected.
      </p>
      <table>
        <thead>
          <tr>
            <th>System</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(data?.connectors ?? []).map((c) => (
            <tr key={c.kind}>
              <td>{connectorLabel(c.kind)}</td>
              <td>{c.status === "not_connected" ? "not connected" : c.status}</td>
              <td>
                <button type="button" className="btn ghost sm" disabled title="OAuth is not connected">
                  Connect
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {loadErr && (
        <p className="sev-high" role="alert">
          {loadErr}
        </p>
      )}

      <h2>Flag policy</h2>
      <p className="lede">
        Firm thresholds persist on <code>org_settings.flag_policy</code>. The Flags job reads these, not only catalog
        defaults. Missing keys keep the catalog default. Org Admin can edit.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!isAdmin) return;
          setPolicyMsg("");
          const thresholds: Record<string, number> = {};
          for (const [k, v] of Object.entries(policyDraft)) {
            const n = Number(v);
            if (Number.isFinite(n) && n >= 0) thresholds[k] = n;
          }
          try {
            await api("/api/settings/flag-policy", {
              method: "POST",
              body: JSON.stringify({ thresholds }),
            });
            setPolicyMsg("Thresholds saved. Recompute Flags to apply.");
            load();
          } catch (ex) {
            setPolicyMsg(ex instanceof Error ? ex.message : "Could not save policy");
          }
        }}
      >
        <table>
          <thead>
            <tr>
              <th>Flag</th>
              <th>Catalog default</th>
              <th>This firm</th>
            </tr>
          </thead>
          <tbody>
            {(data?.flagPolicy ?? FLAG_CATALOG.map((c) => ({ ...c, threshold: c.defaultThreshold }))).map((f) => (
              <tr key={f.key}>
                <td>{f.label}</td>
                <td>{f.defaultThreshold}</td>
                <td>
                  {isAdmin ? (
                    <input
                      type="number"
                      min={0}
                      step="any"
                      aria-label={`${f.label} threshold`}
                      value={policyDraft[f.key] ?? String(f.threshold ?? f.defaultThreshold)}
                      onChange={(e) => setPolicyDraft({ ...policyDraft, [f.key]: e.target.value })}
                    />
                  ) : (
                    f.threshold ?? f.defaultThreshold
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isAdmin && (
          <button className="btn sm" type="submit" style={{ marginTop: 10 }}>
            Save flag policy
          </button>
        )}
      </form>
      {policyMsg && (
        <p className="lede" role="status">
          {policyMsg}
        </p>
      )}

      <h2>Funds</h2>
      {funds.length === 0 ? (
        <div className="empty">
          No funds yet. Add a fund here, then attach positions when you onboard a company. NAV is empty without both.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Vintage</th>
              <th>Currency</th>
              <th>Committed</th>
            </tr>
          </thead>
          <tbody>
            {funds.map((f) => (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td>{f.vintage ?? "—"}</td>
                <td>{f.currency ?? "INR"}</td>
                <td>{f.committedCapital == null ? "—" : f.committedCapital.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {canWrite && (
      <form onSubmit={addFund} className="row" style={{ flexWrap: "wrap" }}>
        <label className="sr-only" htmlFor="fund-name">
          Fund name
        </label>
        <input
          id="fund-name"
          value={fundForm.name}
          onChange={(e) => setFundForm({ ...fundForm, name: e.target.value })}
          placeholder="Fund name"
          required
        />
        <input
          type="number"
          min={1990}
          max={2100}
          value={fundForm.vintage}
          onChange={(e) => setFundForm({ ...fundForm, vintage: e.target.value })}
          placeholder="Vintage"
          aria-label="Vintage"
        />
        <select
          value={fundForm.currency}
          onChange={(e) => setFundForm({ ...fundForm, currency: e.target.value })}
          aria-label="Fund currency"
        >
          <option value="INR">INR</option>
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
          <option value="GBP">GBP</option>
        </select>
        <input
          type="number"
          min={0}
          step="any"
          value={fundForm.committedCapital}
          onChange={(e) => setFundForm({ ...fundForm, committedCapital: e.target.value })}
          placeholder="Committed capital"
          aria-label="Committed capital"
        />
        <button className="btn sm" type="submit">
          Add fund
        </button>
      </form>
      )}
    </Shell>
  );
}
