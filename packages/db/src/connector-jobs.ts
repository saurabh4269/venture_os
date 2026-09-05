import { randomUUID } from "node:crypto";
import { deriveConnectorStatus, publicLastSyncAt, statusAfterDisconnect, statusAfterHealth } from "@venture-os/core";
import type { ConnectorKind, ConnectorStatus, MappedAffinityLink } from "@venture-os/core";
import {
  CONNECTORS,
  clientCredentialsOnedriveToken,
  httpWith,
  refreshOnedriveToken,
  sealJson,
  transcriptToText,
  unsealJson,
  type FetchLike,
} from "@venture-os/core/server";
import { loadEnv } from "@venture-os/config";
import { and, eq } from "drizzle-orm";
import { getDb, withOrg, type Database } from "./client.js";
import { organization } from "./schema.js";
import {
  companies,
  connectorCursors,
  connectors,
  documents,
  inboxItems,
  positions,
  sourceRefs,
  documentChunks,
} from "./schema.js";
import { createObjectStore, sha256 } from "./objects.js";
import { runParseJob } from "./ingest.js";

export type ConnectorSecrets = {
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  apiKey?: string;
  refreshToken?: string;
  accessToken?: string;
  accessTokenExpiresAt?: number;
  authMode?: "auth_code" | "client_credentials";
  ownershipFieldId?: string;
  driveId?: string;
  userId?: string;
};

export type ConnectorPublicConfig = {
  authMode?: "auth_code" | "client_credentials";
  tenantId?: string;
  clientId?: string;
  ownershipFieldId?: string;
  driveId?: string;
  userId?: string;
  hasRefreshToken?: boolean;
};

export type ConnectorPublicView = {
  kind: ConnectorKind;
  status: ConnectorStatus;
  lastError: string | null;
  lastSyncAt?: string;
  lastHealthAt: string | null;
  hasCredentials: boolean;
  usingEnvFallback: boolean;
  config: ConnectorPublicConfig;
};

function sealKey(): string {
  const env = loadEnv();
  return env.CONNECTOR_SEAL_SECRET || env.BETTER_AUTH_SECRET;
}

export function envFallbackSecrets(kind: ConnectorKind): ConnectorSecrets | null {
  const env = loadEnv();
  if (kind === "onedrive") {
    if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET || !env.MICROSOFT_TENANT_ID) return null;
    return {
      clientId: env.MICROSOFT_CLIENT_ID,
      clientSecret: env.MICROSOFT_CLIENT_SECRET,
      tenantId: env.MICROSOFT_TENANT_ID,
      authMode: "client_credentials",
    };
  }
  if (kind === "affinity" && env.AFFINITY_API_KEY) return { apiKey: env.AFFINITY_API_KEY };
  if (kind === "granola" && env.GRANOLA_API_KEY) return { apiKey: env.GRANOLA_API_KEY };
  return null;
}

export function readSealedSecrets(blob: string | null | undefined): ConnectorSecrets | null {
  if (!blob) return null;
  try {
    return unsealJson<ConnectorSecrets>(blob, sealKey());
  } catch {
    return null;
  }
}

export function writeSealedSecrets(secrets: ConnectorSecrets): string {
  return sealJson(secrets, sealKey());
}

export function resolveSecrets(
  row: { sealedCredentials: string | null; config: unknown },
  kind: ConnectorKind,
): { secrets: ConnectorSecrets | null; usingEnvFallback: boolean } {
  const sealed = readSealedSecrets(row.sealedCredentials);
  if (sealed && hasKindSecrets(kind, sealed)) return { secrets: mergeConfig(sealed, row.config), usingEnvFallback: false };
  const env = envFallbackSecrets(kind);
  if (env) return { secrets: mergeConfig(env, row.config), usingEnvFallback: true };
  return { secrets: null, usingEnvFallback: false };
}

function mergeConfig(secrets: ConnectorSecrets, config: unknown): ConnectorSecrets {
  const c = config && typeof config === "object" ? (config as ConnectorPublicConfig) : {};
  return {
    ...secrets,
    authMode: secrets.authMode ?? c.authMode,
    ownershipFieldId: secrets.ownershipFieldId ?? c.ownershipFieldId,
    driveId: secrets.driveId ?? c.driveId,
    userId: secrets.userId ?? c.userId,
    tenantId: secrets.tenantId ?? c.tenantId,
    clientId: secrets.clientId ?? c.clientId,
  };
}

function hasKindSecrets(kind: ConnectorKind, s: ConnectorSecrets): boolean {
  if (kind === "onedrive") return Boolean(s.clientId && s.clientSecret && s.tenantId);
  return Boolean(s.apiKey);
}

export function toPublicView(
  kind: ConnectorKind,
  row: {
    status: string;
    lastError: string | null;
    lastSyncAt: Date | null;
    lastHealthAt: Date | null;
    sealedCredentials: string | null;
    config: unknown;
  },
): ConnectorPublicView {
  const { secrets, usingEnvFallback } = resolveSecrets(row, kind);
  const hasCredentials = Boolean(secrets && hasKindSecrets(kind, secrets));
  const lastHealthOk =
    row.status === "connected" ? true : row.status === "error" ? false : null;
  const status = deriveConnectorStatus({
    hasCredentials,
    lastHealthOk,
    lastError: row.lastError,
  });
  const cfg = (row.config && typeof row.config === "object" ? row.config : {}) as ConnectorPublicConfig;
  return {
    kind,
    status,
    lastError: row.lastError,
    lastSyncAt: publicLastSyncAt(row.lastSyncAt),
    lastHealthAt: row.lastHealthAt ? row.lastHealthAt.toISOString() : null,
    hasCredentials,
    usingEnvFallback,
    config: {
      authMode: secrets?.authMode ?? cfg.authMode,
      tenantId: secrets?.tenantId ?? cfg.tenantId,
      clientId: secrets?.clientId ?? cfg.clientId,
      ownershipFieldId: secrets?.ownershipFieldId ?? cfg.ownershipFieldId,
      driveId: secrets?.driveId ?? cfg.driveId,
      userId: secrets?.userId ?? cfg.userId,
      hasRefreshToken: Boolean(secrets?.refreshToken),
    },
  };
}

async function ensureAccessToken(
  kind: ConnectorKind,
  secrets: ConnectorSecrets,
  fetchImpl: FetchLike,
): Promise<ConnectorSecrets> {
  if (kind !== "onedrive") return secrets;
  const now = Date.now();
  if (secrets.accessToken && secrets.accessTokenExpiresAt && secrets.accessTokenExpiresAt > now + 60_000) {
    return secrets;
  }
  const ctx = httpWith(fetchImpl);
  if (secrets.refreshToken && secrets.clientId && secrets.clientSecret) {
    const tok = await refreshOnedriveToken(ctx, {
      tenantId: secrets.tenantId ?? "common",
      clientId: secrets.clientId,
      clientSecret: secrets.clientSecret,
      refreshToken: secrets.refreshToken,
    });
    return persistToken(secrets, tok);
  }
  if ((secrets.authMode ?? "client_credentials") === "client_credentials") {
    const tok = await clientCredentialsOnedriveToken(ctx, {
      tenantId: secrets.tenantId ?? "",
      clientId: secrets.clientId ?? "",
      clientSecret: secrets.clientSecret ?? "",
    });
    return persistToken(secrets, tok);
  }
  throw new Error("onedrive_not_authorized");
}

function persistToken(
  secrets: ConnectorSecrets,
  tok: { accessToken?: string; refreshToken?: string; expiresIn?: number },
): ConnectorSecrets {
  return {
    ...secrets,
    accessToken: tok.accessToken,
    refreshToken: tok.refreshToken ?? secrets.refreshToken,
    accessTokenExpiresAt: tok.expiresIn ? Date.now() + tok.expiresIn * 1000 : secrets.accessTokenExpiresAt,
  };
}

function connectorParams(secrets: ConnectorSecrets, extra: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = { ...extra };
  if (secrets.apiKey) out.apiKey = secrets.apiKey;
  if (secrets.accessToken) out.accessToken = secrets.accessToken;
  if (secrets.authMode) out.authMode = secrets.authMode;
  if (secrets.ownershipFieldId) out.ownershipFieldId = secrets.ownershipFieldId;
  if (secrets.driveId) out.driveId = secrets.driveId;
  if (secrets.userId) out.userId = secrets.userId;
  if (secrets.tenantId) out.tenantId = secrets.tenantId;
  if (secrets.clientId) out.clientId = secrets.clientId;
  if (secrets.clientSecret) out.clientSecret = secrets.clientSecret;
  return out;
}

export async function runConnectorHealth(
  orgId: string,
  kind: ConnectorKind,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<{ status: ConnectorStatus; error?: string }> {
  return withOrg(orgId, async (tx) => {
    const [row] = await tx.select().from(connectors).where(eq(connectors.kind, kind));
    if (!row) throw new Error("connector_not_found");
    let { secrets } = resolveSecrets(row, kind);
    if (!secrets) {
      await tx
        .update(connectors)
        .set({ status: "not_connected", lastError: "missing_credentials" })
        .where(eq(connectors.id, row.id));
      return { status: "not_connected", error: "missing_credentials" };
    }
    try {
      secrets = await ensureAccessToken(kind, secrets, fetchImpl);
      const health = await CONNECTORS[kind].healthCheck(httpWith(fetchImpl), connectorParams(secrets));
      const status = statusAfterHealth(health.ok, health.ok ? null : health.error, true);
      const nextSealed = writeSealedSecrets(secrets);
      await tx
        .update(connectors)
        .set({
          status,
          lastError: health.ok ? null : health.error,
          lastHealthAt: health.ok ? new Date() : row.lastHealthAt,
          sealedCredentials: row.sealedCredentials ? nextSealed : row.sealedCredentials,
        })
        .where(eq(connectors.id, row.id));
      return health.ok ? { status } : { status, error: health.error };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = statusAfterHealth(false, message, true);
      await tx
        .update(connectors)
        .set({ status, lastError: message })
        .where(eq(connectors.id, row.id));
      return { status, error: message };
    }
  });
}

export async function runConnectorSync(
  orgId: string,
  kind: ConnectorKind,
  opts?: { companyId?: string; fetchImpl?: FetchLike; parse?: boolean },
): Promise<{ status: ConnectorStatus; ingested: number; error?: string }> {
  const fetchImpl = opts?.fetchImpl ?? globalThis.fetch;
  const parse = opts?.parse !== false;
  const pendingParse: string[] = [];
  const result = await withOrg(orgId, async (tx) => {
    const [row] = await tx.select().from(connectors).where(eq(connectors.kind, kind));
    if (!row) throw new Error("connector_not_found");
    let { secrets } = resolveSecrets(row, kind);
    if (!secrets) {
      await tx.update(connectors).set({ status: "not_connected", lastError: "missing_credentials" }).where(eq(connectors.id, row.id));
      return { status: "not_connected" as const, ingested: 0, error: "missing_credentials" };
    }
    try {
      secrets = await ensureAccessToken(kind, secrets, fetchImpl);
      const health = await CONNECTORS[kind].healthCheck(httpWith(fetchImpl), connectorParams(secrets));
      if (!health.ok) {
        const status = statusAfterHealth(false, health.error, true);
        await tx.update(connectors).set({ status, lastError: health.error }).where(eq(connectors.id, row.id));
        return { status, ingested: 0, error: health.error };
      }
      const cos = await tx.select().from(companies);
      const mapped = opts?.companyId ? cos.filter((c) => c.id === opts.companyId) : cos;
      let ingested = 0;
      if (kind === "onedrive") ingested = await syncOnedrive(tx, orgId, secrets, mapped, fetchImpl, pendingParse);
      else if (kind === "affinity") ingested = await syncAffinity(tx, orgId, secrets, mapped, fetchImpl);
      else ingested = await syncGranola(tx, orgId, secrets, mapped, fetchImpl);

      const nextSealed = writeSealedSecrets(secrets);
      await tx
        .update(connectors)
        .set({
          status: "connected",
          lastError: null,
          lastHealthAt: new Date(),
          lastSyncAt: new Date(),
          sealedCredentials: row.sealedCredentials ? nextSealed : row.sealedCredentials,
        })
        .where(eq(connectors.id, row.id));
      return { status: "connected" as const, ingested };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await tx
        .update(connectors)
        .set({ status: "error", lastError: message })
        .where(eq(connectors.id, row.id));
      return { status: "error" as const, ingested: 0, error: message };
    }
  });
  // Parse after commit — runParseJob opens its own withOrg() and cannot see
  // uncommitted documents from the sync transaction.
  if (parse && result.status === "connected") {
    for (const documentId of pendingParse) {
      await runParseJob(orgId, documentId);
    }
  }
  return result;
}

async function syncOnedrive(
  tx: Database,
  orgId: string,
  secrets: ConnectorSecrets,
  cos: { id: string; onedriveFolderId: string | null; onedriveFolderPath: string | null }[],
  fetchImpl: FetchLike,
  pendingParse: string[],
): Promise<number> {
  const targets = cos.filter((c) => c.onedriveFolderId || c.onedriveFolderPath);
  if (!targets.length) return 0;
  let ingested = 0;
  const store = createObjectStore();
  for (const co of targets) {
    const extra: Record<string, string> = {};
    if (co.onedriveFolderId) extra.folderId = co.onedriveFolderId;
    if (co.onedriveFolderPath) extra.folderPath = co.onedriveFolderPath;
    const listed = await CONNECTORS.onedrive.listNewArtifacts(httpWith(fetchImpl), connectorParams(secrets, extra));
    for (const art of listed.artifacts) {
      const [prior] = await tx
        .select()
        .from(documents)
        .where(and(eq(documents.externalId, art.externalId), eq(documents.source, "onedrive")));
      if (prior) continue;
      const name = art.name.toLowerCase();
      if (![".xlsx", ".xls", ".csv", ".pdf"].some((ext) => name.endsWith(ext))) continue;
      const fetched = await CONNECTORS.onedrive.fetch(httpWith(fetchImpl), connectorParams(secrets, extra), art);
      if (!fetched.bytes?.length) continue;
      const buf = Buffer.from(fetched.bytes);
      const digest = sha256(buf);
      const safeName = (fetched.filename ?? art.name).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
      const key = `${orgId}/${co.id}/onedrive-${Date.now()}-${safeName}`;
      await store.put(key, buf, fetched.mime || "application/octet-stream");
      const [doc] = await tx
        .insert(documents)
        .values({
          orgId,
          companyId: co.id,
          kind: "mis",
          filename: safeName,
          storageKey: key,
          mime: fetched.mime || "application/octet-stream",
          sha256: digest,
          source: "onedrive",
          externalId: art.externalId,
        })
        .returning();
      if (doc) pendingParse.push(doc.id);
      ingested += 1;
    }
    await upsertCursor(tx, orgId, "onedrive", co.id, listed.cursor ?? null);
  }
  return ingested;
}

async function syncAffinity(
  tx: Database,
  orgId: string,
  secrets: ConnectorSecrets,
  cos: { id: string; affinityCompanyId: string | null }[],
  fetchImpl: FetchLike,
): Promise<number> {
  const listed = await CONNECTORS.affinity.listNewArtifacts(
    httpWith(fetchImpl),
    connectorParams(secrets),
  );
  let updated = 0;
  for (const art of listed.artifacts) {
    const mapped = art.raw as MappedAffinityLink | undefined;
    if (!mapped) continue;
    const match = cos.find((c) => c.affinityCompanyId && c.affinityCompanyId === mapped.affinityCompanyId);
    if (!match) continue;
    if (mapped.ownershipPct == null) continue;
    const pos = await tx.select().from(positions).where(eq(positions.companyId, match.id));
    if (!pos.length) continue;
    await tx.update(positions).set({ ownershipPct: mapped.ownershipPct }).where(eq(positions.id, pos[0]!.id));
    updated += 1;
  }
  await upsertCursor(tx, orgId, "affinity", null, listed.cursor ?? null);
  return updated;
}

async function syncGranola(
  tx: Database,
  orgId: string,
  secrets: ConnectorSecrets,
  cos: { id: string; granolaLink: string | null }[],
  fetchImpl: FetchLike,
): Promise<number> {
  const targets = cos.filter((c) => c.granolaLink);
  if (!targets.length) return 0;
  const listed = await CONNECTORS.granola.listNewArtifacts(httpWith(fetchImpl), connectorParams(secrets));
  let ingested = 0;
  const store = createObjectStore();
  const today = new Date().toISOString().slice(0, 10);
  for (const co of targets) {
    const link = (co.granolaLink ?? "").trim();
    const arts = listed.artifacts.filter((a) => a.externalId === link || a.name === link);
    for (const art of arts) {
      const [prior] = await tx
        .select()
        .from(documents)
        .where(and(eq(documents.externalId, art.externalId), eq(documents.source, "granola")));
      if (prior) continue;
      const fetched = await CONNECTORS.granola.fetch(httpWith(fetchImpl), connectorParams(secrets), art);
      const text = fetched.text || transcriptToText(fetched.payload) || art.name;
      const buf = Buffer.from(text, "utf8");
      const digest = sha256(buf);
      const safeName = `${art.externalId}.txt`.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const key = `${orgId}/${co.id}/granola-${safeName}`;
      await store.put(key, buf, "text/plain");
      const [doc] = await tx
        .insert(documents)
        .values({
          orgId,
          companyId: co.id,
          kind: "transcript",
          filename: safeName,
          storageKey: key,
          mime: "text/plain",
          sha256: digest,
          source: "granola",
          externalId: art.externalId,
        })
        .returning();
      if (!doc) continue;
      const refId = randomUUID();
      await tx.insert(sourceRefs).values({
        id: refId,
        orgId,
        documentId: doc.id,
        locator: { excerpt: text.slice(0, 240) },
        excerpt: text.slice(0, 500),
      });
      await tx.insert(documentChunks).values({
        orgId,
        documentId: doc.id,
        sourceRefId: refId,
        body: text.slice(0, 20_000),
      });
      await tx.insert(inboxItems).values({
        orgId,
        companyId: co.id,
        documentId: doc.id,
        sourceRefId: refId,
        kind: "commentary",
        status: "pending",
        proposed: {
          lane: "subjective",
          body: text.slice(0, 4000),
          periodStart: today.slice(0, 8) + "01",
          periodEnd: today,
          sourceKind: "transcript",
        },
        confidence: 0.6,
        locator: { excerpt: text.slice(0, 120) },
        proposedBy: "granola",
      });
      ingested += 1;
    }
  }
  await upsertCursor(tx, orgId, "granola", null, listed.cursor ?? null);
  return ingested;
}

async function upsertCursor(tx: Database, orgId: string, kind: string, companyId: string | null, cursor: string | null) {
  const existing = companyId
    ? await tx
        .select()
        .from(connectorCursors)
        .where(and(eq(connectorCursors.kind, kind), eq(connectorCursors.companyId, companyId)))
    : await tx.select().from(connectorCursors).where(eq(connectorCursors.kind, kind));
  const row = existing[0];
  if (row) {
    await tx
      .update(connectorCursors)
      .set({ cursor, lastSuccessAt: new Date() })
      .where(eq(connectorCursors.id, row.id));
    return;
  }
  await tx.insert(connectorCursors).values({
    orgId,
    kind,
    companyId,
    cursor,
    lastSuccessAt: new Date(),
  });
}

export async function disconnectConnector(orgId: string, kind: ConnectorKind) {
  return withOrg(orgId, async (tx) => {
    const [row] = await tx.select().from(connectors).where(eq(connectors.kind, kind));
    if (!row) return { status: statusAfterDisconnect() };
    await tx
      .update(connectors)
      .set({
        status: "not_connected",
        sealedCredentials: null,
        lastError: null,
        lastSyncAt: null,
        lastHealthAt: null,
        config: {},
      })
      .where(eq(connectors.id, row.id));
    return { status: statusAfterDisconnect() };
  });
}

export async function listConnectedOrgs(kind?: ConnectorKind): Promise<{ orgId: string; kind: ConnectorKind }[]> {
  const db = getDb();
  const orgs = await db.select({ id: organization.id }).from(organization);
  const out: { orgId: string; kind: ConnectorKind }[] = [];
  for (const o of orgs) {
    const rows = await withOrg(o.id, (tx) => tx.select().from(connectors));
    for (const r of rows) {
      if (r.status !== "connected") continue;
      if (kind && r.kind !== kind) continue;
      out.push({ orgId: o.id, kind: r.kind as ConnectorKind });
    }
  }
  return out;
}
