/** Client-safe secret masking / log redaction. No Node crypto. */

const SENSITIVE_KEY =
  /^(api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|password|authorization|secret|token|sealed[_-]?credentials|secret[_-]?ciphertext|ciphertext|nonce)$/i;

const SENSITIVE_KEY_LOOSE = /secret|token|password|authorization|apikey|ciphertext|sealed/i;

/** Mask for UI / API. Last 4 only when the value is long enough to be non-identifying. */
export function maskSecretHint(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length < 8) return "••••";
  return `••••${value.slice(-4)}`;
}

export function hintFromConnectorSecrets(secrets: {
  apiKey?: string;
  clientId?: string;
}): string | null {
  return maskSecretHint(secrets.apiKey) ?? maskSecretHint(secrets.clientId);
}

export function isSensitiveLogKey(key: string): boolean {
  return SENSITIVE_KEY.test(key) || SENSITIVE_KEY_LOOSE.test(key);
}

/** Deep-clone JSON and replace secret fields. Never logs raw keys/tokens. */
export function redactSecretsForLog(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactSecretsForLog);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = isSensitiveLogKey(k) ? "[redacted]" : redactSecretsForLog(v);
  }
  return out;
}

const FORBIDDEN_PUBLIC_KEYS = [
  "apiKey",
  "clientSecret",
  "accessToken",
  "refreshToken",
  "sealedCredentials",
  "secretCiphertext",
  "secretNonce",
  "ciphertext",
];

/** True when a public DTO still contains raw credential material. */
export function publicPayloadLeaksSecret(payload: unknown): boolean {
  const seen = new Set<unknown>();
  const walk = (v: unknown): boolean => {
    if (v == null || typeof v !== "object") return false;
    if (seen.has(v)) return false;
    seen.add(v);
    if (Array.isArray(v)) return v.some(walk);
    for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
      if (FORBIDDEN_PUBLIC_KEYS.includes(k) && child) return true;
      if (walk(child)) return true;
    }
    return false;
  };
  return walk(payload);
}
