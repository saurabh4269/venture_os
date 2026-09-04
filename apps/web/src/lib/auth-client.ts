import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  plugins: [organizationClient()],
});

export type Me = {
  user: { id: string; name: string; email: string } | null;
  org: { id: string; name: string; metadata?: string | null } | null;
  role: string | null;
  orgId: string | null;
  needsOrg?: boolean;
};
