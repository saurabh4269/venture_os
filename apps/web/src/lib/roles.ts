export const ROLES = ["org_admin", "partner", "analyst", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  org_admin: "Org Admin",
  partner: "Partner",
  analyst: "Analyst",
  viewer: "Viewer",
};

export function roleLabel(role: string | null | undefined): string {
  if (!role) return "—";
  if ((ROLES as readonly string[]).includes(role)) return ROLE_LABEL[role as Role];
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
  if (t.includes("password too short") || t.includes("min")) {
    return "Password must be at least 8 characters.";
  }
  if (t.includes("slug") && (t.includes("taken") || t.includes("exists") || t.includes("unique"))) {
    return "An organisation with that name already exists. Choose another, or ask to be invited.";
  }
  if (t.includes("not_a_member")) return "You are not a member of that organisation.";
  if (t.includes("invitation_email_mismatch")) {
    return "Sign in with the email this invite was sent to.";
  }
  if (t.includes("invitation_not_pending") || t.includes("invitation_not_found")) {
    return "This invite is no longer valid.";
  }
  if (t.includes("select_or_create_an_org")) {
    return "Create or join an organisation to open the book.";
  }
  return raw;
}
