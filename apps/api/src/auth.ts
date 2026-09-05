import {
  collectTrustedOrigins,
  cookieSecure,
  loadEnv,
  maskEmail,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@venture-os/config";
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
  trustedOrigins: collectTrustedOrigins(env),
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    maxPasswordLength: MAX_PASSWORD_LENGTH,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: cookieSecure(env),
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
        log("info", "invitation_created", {
          invitationId: data.id,
          email: env.NODE_ENV === "production" ? maskEmail(data.email) : data.email,
          organizationId: data.organization.id,
          role: data.role,
        });
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
