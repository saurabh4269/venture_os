import { mapAffinityCompanyPage, type MappedAffinityLink } from "./affinity-map.js";
import type { ConnectorKind, OnedriveAuthMode } from "./kinds.js";
import type {
  Connector,
  ConnectorArtifact,
  ConnectorAuthResult,
  ConnectorHttp,
  FetchArtifactResult,
  HealthCheckResult,
  ListArtifactsResult,
} from "./types.js";

export const GRAPH_AUTHORITY = "https://login.microsoftonline.com";
export const GRAPH_RESOURCE = "https://graph.microsoft.com";
export const AFFINITY_API_BASE = "https://api.affinity.co";
export const GRANOLA_API_BASE = "https://public-api.granola.ai/v1";

export const ONEDRIVE_DELEGATED_SCOPES = "offline_access Files.Read.All User.Read";
export const ONEDRIVE_APP_SCOPE = "https://graph.microsoft.com/.default";

export type FetchLike = typeof fetch;

export function httpWith(fetchImpl: FetchLike = fetch): ConnectorHttp {
  return { fetch: fetchImpl };
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return `${fallback}:${res.status}`;
    return `${fallback}:${res.status}:${text.slice(0, 280)}`;
  } catch {
    return `${fallback}:${res.status}`;
  }
}

function form(body: Record<string, string>): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) p.set(k, v);
  return p;
}

export function onedriveAuthorizeUrl(opts: {
  tenantId: string;
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const tenant = opts.tenantId || "common";
  const u = new URL(`${GRAPH_AUTHORITY}/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize`);
  u.searchParams.set("client_id", opts.clientId);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", opts.redirectUri);
  u.searchParams.set("response_mode", "query");
  u.searchParams.set("scope", ONEDRIVE_DELEGATED_SCOPES);
  u.searchParams.set("state", opts.state);
  return u.toString();
}

export async function exchangeOnedriveCode(
  ctx: ConnectorHttp,
  opts: { tenantId: string; clientId: string; clientSecret: string; redirectUri: string; code: string },
): Promise<ConnectorAuthResult> {
  const tenant = opts.tenantId || "common";
  const res = await ctx.fetch(`${GRAPH_AUTHORITY}/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form({
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      grant_type: "authorization_code",
      code: opts.code,
      redirect_uri: opts.redirectUri,
      scope: ONEDRIVE_DELEGATED_SCOPES,
    }),
  });
  if (!res.ok) throw new Error(await readError(res, "onedrive_token_exchange_failed"));
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };
  if (!json.access_token) throw new Error("onedrive_token_missing");
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    tokenType: json.token_type,
  };
}

export async function refreshOnedriveToken(
  ctx: ConnectorHttp,
  opts: { tenantId: string; clientId: string; clientSecret: string; refreshToken: string },
): Promise<ConnectorAuthResult> {
  const tenant = opts.tenantId || "common";
  const res = await ctx.fetch(`${GRAPH_AUTHORITY}/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form({
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      grant_type: "refresh_token",
      refresh_token: opts.refreshToken,
      scope: ONEDRIVE_DELEGATED_SCOPES,
    }),
  });
  if (!res.ok) throw new Error(await readError(res, "onedrive_refresh_failed"));
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };
  if (!json.access_token) throw new Error("onedrive_token_missing");
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? opts.refreshToken,
    expiresIn: json.expires_in,
    tokenType: json.token_type,
  };
}

export async function clientCredentialsOnedriveToken(
  ctx: ConnectorHttp,
  opts: { tenantId: string; clientId: string; clientSecret: string },
): Promise<ConnectorAuthResult> {
  const tenant = opts.tenantId;
  if (!tenant || tenant === "common" || tenant === "consumers") {
    throw new Error("onedrive_app_only_needs_tenant");
  }
  const res = await ctx.fetch(`${GRAPH_AUTHORITY}/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form({
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      grant_type: "client_credentials",
      scope: ONEDRIVE_APP_SCOPE,
    }),
  });
  if (!res.ok) throw new Error(await readError(res, "onedrive_client_credentials_failed"));
  const json = (await res.json()) as { access_token?: string; expires_in?: number; token_type?: string };
  if (!json.access_token) throw new Error("onedrive_token_missing");
  return { accessToken: json.access_token, expiresIn: json.expires_in, tokenType: json.token_type };
}

function graphChildrenUrl(params: Record<string, string>): string {
  const driveId = params.driveId;
  const folderId = params.folderId;
  const folderPath = (params.folderPath ?? "").replace(/^\/+/, "");
  const userId = params.userId;
  if (driveId && folderId) {
    return `${GRAPH_RESOURCE}/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(folderId)}/children`;
  }
  if (driveId && folderPath) {
    return `${GRAPH_RESOURCE}/v1.0/drives/${encodeURIComponent(driveId)}/root:/${folderPath}:/children`;
  }
  if (userId && folderId) {
    return `${GRAPH_RESOURCE}/v1.0/users/${encodeURIComponent(userId)}/drive/items/${encodeURIComponent(folderId)}/children`;
  }
  if (userId && folderPath) {
    return `${GRAPH_RESOURCE}/v1.0/users/${encodeURIComponent(userId)}/drive/root:/${folderPath}:/children`;
  }
  if (folderId) return `${GRAPH_RESOURCE}/v1.0/me/drive/items/${encodeURIComponent(folderId)}/children`;
  if (folderPath) return `${GRAPH_RESOURCE}/v1.0/me/drive/root:/${folderPath}:/children`;
  return `${GRAPH_RESOURCE}/v1.0/me/drive/root/children`;
}

function graphContentUrl(params: Record<string, string>, itemId: string): string {
  const driveId = params.driveId;
  const userId = params.userId;
  if (driveId) {
    return `${GRAPH_RESOURCE}/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`;
  }
  if (userId) {
    return `${GRAPH_RESOURCE}/v1.0/users/${encodeURIComponent(userId)}/drive/items/${encodeURIComponent(itemId)}/content`;
  }
  return `${GRAPH_RESOURCE}/v1.0/me/drive/items/${encodeURIComponent(itemId)}/content`;
}

export const onedriveConnector: Connector = {
  kind: "onedrive",
  async auth(ctx, params) {
    if (params.grantType === "refresh_token" && params.refreshToken) {
      return refreshOnedriveToken(ctx, {
        tenantId: params.tenantId ?? "common",
        clientId: params.clientId ?? "",
        clientSecret: params.clientSecret ?? "",
        refreshToken: params.refreshToken,
      });
    }
    if (params.grantType === "authorization_code" && params.code) {
      return exchangeOnedriveCode(ctx, {
        tenantId: params.tenantId ?? "common",
        clientId: params.clientId ?? "",
        clientSecret: params.clientSecret ?? "",
        redirectUri: params.redirectUri ?? "",
        code: params.code,
      });
    }
    return clientCredentialsOnedriveToken(ctx, {
      tenantId: params.tenantId ?? "",
      clientId: params.clientId ?? "",
      clientSecret: params.clientSecret ?? "",
    });
  },
  async healthCheck(ctx, params) {
    const token = params.accessToken;
    if (!token) return { ok: false, error: "missing_access_token" };
    const authMode = (params.authMode ?? "auth_code") as OnedriveAuthMode;
    const url =
      authMode === "client_credentials"
        ? `${GRAPH_RESOURCE}/v1.0/organization?$select=id,displayName`
        : `${GRAPH_RESOURCE}/v1.0/me?$select=id,displayName`;
    const res = await ctx.fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return { ok: false, error: await readError(res, "onedrive_health_failed") };
    return { ok: true };
  },
  async listNewArtifacts(ctx, params, cursor) {
    const token = params.accessToken;
    if (!token) throw new Error("missing_access_token");
    const url = cursor && cursor.startsWith("https://") ? cursor : graphChildrenUrl(params);
    const res = await ctx.fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(await readError(res, "onedrive_list_failed"));
    const json = (await res.json()) as {
      value?: Array<{
        id?: string;
        name?: string;
        file?: Record<string, unknown>;
        folder?: Record<string, unknown>;
      }>;
      "@odata.nextLink"?: string;
    };
    const artifacts: ConnectorArtifact[] = [];
    for (const item of json.value ?? []) {
      if (!item.id || !item.name) continue;
      if (!item.file) continue;
      artifacts.push({
        externalId: item.id,
        name: item.name,
        kind: "file",
        mime: typeof item.file.mimeType === "string" ? item.file.mimeType : undefined,
      });
    }
    return { artifacts, cursor: json["@odata.nextLink"] ?? null };
  },
  async fetch(ctx, params, artifact) {
    const token = params.accessToken;
    if (!token) throw new Error("missing_access_token");
    const res = await ctx.fetch(graphContentUrl(params, artifact.externalId), {
      headers: { authorization: `Bearer ${token}` },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(await readError(res, "onedrive_download_failed"));
    const buf = new Uint8Array(await res.arrayBuffer());
    return { bytes: buf, filename: artifact.name, mime: artifact.mime ?? res.headers.get("content-type") ?? undefined };
  },
};

export const affinityConnector: Connector = {
  kind: "affinity",
  async auth() {
    return {};
  },
  async healthCheck(ctx, params) {
    const key = params.apiKey;
    if (!key) return { ok: false, error: "missing_api_key" };
    const res = await ctx.fetch(`${AFFINITY_API_BASE}/v2/companies?limit=1`, {
      headers: { authorization: `Bearer ${key}` },
    });
    if (!res.ok) return { ok: false, error: await readError(res, "affinity_health_failed") };
    return { ok: true };
  },
  async listNewArtifacts(ctx, params, cursor) {
    const key = params.apiKey;
    if (!key) throw new Error("missing_api_key");
    const url = cursor && cursor.startsWith("https://") ? cursor : `${AFFINITY_API_BASE}/v2/companies?limit=100`;
    const res = await ctx.fetch(url, { headers: { authorization: `Bearer ${key}` } });
    if (!res.ok) throw new Error(await readError(res, "affinity_list_failed"));
    const json = (await res.json()) as { data?: unknown[]; pagination?: { nextUrl?: string | null } };
    const mapped = mapAffinityCompanyPage(json, { ownershipFieldId: params.ownershipFieldId });
    return {
      artifacts: mapped.map((c) => ({
        externalId: c.affinityCompanyId,
        name: c.name,
        kind: "ownership" as const,
        companyHint: c.domain,
        raw: c,
      })),
      cursor: json.pagination?.nextUrl ?? null,
    };
  },
  async fetch(_ctx, _params, artifact): Promise<FetchArtifactResult> {
    return { payload: artifact.raw };
  },
};

export const granolaConnector: Connector = {
  kind: "granola",
  async auth() {
    return {};
  },
  async healthCheck(ctx, params) {
    const key = params.apiKey;
    if (!key) return { ok: false, error: "missing_api_key" };
    const res = await ctx.fetch(`${GRANOLA_API_BASE}/notes`, {
      headers: { authorization: `Bearer ${key}` },
    });
    if (!res.ok) return { ok: false, error: await readError(res, "granola_health_failed") };
    return { ok: true };
  },
  async listNewArtifacts(ctx, params, cursor) {
    const key = params.apiKey;
    if (!key) throw new Error("missing_api_key");
    const url = new URL(`${GRANOLA_API_BASE}/notes`);
    if (cursor && !cursor.startsWith("https://")) url.searchParams.set("cursor", cursor);
    const res = await ctx.fetch(cursor?.startsWith("https://") ? cursor : url.toString(), {
      headers: { authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(await readError(res, "granola_list_failed"));
    const json = (await res.json()) as {
      notes?: Array<{ id?: string; title?: string }>;
      hasMore?: boolean;
      cursor?: string;
    };
    const artifacts: ConnectorArtifact[] = [];
    for (const note of json.notes ?? []) {
      if (!note.id) continue;
      artifacts.push({
        externalId: note.id,
        name: note.title ?? note.id,
        kind: "transcript",
      });
    }
    return { artifacts, cursor: json.hasMore ? (json.cursor ?? null) : null };
  },
  async fetch(ctx, params, artifact) {
    const key = params.apiKey;
    if (!key) throw new Error("missing_api_key");
    const res = await ctx.fetch(`${GRANOLA_API_BASE}/notes/${encodeURIComponent(artifact.externalId)}?include=transcript`, {
      headers: { authorization: `Bearer ${key}` },
    });
    if (res.status === 413) {
      const tr = await ctx.fetch(`${GRANOLA_API_BASE}/notes/${encodeURIComponent(artifact.externalId)}/transcript`, {
        headers: { authorization: `Bearer ${key}` },
      });
      if (!tr.ok) throw new Error(await readError(tr, "granola_transcript_failed"));
      const payload = await tr.json();
      return { payload, text: transcriptToText(payload), filename: `${artifact.name}.txt`, mime: "text/plain" };
    }
    if (!res.ok) throw new Error(await readError(res, "granola_note_failed"));
    const payload = (await res.json()) as {
      id?: string;
      title?: string;
      summary?: string;
      transcript?: unknown;
    };
    const text = [payload.title, payload.summary, transcriptToText(payload.transcript)].filter(Boolean).join("\n\n");
    return { payload, text, filename: `${payload.title ?? artifact.name}.txt`, mime: "text/plain" };
  },
};

/** Official Granola transcript items: { speaker: { source, diarization_label? }, text }. */
export function transcriptToText(transcript: unknown): string {
  if (typeof transcript === "string") return transcript;
  if (!Array.isArray(transcript)) return "";
  const lines: string[] = [];
  for (const item of transcript) {
    if (!item || typeof item !== "object") continue;
    const row = item as { text?: unknown; speaker?: { source?: unknown; diarization_label?: unknown } };
    if (typeof row.text !== "string") continue;
    const who =
      typeof row.speaker?.diarization_label === "string"
        ? row.speaker.diarization_label
        : typeof row.speaker?.source === "string"
          ? row.speaker.source
          : "speaker";
    lines.push(`${who}: ${row.text}`);
  }
  return lines.join("\n");
}

export const CONNECTORS: Record<ConnectorKind, Connector> = {
  onedrive: onedriveConnector,
  affinity: affinityConnector,
  granola: granolaConnector,
};

export async function connectorHealthCheck(
  kind: ConnectorKind,
  ctx: ConnectorHttp,
  params: Record<string, string>,
): Promise<HealthCheckResult> {
  return CONNECTORS[kind].healthCheck(ctx, params);
}

export async function connectorListNewArtifacts(
  kind: ConnectorKind,
  ctx: ConnectorHttp,
  params: Record<string, string>,
  cursor?: string | null,
): Promise<ListArtifactsResult> {
  return CONNECTORS[kind].listNewArtifacts(ctx, params, cursor);
}

export async function connectorFetchArtifact(
  kind: ConnectorKind,
  ctx: ConnectorHttp,
  params: Record<string, string>,
  artifact: ConnectorArtifact,
): Promise<FetchArtifactResult> {
  return CONNECTORS[kind].fetch(ctx, params, artifact);
}

export type { MappedAffinityLink };
