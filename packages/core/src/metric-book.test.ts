import { describe, expect, it } from "vitest";
import { METRIC_CATALOG } from "./catalog.js";
import {
  metricBookView,
  parseMetricBookJson,
  resolveMetricCatalog,
  validateMetricBookInput,
} from "./metric-book.js";
import { matchMetricAlias } from "./catalog.js";

describe("metric book", () => {
  it("parses firm overrides and merges onto the catalog", () => {
    const book = parseMetricBookJson({
      cash: { label: "Closing cash", aliases: ["bank balance", "closing cash", "cash at bank"] },
      burn: { defaultUnit: "lakh" },
      ghost: { label: "nope" },
    });
    expect(book.cash?.label).toBe("Closing cash");
    expect("ghost" in book).toBe(false);
    const cat = resolveMetricCatalog(book);
    const cash = cat.find((m) => m.key === "cash")!;
    expect(cash.label).toBe("Closing cash");
    expect(cash.aliases).toContain("cash at bank");
    expect(cat.find((m) => m.key === "burn")!.defaultUnit).toBe("lakh");
  });

  it("rejects units outside the metric family", () => {
    const bad = validateMetricBookInput({ cash: { defaultUnit: "percent" } });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.fields["cash.defaultUnit"]).toMatch(/money/);
  });

  it("uses firm aliases in matchMetricAlias when catalog is resolved", () => {
    const cat = resolveMetricCatalog({
      net_revenue: { aliases: ["topline", "net sales"] },
    });
    expect(matchMetricAlias("topline", cat)?.key).toBe("net_revenue");
    expect(matchMetricAlias("topline", METRIC_CATALOG)?.key).toBeUndefined();
  });

  it("marks overridden rows in the settings view", () => {
    const view = metricBookView({ cash: { label: "Bank cash" } });
    expect(view.find((r) => r.key === "cash")?.overridden).toBe(true);
    expect(view.find((r) => r.key === "burn")?.overridden).toBe(false);
    expect(view.find((r) => r.key === "runway_months")?.derivedFormula).toMatch(/Cash/);
  });
});
