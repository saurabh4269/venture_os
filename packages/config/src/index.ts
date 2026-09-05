import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { collectTrustedOrigins, isTrustedOrigin, originMatches, parseOriginPatterns } from "./origins.js";
import { isSafeInternalPath, safeNextPath } from "./paths.js";

export {
  collectTrustedOrigins,
  isSafeInternalPath,
  isTrustedOrigin,
  originMatches,
  parseOriginPatterns,
  safeNextPath,
};

export const PUBLIC_DEV_AUTH_SECRET = "dev-only-change-me-to-a-long-random-string";
export const MAX_ORGS_AS_ADMIN = 5;

function loadDotenv() {
  const candidates = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 0) continue;
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim();
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

loadDotenv();

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  WEB_URL: z.string().default("http://localhost:3000"),
  WEB_PORT: z.coerce.number().default(3000),
  API_PORT: z.coerce.number().default(4000),
  API_URL: z.string().default("http://localhost:4000"),
  BETTER_AUTH_SECRET: z.string().min(16).default(PUBLIC_DEV_AUTH_SECRET),
  BETTER_AUTH_URL: z.string().default("http://localhost:4000"),
  WEB_ORIGIN_PATTERNS: z.string().optional().default(""),
  COOKIE_SECURE: z.string().optional(),
  GIT_SHA: z.string().optional().default(""),
  DATABASE_URL: z.string().default("postgres://venture:venture@localhost:5432/venture_os"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("venture-os"),
  S3_ACCESS_KEY: z.string().default("venture"),
  S3_SECRET_KEY: z.string().default("venturesecret"),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  LLM_PROVIDER: z.string().default("openai"),
  SEED_DEMO: z.string().optional().default("0"),
  SEED_DEMO_EMAIL: z.string().default("analyst@fixture.local"),
  SEED_DEMO_PASSWORD: z.string().default("fixture-only-password"),
  /**
   * Preferred connector envelope key (AES-256-GCM). Never commit a live value.
   * Fallback: CONNECTOR_SEAL_SECRET, then BETTER_AUTH_SECRET.
   */
  CONNECTOR_SECRETS_KEY: z.string().optional().default(""),
  /** Previous envelope key during rotation. Used only to decrypt key_version - 1. */
  CONNECTOR_SECRETS_KEY_PREVIOUS: z.string().optional().default(""),
  CONNECTOR_SECRETS_KEY_VERSION: z.coerce.number().int().min(1).optional().default(1),
  /** @deprecated Prefer CONNECTOR_SECRETS_KEY. Still accepted as an alias. */
  CONNECTOR_SEAL_SECRET: z.string().optional().default(""),
  MICROSOFT_CLIENT_ID: z.string().optional().default(""),
  MICROSOFT_CLIENT_SECRET: z.string().optional().default(""),
  MICROSOFT_TENANT_ID: z.string().optional().default(""),
  AFFINITY_API_KEY: z.string().optional().default(""),
  GRANOLA_API_KEY: z.string().optional().default(""),
});

export type Env = z.infer<typeof Env>;

export function assertProductionAuthSecret(secret: string | undefined): void {
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be 32+ characters in production");
  }
  if (secret === PUBLIC_DEV_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET must not use the public default in production");
  }
}

export function cookieSecure(
  env: Pick<Env, "NODE_ENV" | "BETTER_AUTH_URL">,
  cookieSecureFlag?: string,
): boolean {
  const flag = cookieSecureFlag ?? (env as Env).COOKIE_SECURE;
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  if (env.BETTER_AUTH_URL.startsWith("https://")) return true;
  return env.NODE_ENV === "production";
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return "***";
  return `${local[0] ?? ""}***@${domain}`;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const nodeEnv = source.NODE_ENV ?? "development";
  if (nodeEnv === "production") {
    assertProductionAuthSecret(source.BETTER_AUTH_SECRET);
    if (source.SEED_DEMO === "1") {
      throw new Error("SEED_DEMO is forbidden when NODE_ENV=production");
    }
  }
  return Env.parse(source);
}

export const ROLES = ["org_admin", "partner", "analyst", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  org_admin: "Org Admin",
  partner: "Partner",
  analyst: "Analyst",
  viewer: "Viewer",
};

export const DEFAULT_FY_START_MONTH = 4; // April
export const BASE_CURRENCY = "INR";
export const DISPLAY_CURRENCY = "EUR";

export const WRITE_ROLES: Role[] = ["org_admin", "partner", "analyst"];
export const ADMIN_ROLES: Role[] = ["org_admin"];
export const CONFIRM_ROLES: Role[] = ["org_admin", "partner", "analyst"];
/** Partner or Org Admin may lock / unlock a NAV as-of. Analyst may not. */
export const LOCK_ROLES: Role[] = ["org_admin", "partner"];
export const INVITE_TTL_SECONDS = 60 * 60 * 24 * 7;

/** Better Auth historically used owner/admin; treat as org_admin aliases. */
const ROLE_ALIASES: Record<string, Role> = {
  owner: "org_admin",
  admin: "org_admin",
  member: "analyst",
};

export function canonicalizeRole(role: string | null | undefined): Role | null {
  if (!role) return null;
  if ((ROLES as readonly string[]).includes(role)) return role as Role;
  return ROLE_ALIASES[role] ?? null;
}

export function isRole(role: string | null | undefined): role is Role {
  return canonicalizeRole(role) !== null;
}

export function isWriteRole(role: string | null | undefined): boolean {
  const r = canonicalizeRole(role);
  return r !== null && WRITE_ROLES.includes(r);
}

export function isAdminRole(role: string | null | undefined): boolean {
  const r = canonicalizeRole(role);
  return r !== null && ADMIN_ROLES.includes(r);
}

export function isConfirmRole(role: string | null | undefined): boolean {
  const r = canonicalizeRole(role);
  return r !== null && CONFIRM_ROLES.includes(r);
}

export function isLockRole(role: string | null | undefined): boolean {
  const r = canonicalizeRole(role);
  return r !== null && LOCK_ROLES.includes(r);
}

export function invitationExpired(expiresAt: Date | string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  const t = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  if (Number.isNaN(t)) return false;
  return t < now.getTime();
}

export function roleLabel(role: string | null | undefined): string {
  const r = canonicalizeRole(role);
  if (r) return ROLE_LABEL[r];
  if (!role) return "—";
  return role.replaceAll("_", " ");
}

export function slugifyOrg(name: string): string {
  const s = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s;
}
