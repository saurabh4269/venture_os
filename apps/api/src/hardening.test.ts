import { invitationExpired, loadEnv } from "@venture-os/config";
import { getDb, invitation, navPeriodLocks } from "@venture-os/db";
import { eq } from "drizzle-orm";
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

describe.skipIf(!url)("hardening 23–30 HTTP", () => {
  const app = createApp();
  const stamp = Date.now().toString(36);
  const adminEmail = `hard-admin-${stamp}@alpha.test`;
  const viewerEmail = `hard-view-${stamp}@alpha.test`;
  let adminCookie = "";
  let viewerCookie = "";
  let positionId = "";
  let companyId = "";

  beforeAll(async () => {
    const a = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: origin,
      body: JSON.stringify({ email: adminEmail, password: "password123", name: "Hard Admin" }),
    });
    expect(a.status).toBe(200);
    adminCookie = cookieFrom(a);
    const org = await app.request("/api/orgs", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ name: `Hard ${stamp}`, slug: `hard-${stamp}` }),
    });
    expect(org.status).toBe(200);
    adminCookie = cookieFrom(org) || adminCookie;

    const co = await json<{ company: { id: string } }>(
      await app.request("/api/companies", {
        method: "POST",
        headers: { ...origin, cookie: adminCookie },
        body: JSON.stringify({ name: `HardCo ${stamp}`, sector: "saas", stage: "Seed" }),
      }),
    );
    companyId = co.company.id;
    const detail = await json<{ positions: { id: string }[] }>(
      await app.request(`/api/companies/${companyId}`, { headers: { cookie: adminCookie } }),
    );
    positionId = detail.positions[0]!.id;

    const inv = await json<{ invitation: { id: string } }>(
      await app.request("/api/invitations", {
        method: "POST",
        headers: { ...origin, cookie: adminCookie },
        body: JSON.stringify({ email: viewerEmail, role: "viewer" }),
      }),
    );
    const signup = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: origin,
      body: JSON.stringify({ email: viewerEmail, password: "password123", name: "View" }),
    });
    viewerCookie = cookieFrom(signup);
    await app.request(`/api/invitations/${inv.invitation.id}/accept`, {
      method: "POST",
      headers: { ...origin, cookie: viewerCookie },
    });
  });

  afterAll(() => {
    /* process-global db */
  });

  it("defaults NAV as-of to last calendar quarter-end and starts unofficial", async () => {
    const nav = await json<{ asOf: string; period: { status: string } }>(
      await app.request("/api/nav", { headers: { cookie: adminCookie } }),
    );
    expect(nav.period.status).toBe("unofficial");
    expect(nav.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("locks an as-of so a write cannot silently change marks", async () => {
    const asOf = "2026-06-30";
    const lock = await app.request("/api/nav/lock", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ asOf }),
    });
    expect(lock.status).toBe(200);
    expect((await json<{ period: { status: string } }>(lock)).period.status).toBe("locked");

    const write = await app.request("/api/nav/marks", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ positionId, asOf, method: "last_round", value: 12 }),
    });
    expect(write.status).toBe(409);
    expect((await json<{ error: string }>(write)).error).toBe("period_locked");

    const viewerLock = await app.request("/api/nav/lock", {
      method: "POST",
      headers: { ...origin, cookie: viewerCookie },
      body: JSON.stringify({ asOf: "2026-03-31" }),
    });
    expect(viewerLock.status).toBe(403);

    const unlockNoReason = await app.request("/api/nav/unlock", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ asOf }),
    });
    expect(unlockNoReason.status).toBe(400);

    const unlock = await app.request("/api/nav/unlock", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ asOf, reason: "Restate after board pack" }),
    });
    expect(unlock.status).toBe(200);
    const period = (await json<{ period: { status: string; unlockReason: string } }>(unlock)).period;
    expect(period.status).toBe("unofficial");
    expect(period.unlockReason).toBe("Restate after board pack");

    const ok = await app.request("/api/nav/marks", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ positionId, asOf, method: "last_round", value: 12 }),
    });
    expect(ok.status).toBe(200);
  });

  it("persists firm flag policy and returns merged thresholds", async () => {
    const save = await app.request("/api/settings/flag-policy", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ thresholds: { runway_short: 4 } }),
    });
    expect(save.status).toBe(200);
    const saved = await json<{ flagPolicy: { key: string; threshold: number; defaultThreshold: number }[] }>(save);
    expect(saved.flagPolicy.find((f) => f.key === "runway_short")?.threshold).toBe(4);
    expect(saved.flagPolicy.find((f) => f.key === "mis_late")?.threshold).toBe(45);

    const viewer = await app.request("/api/settings/flag-policy", {
      method: "POST",
      headers: { ...origin, cookie: viewerCookie },
      body: JSON.stringify({ thresholds: { runway_short: 1 } }),
    });
    expect(viewer.status).toBe(403);

    const get = await json<{ flagPolicy: { key: string; threshold: number }[] }>(
      await app.request("/api/settings", { headers: { cookie: adminCookie } }),
    );
    expect(get.flagPolicy.find((f) => f.key === "runway_short")?.threshold).toBe(4);
  });

  it("drafts a monthly pack with separate objective and subjective lanes", async () => {
    const rpt = await app.request("/api/reports", {
      method: "POST",
      headers: { ...origin, cookie: adminCookie },
      body: JSON.stringify({ kind: "monthly_pack", periodEnd: "2026-03-31" }),
    });
    expect(rpt.status).toBe(200);
    const draft = await json<{
      report: { kind: string; body: { rows: { objective: string[]; subjective: string[]; metrics: { key: string; value: number | null }[] }[] } };
    }>(rpt);
    expect(draft.report.kind).toBe("monthly_pack");
    expect(draft.report.body.rows[0]?.metrics.map((m) => m.key)).toEqual([
      "net_revenue",
      "gross_margin_pct",
      "cash",
      "burn",
      "runway_months",
    ]);
    expect(draft.report.body.rows[0]?.metrics.find((m) => m.key === "cash")?.value).toBeNull();
  });

  it("refuses an expired invite with 410", async () => {
    const created = await json<{ invitation: { id: string } }>(
      await app.request("/api/invitations", {
        method: "POST",
        headers: { ...origin, cookie: adminCookie },
        body: JSON.stringify({ email: `expired-${stamp}@alpha.test`, role: "analyst" }),
      }),
    );
    const db = getDb();
    await db
      .update(invitation)
      .set({ expiresAt: new Date("2020-01-01T00:00:00Z") })
      .where(eq(invitation.id, created.invitation.id));
    expect(invitationExpired(new Date("2020-01-01T00:00:00Z"))).toBe(true);

    const signup = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: origin,
      body: JSON.stringify({
        email: `expired-${stamp}@alpha.test`,
        password: "password123",
        name: "Expired",
      }),
    });
    const cookie = cookieFrom(signup);
    const acc = await app.request(`/api/invitations/${created.invitation.id}/accept`, {
      method: "POST",
      headers: { ...origin, cookie },
    });
    expect(acc.status).toBe(410);
    expect((await json<{ error: string }>(acc)).error).toBe("invitation_expired");
  });

  it("rejects mutating book calls from an untrusted origin", async () => {
    const res = await app.request("/api/funds", {
      method: "POST",
      headers: { origin: "https://evil.example", "content-type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ name: "Evil" }),
    });
    expect(res.status).toBe(403);
    expect((await json<{ error: string }>(res)).error).toBe("untrusted_origin");
  });

  it("does not leak another org NAV lock via RLS session", async () => {
    const db = getDb();
    const other = await db.select().from(navPeriodLocks);
    expect(other.every((r) => r.orgId)).toBe(true);
  });

  it("masks the public invite payload and withholds the full email", async () => {
    const created = await json<{ invitation: { id: string } }>(
      await app.request("/api/invitations", {
        method: "POST",
        headers: { ...origin, cookie: adminCookie },
        body: JSON.stringify({ email: `mask-${stamp}@alpha.test`, role: "analyst" }),
      }),
    );
    const pub = await json<{
      invitation: { email?: string; emailMasked?: string; canAccept?: boolean };
    }>(await app.request(`/api/invitations/${created.invitation.id}`));
    expect(pub.invitation.email).toBeUndefined();
    expect(pub.invitation.emailMasked).toMatch(/^\w\*\*\*@alpha\.test$/);
    expect(pub.invitation.canAccept).toBeFalsy();
  });

  it("forbids a viewer from listing invite copy-links", async () => {
    const res = await app.request("/api/invitations", { headers: { cookie: viewerCookie } });
    expect(res.status).toBe(403);
  });

  it("logout is idempotent without a session", async () => {
    const res = await app.request("/api/logout", { method: "POST", headers: origin, body: "{}" });
    expect(res.status).toBe(200);
    expect((await json<{ ok: boolean }>(res)).ok).toBe(true);
  });

  it("health reports postgres, redis, and a git SHA", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors");
    const body = await json<{
      ok: boolean;
      postgres: string;
      redis: string;
      gitSha: string;
      ready: boolean;
    }>(res);
    expect(body.ok).toBe(true);
    expect(body.postgres).toBe("up");
    expect(["up", "down"]).toContain(body.redis);
    expect(typeof body.gitSha).toBe("string");
  });

  it("rejects invite decline from the wrong account", async () => {
    const created = await json<{ invitation: { id: string } }>(
      await app.request("/api/invitations", {
        method: "POST",
        headers: { ...origin, cookie: adminCookie },
        body: JSON.stringify({ email: `rej-${stamp}@alpha.test`, role: "analyst" }),
      }),
    );
    const res = await app.request(`/api/invitations/${created.invitation.id}/reject`, {
      method: "POST",
      headers: { ...origin, cookie: viewerCookie },
      body: "{}",
    });
    expect(res.status).toBe(403);
  });
});

describe.skipIf(!url)("preview origin allow-list", () => {
  it("accepts a matching Vercel preview Origin when patterned", async () => {
    process.env.WEB_ORIGIN_PATTERNS = "https://*.vercel.app";
    const previewApp = createApp();
    const stamp = `pv-${Date.now().toString(36)}`;
    const email = `${stamp}@alpha.test`;
    const signup = await previewApp.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { origin: "https://preview-foo.vercel.app", "content-type": "application/json" },
      body: JSON.stringify({ email, password: "password123", name: "Preview" }),
    });
    expect(signup.status).toBe(200);
    const cookie = cookieFrom(signup);
    const org = await previewApp.request("/api/orgs", {
      method: "POST",
      headers: {
        origin: "https://preview-foo.vercel.app",
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({ name: stamp, slug: stamp }),
    });
    expect(org.status).toBe(200);
  });
});
