export const CONNECTOR_LABEL: Record<string, string> = {
  onedrive: "Microsoft OneDrive",
  affinity: "Affinity CRM",
  granola: "Granola",
};

export function connectorLabel(kind: string): string {
  return CONNECTOR_LABEL[kind] ?? kind.replaceAll("_", " ");
}