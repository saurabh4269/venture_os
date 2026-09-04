import { describe, expect, it } from "vitest";
import {
  PUBLIC_DEV_AUTH_SECRET,
  assertProductionAuthSecret,
  cookieSecure,
  isTrustedOrigin,
  loadEnv,
  maskEmail,
  originMatches,
  safeNextPath,
} from "./index.js";

describe("safeNextPath", () => {
  it("keeps a single-slash app path", () => {
    expect(safeNextPath("/inbox")).toBe("/inbox");
    expect(safeNextPath("/invite?id=abc")).toBe("/invite?id=abc");
  });

  it("rejects protocol-relative and scheme-bearing values", () => {
    expect(safeNextPath("//evil.example/phish")).toBe("/command");
    expect(safeNextPath("https://evil.example")).toBe("/command");
    expect(safeNextPath("/\\evil")).toBe("/command");
    expect(safeNextPath("/%2f%2fevil.example")).toBe("/command");
    expect(safeNextPath(null)).toBe("/command");
  });
});

describe("origins", () => {
  const env = {
    WEB_URL: "https://app.example",
    API_URL: "https://api.example",
    WEB_ORIGIN_PATTERNS: "https://*.vercel.app",
  };

  it("allows WEB_URL and a matching preview host", () => {
    expect(isTrustedOrigin("https://app.example", env)).toBe(true);
    expect(isTrustedOrigin("https://preview-foo.vercel.app", env)).toBe(true);
    expect(originMatches("https://preview-foo.vercel.app", "https://*.vercel.app")).toBe(true);
  });

  it("rejects an unlisted host", () => {
    expect(isTrustedOrigin("https://evil.example", env)).toBe(false);
    expect(isTrustedOrigin("https://evil.vercel.app.attacker.test", env)).toBe(false);
  });
});

describe("production secret + seed", () => {
  it("throws on missing, short, or public default secret", () => {
    expect(() => assertProductionAuthSecret(undefined)).toThrow(/32/);
    expect(() => assertProductionAuthSecret("short")).toThrow(/32/);
    expect(() => assertProductionAuthSecret(PUBLIC_DEV_AUTH_SECRET)).toThrow(/public default/);
  });

  it("loadEnv fails closed in production", () => {
    expect(() => loadEnv({ NODE_ENV: "production" })).toThrow(/BETTER_AUTH_SECRET/);
    expect(() =>
      loadEnv({
        NODE_ENV: "production",
        BETTER_AUTH_SECRET: "a".repeat(32),
        SEED_DEMO: "1",
      }),
    ).toThrow(/SEED_DEMO/);
    expect(
      loadEnv({
        NODE_ENV: "production",
        BETTER_AUTH_SECRET: "ci-secret-not-for-production-use-32ch",
      }).NODE_ENV,
    ).toBe("production");
  });
});

describe("cookieSecure + maskEmail", () => {
  it("follows COOKIE_SECURE then https then NODE_ENV", () => {
    expect(cookieSecure({ NODE_ENV: "development", BETTER_AUTH_URL: "http://localhost:4000" }, "1")).toBe(
      true,
    );
    expect(cookieSecure({ NODE_ENV: "development", BETTER_AUTH_URL: "https://api.example" })).toBe(true);
    expect(cookieSecure({ NODE_ENV: "production", BETTER_AUTH_URL: "http://localhost:4000" })).toBe(true);
    expect(cookieSecure({ NODE_ENV: "development", BETTER_AUTH_URL: "http://localhost:4000" }, "0")).toBe(
      false,
    );
  });

  it("masks the local part", () => {
    expect(maskEmail("analyst@firm.test")).toBe("a***@firm.test");
  });
});
