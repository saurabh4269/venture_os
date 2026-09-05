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

/** Separate ciphertext + nonce + version (AES-256-GCM). Ciphertext column is `ct.tag`. */
export type SealedEnvelope = {
  ciphertext: string;
  nonce: string;
  keyVersion: number;
};

function material(secret: string, keyVersion: number): Buffer {
  return createHash("sha256").update(`${secret}:v${keyVersion}`, "utf8").digest();
}

export function sealEnvelope(plaintext: string, secret: string, keyVersion = 1): SealedEnvelope {
  if (!secret || secret.length < 16) throw new Error("seal_secret_too_short");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", material(secret, keyVersion), nonce);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: `${b64(ct)}.${b64(tag)}`,
    nonce: b64(nonce),
    keyVersion,
  };
}

export function unsealEnvelope(envelope: SealedEnvelope, secret: string): string {
  if (!secret || secret.length < 16) throw new Error("seal_secret_too_short");
  const [ctPart, tagPart] = envelope.ciphertext.split(".");
  if (!ctPart || !tagPart || !envelope.nonce) throw new Error("invalid_sealed_envelope");
  const decipher = createDecipheriv("aes-256-gcm", material(secret, envelope.keyVersion), unb64(envelope.nonce));
  decipher.setAuthTag(unb64(tagPart));
  return Buffer.concat([decipher.update(unb64(ctPart)), decipher.final()]).toString("utf8");
}

export function sealJsonEnvelope(value: unknown, secret: string, keyVersion = 1): SealedEnvelope {
  return sealEnvelope(JSON.stringify(value), secret, keyVersion);
}

export function unsealJsonEnvelope<T>(envelope: SealedEnvelope, secret: string): T {
  return JSON.parse(unsealEnvelope(envelope, secret)) as T;
}

function b64(buf: Buffer): string {
  return buf.toString("base64url");
}

function unb64(s: string): Buffer {
  return Buffer.from(s, "base64url");
}
