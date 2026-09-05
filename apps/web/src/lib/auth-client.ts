import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

/**
 * Same-origin BFF unless NEXT_PUBLIC_API_URL is set for a split host.
 * Prefer `window.location.origin` over Better Auth's env/VERCEL_URL fallback so
 * www.ventureos.xyz never posts cookies to a different host.
 */
function authBaseURL(): string | undefined {
  const explicit = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (explicit) return explicit;
  if (typeof window !== "undefined") return window.location.origin;
  return undefined;
}

export const authClient = createAuthClient({
  baseURL: authBaseURL(),
  fetchOptions: { credentials: "include" },
  plugins: [organizationClient()],
});

export type Me = {
  user: { id: string; name: string; email: string } | null;
  org: { id: string; name: string; metadata?: string | null } | null;
  role: string | null;
  orgId: string | null;
  needsOrg?: boolean;
};
