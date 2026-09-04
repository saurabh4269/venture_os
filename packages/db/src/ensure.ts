import { eq } from "drizzle-orm";
import { withOrg } from "./client.js";
import { connectors, orgSettings } from "./schema.js";

export async function ensureOrgDefaults(orgId: string) {
  await withOrg(orgId, async (tx) => {
    const settings = await tx.select().from(orgSettings);
    if (!settings.length) {
      await tx.insert(orgSettings).values({
        orgId,
        fyStartMonth: 4,
        baseCurrency: "INR",
        displayCurrency: "EUR",
      });
    }
    const conns = await tx.select().from(connectors);
    if (!conns.length) {
      await tx.insert(connectors).values([
        { orgId, kind: "onedrive", status: "not_connected" },
        { orgId, kind: "affinity", status: "not_connected" },
        { orgId, kind: "granola", status: "not_connected" },
      ]);
    }
  });
  void eq;
}
