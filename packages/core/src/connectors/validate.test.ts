import { describe, expect, it } from "vitest";
import { validateAffinityApiKey, validateConnectorCredentials, validateGranolaApiKey, validateOnedriveCredentials } from "./validate.js";

describe("connector credential validation", () => {
  it("requires OneDrive client id, secret, and tenant", () => {
    const empty = validateOnedriveCredentials({});
    expect(empty.ok).toBe(false);
    if (!empty.ok) {
      expect(empty.fields.clientId).toBe("required");
      expect(empty.fields.clientSecret).toBe("required");
      expect(empty.fields.tenantId).toBe("required");
    }
  });

  it("accepts a well-formed Azure app registration", () => {
    expect(
      validateOnedriveCredentials({
        clientId: "11111111-1111-1111-1111-111111111111",
        clientSecret: "super-secret-value",
        tenantId: "common",
      }).ok,
    ).toBe(true);
  });

  it("rejects short Affinity keys and whitespace", () => {
    expect(validateAffinityApiKey("short").ok).toBe(false);
    expect(validateAffinityApiKey("affinity-key-with space").ok).toBe(false);
    expect(validateAffinityApiKey("affinity-live-key-ok").ok).toBe(true);
  });

  it("requires Granola keys to use the documented grn_ prefix", () => {
    expect(validateGranolaApiKey("not-granola").ok).toBe(false);
    expect(validateGranolaApiKey("grn_short").ok).toBe(false);
    expect(validateGranolaApiKey("grn_workspace_key").ok).toBe(true);
  });

  it("routes by kind", () => {
    expect(validateConnectorCredentials({ kind: "affinity", apiKey: "x" }).ok).toBe(false);
    expect(validateConnectorCredentials({ kind: "granola", apiKey: "grn_workspace_key" }).ok).toBe(true);
  });
});
