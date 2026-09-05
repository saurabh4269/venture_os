import { describe, expect, it } from "vitest";
import {
  sealEnvelope,
  sealJson,
  sealJsonEnvelope,
  sealSecret,
  unsealEnvelope,
  unsealJson,
  unsealJsonEnvelope,
  unsealSecret,
} from "./seal.js";

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

  it("envelope separates ciphertext, nonce, and key_version", () => {
    const env = sealEnvelope("affinity-live-key-ok", secret, 2);
    expect(env.keyVersion).toBe(2);
    expect(env.ciphertext.includes("affinity-live-key-ok")).toBe(false);
    expect(env.nonce).toBeTruthy();
    expect(unsealEnvelope(env, secret)).toBe("affinity-live-key-ok");
    expect(() => unsealEnvelope(env, "other-seal-secret-32-chars-min")).toThrow();
  });

  it("envelope JSON round-trips and re-encrypts under a new version", () => {
    const creds = { apiKey: "affinity-live-key-ok" };
    const v1 = sealJsonEnvelope(creds, secret, 1);
    const plain = unsealJsonEnvelope<typeof creds>(v1, secret);
    const v2 = sealJsonEnvelope(plain, secret, 2);
    expect(v2.keyVersion).toBe(2);
    expect(v2.ciphertext).not.toBe(v1.ciphertext);
    expect(unsealJsonEnvelope<typeof creds>(v2, secret)).toEqual(creds);
  });
});
