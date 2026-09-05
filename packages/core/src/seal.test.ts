import { describe, expect, it } from "vitest";
import { sealJson, sealSecret, unsealJson, unsealSecret } from "./seal.js";

describe("credential seal", () => {
  const secret = "test-seal-secret-32-chars-minimum";

  it("round-trips a string", () => {
    const blob = sealSecret("affinity-live-key-ok", secret);
    expect(blob.startsWith("v1.")).toBe(true);
    expect(blob.includes("affinity-live-key-ok")).toBe(false);
    expect(unsealSecret(blob, secret)).toBe("affinity-live-key-ok");
  });

  it("round-trips JSON credentials", () => {
    const creds = { apiKey: "grn_workspace_key", refreshToken: "rt" };
    expect(unsealJson<typeof creds>(sealJson(creds, secret), secret)).toEqual(creds);
  });

  it("fails closed on a wrong secret", () => {
    const blob = sealSecret("x", secret);
    expect(() => unsealSecret(blob, "other-seal-secret-32-chars-min")).toThrow();
  });
});
