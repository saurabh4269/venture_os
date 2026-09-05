"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FLAG_CATALOG, FLAG_THRESHOLD_BOUNDS } from "@venture-os/core";
import { PageHead, Panel, SettingsSubnav } from "@/components/BookUI";
import { Shell, useBookSession } from "@/components/Shell";
import { api } from "@/lib/api";
import { connectorLabel } from "@/lib/connectors";
import { friendlyAuthError, ROLE_LABEL, ROLES, roleLabel } from "@/lib/roles";
import { bookErrorMessage } from "@/lib/wake";

type Settings = {
  settings: { fyStartMonth: number; baseCurrency: string; displayCurrency: string } | null;
  connectors: { kind: string; status: string; lastError?: string | null; lastSyncAt?: string }[];
  flagPolicy?: {
    key: string;
    label: string;
    defaultThreshold: number;
    threshold?: number;
    min?: number;
    max?: number;
    unit?: string;
  }[];
  flagPolicyAudits?: {
    id: string;
    changedAt: string;
    changedByName: string | null;
    changedByEmail: string | null;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  }[];
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
  const [policyFields, setPolicyFields] = useState<Record<string, string>>({});
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
      .catch((e: Error) => setLoadErr(bookErrorMessage(e.message)));
    api<{
      funds: { id: string; name: string; vintage?: number | null; currency?: string; committedCapital?: number | null }[];
    }>("/api/funds")
      .then((r) => setFunds(r.funds ?? []))
      .catch(() => setFunds([]));
    api<{ members: Member[] }>("/api/members")
      .then((r) => setMembers(r.members ?? []))
      .catch(() => setMembers([]));
    api<{ invitations: Invite[] }>("/api/invitations")
      .then((r) => setInvites(r.invitations ?? []))
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
        `Invite created for ${invite.email}. Copy the link below and send it to them.`,
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
      <PageHead
        kicker="Organisation"
        title="Settings"
        testId="settings-ready"
        lede="Firm defaults, members, connectors, and flag policy. FY starts April–March unless you change it here."
      />
      <SettingsSubnav current="firm" />
      <div className="settings-stack">

      <Panel title="Firm year">
      {data?.settings && !isAdmin && (
        <p className="lede">
          FY starts month {data.settings.fyStartMonth}. Base {data.settings.baseCurrency} · display{" "}
          {data.settings.displayCurrency}. Org Admin can change this.
        </p>
      )}
      {data?.settings && isAdmin && (
        <form
          className="row settings-form-row"
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
      </Panel>
      <Panel title="Mapping">
      <p className="lede">
        Optional vendor ids on each company profile. Unit and currency hints live there too.
      </p>
      </Panel>

      <Panel title="People" flush>
      <div id="people" />
      {members.length === 0 ? (
        <div className="empty">Members will appear here once invites are accepted.</div>
      ) : (
        <div className="table-scroll table-scroll--compact">
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
        </div>
      )}
      </Panel>

      <Panel title="Invite">
      <p className="lede">
        Invite teammates by role. Copy the accept link and send it by email.
      </p>
      {isAdmin ? (
      <form onSubmit={inviteMember} className="row settings-form-row">
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
        <div className="table-scroll table-scroll--compact settings-pending-table">
        <table>
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
        </div>
      )}
      </Panel>

      <Panel title="Connectors" flush>
      <div className="panel-body">
      <p className="lede" id="connector-honest">
        Add connector keys on <Link href="/settings/connectors">Settings → Connectors</Link>. Sync starts after a
        successful health check. You can always upload files in the <Link href="/vault">Vault</Link>.
      </p>
      <div className="table-scroll table-scroll--compact">
      <table>
        <thead>
          <tr>
            <th>System</th>
            <th>Status</th>
            <th>Last sync</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {(data?.connectors ?? []).map((c) => (
            <tr key={c.kind}>
              <td>{connectorLabel(c.kind)}</td>
              <td>{c.status === "not_connected" ? "Setup" : c.status.replaceAll("_", " ")}</td>
              <td>{c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : "—"}</td>
              <td className="lede">{c.lastError ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p className="settings-cta-row">
        <Link className="btn sm" href="/settings/connectors">
          Open connector settings
        </Link>
      </p>
      </div>
      </Panel>

      {loadErr && (
        <p className="sev-high" role="alert">
          {loadErr}
        </p>
      )}

      <Panel title="Session">
      <p className="lede">
        Sessions last seven days and refresh with use. Sign out anytime from the account menu.
      </p>
      </Panel>

      <Panel title="Flag policy">
      <p className="lede">
        Set firm-wide thresholds for flag detectors. Org Admin can edit values; save to refresh Flags.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!isAdmin) return;
          setPolicyMsg("");
          setPolicyFields({});
          const thresholds: Record<string, number> = {};
          const local: Record<string, string> = {};
          for (const [k, v] of Object.entries(policyDraft)) {
            const n = Number(v);
            if (!Number.isFinite(n)) {
              local[k] = "must be a finite number";
              continue;
            }
            thresholds[k] = n;
          }
          if (Object.keys(local).length) {
            setPolicyFields(local);
            setPolicyMsg("Fix the highlighted thresholds.");
            return;
          }
          try {
            await api("/api/settings/flag-policy", {
              method: "POST",
              body: JSON.stringify({ thresholds }),
            });
            setPolicyMsg("Thresholds saved. Recompute Flags to apply.");
            load();
          } catch (ex) {
            const raw = ex instanceof Error ? ex.message : "Could not save policy";
            setPolicyMsg(friendlyAuthError(raw));
          }
        }}
      >
        <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Flag</th>
              <th>Catalog default</th>
              <th>Bounds</th>
              <th>This firm</th>
            </tr>
          </thead>
          <tbody>
            {(
              data?.flagPolicy ??
              FLAG_CATALOG.map((c) => ({
                ...c,
                threshold: c.defaultThreshold,
                ...FLAG_THRESHOLD_BOUNDS[c.key],
              }))
            ).map((f) => (
              <tr key={f.key}>
                <td>{f.label}</td>
                <td>{f.defaultThreshold}</td>
                <td className="lede">
                  {f.min ?? 0}–{f.max ?? "—"} {f.unit ?? ""}
                </td>
                <td>
                  {isAdmin ? (
                    <>
                      <input
                        type="number"
                        min={f.min ?? 0}
                        max={f.max}
                        step="any"
                        aria-label={`${f.label} threshold`}
                        aria-invalid={Boolean(policyFields[f.key])}
                        value={policyDraft[f.key] ?? String(f.threshold ?? f.defaultThreshold)}
                        onChange={(e) => setPolicyDraft({ ...policyDraft, [f.key]: e.target.value })}
                      />
                      {policyFields[f.key] && (
                        <div className="sev-high" role="alert">
                          {policyFields[f.key]}
                        </div>
                      )}
                    </>
                  ) : (
                    f.threshold ?? f.defaultThreshold
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {isAdmin && (
          <button className="btn sm settings-save-row" type="submit" data-testid="save-flag-policy">
            Save flag policy
          </button>
        )}
      </form>
      {policyMsg && (
        <p className="lede" role="status">
          {policyMsg}
        </p>
      )}
      {(data?.flagPolicyAudits ?? []).length > 0 && (
        <>
          <h3 className="settings-audit-title">Policy audit</h3>
          <div className="table-scroll table-scroll--compact">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>After</th>
              </tr>
            </thead>
            <tbody>
              {data!.flagPolicyAudits!.map((a) => (
                <tr key={a.id}>
                  <td className="lede">{new Date(a.changedAt).toLocaleString()}</td>
                  <td>{a.changedByName ?? a.changedByEmail ?? "—"}</td>
                  <td className="lede">{JSON.stringify(a.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      </Panel>
      <Panel title="Funds">
      {funds.length === 0 ? (
        <div className="empty">
          Add your first fund here, then attach positions when you onboard a company.
        </div>
      ) : (
        <div className="table-scroll table-scroll--compact">
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
        </div>
      )}
      {canWrite && (
      <form onSubmit={addFund} className="row settings-form-row">
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
      </Panel>
      </div>
    </Shell>
  );
}
