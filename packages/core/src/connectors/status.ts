import type { ConnectorStatus } from "./kinds.js";

export type ConnectorStatusInput = {
  hasCredentials: boolean;
  lastHealthOk: boolean | null;
  lastError: string | null;
};

/**
 * Honest connector status. `connected` only after a successful healthCheck.
 * `lastSyncAt` is not part of this machine — it is set only by a successful sync.
 */
export function deriveConnectorStatus(input: ConnectorStatusInput): ConnectorStatus {
  if (!input.hasCredentials) return "not_connected";
  if (input.lastError && input.lastHealthOk !== true) return "error";
  if (input.lastHealthOk === true) return "connected";
  return "configured";
}

export function statusAfterSave(hasCredentials: boolean): ConnectorStatus {
  return deriveConnectorStatus({ hasCredentials, lastHealthOk: null, lastError: null });
}

export function statusAfterHealth(ok: boolean, error: string | null, hasCredentials: boolean): ConnectorStatus {
  return deriveConnectorStatus({
    hasCredentials,
    lastHealthOk: ok,
    lastError: ok ? null : error || "health_check_failed",
  });
}

export function statusAfterDisconnect(): ConnectorStatus {
  return "not_connected";
}

export function mayShowLastSyncAt(lastSyncAt: Date | string | null | undefined): lastSyncAt is Date | string {
  return lastSyncAt != null && String(lastSyncAt).length > 0;
}

/** Never invent a sync time. Omit the field when there was no successful sync. */
export function publicLastSyncAt(lastSyncAt: Date | string | null | undefined): string | undefined {
  if (!mayShowLastSyncAt(lastSyncAt)) return undefined;
  return lastSyncAt instanceof Date ? lastSyncAt.toISOString() : lastSyncAt;
}
