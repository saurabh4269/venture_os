"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  CONNECTOR_KINDS,
  connectorLabel,
  validateAffinityApiKey,
  validateGranolaApiKey,
  validateOnedriveCredentials,
  type ConnectorKind,
  type ConnectorStatus,
} from "@venture-os/core";
import { PageHead, Panel, SettingsSubnav } from "@/components/BookUI";
import { IconKey, IconLock } from "@/components/Icons";
import { useBookSession } from "@/components/Shell";
import { api } from "@/lib/api";
import { bookErrorMessage } from "@/lib/wake";

type ConnectorView = {
  kind: ConnectorKind;
  label: string;
  status: ConnectorStatus;
  lastError: string | null;
  lastSyncAt?: string;
  lastHealthAt: string | null;
  hasCredentials: boolean;
  usingEnvFallback: boolean;
  secretHint: string | null;
  config: {
    authMode?: "auth_code" | "client_credentials";
    ownershipFieldId?: string;
    driveId?: string;
    userId?: string;
    hasRefreshToken?: boolean;
  };
};

type FormState = {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  apiKey: string;
  authMode: "auth_code" | "client_credentials";
  ownershipFieldId: string;
  driveId: string;
  userId: string;
};

const EMPTY: FormState = {
  clientId: "",
  clientSecret: "",
  tenantId: "",
  apiKey: "",
  authMode: "auth_code",
  ownershipFieldId: "",
  driveId: "",
  userId: "",
};

function statusLabel(status: ConnectorStatus) {
  if (status === "not_connected") return "not connected";
  return status.replaceAll("_", " ");
}

function ConnectorCards() {
  const { isAdmin } = useBookSession();
  const search = useSearchParams();
  const [rows, setRows] = useState<ConnectorView[]>([]);
  const [forms, setForms] = useState<Record<string, FormState>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string>("");
  const [affinityFields, setAffinityFields] = useState<{ id: string; name: string; type?: string }[]>([]);
  const [affinityFieldsErr, setAffinityFieldsErr] = useState("");

  const oauthNote = search.get("onedrive") || search.get("error");

  function load() {
    if (!isAdmin) return;
    api<{ connectors: ConnectorView[] }>("/api/connectors")
      .then((r) => {
        setRows(r.connectors);
        setForms((prev) => {
          const next = { ...prev };
          for (const c of r.connectors) {
            next[c.kind] = {
              ...(next[c.kind] ?? EMPTY),
              clientId: "",
              clientSecret: "",
              tenantId: "",
              apiKey: "",
              authMode: c.config.authMode ?? "auth_code",
              ownershipFieldId: c.config.ownershipFieldId ?? "",
              driveId: c.config.driveId ?? "",
              userId: c.config.userId ?? "",
            };
          }
          return next;
        });
      })
      .catch((e: Error) => setErr({ page: bookErrorMessage(e.message) }));
  }

  useEffect(() => {
    load();
  }, [isAdmin]);

  function form(kind: string): FormState {
    return forms[kind] ?? EMPTY;
  }

  async function loadAffinityFields() {
    setAffinityFieldsErr("");
    setBusy("affinity-fields");
    try {
      const r = await api<{ fields: { id: string; name: string; type?: string }[] }>(
        "/api/connectors/affinity/fields",
      );
      setAffinityFields(r.fields);
    } catch (e) {
      setAffinityFields([]);
      setAffinityFieldsErr(bookErrorMessage(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy("");
    }
  }

  function valid(kind: ConnectorKind): boolean {
    const f = form(kind);
    if (kind === "onedrive") return validateOnedriveCredentials(f).ok;
    if (kind === "affinity") return validateAffinityApiKey(f.apiKey).ok;
    return validateGranolaApiKey(f.apiKey).ok;
  }

  async function save(kind: ConnectorKind) {
    const f = form(kind);
    const checked =
      kind === "onedrive"
        ? validateOnedriveCredentials(f)
        : kind === "affinity"
          ? validateAffinityApiKey(f.apiKey)
          : validateGranolaApiKey(f.apiKey);
    if (!checked.ok) {
      setErr((m) => ({ ...m, [kind]: checked.error }));
      return;
    }
    const rowHasCred = Boolean(rows.find((r) => r.kind === kind)?.hasCredentials);
    setBusy(`save-${kind}`);
    setErr((m) => ({ ...m, [kind]: "" }));
    try {
      await api(`/api/connectors/${kind}/credentials`, {
        method: "POST",
        body: JSON.stringify({
          clientId: f.clientId || undefined,
          clientSecret: f.clientSecret || undefined,
          tenantId: f.tenantId || undefined,
          apiKey: f.apiKey || undefined,
          authMode: kind === "onedrive" ? f.authMode : undefined,
          ownershipFieldId: f.ownershipFieldId || undefined,
          driveId: f.driveId || undefined,
          userId: f.userId || undefined,
        }),
      });
      setMsg((m) => ({
        ...m,
        [kind]: rowHasCred
          ? "Rotated. Plaintext cleared from this form. Test connection before Connect."
          : "Saved. Plaintext cleared from this form. Test connection before Connect.",
      }));
      setForms((prev) => ({
        ...prev,
        [kind]: { ...form(kind), clientSecret: "", apiKey: "", clientId: "", tenantId: "" },
      }));
      load();
    } catch (e) {
      setErr((m) => ({ ...m, [kind]: e instanceof Error ? e.message : "save_failed" }));
    } finally {
      setBusy("");
    }
  }

  async function test(kind: ConnectorKind) {
    setBusy(`test-${kind}`);
    setErr((m) => ({ ...m, [kind]: "" }));
    try {
      await api(`/api/connectors/${kind}/test`, { method: "POST", body: "{}" });
      setMsg((m) => ({ ...m, [kind]: "Health check succeeded. Sync can start." }));
      load();
    } catch (e) {
      setErr((m) => ({ ...m, [kind]: e instanceof Error ? e.message : "test_failed" }));
      load();
    } finally {
      setBusy("");
    }
  }

  async function connect(kind: ConnectorKind) {
    if (!valid(kind) && !rows.find((r) => r.kind === kind)?.hasCredentials) return;
    setBusy(`connect-${kind}`);
    setErr((m) => ({ ...m, [kind]: "" }));
    try {
      const res = await api<{ authorizeUrl?: string }>(`/api/connectors/${kind}/connect`, {
        method: "POST",
        body: "{}",
      });
      if (res.authorizeUrl) {
        window.location.href = res.authorizeUrl;
        return;
      }
      setMsg((m) => ({ ...m, [kind]: "Connected. Sync is queued." }));
      load();
    } catch (e) {
      setErr((m) => ({ ...m, [kind]: e instanceof Error ? e.message : "connect_failed" }));
      load();
    } finally {
      setBusy("");
    }
  }

  async function disconnect(kind: ConnectorKind) {
    setBusy(`disc-${kind}`);
    try {
      await api(`/api/connectors/${kind}/disconnect`, { method: "POST", body: "{}" });
      setMsg((m) => ({ ...m, [kind]: "Disconnected. Credentials cleared." }));
      load();
    } catch (e) {
      setErr((m) => ({ ...m, [kind]: e instanceof Error ? e.message : "disconnect_failed" }));
    } finally {
      setBusy("");
    }
  }

  const help = useMemo(
    () => ({
      onedrive:
        "Azure app: Files.Read.All + offline_access (delegated) or Files.Read.All (app-only). Redirect URI must be this site’s /api/connectors/onedrive/callback.",
      affinity:
        "Paste an Affinity v2 API key (Settings → Manage Apps). Load Affinity fields, then set an ownership field id. We never invent CRM fields.",
      granola:
        "Granola Business/Enterprise key (grn_…). Map each company to a note id (not_…). Transcripts become subjective Confirm proposals only, never objective metric cells.",
    }),
    [],
  );

  return (
    <><PageHead
        kicker="Settings"
        title="Connectors"
        lede="Not connected until a real health check passes."
        badge={
          isAdmin ? (
            <span className="badge">
              <IconLock /> Org Admin
            </span>
          ) : (
            <span className="badge">Read only</span>
          )
        }
      />
      <SettingsSubnav current="connectors" />
      {oauthNote && (
        <p className={search.get("error") ? "sev-high" : "lede"} role="status">
          {search.get("error") ? `OAuth error: ${search.get("error")}` : `OneDrive ${search.get("onedrive")}.`}
        </p>
      )}
      {err.page && (
        <p className="sev-high" role="alert">
          {err.page}
        </p>
      )}

      <h2 className="section-title">Active connections</h2>
      <div className="connector-grid" data-testid="connector-cards">
        {CONNECTOR_KINDS.map((kind) => {
          const row = rows.find((r) => r.kind === kind);
          const status = row?.status ?? "not_connected";
          const f = form(kind);
          const canConnect = isAdmin && (valid(kind) || Boolean(row?.hasCredentials));
          return (
            <section className="card connector-card" key={kind} data-testid={`connector-card-${kind}`}>
              <div className="vault-row">
                <div className="conn-mark" aria-hidden>
                  {connectorLabel(kind).slice(0, 1)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row">
                    <strong>{connectorLabel(kind)}</strong>
                    <span className={`badge badge-${status}`} data-testid={`connector-status-${kind}`}>
                      {status === "connected" ? "● Connected" : statusLabel(status)}
                    </span>
                  </div>
                  <div className="row" style={{ marginTop: 6 }}>
                    {row?.usingEnvFallback && <span className="lede">env default</span>}
                    {row?.hasCredentials ? (
                      <span className="lede" data-testid={`connector-hint-${kind}`}>
                        <IconKey /> {row.secretHint ?? "••••"}
                      </span>
                    ) : (
                      <span className="lede">No org key saved</span>
                    )}
                    {row?.lastHealthAt ? (
                      <span className="lede">Last health {new Date(row.lastHealthAt).toLocaleDateString()}</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <p className="lede" style={{ marginTop: 8 }}>
                {help[kind]}
              </p>
              {row?.lastError && (
                <p className="sev-high" role="alert" data-testid={`connector-error-${kind}`}>
                  {row.lastError}
                </p>
              )}
              <p className="lede">
                Last successful sync: {row?.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString() : ""}
              </p>

              {isAdmin ? (
                <form
                  className="field"
                  style={{ gap: 8, marginTop: 10 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    save(kind);
                  }}
                >
                  {kind === "onedrive" && (
                    <>
                      <label className="field">
                        Auth mode
                        <select
                          value={f.authMode}
                          onChange={(e) =>
                            setForms((p) => ({
                              ...p,
                              [kind]: { ...form(kind), authMode: e.target.value as FormState["authMode"] },
                            }))
                          }
                          aria-label="OneDrive auth mode"
                        >
                          <option value="auth_code">Delegated (auth code + refresh)</option>
                          <option value="client_credentials">App-only (client credentials)</option>
                        </select>
                      </label>
                      <label className="field">
                        Application (client) ID
                        <input
                          value={f.clientId}
                          onChange={(e) => setForms((p) => ({ ...p, [kind]: { ...form(kind), clientId: e.target.value } }))}
                          autoComplete="off"
                          data-testid="onedrive-client-id"
                        />
                      </label>
                      <label className="field">
                        Client secret
                        <input
                          type="password"
                          value={f.clientSecret}
                          onChange={(e) =>
                            setForms((p) => ({ ...p, [kind]: { ...form(kind), clientSecret: e.target.value } }))
                          }
                          autoComplete="new-password"
                          data-testid="onedrive-client-secret"
                        />
                      </label>
                      <label className="field">
                        Directory (tenant) ID
                        <input
                          value={f.tenantId}
                          onChange={(e) => setForms((p) => ({ ...p, [kind]: { ...form(kind), tenantId: e.target.value } }))}
                          data-testid="onedrive-tenant-id"
                        />
                      </label>
                      {f.authMode === "client_credentials" && (
                        <>
                          <label className="field">
                            Drive id (app-only)
                            <input
                              value={f.driveId}
                              onChange={(e) => setForms((p) => ({ ...p, [kind]: { ...form(kind), driveId: e.target.value } }))}
                            />
                          </label>
                          <label className="field">
                            User id (app-only, optional)
                            <input
                              value={f.userId}
                              onChange={(e) => setForms((p) => ({ ...p, [kind]: { ...form(kind), userId: e.target.value } }))}
                            />
                          </label>
                        </>
                      )}
                    </>
                  )}
                  {kind === "affinity" && (
                    <>
                      <label className="field">
                        API key
                        <input
                          type="password"
                          value={f.apiKey}
                          onChange={(e) => setForms((p) => ({ ...p, [kind]: { ...form(kind), apiKey: e.target.value } }))}
                          autoComplete="new-password"
                          data-testid="affinity-api-key"
                        />
                      </label>
                      <label className="field">
                        Ownership field id (optional)
                        <input
                          value={f.ownershipFieldId}
                          onChange={(e) =>
                            setForms((p) => ({ ...p, [kind]: { ...form(kind), ownershipFieldId: e.target.value } }))
                          }
                          placeholder="from GET /v2/companies/fields"
                          list="affinity-field-ids"
                        />
                      </label>
                      <datalist id="affinity-field-ids">
                        {affinityFields.map((af) => (
                          <option key={af.id} value={af.id}>
                            {af.name}
                            {af.type ? ` (${af.type})` : ""}
                          </option>
                        ))}
                      </datalist>
                      <button
                        className="btn ghost sm"
                        type="button"
                        disabled={Boolean(busy) || !row?.hasCredentials}
                        onClick={() => void loadAffinityFields()}
                        data-testid="affinity-load-fields"
                      >
                        {busy === "affinity-fields" ? "Loading fields…" : "Load Affinity fields"}
                      </button>
                      {affinityFieldsErr ? <p className="error">{affinityFieldsErr}</p> : null}
                      {affinityFields.length > 0 ? (
                        <p className="muted">
                          {affinityFields.length} field{affinityFields.length === 1 ? "" : "s"} loaded. Pick an id for
                          ownership, or paste one.
                        </p>
                      ) : null}
                    </>
                  )}
                  {kind === "granola" && (
                    <label className="field">
                      API key
                      <input
                        type="password"
                        value={f.apiKey}
                        onChange={(e) => setForms((p) => ({ ...p, [kind]: { ...form(kind), apiKey: e.target.value } }))}
                        autoComplete="new-password"
                        data-testid="granola-api-key"
                      />
                    </label>
                  )}
                  <div className="row">
                    <button className="btn sm" type="submit" disabled={Boolean(busy)}>
                      {busy === `save-${kind}`
                        ? row?.hasCredentials
                          ? "Rotating…"
                          : "Saving…"
                        : row?.hasCredentials
                          ? "Rotate"
                          : "Save"}
                    </button>
                    <button
                      className="btn ghost sm"
                      type="button"
                      disabled={Boolean(busy) || (!valid(kind) && !row?.hasCredentials)}
                      onClick={() => test(kind)}
                      data-testid={`connector-test-${kind}`}
                    >
                      {busy === `test-${kind}` ? "Testing…" : "Test connection"}
                    </button>
                    <button
                      className="btn sm"
                      type="button"
                      disabled={!canConnect || Boolean(busy)}
                      onClick={() => connect(kind)}
                      data-testid={`connector-connect-${kind}`}
                      title={canConnect ? "Connect" : "Save valid credentials first"}
                    >
                      {busy === `connect-${kind}` ? "Connecting…" : "Connect"}
                    </button>
                    <button
                      className="btn ghost sm danger-text"
                      type="button"
                      disabled={status === "not_connected" || Boolean(busy)}
                      onClick={() => disconnect(kind)}
                    >
                      Disconnect
                    </button>
                  </div>
                </form>
              ) : (
                <p className="lede">Only Org Admin can paste keys.</p>
              )}
              {err[kind] && (
                <p className="sev-high" role="alert" data-testid={`connector-form-error-${kind}`}>
                  {err[kind]}
                </p>
              )}
              {msg[kind] && (
                <p className="lede" role="status">
                  {msg[kind]}
                </p>
              )}
            </section>
          );
        })}
      </div>
      <p className="lede" style={{ marginTop: 16 }}>
        Map OneDrive, Affinity, or Granola ids on each <Link href="/companies">company</Link>, then sync into Confirm.
      </p>
      <Panel title="How keys are stored">
        <div className="vault-card" style={{ marginTop: 0 }}>
          <div className="vault-ico" aria-hidden>
            <IconLock />
          </div>
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Org keys are sealed with AES-256-GCM. Postgres holds ciphertext, nonce, and key version, never the
              envelope key. After save, this form clears secrets from memory.
            </p>
            <p className="lede" style={{ margin: 0 }}>
              Only Org Admin can paste or rotate. Disconnect clears the envelope. Status stays not connected without a
              real health check.
            </p>
          </div>
        </div>
      </Panel>
    </>
  );
}

export default function ConnectorsPage() {
  return (
    <Suspense
      fallback={
          <p className="lede">Loading the book…</p>
        }
    >
      <ConnectorCards />
    </Suspense>
  );
}
