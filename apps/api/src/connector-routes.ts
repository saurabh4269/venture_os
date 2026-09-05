import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  CONNECTOR_KINDS,
  connectorLabel,
  isConnectorKind,
  statusAfterSave,
  validateCompanyConnectorMapping,
  validateConnectorCredentials,
  type ConnectorKind,
} from "@venture-os/core";
import { exchangeOnedriveCode, onedriveAuthorizeUrl } from "@venture-os/core/server";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { loadEnv } from "@venture-os/config";
import { CompanyConnectorMappingSchema, SaveConnectorCredentialsSchema } from "@venture-os/schema";
import {
  companies,
  connectors,
  disconnectConnector,
  ensureOrgDefaults,
  persistSecretColumns,
  recordConnectorAudit,
  resolveSecrets,
  runConnectorHealth,
  toPublicView,
  withOrg,
  type ConnectorSecrets,
} from "@venture-os/db";
import { HttpError, requireAdmin, requireWrite } from "./context.js";
import { enqueueConnectorHealth, enqueueConnectorSync } from "./queues.js";
import { CONNECTOR_MUTATE_LIMIT, CONNECTOR_MUTATE_WINDOW_MS, allowRequestShared } from "./rate-limit.js";
import { log } from "./log.js";

export const connectorRoutes = new Hono();

function kindParam(raw: string): ConnectorKind {
  if (!isConnectorKind(raw)) throw new HttpError(400, "unknown_connector");
  return raw;
}

function redirectUri(): string {
  const env = loadEnv();
  return `${env.WEB_URL.replace(/\/$/, "")}/api/connectors/onedrive/callback`;
}

function oauthSecret(): string {
  const env = loadEnv();
  return env.CONNECTOR_SECRETS_KEY || env.CONNECTOR_SEAL_SECRET || env.BETTER_AUTH_SECRET;
}

async function rateLimitConnector(orgId: string, userId: string, action: string) {
  const ok = await allowRequestShared(
    `connector:${action}:${orgId}:${userId}`,
    CONNECTOR_MUTATE_LIMIT,
    CONNECTOR_MUTATE_WINDOW_MS,
  );
  if (!ok) throw new HttpError(429, "rate_limited");
}

function signOauthState(orgId: string): string {
  const nonce = randomBytes(12).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ orgId, nonce, exp: Date.now() + 15 * 60_000 })).toString("base64url");
  const sig = createHmac("sha256", oauthSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyOauthState(state: string): string {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) throw new HttpError(400, "invalid_oauth_state");
  const expected = createHmac("sha256", oauthSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(400, "invalid_oauth_state");
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    orgId?: string;
    exp?: number;
  };
  if (!parsed.orgId || !parsed.exp || parsed.exp < Date.now()) throw new HttpError(400, "oauth_state_expired");
  return parsed.orgId;
}

async function publicConnectors(orgId: string) {
  await ensureOrgDefaults(orgId);
  return withOrg(orgId, async (tx) => {
    const rows = await tx.select().from(connectors);
    return CONNECTOR_KINDS.map((kind) => {
      const row = rows.find((r) => r.kind === kind) ?? {
        status: "not_connected",
        lastError: null,
        lastSyncAt: null,
        lastHealthAt: null,
        sealedCredentials: null,
        config: {},
      };
      return { ...toPublicView(kind, row), label: connectorLabel(kind) };
    });
  });
}

connectorRoutes.get("/api/connectors", async (c) => {
  const s = requireAdmin(c);
  return c.json({ connectors: await publicConnectors(s.orgId) });
});

connectorRoutes.post("/api/connectors/:kind/credentials", async (c) => {
  const s = requireAdmin(c);
  const kind = kindParam(c.req.param("kind"));
  const body = SaveConnectorCredentialsSchema.parse({ ...(await c.req.json()), kind });
  const checked = validateConnectorCredentials({
    kind,
    clientId: body.clientId,
    clientSecret: body.clientSecret,
    tenantId: body.tenantId,
    apiKey: body.apiKey,
    authMode: body.authMode,
  });
  if (!checked.ok) return c.json({ error: checked.error, fields: checked.fields }, 400);
  await rateLimitConnector(s.orgId, s.user.id, "save");

  const secrets: ConnectorSecrets = {
    clientId: body.clientId,
    clientSecret: body.clientSecret,
    tenantId: body.tenantId,
    apiKey: body.apiKey,
    authMode: body.authMode ?? (kind === "onedrive" ? "auth_code" : undefined),
    ownershipFieldId: body.ownershipFieldId,
    driveId: body.driveId,
    userId: body.userId,
  };
  await withOrg(s.orgId, async (tx) => {
    const [existing] = await tx.select().from(connectors).where(eq(connectors.kind, kind));
    const prev = existing ? resolveSecrets(existing, kind).secrets : null;
    const hadOrgSecret = Boolean(existing?.secretCiphertext || existing?.sealedCredentials);
    const merged: ConnectorSecrets = {
      ...prev,
      ...secrets,
      refreshToken: prev?.refreshToken,
      accessToken: kind === "onedrive" ? undefined : prev?.accessToken,
      accessTokenExpiresAt: kind === "onedrive" ? undefined : prev?.accessTokenExpiresAt,
    };
    const persist = persistSecretColumns(merged);
    if (!existing) {
      await tx.insert(connectors).values({
        orgId: s.orgId,
        kind,
        status: statusAfterSave(true),
        ...persist,
        lastError: null,
        lastSyncAt: null,
        lastHealthAt: null,
      });
    } else {
      await tx
        .update(connectors)
        .set({
          status: statusAfterSave(true),
          ...persist,
          lastError: null,
        })
        .where(eq(connectors.id, existing.id));
    }
    await recordConnectorAudit(tx, s.orgId, kind, hadOrgSecret ? "rotate" : "save", s.user.id);
  });
  log("info", "connector_credentials_saved", { orgId: s.orgId, userId: s.user.id, kind });
  return c.json({ connectors: await publicConnectors(s.orgId) });
});

connectorRoutes.post("/api/connectors/:kind/test", async (c) => {
  const s = requireAdmin(c);
  const kind = kindParam(c.req.param("kind"));
  await rateLimitConnector(s.orgId, s.user.id, "test");
  const result = await runConnectorHealth(s.orgId, kind, globalThis.fetch, s.user.id);
  if (result.status === "connected") {
    await enqueueConnectorHealth(s.orgId, kind);
  }
  log("info", "connector_test", { orgId: s.orgId, userId: s.user.id, kind, status: result.status });
  return c.json({ ...result, connectors: await publicConnectors(s.orgId) }, result.status === "connected" ? 200 : 400);
});

connectorRoutes.post("/api/connectors/:kind/connect", async (c) => {
  const s = requireAdmin(c);
  const kind = kindParam(c.req.param("kind"));
  if (kind === "onedrive") {
    const view = (await publicConnectors(s.orgId)).find((x) => x.kind === "onedrive");
    if (!view?.hasCredentials) throw new HttpError(400, "save_credentials_first");
    if ((view.config.authMode ?? "auth_code") === "auth_code") {
      const row = await withOrg(s.orgId, async (tx) => {
        const [r] = await tx.select().from(connectors).where(eq(connectors.kind, "onedrive"));
        return r;
      });
      const secrets = row ? resolveSecrets(row, "onedrive").secrets : null;
      if (!secrets?.clientId || !secrets.tenantId) throw new HttpError(400, "save_credentials_first");
      const url = onedriveAuthorizeUrl({
        tenantId: secrets.tenantId,
        clientId: secrets.clientId,
        redirectUri: redirectUri(),
        state: signOauthState(s.orgId),
      });
      await withOrg(s.orgId, (tx) => recordConnectorAudit(tx, s.orgId, "onedrive", "connect", s.user.id));
      log("info", "connector_connect", { orgId: s.orgId, userId: s.user.id, kind, status: "authorize" });
      return c.json({ authorizeUrl: url });
    }
  }
  const result = await runConnectorHealth(s.orgId, kind, globalThis.fetch, s.user.id);
  if (result.status === "connected") await enqueueConnectorSync(s.orgId, kind);
  log("info", "connector_connect", { orgId: s.orgId, userId: s.user.id, kind, status: result.status });
  return c.json({ ...result, connectors: await publicConnectors(s.orgId) }, result.status === "connected" ? 200 : 400);
});

connectorRoutes.post("/api/connectors/:kind/disconnect", async (c) => {
  const s = requireAdmin(c);
  const kind = kindParam(c.req.param("kind"));
  await disconnectConnector(s.orgId, kind, s.user.id);
  log("info", "connector_disconnect", { orgId: s.orgId, userId: s.user.id, kind });
  return c.json({ connectors: await publicConnectors(s.orgId) });
});

connectorRoutes.post("/api/connectors/:kind/sync", async (c) => {
  const s = requireWrite(c);
  const kind = kindParam(c.req.param("kind"));
  const body = await c.req.json().catch(() => ({} as { companyId?: string }));
  const queued = await enqueueConnectorSync(s.orgId, kind, body.companyId, s.user.id);
  log("info", "connector_sync_enqueued", { orgId: s.orgId, userId: s.user.id, kind });
  return c.json({ queued, accepted: true });
});

connectorRoutes.get("/api/connectors/onedrive/callback", async (c) => {
  const env = loadEnv();
  const err = c.req.query("error");
  const web = env.WEB_URL.replace(/\/$/, "");
  if (err) return c.redirect(`${web}/settings/connectors?error=${encodeURIComponent(err)}`);
  const code = c.req.query("code");
  const state = c.req.query("state");
  if (!code || !state) return c.redirect(`${web}/settings/connectors?error=missing_code`);
  let orgId: string;
  try {
    orgId = verifyOauthState(state);
  } catch {
    return c.redirect(`${web}/settings/connectors?error=invalid_oauth_state`);
  }
  try {
    await withOrg(orgId, async (tx) => {
      const [row] = await tx.select().from(connectors).where(eq(connectors.kind, "onedrive"));
      if (!row) throw new Error("connector_not_found");
      const { secrets } = resolveSecrets(row, "onedrive");
      if (!secrets?.clientId || !secrets.clientSecret || !secrets.tenantId) throw new Error("missing_credentials");
      const tok = await exchangeOnedriveCode(
        { fetch },
        {
          tenantId: secrets.tenantId,
          clientId: secrets.clientId,
          clientSecret: secrets.clientSecret,
          redirectUri: redirectUri(),
          code,
        },
      );
      const next: ConnectorSecrets = {
        ...secrets,
        accessToken: tok.accessToken,
        refreshToken: tok.refreshToken ?? secrets.refreshToken,
        accessTokenExpiresAt: tok.expiresIn ? Date.now() + tok.expiresIn * 1000 : undefined,
        authMode: "auth_code",
      };
      await tx
        .update(connectors)
        .set({
          status: "configured",
          lastError: null,
          ...persistSecretColumns(next),
        })
        .where(eq(connectors.id, row.id));
      await recordConnectorAudit(tx, orgId, "onedrive", "oauth_callback", null);
    });
    const health = await runConnectorHealth(orgId, "onedrive");
    if (health.status === "connected") await enqueueConnectorSync(orgId, "onedrive");
    return c.redirect(
      `${web}/settings/connectors?onedrive=${health.status === "connected" ? "connected" : "error"}`,
    );
  } catch (ex) {
    return c.redirect(`${web}/settings/connectors?error=${encodeURIComponent(ex instanceof Error ? ex.message : "oauth_failed")}`);
  }
});

connectorRoutes.patch("/api/companies/:id/connector-mapping", async (c) => {
  const s = requireWrite(c);
  const id = c.req.param("id");
  const body = CompanyConnectorMappingSchema.parse(await c.req.json());
  const checked = validateCompanyConnectorMapping(body);
  if (!checked.ok) return c.json({ error: checked.error, fields: checked.fields }, 400);
  const row = await withOrg(s.orgId, async (tx) => {
    const [existing] = await tx.select().from(companies).where(eq(companies.id, id));
    if (!existing) return null;
    const [updated] = await tx
      .update(companies)
      .set({
        onedriveFolderId:
          body.onedriveFolderId === undefined ? existing.onedriveFolderId : body.onedriveFolderId || null,
        onedriveFolderPath:
          body.onedriveFolderPath === undefined ? existing.onedriveFolderPath : body.onedriveFolderPath || null,
        affinityCompanyId:
          body.affinityCompanyId === undefined ? existing.affinityCompanyId : body.affinityCompanyId || null,
        granolaLink: body.granolaLink === undefined ? existing.granolaLink : body.granolaLink || null,
      })
      .where(eq(companies.id, id))
      .returning();
    return updated;
  });
  if (!row) throw new HttpError(404, "company_not_found");
  return c.json({ company: row });
});
