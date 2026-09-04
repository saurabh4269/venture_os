import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { companies, organization } from "./schema.js";
import { drizzle } from "drizzle-orm/postgres-js";

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
});
