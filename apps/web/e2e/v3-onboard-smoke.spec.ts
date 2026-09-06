import { expect, test } from "@playwright/test";

const url = process.env.DATABASE_URL;
const seedEmail = process.env.SEED_V3_EMAIL || process.env.SEED_DEMO_EMAIL || "analyst@fixture.local";
const seedPassword = process.env.SEED_DEMO_PASSWORD || "fixture-only-password";

test.describe("@smoke v3 onboard seed", () => {
  test.skip(!url, "DATABASE_URL required for onboard seed smoke");

  test("switch to onboard seed org → Command → Inbox → company cite", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill(seedEmail);
    await page.getByTestId("login-password").fill(seedPassword);
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });

    await page.getByTestId("account-menu").click({ force: true });
    const v3Org = page.getByRole("menuitem", { name: /V3 Ventures \(ONBOARD_SEED\)/i });
    if (await v3Org.isVisible().catch(() => false)) {
      await v3Org.click();
      await expect(page.getByTestId("seed-banner")).toContainText(/not the live book/i);
    }

    await page.goto("/command");
    await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: "SuperYou" }).first()).toBeVisible();

    await page.goto("/inbox");
    await expect(page.getByTestId("inbox-ready")).toBeVisible();
    await expect(page.getByTestId("inbox-confirm").first()).toBeVisible();

    await page.goto("/companies");
    await expect(page.getByRole("link", { name: "The Hosteller" }).first()).toBeVisible();
    await page.getByRole("link", { name: "The Hosteller" }).first().click();
    await expect(page.getByTestId("shell-ready")).toBeVisible();
    await expect(page.getByText(/objective/i).first()).toBeVisible();

    for (const path of ["/flags", "/nav", "/compare", "/reports"]) {
      await page.goto(path);
      await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
    }
  });
});
