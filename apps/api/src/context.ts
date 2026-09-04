import type { Context, Next } from "hono";
import { isAdminRole, isConfirmRole, isWriteRole } from "@venture-os/config";
import { ensureOrgDefaults, getDb, member } from "@venture-os/db";
import { eq } from "drizzle-orm";
import { auth } from "./auth.js";

export type AppUser = {
  id: string;
  name: string;
  email: string;
};

export type AppSession = {
  user: AppUser;
  orgId: string | null;
  role: string | null;
};

declare module "hono" {
  interface ContextVariableMap {
    session: AppSession;
  }
}

export async function sessionMiddleware(c: Context, next: Next) {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!result?.user) {
    c.set("session", { user: null as unknown as AppUser, orgId: null, role: null });
    return next();
  }
  const db = getDb();
  const memberships = await db.select().from(member).where(eq(member.userId, result.user.id));
  let orgId =
    (result.session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null;
  if (orgId && !memberships.some((m) => m.organizationId === orgId)) {
    orgId = null;
  }
  if (!orgId) orgId = memberships[0]?.organizationId ?? null;
  const role = memberships.find((m) => m.organizationId === orgId)?.role ?? memberships[0]?.role ?? null;
  if (orgId) {
    try {
      await ensureOrgDefaults(orgId);
    } catch {
      /* first request after create can race; settings GET also ensures */
    }
  }
  c.set("session", {
    user: { id: result.user.id, name: result.user.name, email: result.user.email },
    orgId,
    role,
  });
  return next();
}

export function requireUser(c: Context): AppSession {
  const s = c.get("session");
  if (!s?.user?.id) throw new HttpError(401, "sign_in_required");
  return s;
}

export function requireOrg(c: Context): AppSession & { orgId: string } {
  const s = requireUser(c);
  if (!s.orgId) throw new HttpError(400, "select_or_create_an_org");
  return s as AppSession & { orgId: string };
}

export function requireWrite(c: Context) {
  const s = requireOrg(c);
  if (!isWriteRole(s.role)) throw new HttpError(403, "viewer_cannot_write");
  return s;
}

export function requireAdmin(c: Context) {
  const s = requireOrg(c);
  if (!isAdminRole(s.role)) throw new HttpError(403, "org_admin_required");
  return s;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function canConfirm(role: string | null) {
  return isConfirmRole(role);
}
