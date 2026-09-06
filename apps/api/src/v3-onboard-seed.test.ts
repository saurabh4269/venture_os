import { loadEnv } from "@venture-os/config";
import { closeDb, getDb, seedV3Onboard, V3_ONBOARD_ORG_ID } from "@venture-os/db";
import { companies, organization } from "@venture-os/db/schema";
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

describe.skipIf(!url)("v3 onboard seed smoke", () => {
  const app = createApp();
  const stamp = Date.now().toString(36);
  const email = `v3-seed-${stamp}@example.test`;
  let cookie = "";

  beforeAll(async () => {
    process.env.SEED_V3_ONBOARD = "1";
    const signup = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: origin,
      body: JSON.stringify({ email, password: "password123", name: "V3 Seed" }),
    });
    expect(signup.status).toBe(200);
    cookie = cookieFrom(signup);
    process.env.SEED_V3_EMAIL = email;
    await seedV3Onboard();
  });

  afterAll(async () => {
    await closeDb();
  });

  it("creates onboard seed org with companies", async () => {
    const db = getDb();
    const [org] = await db.select().from(organization).where(eq(organization.id, V3_ONBOARD_ORG_ID));
    expect(org?.metadata).toContain("onboardSeed");
    const cos = await db.select().from(companies).where(eq(companies.orgId, V3_ONBOARD_ORG_ID));
    expect(cos.length).toBeGreaterThanOrEqual(36);
  });

  it("Command returns non-empty coverage after org switch", async () => {
    const sel = await app.request("/api/orgs/select", {
      method: "POST",
      headers: { ...origin, cookie },
      body: JSON.stringify({ organizationId: V3_ONBOARD_ORG_ID }),
    });
    expect(sel.status).toBe(200);
    cookie = cookieFrom(sel) || cookie;

    const cmd = await app.request("/api/command", { headers: { cookie } });
    expect(cmd.status).toBe(200);
    const body = (await cmd.json()) as {
      pulse: { companies: number; inboxPending: number };
      coverage: unknown[];
    };
    expect(body.pulse.companies).toBeGreaterThanOrEqual(36);
    expect(body.coverage.length).toBeGreaterThanOrEqual(36);
    expect(body.pulse.inboxPending).toBeGreaterThanOrEqual(3);
  });

  it("Companies list and inbox load", async () => {
    const list = await app.request("/api/companies", { headers: { cookie } });
    expect(list.status).toBe(200);
    const cos = (await list.json()) as { companies: { name: string }[] };
    expect(cos.companies.some((c) => c.name === "SuperYou")).toBe(true);
    expect(cos.companies.some((c) => c.name === "Pattern Brands")).toBe(true);

    const inbox = await app.request("/api/inbox", { headers: { cookie } });
    expect(inbox.status).toBe(200);
    const items = (await inbox.json()) as { items: { status: string }[] };
    expect(items.items.filter((i) => i.status === "pending").length).toBeGreaterThanOrEqual(3);
  });

  it("Flags, NAV, Compare, Reports endpoints respond", async () => {
    for (const path of ["/api/flags", "/api/nav", "/api/compare", "/api/reports"]) {
      const res = await app.request(path, { headers: { cookie } });
      expect(res.status).toBe(200);
    }
  });
});
