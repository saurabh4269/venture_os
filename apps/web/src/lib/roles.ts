export const ROLES = ["org_admin", "partner", "analyst", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  org_admin: "Org Admin",
  partner: "Partner",
  analyst: "Analyst",
  viewer: "Viewer",
};

export function canonicalizeRole(role: string | null | undefined): Role | null {
  if (!role) return null;
  if ((ROLES as readonly string[]).includes(role)) return role as Role;
  if (role === "owner" || role === "admin") return "org_admin";
  if (role === "member") return "analyst";
  return null;
}

export function isWriteRole(role: string | null | undefined): boolean {
  const r = canonicalizeRole(role);
  return r === "org_admin" || r === "partner" || r === "analyst";
}

export function isAdminRole(role: string | null | undefined): boolean {
  return canonicalizeRole(role) === "org_admin";
}

export function isLockRole(role: string | null | undefined): boolean {
  const r = canonicalizeRole(role);
  return r === "org_admin" || r === "partner";
}

export function roleLabel(role: string | null | undefined): string {
  const r = canonicalizeRole(role);
  if (r) return ROLE_LABEL[r];
  if (!role) return "—";
  return role.replaceAll("_", " ");
}

export function slugifyOrg(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function friendlyAuthError(raw: string): string {
  const t = raw.toLowerCase();
  if (t.includes("already exists") || t.includes("use another email")) {
    return "That work email is already on the book. Sign in instead.";
  }
  if (t.includes("invalid email or password")) {
    return "Email or password is wrong. Check the firm address — we will not say which.";
  }
  if (
    t.includes("password too short") ||
    t.includes("password too small") ||
    t.includes("minpassword") ||
    t.includes("minimal length") ||
    t.includes("too small: expected string")
  ) {
    return "Password must be at least 8 characters.";
  }
  if (t.includes("slug") && (t.includes("taken") || t.includes("exists") || t.includes("unique"))) {
    return "An organisation with that name already exists. Choose another, or ask to be invited.";
  }
  if (t.includes("not_a_member")) return "You are not a member of that organisation.";
  if (t.includes("invitation_email_mismatch")) {
    return "Sign in with the email this invite was sent to.";
  }
  if (t.includes("invitation_expired")) {
    return "This invite has expired. Ask Org Admin for a new copy-link.";
  }
  if (t.includes("invitation_not_pending") || t.includes("invitation_not_found")) {
    return "This invite is no longer valid.";
  }
  if (t.includes("period_locked")) {
    return "This as-of is locked. Partner or Org Admin must unlock it with a reason before marks can change.";
  }
  if (t.includes("snapshot_not_found")) {
    return "No official pack has been frozen for that as-of.";
  }
  if (t.includes("invalid_flag_policy")) {
    return "A flag threshold is out of range. Check the bounds next to each input.";
  }
  if (t.includes("rate_limited")) {
    return "Too many sign-in attempts. Wait a few minutes.";
  }
  if (t.includes("org_create_cap")) {
    return "This user already administers the maximum number of organisations.";
  }
  if (t.includes("select_or_create_an_org")) {
    return "Create or join an organisation to open the book.";
  }
  return raw;
}
