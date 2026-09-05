import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "v1";

function keyFromSecret(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

/** AES-256-GCM seal. Output is `v1.<iv_b64url>.<tag_b64url>.<ct_b64url>`. */
export function sealSecret(plaintext: string, secret: string): string {
  if (!secret || secret.length < 16) throw new Error("seal_secret_too_short");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, b64(iv), b64(tag), b64(ct)].join(".");
}

export function unsealSecret(blob: string, secret: string): string {
  if (!secret || secret.length < 16) throw new Error("seal_secret_too_short");
  const parts = blob.split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX) throw new Error("invalid_sealed_blob");
  const iv = unb64(parts[1]!);
  const tag = unb64(parts[2]!);
  const ct = unb64(parts[3]!);
  const decipher = createDecipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

export function sealJson(value: unknown, secret: string): string {
  return sealSecret(JSON.stringify(value), secret);
}

export function unsealJson<T>(blob: string, secret: string): T {
  return JSON.parse(unsealSecret(blob, secret)) as T;
}

function b64(buf: Buffer): string {
  return buf.toString("base64url");
}

function unb64(s: string): Buffer {
  return Buffer.from(s, "base64url");
}
