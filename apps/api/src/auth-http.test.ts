import { loadEnv } from "@venture-os/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";

loadEnv();

const url = process.env.DATABASE_URL;
const origin = { origin: "http://localhost:3000", "content-type": "application/json" };

function cookieFrom(res: Response): string {
  const raw = res.headers.getSetCookie?.() ?? [];
  if (raw.length) return raw.map((c) => c.split(";")[0]).join("; ");
  const one = res.headers.get("set-cookie");
  return one ? (one.split(";")[0] ?? "") : "";
}

async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

describe.skipIf(!url)("auth & org HTTP", () => {
  const app = createApp();
  const stamp = Date.now().toString(36);
  const adminEmail = `admin-${stamp}@alpha.test`;
  const inviteEmail = `analyst-${stamp}@alpha.test`;
  const otherEmail = `ops-${stamp}@beta.test`;
  let adminCookie = "";
  let otherCookie = "";
  let adminOrgId = "";
  let otherOrgId = "";
  let inviteId = "";

  beforeAll(async () => {
    const a = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: origin,
      body: JSON.stringify({ email: adminEmail, password: "password123", name: "Alpha Admin" }),
    });
    expect(a.status).toBe(200);
    adminCookie = cookieFrom(a);

    const org = await app.request("/api/orgs", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ name: `Alpha ${stamp}`, slug: `alpha-${stamp}` }),
    });
    expect(org.status).toBe(200);
    const created = await json<{ org: { id: string } }>(org);
    adminOrgId = created.org.id;
    adminCookie = cookieFrom(org) || adminCookie;

    const b = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: origin,
      body: JSON.stringify({ email: otherEmail, password: "password123", name: "Beta Ops" }),
    });
    otherCookie = cookieFrom(b);
    const borg = await app.request("/api/orgs", {
      method: "POST",
      headers: { ...origin, cookie: otherCookie },
      body: JSON.stringify({ name: `Beta ${stamp}`, slug: `beta-${stamp}` }),
    });
    const bcreated = await json<{ org: { id: string } }>(borg);
    otherOrgId = bcreated.org.id;
    otherCookie = cookieFrom(borg) || otherCookie;
  });

  afterAll(() => {
    /* connections stay process-global via getDb — CI process exits after vitest */
  });

  it("rejects unauthenticated book reads", async () => {
    const res = await app.request("/api/companies");
    expect(res.status).toBe(401);
    expect((await json<{ error: string }>(res)).error).toBe("sign_in_required");
  });

  it("returns needsOrg for a signed-in user with no membership", async () => {
    const lone = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: origin,
      body: JSON.stringify({
        email: `lone-${stamp}@none.test`,
        password: "password123",
        name: "Lone",
      }),
    });
    const cookie = cookieFrom(lone);
    const me = await json<{ needsOrg: boolean; orgId: string | null }>(
      await app.request("/api/me", { headers: { cookie } }),
    );
    expect(me.needsOrg).toBe(true);
    expect(me.orgId).toBeNull();
    const cmd = await app.request("/api/command", { headers: { cookie } });
    expect(cmd.status).toBe(400);
  });

  it("refuses selecting another firm's org", async () => {
    const res = await app.request("/api/orgs/select", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ organizationId: otherOrgId }),
    });
    expect(res.status).toBe(403);
    expect((await json<{ error: string }>(res)).error).toBe("not_a_member");
    const me = await json<{ orgId: string }>(
      await app.request("/api/me", { headers: { cookie: adminCookie } }),
    );
    expect(me.orgId).toBe(adminOrgId);
  });

  it("lets org_admin invite a locked role and returns a copy-link", async () => {
    const res = await app.request("/api/invitations", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ email: inviteEmail, role: "analyst" }),
    });
    expect(res.status).toBe(200);
    const body = await json<{ invitation: { id: string }; acceptUrl: string }>(res);
    expect(body.invitation.id).toBeTruthy();
    expect(body.acceptUrl).toContain(body.invitation.id);
    inviteId = body.invitation.id;
  });

  it("rejects invite with a role outside the locked set", async () => {
    const res = await app.request("/api/invitations", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ email: `x-${stamp}@alpha.test`, role: "owner" }),
    });
    expect(res.status).toBe(400);
  });

  it("refuses accept when the signed-in email does not match the invite", async () => {
    const res = await app.request(`/api/invitations/${inviteId}/accept`, {
      method: "POST",
      headers: { ...origin, cookie: otherCookie },
    });
    expect(res.status).toBe(403);
  });

  it("accepts the invite for the matching user and sets the org", async () => {
    const signup = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: origin,
      body: JSON.stringify({ email: inviteEmail, password: "password123", name: "Ana" }),
    });
    const cookie = cookieFrom(signup);
    const acc = await app.request(`/api/invitations/${inviteId}/accept`, {
      method: "POST",
      headers: { ...origin, cookie },
    });
    expect(acc.status).toBe(200);
    const me = await json<{ orgId: string; role: string; needsOrg: boolean }>(
      await app.request("/api/me", { headers: { cookie } }),
    );
    expect(me.orgId).toBe(adminOrgId);
    expect(me.role).toBe("analyst");
    expect(me.needsOrg).toBe(false);
  });

  it("lists members of the active org only", async () => {
    const res = await app.request("/api/members", { headers: { cookie: adminCookie } });
    expect(res.status).toBe(200);
    const body = await json<{ members: { email: string | null; role: string }[] }>(res);
    const emails = body.members.map((m) => m.email);
    expect(emails).toContain(adminEmail);
    expect(emails).toContain(inviteEmail);
    expect(emails).not.toContain(otherEmail);
  });

  it("lets org_admin change a member role and refuses demoting the last admin", async () => {
    const listed = await json<{ members: { id: string; email: string | null; role: string }[] }>(
      await app.request("/api/members", { headers: { cookie: adminCookie } }),
    );
    const adminRow = listed.members.find((m) => m.email === adminEmail);
    const analystRow = listed.members.find((m) => m.email === inviteEmail);
    expect(adminRow && analystRow).toBeTruthy();

    const demote = await app.request(`/api/members/${adminRow!.id}`, {
      method: "PATCH",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ role: "viewer" }),
    });
    expect(demote.status).toBe(400);
    expect((await json<{ error: string }>(demote)).error).toBe("last_admin");

    const promote = await app.request(`/api/members/${analystRow!.id}`, {
      method: "PATCH",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ role: "partner" }),
    });
    expect(promote.status).toBe(200);
    expect((await json<{ member: { role: string } }>(promote)).member.role).toBe("partner");

    const foreign = await app.request(`/api/members/${analystRow!.id}`, {
      method: "PATCH",
      headers: { ...origin, cookie: otherCookie },
      body: JSON.stringify({ role: "viewer" }),
    });
    expect(foreign.status).toBe(404);
  });

  it("requires companyId on one-pager and returns company-scoped sourceRefs", async () => {
    const created = await app.request("/api/companies", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ name: `Co ${stamp}`, sector: "saas", stage: "Seed", country: "IN" }),
    });
    expect(created.status).toBe(200);
    const co = await json<{ company: { id: string } }>(created);
    const get = await app.request(`/api/companies/${co.company.id}`, { headers: { cookie: adminCookie } });
    expect(get.status).toBe(200);
    const detail = await json<{ sourceRefs: unknown[]; kpi: { cash: { display: string } } }>(get);
    expect(Array.isArray(detail.sourceRefs)).toBe(true);
    expect(detail.kpi.cash.display).toBe("—");

    const rpt = await app.request("/api/reports", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ kind: "one_pager" }),
    });
    expect(rpt.status).toBe(400);
    expect((await json<{ error: string }>(rpt)).error).toBe("company_id_required");
  });

  it("patches company profile, funds, curated one-pager, and refuses undated IRR", async () => {
    const created = await app.request("/api/companies", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ name: `Edit ${stamp}`, sector: "consumer", stage: "Seed" }),
    });
    expect(created.status).toBe(200);
    const co = await json<{ company: { id: string } }>(created);

    const patch = await app.request(`/api/companies/${co.company.id}`, {
      method: "PATCH",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ legalName: "Edit Pvt Ltd", fyStartMonth: 7, unitHint: "crore" }),
    });
    expect(patch.status).toBe(200);
    expect((await json<{ company: { legalName: string; fyStartMonth: number } }>(patch)).company.legalName).toBe(
      "Edit Pvt Ltd",
    );

    const detail = await json<{
      positions: { id: string; fundName: string }[];
      company: { fyStartMonth: number; unitHint: string | null };
    }>(await app.request(`/api/companies/${co.company.id}`, { headers: { cookie: adminCookie } }));
    expect(detail.company.fyStartMonth).toBe(7);
    expect(detail.company.unitHint).toBe("crore");
    expect(detail.positions.length).toBeGreaterThan(0);

    const fund = await app.request("/api/funds", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ name: `Euro ${stamp}`, vintage: 2024, currency: "EUR", committedCapital: 10 }),
    });
    expect(fund.status).toBe(200);
    const funded = await json<{ fund: { currency: string; vintage: number } }>(fund);
    expect(funded.fund.currency).toBe("EUR");
    expect(funded.fund.vintage).toBe(2024);

    const cmp = await json<{ stages: string[]; sectors: string[]; labels: Record<string, string> }>(
      await app.request("/api/compare?stage=Seed&metrics=cash,cac", { headers: { cookie: adminCookie } }),
    );
    expect(cmp.stages).toContain("Seed");
    expect(cmp.labels.cac).toBe("CAC");

    const rpt = await app.request("/api/reports", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ kind: "one_pager", companyId: co.company.id }),
    });
    expect(rpt.status).toBe(200);
    const draft = await json<{ report: { body: { pages: { metrics: { key: string }[] }[] } } }>(rpt);
    expect(draft.report.body.pages[0]?.metrics.map((m) => m.key)).toEqual([
      "net_revenue",
      "gross_margin_pct",
      "cash",
      "burn",
      "runway_months",
    ]);

    const settings = await json<{ connectors: Record<string, unknown>[] }>(
      await app.request("/api/settings", { headers: { cookie: adminCookie } }),
    );
    for (const c of settings.connectors) {
      expect(c.lastSyncAt).toBeUndefined();
      expect(c.config).toBeUndefined();
    }

    const nav = await json<{ irr: number | null }>(
      await app.request("/api/nav", { headers: { cookie: adminCookie } }),
    );
    expect(nav.irr).toBeNull();

    const bad = await app.request("/api/nav/marks", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({
        positionId: detail.positions[0]!.id,
        asOf: "2026-09-01",
        method: "made_up",
        value: 1,
      }),
    });
    expect(bad.status).toBe(400);
    expect((await json<{ error: string }>(bad)).error).toBe("invalid_mark_method");
  });

  it("forbids viewer writes", async () => {
    const vEmail = `viewer-${stamp}@alpha.test`;
    const inv = await app.request("/api/invitations", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ email: vEmail, role: "viewer" }),
    });
    expect(inv.status).toBe(200);
    const invBody = await json<{ invitation: { id: string } }>(inv);
    const signup = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: origin,
      body: JSON.stringify({ email: vEmail, password: "password123", name: "View" }),
    });
    const cookie = cookieFrom(signup);
    const acc = await app.request(`/api/invitations/${invBody.invitation.id}/accept`, {
      method: "POST",
      headers: { ...origin, cookie },
    });
    expect(acc.status).toBe(200);
    const write = await app.request("/api/funds", {
      method: "POST",
      headers: { ...origin, cookie },
      body: JSON.stringify({ name: "Should fail" }),
    });
    expect(write.status).toBe(403);
    expect((await json<{ error: string }>(write)).error).toBe("viewer_cannot_write");
  });

  it("logs out and then blocks the book", async () => {
    const out = await app.request("/api/logout", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
    });
    expect(out.status).toBe(200);
    const cleared = cookieFrom(out) || adminCookie;
    const me = await json<{ user: { id: string } | null }>(
      await app.request("/api/me", { headers: { cookie: cleared } }),
    );
    expect(me.user).toBeNull();
  });
});
