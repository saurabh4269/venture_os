export const CONNECTOR_KINDS = ["onedrive", "affinity", "granola"] as const;
export type ConnectorKind = (typeof CONNECTOR_KINDS)[number];

export const CONNECTOR_STATUSES = ["not_connected", "configured", "connected", "error"] as const;
export type ConnectorStatus = (typeof CONNECTOR_STATUSES)[number];

export const CONNECTOR_LABEL: Record<ConnectorKind, string> = {
  onedrive: "Microsoft OneDrive",
  affinity: "Affinity CRM",
  granola: "Granola",
};

export function isConnectorKind(value: string): value is ConnectorKind {
  return (CONNECTOR_KINDS as readonly string[]).includes(value);
}

export function connectorLabel(kind: string): string {
  if (isConnectorKind(kind)) return CONNECTOR_LABEL[kind];
  return kind.replaceAll("_", " ");
}

export const ONEDRIVE_AUTH_MODES = ["auth_code", "client_credentials"] as const;
export type OnedriveAuthMode = (typeof ONEDRIVE_AUTH_MODES)[number];
