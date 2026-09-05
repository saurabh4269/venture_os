import { expect, test } from "@playwright/test";

const PASSWORD = "password12345";

async function coldProspectTour(
  page: import("@playwright/test").Page,
  prefix: string,
  expandRail: boolean,
) {
  const stamp = `${Date.now().toString(36)}${expandRail ? "d" : "m"}`;

  await page.goto("/");
  await expect(page.getByTestId("marketing-landing")).toBeVisible();
  await page.screenshot({ path: `test-results/${prefix}-01-landing.png`, fullPage: true });

  await page.getByTestId("landing-get-started").click();
  await expect(page.getByTestId("signup-submit")).toBeVisible();
  await page.screenshot({ path: `test-results/${prefix}-02-signup.png`, fullPage: true });

  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page.getByTestId("login-submit")).toBeVisible();
  await page.screenshot({ path: `test-results/${prefix}-03-login.png`, fullPage: true });

  await page.getByRole("link", { name: "Sign up" }).click();
  await expect(page.getByTestId("signup-submit")).toBeVisible();
  await page.getByTestId("signup-name").fill(expandRail ? "Partner Desktop" : "Partner Mobile");
  await page.getByTestId("signup-email").fill(`partner-${stamp}@example.test`);
  await page.getByTestId("signup-password").fill(PASSWORD);
  await page.getByTestId("signup-confirm").fill(PASSWORD);
  await page.getByTestId("signup-org").fill(`Partner Org ${stamp}`);
  await page.getByTestId("signup-submit").click();

  const rateLimited = page.getByRole("alert", { name: /too many requests/i });
  if (await rateLimited.isVisible({ timeout: 5000 }).catch(() => false)) {
    throw new Error("signup_rate_limited");
  }

  await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 90_000 });
  await page.screenshot({ path: `test-results/${prefix}-04-command.png`, fullPage: true });

  if (expandRail) {
    await page.locator(".rail-toggle").click();
    await expect(page.locator(".app.app-rail-expanded")).toBeVisible();
    await expect(page.locator("aside.rail")).toHaveCSS("width", /23\dpx/);
    await expect(page.locator(".rail-expanded .rail-item.active .rail-label")).toHaveText("Command");
    await page.screenshot({ path: `test-results/${prefix}-05-rail-expanded.png`, fullPage: false });
    await page.locator("aside.rail").getByRole("link", { name: "Inbox", exact: true }).click();
  } else {
    await expect(page.locator("aside.rail")).toBeHidden();
    await page.getByTestId("mobile-nav-open").click();
    await expect(page.getByTestId("mobile-nav")).toBeVisible();
    await page.screenshot({ path: `test-results/${prefix}-05-mobile-nav.png`, fullPage: false });
    await page.getByTestId("mobile-nav").getByRole("link", { name: "Inbox", exact: true }).click();
  }

  await expect(page.getByTestId("inbox-ready")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `test-results/${prefix}-06-inbox.png`, fullPage: true });
}

test.describe("partner cold walk", () => {
  test("desktop landing through inbox with expanded rail", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    try {
      await coldProspectTour(page, "partner-desktop", true);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
  });

  test("mobile landing through inbox", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await coldProspectTour(page, "partner-mobile", false);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
  });
});
