import { expect, test } from "@playwright/test";
import { signupAdmin } from "./helpers/session";

async function landingWalk(page: import("@playwright/test").Page, prefix: string) {
  await page.goto("/");
  await expect(page.getByTestId("marketing-landing")).toBeVisible();
  await expect(page.getByRole("heading", { name: /book for the investment team/i })).toBeVisible();
  await expect(page.getByTestId("landing-get-started")).toBeVisible();
  await expect(page.getByTestId("landing-hero-login")).toBeVisible();
  await page.screenshot({ path: `test-results/${prefix}-landing-top.png`, fullPage: false });

  await page.getByTestId("mkt-notes").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/${prefix}-landing-notes.png`, fullPage: false });

  await page.locator("#pricing").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("landing-log-in")).toBeVisible();
  await page.screenshot({ path: `test-results/${prefix}-landing-pricing.png`, fullPage: false });
  await page.screenshot({ path: `test-results/${prefix}-landing-full.png`, fullPage: true });
}

async function connectorsWalk(page: import("@playwright/test").Page, prefix: string) {
  await page.goto("/settings/connectors");
  await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("connectors-ready")).toBeVisible();
    await expect(page.getByTestId("connector-cards")).toBeVisible();
  await expect(page.getByTestId("connector-card-onedrive")).toBeVisible();
  await expect(page.getByTestId("connector-card-affinity")).toBeVisible();
  await expect(page.getByTestId("connector-card-granola")).toBeVisible();
  await page.screenshot({ path: `test-results/${prefix}-connectors-top.png`, fullPage: false });

  await page.getByTestId("connector-card-onedrive").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/${prefix}-connectors-onedrive.png`, fullPage: false });

  await page.getByTestId("connector-card-granola").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/${prefix}-connectors-granola.png`, fullPage: false });
  await page.screenshot({ path: `test-results/${prefix}-connectors-full.png`, fullPage: true });
}

test.describe("cold walk: landing and connectors", () => {
  test("desktop landing and connector settings", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await landingWalk(page, "walk-landing-desktop");

    const stamp = Date.now().toString(36);
    try {
      await signupAdmin(page, stamp);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
    await connectorsWalk(page, "walk-connectors-desktop");
  });

  test("mobile landing menu and connector settings", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("marketing-landing")).toBeVisible();
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
    await page.screenshot({ path: "test-results/walk-landing-mobile-menu.png", fullPage: false });
    await page.keyboard.press("Escape");
    await landingWalk(page, "walk-landing-mobile");

    const stamp = `${Date.now().toString(36)}m`;
    try {
      await signupAdmin(page, stamp);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
    await connectorsWalk(page, "walk-connectors-mobile");
  });
});
