import { redactSecretsForLog } from "@venture-os/core";

export function log(level: string, msg: string, extra: Record<string, unknown> = {}) {
  const safe = redactSecretsForLog(extra) as Record<string, unknown>;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...safe,
  });
  if (level === "error") console.error(line);
  else console.log(line);
}
