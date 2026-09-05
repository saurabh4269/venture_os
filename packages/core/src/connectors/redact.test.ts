import { describe, expect, it } from "vitest";
import {
  hintFromConnectorSecrets,
  maskSecretHint,
  publicPayloadLeaksSecret,
  redactSecretsForLog,
} from "./redact.js";

describe("secret redaction", () => {
  it("masks last 4 only when safe", () => {
    expect(maskSecretHint("short")).toBe("••••");
    expect(maskSecretHint("affinity-live-key-ok")).toBe("••••y-ok");
    expect(maskSecretHint(null)).toBeNull();
  });

  it("prefers api key hint over client id", () => {
    expect(hintFromConnectorSecrets({ apiKey: "affinity-live-key-ok", clientId: "11111111-1111-1111-1111-111111111111" })).toBe(
      "••••y-ok",
    );
  });

  it("redacts nested secret keys for logs", () => {
    const redacted = redactSecretsForLog({
      kind: "affinity",
      apiKey: "affinity-live-key-ok",
      nested: { clientSecret: "super-secret-value", status: "configured" },
    }) as Record<string, unknown>;
    expect(redacted.kind).toBe("affinity");
    expect(redacted.apiKey).toBe("[redacted]");
    expect((redacted.nested as Record<string, unknown>).clientSecret).toBe("[redacted]");
    expect((redacted.nested as Record<string, unknown>).status).toBe("configured");
    expect(JSON.stringify(redacted)).not.toContain("affinity-live-key-ok");
  });

  it("flags public payloads that still carry raw keys", () => {
    expect(publicPayloadLeaksSecret({ kind: "affinity", status: "configured" })).toBe(false);
    expect(publicPayloadLeaksSecret({ connectors: [{ apiKey: "affinity-live-key-ok" }] })).toBe(true);
  });
});
