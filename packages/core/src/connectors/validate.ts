import { CONNECTOR_KINDS, type ConnectorKind, type OnedriveAuthMode } from "./kinds.js";

export type ConnectorCredentialInput = {
  kind: ConnectorKind;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  apiKey?: string;
  authMode?: OnedriveAuthMode;
};

export type CredentialValidation =
  | { ok: true; fields: Record<string, string> }
  | { ok: false; error: string; fields: Record<string, string> };

const GUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TENANT = /^(common|organizations|consumers|[0-9a-f-]{8,})$/i;

function trim(value: string | undefined): string {
  return (value ?? "").trim();
}

export function validateOnedriveCredentials(input: {
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
}): CredentialValidation {
  const fields: Record<string, string> = {};
  const clientId = trim(input.clientId);
  const clientSecret = trim(input.clientSecret);
  const tenantId = trim(input.tenantId);
  if (!clientId) fields.clientId = "required";
  else if (clientId.length < 8) fields.clientId = "too_short";
  if (!clientSecret) fields.clientSecret = "required";
  else if (clientSecret.length < 8) fields.clientSecret = "too_short";
  if (!tenantId) fields.tenantId = "required";
  else if (!TENANT.test(tenantId) && !GUID.test(tenantId)) fields.tenantId = "invalid_tenant";
  if (Object.keys(fields).length) {
    return { ok: false, error: "invalid_onedrive_credentials", fields };
  }
  return { ok: true, fields: {} };
}

/** Affinity v2 uses a bearer API key. No public prefix is documented. */
export function validateAffinityApiKey(apiKey: string | undefined): CredentialValidation {
  const key = trim(apiKey);
  const fields: Record<string, string> = {};
  if (!key) fields.apiKey = "required";
  else if (key.length < 12) fields.apiKey = "too_short";
  else if (/\s/.test(key)) fields.apiKey = "invalid_format";
  if (Object.keys(fields).length) {
    return { ok: false, error: "invalid_affinity_api_key", fields };
  }
  return { ok: true, fields: {} };
}

/**
 * Granola documents personal/workspace keys as `grn_…` bearer tokens
 * (https://docs.granola.ai/introduction).
 */
export function validateGranolaApiKey(apiKey: string | undefined): CredentialValidation {
  const key = trim(apiKey);
  const fields: Record<string, string> = {};
  if (!key) fields.apiKey = "required";
  else if (!key.startsWith("grn_")) fields.apiKey = "must_start_with_grn_";
  else if (key.length < 12) fields.apiKey = "too_short";
  else if (/\s/.test(key)) fields.apiKey = "invalid_format";
  if (Object.keys(fields).length) {
    return { ok: false, error: "invalid_granola_api_key", fields };
  }
  return { ok: true, fields: {} };
}

export function validateConnectorCredentials(input: ConnectorCredentialInput): CredentialValidation {
  if (!CONNECTOR_KINDS.includes(input.kind)) {
    return { ok: false, error: "unknown_connector", fields: { kind: "unknown" } };
  }
  if (input.kind === "onedrive") return validateOnedriveCredentials(input);
  if (input.kind === "affinity") return validateAffinityApiKey(input.apiKey);
  return validateGranolaApiKey(input.apiKey);
}

export function validateCompanyConnectorMapping(input: {
  onedriveFolderId?: string | null;
  onedriveFolderPath?: string | null;
  affinityCompanyId?: string | null;
  granolaLink?: string | null;
}): CredentialValidation {
  const fields: Record<string, string> = {};
  const folderId = trim(input.onedriveFolderId ?? undefined);
  const folderPath = trim(input.onedriveFolderPath ?? undefined);
  const affinityId = trim(input.affinityCompanyId ?? undefined);
  const granola = trim(input.granolaLink ?? undefined);
  if (affinityId && !/^\d+$/.test(affinityId)) fields.affinityCompanyId = "must_be_numeric_id";
  if (granola && granola.length > 400) fields.granolaLink = "too_long";
  if (folderId && folderId.length > 200) fields.onedriveFolderId = "too_long";
  if (folderPath && folderPath.length > 500) fields.onedriveFolderPath = "too_long";
  if (Object.keys(fields).length) {
    return { ok: false, error: "invalid_connector_mapping", fields };
  }
  return { ok: true, fields: {} };
}
