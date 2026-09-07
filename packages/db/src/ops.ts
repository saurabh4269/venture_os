import { isOpsEventKey, type OpsEventKey } from "@venture-os/core";
import type { Database } from "./client.js";
import { opsEvents } from "./schema.js";

export async function recordOpsEvent(
  tx: Database,
  orgId: string,
  eventKey: OpsEventKey | string,
  opts?: { value?: number | null; meta?: Record<string, unknown> },
) {
  if (!isOpsEventKey(eventKey)) return;
  await tx.insert(opsEvents).values({
    orgId,
    eventKey,
    value: opts?.value ?? null,
    meta: opts?.meta ?? {},
  });
}
