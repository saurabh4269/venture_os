import { randomUUID } from "node:crypto";
import { loadEnv } from "@venture-os/config";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { companies, navPeriodLocks, organization, orgSettings } from "./schema.js";
import { drizzle } from "drizzle-orm/postgres-js";

loadEnv();
const url = process.env.DATABASE_URL;

describe.skipIf(!url)("RLS org isolation", () => {
  const client = postgres(url!, { max: 1 });
  const db = drizzle(client);

  afterAll(async () => {
    await client.end();
  });

  it("org A cannot read org B companies", async () => {
    const orgA = "rls_org_a_" + randomUUID();
    const orgB = "rls_org_b_" + randomUUID();
    await db.execute(sql`select set_config('app.current_org_id', '', false)`);
    // organization table is not RLS-forced
    await db.insert(organization).values([
      { id: orgA, name: "A", slug: orgA },
      { id: orgB, name: "B", slug: orgB },
    ]);

    await db.execute(sql`select set_config('app.current_org_id', ${orgA}, false)`);
    await db.insert(companies).values({ orgId: orgA, name: "A Co" });

    await db.execute(sql`select set_config('app.current_org_id', ${orgB}, false)`);
    await db.insert(companies).values({ orgId: orgB, name: "B Co" });

    await db.execute(sql`select set_config('app.current_org_id', ${orgA}, false)`);
    const asA = await db.select().from(companies);
    expect(asA.every((c) => c.orgId === orgA)).toBe(true);
    expect(asA.some((c) => c.name === "B Co")).toBe(false);

    await db.execute(sql`select set_config('app.current_org_id', ${orgB}, false)`);
    const asB = await db.select().from(companies);
    expect(asB.every((c) => c.orgId === orgB)).toBe(true);
    expect(asB.some((c) => c.name === "A Co")).toBe(false);

    await db.execute(sql`select set_config('app.current_org_id', '', false)`);
    const none = await db.select().from(companies);
    expect(none.length).toBe(0);
  });

  it("org A cannot read org B NAV locks or flag policy", async () => {
    const orgA = "rls_lock_a_" + randomUUID();
    const orgB = "rls_lock_b_" + randomUUID();
    await db.execute(sql`select set_config('app.current_org_id', '', false)`);
    await db.insert(organization).values([
      { id: orgA, name: "A lock", slug: orgA },
      { id: orgB, name: "B lock", slug: orgB },
    ]);

    await db.execute(sql`select set_config('app.current_org_id', ${orgA}, false)`);
    await db.insert(orgSettings).values({ orgId: orgA, flagPolicy: { runway_short: 4 } });
    await db.insert(navPeriodLocks).values({ orgId: orgA, asOf: "2026-06-30", status: "locked" });

    await db.execute(sql`select set_config('app.current_org_id', ${orgB}, false)`);
    await db.insert(orgSettings).values({ orgId: orgB, flagPolicy: { runway_short: 9 } });
    const asBLocks = await db.select().from(navPeriodLocks);
    expect(asBLocks).toEqual([]);
    const asBSettings = await db.select().from(orgSettings);
    expect(asBSettings).toHaveLength(1);
    expect(asBSettings[0]?.orgId).toBe(orgB);

    await db.execute(sql`select set_config('app.current_org_id', ${orgA}, false)`);
    const asALocks = await db.select().from(navPeriodLocks);
    expect(asALocks).toHaveLength(1);
    expect(asALocks[0]?.orgId).toBe(orgA);
    const asASettings = await db.select().from(orgSettings);
    expect((asASettings[0]?.flagPolicy as { runway_short?: number })?.runway_short).toBe(4);
  });
});
