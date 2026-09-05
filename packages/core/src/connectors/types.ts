import type { ConnectorKind } from "./kinds.js";

export type ConnectorArtifactKind = "file" | "ownership" | "transcript";

/** Vendor-neutral artifact. Vendor field names stay on `raw` only when labeled FIXTURE or documented. */
export type ConnectorArtifact = {
  externalId: string;
  name: string;
  kind: ConnectorArtifactKind;
  mime?: string;
  companyHint?: string | null;
  /** Opaque vendor payload — never treat as a book fact. */
  raw?: unknown;
};

export type HealthCheckResult = { ok: true } | { ok: false; error: string };

export type ListArtifactsResult = {
  artifacts: ConnectorArtifact[];
  cursor?: string | null;
};

export type FetchArtifactResult = {
  bytes?: Uint8Array;
  filename?: string;
  mime?: string;
  text?: string;
  payload?: unknown;
};

export type ConnectorAuthResult = {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
};

export type ConnectorHttp = {
  fetch: typeof fetch;
};

/**
 * Connector port: auth | listNewArtifacts | fetch | healthCheck.
 * Implementations live in `@venture-os/core/server` so the web barrel never pulls Node crypto.
 */
export type Connector = {
  kind: ConnectorKind;
  auth(ctx: ConnectorHttp, params: Record<string, string>): Promise<ConnectorAuthResult>;
  healthCheck(ctx: ConnectorHttp, params: Record<string, string>): Promise<HealthCheckResult>;
  listNewArtifacts(
    ctx: ConnectorHttp,
    params: Record<string, string>,
    cursor?: string | null,
  ): Promise<ListArtifactsResult>;
  fetch(ctx: ConnectorHttp, params: Record<string, string>, artifact: ConnectorArtifact): Promise<FetchArtifactResult>;
};
