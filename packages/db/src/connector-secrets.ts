import { hintFromConnectorSecrets, deriveConnectorStatus, publicLastSyncAt } from "@venture-os/core";
import type { ConnectorKind, ConnectorStatus } from "@venture-os/core";
import {
  sealJson,
  sealJsonEnvelope,
  unsealJson,
  unsealJsonEnvelope,
  type SealedEnvelope,
} from "@venture-os/core/server";
import { loadEnv } from "@venture-os/config";
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

/** Non-secret metadata only. Never clientSecret / apiKey / tokens. */
export type ConnectorPublicConfig = {
  authMode?: "auth_code" | "client_credentials";
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
  secretHint: string | null;
  config: ConnectorPublicConfig;
};

export type ConnectorSecretRow = {
  status: string;
  lastError: string | null;
  lastSyncAt: Date | null;
  lastHealthAt: Date | null;
  sealedCredentials: string | null;
  secretCiphertext?: string | null;
  secretNonce?: string | null;
  secretKeyVersion?: number | null;
  secretUpdatedAt?: Date | null;
  config: unknown;
};

export function currentSecretsKeyVersion(): number {
  return loadEnv().CONNECTOR_SECRETS_KEY_VERSION || 1;
}

/** Dedicated envelope key. Never stored in the database. */
export function currentSecretsKey(): string {
  const env = loadEnv();
  return env.CONNECTOR_SECRETS_KEY || env.CONNECTOR_SEAL_SECRET || env.BETTER_AUTH_SECRET;
}

export function secretsKeyForVersion(version: number): string {
  const env = loadEnv();
  const current = currentSecretsKeyVersion();
  if (version === current) return currentSecretsKey();
  if (version === current - 1 && env.CONNECTOR_SECRETS_KEY_PREVIOUS) {
    return env.CONNECTOR_SECRETS_KEY_PREVIOUS;
  }
  throw new Error("unknown_connector_key_version");
}

export function publicMeta(secrets: ConnectorSecrets): ConnectorPublicConfig {
  return {
    authMode: secrets.authMode,
    ownershipFieldId: secrets.ownershipFieldId,
    driveId: secrets.driveId,
    userId: secrets.userId,
    hasRefreshToken: Boolean(secrets.refreshToken),
  };
}

export function persistSecretColumns(secrets: ConnectorSecrets): {
  secretCiphertext: string;
  secretNonce: string;
  secretKeyVersion: number;
  secretUpdatedAt: Date;
  sealedCredentials: null;
  config: ConnectorPublicConfig;
} {
  const version = currentSecretsKeyVersion();
  const env = sealJsonEnvelope(secrets, currentSecretsKey(), version);
  return {
    secretCiphertext: env.ciphertext,
    secretNonce: env.nonce,
    secretKeyVersion: env.keyVersion,
    secretUpdatedAt: new Date(),
    sealedCredentials: null,
    config: publicMeta(secrets),
  };
}

export function readRowSecrets(row: ConnectorSecretRow): {
  secrets: ConnectorSecrets | null;
  needsReencrypt: boolean;
} {
  if (row.secretCiphertext && row.secretNonce) {
    const envelope: SealedEnvelope = {
      ciphertext: row.secretCiphertext,
      nonce: row.secretNonce,
      keyVersion: row.secretKeyVersion ?? 1,
    };
    try {
      const secrets = unsealJsonEnvelope<ConnectorSecrets>(envelope, secretsKeyForVersion(envelope.keyVersion));
      return { secrets, needsReencrypt: envelope.keyVersion !== currentSecretsKeyVersion() };
    } catch {
      return { secrets: null, needsReencrypt: false };
    }
  }
  if (row.sealedCredentials) {
    try {
      return { secrets: unsealJson<ConnectorSecrets>(row.sealedCredentials, currentSecretsKey()), needsReencrypt: true };
    } catch {
      try {
        return { secrets: unsealJson<ConnectorSecrets>(row.sealedCredentials, loadEnv().BETTER_AUTH_SECRET), needsReencrypt: true };
      } catch {
        return { secrets: null, needsReencrypt: false };
      }
    }
  }
  return { secrets: null, needsReencrypt: false };
}

/** @deprecated Use persistSecretColumns. Kept for tests that seal a legacy blob. */
export function writeSealedSecrets(secrets: ConnectorSecrets): string {
  return sealJson(secrets, currentSecretsKey());
}

export function readSealedSecrets(blob: string | null | undefined): ConnectorSecrets | null {
  if (!blob) return null;
  try {
    return unsealJson<ConnectorSecrets>(blob, currentSecretsKey());
  } catch {
    return null;
  }
}

export function toPublicView(kind: ConnectorKind, row: ConnectorSecretRow): ConnectorPublicView {
  const { secrets: sealed } = readRowSecrets(row);
  const env = envFallbackSecrets(kind);
  const secrets = sealed && hasKindSecrets(kind, sealed) ? mergeConfig(sealed, row.config) : env ? mergeConfig(env, row.config) : null;
  const usingEnvFallback = !(sealed && hasKindSecrets(kind, sealed)) && Boolean(env);
  const hasCredentials = Boolean(secrets && hasKindSecrets(kind, secrets));
  const lastHealthOk = row.status === "connected" ? true : row.status === "error" ? false : null;
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
    secretHint: secrets ? hintFromConnectorSecrets(secrets) : null,
    config: {
      authMode: secrets?.authMode ?? cfg.authMode,
      ownershipFieldId: secrets?.ownershipFieldId ?? cfg.ownershipFieldId,
      driveId: secrets?.driveId ?? cfg.driveId,
      userId: secrets?.userId ?? cfg.userId,
      hasRefreshToken: Boolean(secrets?.refreshToken ?? cfg.hasRefreshToken),
    },
  };
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

export function resolveSecrets(
  row: ConnectorSecretRow,
  kind: ConnectorKind,
): { secrets: ConnectorSecrets | null; usingEnvFallback: boolean; needsReencrypt: boolean } {
  const read = readRowSecrets(row);
  if (read.secrets && hasKindSecrets(kind, read.secrets)) {
    return { secrets: mergeConfig(read.secrets, row.config), usingEnvFallback: false, needsReencrypt: read.needsReencrypt };
  }
  const env = envFallbackSecrets(kind);
  if (env) return { secrets: mergeConfig(env, row.config), usingEnvFallback: true, needsReencrypt: false };
  return { secrets: null, usingEnvFallback: false, needsReencrypt: false };
}

function mergeConfig(secrets: ConnectorSecrets, config: unknown): ConnectorSecrets {
  const c = config && typeof config === "object" ? (config as ConnectorPublicConfig) : {};
  return {
    ...secrets,
    authMode: secrets.authMode ?? c.authMode,
    ownershipFieldId: secrets.ownershipFieldId ?? c.ownershipFieldId,
    driveId: secrets.driveId ?? c.driveId,
    userId: secrets.userId ?? c.userId,
  };
}

export function hasKindSecrets(kind: ConnectorKind, s: ConnectorSecrets): boolean {
  if (kind === "onedrive") return Boolean(s.clientId && s.clientSecret && s.tenantId);
  return Boolean(s.apiKey);
}

export type ConnectorAuditAction = "save" | "rotate" | "disconnect" | "test" | "connect" | "sync" | "oauth_callback";
