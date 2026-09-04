import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

/** Undefined baseURL → current origin (same-origin BFF). */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || undefined,
  plugins: [organizationClient()],
});

export type Me = {
  user: { id: string; name: string; email: string } | null;
  org: { id: string; name: string; metadata?: string | null } | null;
  role: string | null;
  orgId: string | null;
  needsOrg?: boolean;
};
