import { loadEnv } from "@venture-os/config";
import { getDb } from "@venture-os/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import * as schema from "@venture-os/db/schema";
import { log } from "./log.js";
import { orgAc, orgRoles } from "./org-access.js";

const env = loadEnv();

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.WEB_URL, env.API_URL, "http://localhost:3000", "http://localhost:4000"],
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      httpOnly: true,
      path: "/",
    },
  },
  plugins: [
    organization({
      ac: orgAc,
      roles: orgRoles,
      allowUserToCreateOrganization: true,
      creatorRole: "org_admin",
      invitationExpiresIn: 60 * 60 * 24 * 7,
      sendInvitationEmail: async (data) => {
        // No SMTP in this phase. Invitation row is SoT; Settings shows a copy-link.
        log("info", "invitation_created", {
          invitationId: data.id,
          email: data.email,
          organizationId: data.organization.id,
          role: data.role,
        });
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
