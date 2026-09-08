import { describe, expect, it } from "vitest";
import { companyLogoSlug, companyLogoSrc, normalizeCompanyKey } from "./company-logos";

describe("company-logos", () => {
  it("normalizes names", () => {
    expect(normalizeCompanyKey("  The Hosteller ")).toBe("the hosteller");
    expect(normalizeCompanyKey("Crème Castle")).toBe("creme castle");
  });

  it("resolves known V3-shaped brands", () => {
    expect(companyLogoSlug("Salad Days")).toBe("salad-days");
    expect(companyLogoSlug("The Hosteller")).toBe("hosteller");
    expect(companyLogoSlug("CAVA Athleisure")).toBe("cava");
    expect(companyLogoSlug("Lightfury Games")).toBe("lightfury-games");
    expect(companyLogoSrc("Go Zero")).toBe("/company-logos/go-zero.png");
  });

  it("refuses invented fixture names", () => {
    expect(companyLogoSlug("Fixture Apparel")).toBeNull();
    expect(companyLogoSrc("Unknown Co")).toBeNull();
  });
});
