import { expect, test } from "@playwright/test";
import { signupAdmin } from "./helpers/session";

async function assertLandingPolish(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByTestId("marketing-landing")).toBeVisible();
  await expect(page.getByRole("heading", { name: /book for the investment team/i })).toBeVisible();
  await expect(page.getByTestId("landing-get-started")).toBeVisible();
  await expect(page.getByTestId("landing-hero-login")).toBeVisible();
  await expect(page.locator(".mkt-frame-kpis .v").first()).toHaveText("—");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "How we work" })).toBeVisible();
  const footerLinkCase = await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "How we work" })
    .evaluate((el) => getComputedStyle(el).textTransform);
  expect(footerLinkCase).toBe("none");
}

async function assertExpandedRailEntry(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 30_000 });
  const toggle = page.getByTestId("rail-toggle");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveCSS("border-width", /1px/);
  await toggle.click();
  await expect(page.locator(".app.app-rail-expanded")).toBeVisible();
  await expect(page.locator(".rail-expanded .rail-label").filter({ hasText: "Command" })).toBeVisible();
  await expect(page.locator(".rail-expanded .rail-label").filter({ hasText: "Vault" })).toBeVisible();
  await page.locator('aside.rail a.rail-item[href="/inbox"]').click();
  await expect(page.getByTestId("inbox-ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".rail-expanded .rail-item.active .rail-label")).toHaveText("Inbox");
}

async function assertLoginPolish(page: import("@playwright/test").Page) {
  await page.goto("/login?next=/command");
  await expect(page.getByTestId("login-submit")).toBeVisible();
  await expect(page.getByTestId("login-submit")).toHaveClass(/auth-submit/);
  await expect(page.locator(".auth")).toBeVisible();
  const border = await page.locator(".auth").evaluate((el) => getComputedStyle(el).borderWidth);
  expect(border).not.toBe("0px");
}

async function assertCommandEmpty(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".command-kpis .kpi .v").first()).toHaveText("—");
  const empty = page.getByTestId("command-empty");
  await expect(empty).toBeVisible();
  await expect(empty.getByRole("link", { name: "Add company" })).toBeVisible();
  await expect(empty.getByRole("link", { name: "Open Inbox" })).toBeVisible();
}

test.describe("entry polish walk", () => {
  test("desktop landing, login, and command empty book", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    const stamp = Date.now().toString(36);
    try {
      await assertLandingPolish(page);
      await page.screenshot({ path: `test-results/entry-polish-${stamp}-landing-desktop.png`, fullPage: true });
      await assertLoginPolish(page);
      await page.screenshot({ path: `test-results/entry-polish-${stamp}-login-desktop.png`, fullPage: true });
      await signupAdmin(page, stamp);
      await assertCommandEmpty(page);
      await assertExpandedRailEntry(page);
      await page.screenshot({ path: `test-results/entry-polish-${stamp}-command-empty-desktop.png`, fullPage: true });
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
  });

  test("mobile landing, login, and command empty book", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const stamp = `${Date.now().toString(36)}m`;
    try {
      await assertLandingPolish(page);
      await page.screenshot({ path: `test-results/entry-polish-${stamp}-landing-mobile.png`, fullPage: true });
      await assertLoginPolish(page);
      await page.screenshot({ path: `test-results/entry-polish-${stamp}-login-mobile.png`, fullPage: true });
      await signupAdmin(page, stamp);
      await assertCommandEmpty(page);
      const addBtn = page.getByTestId("command-empty").getByRole("link", { name: "Add company" });
      await expect(addBtn).toHaveCSS("min-height", /44px/);
      await page.screenshot({ path: `test-results/entry-polish-${stamp}-command-empty-mobile.png`, fullPage: true });
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
  });
});
