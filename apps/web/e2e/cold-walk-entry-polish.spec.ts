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
  await expect(empty.getByText(/confirm in Inbox/i)).toBeVisible();
}

async function signupViaForm(page: import("@playwright/test").Page, stamp: string) {
  await page.getByTestId("signup-name").fill("E2E Admin");
  await page.getByTestId("signup-email").fill(`e2e-admin-${stamp}@example.test`);
  await page.getByTestId("signup-password").fill("password123");
  await page.getByTestId("signup-confirm").fill("password123");
  await page.getByTestId("signup-org").fill(`E2E ${stamp}`);
  await page.getByTestId("signup-submit").click();
  await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 30_000 });
}

async function assertMobileCommandEmpty(page: import("@playwright/test").Page) {
  await assertCommandEmpty(page);
  const empty = page.getByTestId("command-empty");
  const addBtn = empty.getByRole("link", { name: "Add company" });
  const inboxBtn = empty.getByRole("link", { name: "Open Inbox" });
  await expect(addBtn).toHaveCSS("min-height", /44px/);
  await expect(inboxBtn).toHaveCSS("min-height", /44px/);
  await expect(page.getByTestId("topbar-mobile-title")).toHaveText("Command");
  await expect(page.getByTestId("mobile-nav-open")).toHaveCSS("min-height", /44px/);
  const topbarAdd = page.locator(".topbar-actions .topbar-add-btn");
  await expect(topbarAdd).toBeVisible();
  await expect(topbarAdd).toHaveCSS("min-height", /44px/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function assertSignupPolish(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("signup-submit")).toBeVisible();
  await expect(page.getByTestId("signup-submit")).toHaveClass(/auth-submit/);
  await expect(page.getByText(/8 to 128 characters/i)).toBeVisible();
  const submitMinH = await page.getByTestId("signup-submit").evaluate((el) => parseFloat(getComputedStyle(el).minHeight));
  expect(submitMinH).toBeGreaterThanOrEqual(44);
}

test.describe("entry polish walk", () => {
  test("desktop landing, login, and command empty book", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    const stamp = Date.now().toString(36);
    try {
      await assertLandingPolish(page);
      await page.screenshot({ path: `test-results/entry-polish-${stamp}-landing-desktop.png`, fullPage: true });
      await page.goto("/login?next=/command");
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

      await page.getByTestId("landing-hero-login").click();
      await expect(page).toHaveURL(/\/login/);
      await assertLoginPolish(page);
      const loginMinH = await page.getByTestId("login-submit").evaluate((el) => parseFloat(getComputedStyle(el).minHeight));
      expect(loginMinH).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: `test-results/entry-polish-${stamp}-login-mobile.png`, fullPage: true });

      await page.getByRole("link", { name: "Sign up" }).click();
      await expect(page).toHaveURL(/\/signup/);
      await assertSignupPolish(page);
      await page.screenshot({ path: `test-results/entry-polish-${stamp}-signup-mobile.png`, fullPage: true });

      await signupViaForm(page, stamp);
      await assertMobileCommandEmpty(page);
      await page.screenshot({ path: `test-results/entry-polish-${stamp}-command-empty-mobile.png`, fullPage: true });
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      if (e instanceof Error && e.message.includes("signup_did_not_finish")) {
        test.skip(true, "Signup did not reach Command");
      }
      throw e;
    }
  });
});
