"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FLAG_CATALOG, FLAG_THRESHOLD_BOUNDS, METRIC_CATALOG } from "@venture-os/core";
import { UnitSchema, type Unit } from "@venture-os/schema";
import { Miss, PageHead, Panel, type SettingsTab } from "@/components/BookUI";
import { useBookSession } from "@/components/Shell";
import { api } from "@/lib/api";
import { connectorLabel } from "@/lib/connectors";
import { MONTH_NAMES, monthName, titleCaseKind } from "@/lib/format";
import { friendlyAuthError, ROLE_LABEL, ROLES, roleLabel } from "@/lib/roles";
import { bookErrorMessage } from "@/lib/wake";

function asTab(raw: string | null): SettingsTab {
  if (raw === "formula" || raw === "flags" || raw === "firm" || raw === "funds" || raw === "people") return raw;
  return "formula";
}

type Settings = {
  settings: {
    fyStartMonth: number;
    baseCurrency: string;
    displayCurrency: string;
    autoConfirmMinConfidence?: number | null;
    monthlyPackEnabled?: boolean;
    monthlyPackDay?: number;
  } | null;
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
  formulaBook?: {
    key: string;
    label: string;
    catalogLabel: string;
    unitFamily: string;
    defaultUnit: string;
    catalogDefaultUnit: string;
    aliases: string[];
    catalogAliases: string[];
    derivedFormula: string | null;
    overridden: boolean;
  }[];
};

type FormulaDraftRow = { label: string; aliases: string; defaultUnit: string };

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
  return (
    <Suspense fallback={<p className="lede">Loading…</p>}>
      <SettingsInner />
    </Suspense>
  );
}

function SettingsInner() {
  const search = useSearchParams();
  const tab = asTab(search.get("tab"));
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
  const [formulaDraft, setFormulaDraft] = useState<Record<string, FormulaDraftRow>>({});
  const [formulaMsg, setFormulaMsg] = useState("");
  const [formulaFields, setFormulaFields] = useState<Record<string, string>>({});
  const [formulaOpen, setFormulaOpen] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState("");

  function seedFormulaDraft(
    rows?: Settings["formulaBook"],
  ) {
    const next: Record<string, FormulaDraftRow> = {};
    const source =
      rows ??
      METRIC_CATALOG.map((m) => ({
        key: m.key,
        label: m.label,
        catalogLabel: m.label,
        unitFamily: m.unitFamily,
        defaultUnit: m.defaultUnit,
        catalogDefaultUnit: m.defaultUnit,
        aliases: m.aliases,
        catalogAliases: m.aliases,
        derivedFormula: null as string | null,
        overridden: false,
      }));
    for (const m of source) {
      next[m.key] = {
        label: m.label,
        aliases: m.aliases.join(", "),
        defaultUnit: m.defaultUnit,
      };
    }
    setFormulaDraft(next);
  }

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
        seedFormulaDraft(s.formulaBook);
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
      setInviteMsg(`Invite ready for ${invite.email}. Copy the link.`);
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
    <><PageHead title="Settings" lede="Firm defaults, formula book, people, and flag policy." />
      {loadErr && (
        <p className="sev-high" role="alert">
          {loadErr}
        </p>
      )}
      <div className="settings-stack">

      {tab === "firm" && (
      <Panel title="Firm year">
      {data?.settings && !isAdmin && (
        <p className="lede">
          FY starts in {monthName(data.settings.fyStartMonth)}. Base {data.settings.baseCurrency}. Display{" "}
          {data.settings.displayCurrency}.
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
                autoConfirmMinConfidence: (() => {
                  const raw = String(fd.get("autoConfirmMinConfidence") || "").trim();
                  if (!raw) return null;
                  return Number(raw);
                })(),
                monthlyPackEnabled: fd.get("monthlyPackEnabled") === "on",
                monthlyPackDay: Number(fd.get("monthlyPackDay") || 1),
              }),
            });
            load();
          }}
        >
          <label className="field">
            FY start month
            <select name="fyStartMonth" defaultValue={String(data.settings.fyStartMonth)} aria-label="FY start month">
              {MONTH_NAMES.map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Base
            <input name="baseCurrency" defaultValue={data.settings.baseCurrency} />
          </label>
          <label className="field">
            Display
            <input name="displayCurrency" defaultValue={data.settings.displayCurrency} />
          </label>
          <label className="field">
            Auto-confirm ≥
            <input
              name="autoConfirmMinConfidence"
              type="number"
              min={0.5}
              max={1}
              step={0.01}
              placeholder="off"
              defaultValue={data.settings.autoConfirmMinConfidence ?? ""}
            />
          </label>
          <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input
              name="monthlyPackEnabled"
              type="checkbox"
              defaultChecked={!!data.settings.monthlyPackEnabled}
            />
            Monthly pack
          </label>
          <label className="field">
            Pack day (UTC)
            <input
              name="monthlyPackDay"
              type="number"
              min={1}
              max={28}
              defaultValue={data.settings.monthlyPackDay ?? 1}
            />
          </label>
          <button className="btn sm" type="submit">
            Save
          </button>
        </form>
      )}
      </Panel>
      )}

      {tab === "formula" && (
      <Panel
        title="Formula book"
        kicker="Firm metric dictionary"
        actions={
          isAdmin ? (
            <button
              type="button"
              className="btn sm"
              disabled={busy}
              onClick={async () => {
                setFormulaMsg("");
                setFormulaFields({});
                const metrics: Record<string, { label: string; aliases: string[]; defaultUnit: string }> = {};
                const local: Record<string, string> = {};
                for (const m of METRIC_CATALOG) {
                  const d = formulaDraft[m.key];
                  if (!d) continue;
                  const label = d.label.trim();
                  if (!label) {
                    local[`${m.key}.label`] = "label required";
                    continue;
                  }
                  const aliases = d.aliases
                    .split(",")
                    .map((a) => a.trim().toLowerCase())
                    .filter(Boolean);
                  const unitOk = UnitSchema.safeParse(d.defaultUnit);
                  if (!unitOk.success) {
                    local[`${m.key}.defaultUnit`] = "invalid unit";
                    continue;
                  }
                  const base = METRIC_CATALOG.find((x) => x.key === m.key)!;
                  const sameLabel = label === base.label;
                  const sameAliases =
                    aliases.length === base.aliases.length &&
                    aliases.every((a, i) => a === base.aliases[i]);
                  const sameUnit = d.defaultUnit === base.defaultUnit;
                  if (sameLabel && sameAliases && sameUnit) continue;
                  metrics[m.key] = {
                    label,
                    aliases: aliases.length ? aliases : base.aliases,
                    defaultUnit: d.defaultUnit,
                  };
                }
                if (Object.keys(local).length) {
                  setFormulaFields(local);
                  setFormulaMsg("Fix the highlighted rows");
                  return;
                }
                setBusy(true);
                try {
                  await api("/api/settings/formula-book", {
                    method: "POST",
                    body: JSON.stringify({ metrics }),
                  });
                  setFormulaMsg("Saved");
                  load();
                } catch (ex) {
                  const raw = ex instanceof Error ? ex.message : "Could not save formula book";
                  setFormulaMsg(friendlyAuthError(raw));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : "Save formula book"}
            </button>
          ) : null
        }
      >
        <p className="lede" style={{ marginTop: 0 }}>
          Edit firm labels, MIS aliases, and default units. Derived rules (like runway) stay
          deterministic — you can rename them, not rewrite the math.
          {!isAdmin ? " Org Admin can save changes." : ""}
        </p>
        {formulaMsg && (
          <p className={Object.keys(formulaFields).length ? "sev-high" : "lede"} role="status">
            {formulaMsg}
          </p>
        )}
        <div className="formula-book">
          {(data?.formulaBook ?? METRIC_CATALOG.map((m) => ({
            key: m.key,
            label: m.label,
            catalogLabel: m.label,
            unitFamily: m.unitFamily,
            defaultUnit: m.defaultUnit,
            catalogDefaultUnit: m.defaultUnit,
            aliases: m.aliases,
            catalogAliases: m.aliases,
            derivedFormula: m.key === "runway_months" ? "Cash ÷ average of the last up to three booked burn months" : null,
            overridden: false,
          }))).map((m) => {
            const draft = formulaDraft[m.key] ?? {
              label: m.label,
              aliases: m.aliases.join(", "),
              defaultUnit: m.defaultUnit,
            };
            const open = formulaOpen === m.key;
            const unitsForFamily = (UnitSchema.options as Unit[]).filter((u) => {
              if (u === "unknown") return false;
              if (m.unitFamily === "money") return ["lakh", "crore", "thousand", "million", "unit"].includes(u);
              if (m.unitFamily === "percent") return u === "percent";
              if (m.unitFamily === "months") return u === "months";
              if (m.unitFamily === "count") return u === "count" || u === "unit";
              return true;
            });
            return (
              <div key={m.key} className={`formula-row${m.overridden ? " is-overridden" : ""}${open ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="formula-row-head"
                  aria-expanded={open}
                  onClick={() => setFormulaOpen(open ? null : m.key)}
                >
                  <span className="formula-row-title">
                    <strong>{draft.label}</strong>
                    <span className="lede">{titleCaseKind(m.key)}</span>
                  </span>
                  <span className="formula-row-meta">
                    {m.derivedFormula ? <span className="badge">Derived</span> : null}
                    {m.overridden ? <span className="badge">Firm</span> : null}
                    <span className="lede">{titleCaseKind(m.unitFamily)} · {draft.defaultUnit}</span>
                  </span>
                </button>
                {open ? (
                  <div className="formula-row-body">
                    {m.derivedFormula ? (
                      <p className="formula-derived">
                        <span className="page-kicker">Formula</span>
                        {m.derivedFormula}
                      </p>
                    ) : null}
                    <div className="formula-edit-grid">
                      <label className="field">
                        <span>Display label</span>
                        <input
                          value={draft.label}
                          disabled={!isAdmin}
                          aria-invalid={Boolean(formulaFields[`${m.key}.label`])}
                          aria-label={`${m.catalogLabel} label`}
                          onChange={(e) =>
                            setFormulaDraft({
                              ...formulaDraft,
                              [m.key]: { ...draft, label: e.target.value },
                            })
                          }
                        />
                        {formulaFields[`${m.key}.label`] ? (
                          <span className="sev-high">{formulaFields[`${m.key}.label`]}</span>
                        ) : null}
                      </label>
                      <label className="field">
                        <span>Default unit</span>
                        <select
                          value={draft.defaultUnit}
                          disabled={!isAdmin}
                          aria-label={`${m.catalogLabel} default unit`}
                          onChange={(e) =>
                            setFormulaDraft({
                              ...formulaDraft,
                              [m.key]: { ...draft, defaultUnit: e.target.value },
                            })
                          }
                        >
                          {unitsForFamily.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                        {formulaFields[`${m.key}.defaultUnit`] ? (
                          <span className="sev-high">{formulaFields[`${m.key}.defaultUnit`]}</span>
                        ) : null}
                      </label>
                      <label className="field formula-aliases">
                        <span>MIS aliases · comma-separated</span>
                        <textarea
                          rows={2}
                          value={draft.aliases}
                          disabled={!isAdmin}
                          aria-label={`${m.catalogLabel} aliases`}
                          onChange={(e) =>
                            setFormulaDraft({
                              ...formulaDraft,
                              [m.key]: { ...draft, aliases: e.target.value },
                            })
                          }
                        />
                        <span className="field-hint">
                          Catalog defaults: {m.catalogAliases.join(", ")}
                        </span>
                      </label>
                    </div>
                    {isAdmin ? (
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() =>
                          setFormulaDraft({
                            ...formulaDraft,
                            [m.key]: {
                              label: m.catalogLabel,
                              aliases: m.catalogAliases.join(", "),
                              defaultUnit: m.catalogDefaultUnit,
                            },
                          })
                        }
                      >
                        Reset to catalog
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Panel>
      )}

      {tab === "people" && (
      <>
      <Panel title="People" flush>
      <div id="people" />
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
                <td>{m.name || <Miss />}</td>
                <td>{m.email || <Miss />}</td>
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
      </Panel>

      <Panel title="Invite">
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
        <p className="lede">Org Admin only</p>
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
      </Panel>
      </>
      )}

      {tab === "firm" && (
      <Panel title="Connectors" flush>
      <div className="panel-body">
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
              <td>{c.status === "not_connected" ? "not connected" : titleCaseKind(c.status)}</td>
              <td>{c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : <Miss />}</td>
              <td className="lede">{c.lastError || <Miss />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <Link className="btn sm" href="/settings/connectors">
          Connectors
        </Link>
      </p>
      </div>
      </Panel>
      )}

      {tab === "flags" && (
      <Panel title="Flag policy" id="flag-policy">
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
            setPolicyMsg("Fix thresholds");
            return;
          }
          try {
            await api("/api/settings/flag-policy", {
              method: "POST",
              body: JSON.stringify({ thresholds }),
            });
            setPolicyMsg("Saved");
            load();
          } catch (ex) {
            const raw = ex instanceof Error ? ex.message : "Could not save policy";
            setPolicyMsg(friendlyAuthError(raw));
          }
        }}
      >
        <table>
          <thead>
            <tr>
              <th>Flag</th>
              <th>Default</th>
              <th>Bounds</th>
              <th>Firm</th>
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
                  {f.min ?? 0} to {f.max ?? ""} {f.unit ?? ""}
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
        {isAdmin && (
          <button className="btn sm" type="submit" style={{ marginTop: 10 }} data-testid="save-flag-policy">
            Save
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
          <h3>Audit</h3>
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
                  <td>{a.changedByName ?? a.changedByEmail ?? <Miss />}</td>
                  <td className="lede">{JSON.stringify(a.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      </Panel>
      )}

      {tab === "funds" && (
      <Panel title="Funds">
      {funds.length === 0 ? (
        <div className="empty">No funds</div>
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
                <td>{f.vintage ?? <Miss />}</td>
                <td>{f.currency ?? "INR"}</td>
                <td>{f.committedCapital == null ? <Miss /> : f.committedCapital.toLocaleString("en-IN")}</td>
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
      </Panel>
      )}
      </div>
    </>
  );
}
