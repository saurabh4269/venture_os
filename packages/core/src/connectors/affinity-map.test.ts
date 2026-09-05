import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mapAffinityCompany, mapAffinityCompanyPage } from "./affinity-map.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, "../../../../fixtures/connectors/FIXTURE_ONLY-affinity-companies.json");

describe("Affinity field mapper", () => {
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;

  it("maps only verified v2 Company fields from FIXTURE payload", () => {
    const rows = mapAffinityCompanyPage(fixture);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      affinityCompanyId: "1",
      name: "Horizon Technologies",
      domain: "horizontech.com",
      ownershipPct: null,
    });
    expect(rows[1]?.affinityCompanyId).toBe("2");
  });

  it("does not invent ownership without a configured field id", () => {
    const mapped = mapAffinityCompany({
      id: 9,
      name: "No Field",
      domain: "n.co",
      domains: ["n.co"],
      fields: [{ id: "made-up-ownership", name: "Ownership", value: { type: "number", data: 12 } }],
    });
    expect(mapped?.ownershipPct).toBeNull();
  });

  it("reads ownership only from a configured number FieldValue", () => {
    const mapped = mapAffinityCompany(
      {
        id: 3,
        name: "Mapped Co",
        domain: "m.co",
        domains: ["m.co"],
        fields: [{ id: "field-own-1", name: "Ownership %", value: { type: "number", data: 18.5 } }],
      },
      { ownershipFieldId: "field-own-1" },
    );
    expect(mapped?.ownershipPct).toBe(18.5);
    expect(mapped?.ownershipFieldName).toBe("Ownership %");
  });

  it("keeps ownership null when the number field data is null (missing ≠ 0)", () => {
    const mapped = mapAffinityCompany(
      {
        id: 4,
        name: "Null Own",
        domain: "z.co",
        domains: ["z.co"],
        fields: [{ id: "field-own-1", name: "Ownership %", value: { type: "number", data: null } }],
      },
      { ownershipFieldId: "field-own-1" },
    );
    expect(mapped?.ownershipPct).toBeNull();
  });

  it("rejects payloads that are not official Company objects", () => {
    expect(mapAffinityCompany({ name: "no id" })).toBeNull();
    expect(mapAffinityCompanyPage({ data: [{ foo: 1 }] })).toEqual([]);
  });
});
