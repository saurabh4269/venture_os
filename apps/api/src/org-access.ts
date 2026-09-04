import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

/** Locked org roles (D5 / AGENTS.md). Must stay in sync with @venture-os/config ROLES. */
export const orgAc = createAccessControl(defaultStatements);

export const orgAdminRole = orgAc.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
});

export const partnerRole = orgAc.newRole({
  organization: ["update"],
  member: ["create", "update"],
  invitation: ["create", "cancel"],
  team: ["create", "update"],
  ac: ["read"],
});

export const analystRole = orgAc.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ["read"],
});

export const viewerRole = orgAc.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ["read"],
});

export const orgRoles = {
  org_admin: orgAdminRole,
  partner: partnerRole,
  analyst: analystRole,
  viewer: viewerRole,
};
