import { expect, test } from "@playwright/test";

test.describe("rail and auth visual", () => {
  test("desktop rail collapsed and expanded", async ({ page }) => {
    test.setTimeout(120_000);
    const stamp = Date.now().toString(36);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("Rail Audit");
    await page.getByTestId("signup-email").fill(`rail-audit-${stamp}@example.test`);
    await page.getByTestId("signup-password").fill("password12345");
    await page.getByTestId("signup-confirm").fill("password12345");
    await page.getByTestId("signup-org").fill(`Rail Audit ${stamp}`);
    await page.getByTestId("signup-submit").click();
    await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 90_000 });

    await page.screenshot({ path: "test-results/audit-rail-collapsed.png", fullPage: false });
    await page.locator(".rail-toggle").click();
    await expect(page.locator(".app.app-rail-expanded")).toBeVisible();
    await page.screenshot({ path: "test-results/audit-rail-expanded.png", fullPage: false });

    const submitBg = await page.locator(".topbar-add-btn").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(submitBg).toMatch(/9,\s*9,\s*11|rgb\(9,\s*9,\s*11\)/);
  });

  test("landing login signup desktop and mobile", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByTestId("marketing-landing")).toBeVisible();
    await page.screenshot({ path: "test-results/audit-landing-desktop.png", fullPage: true });

    await page.goto("/login");
    await expect(page.getByTestId("login-submit")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toHaveClass(/auth-submit/);
    const loginBg = await page.getByTestId("login-submit").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(loginBg).toMatch(/9,\s*9,\s*11|rgb\(9,\s*9,\s*11\)/);
    await page.screenshot({ path: "test-results/audit-login-desktop.png", fullPage: true });

    await page.goto("/signup");
    await expect(page.getByTestId("signup-submit")).toBeVisible();
    await page.screenshot({ path: "test-results/audit-signup-desktop.png", fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.screenshot({ path: "test-results/audit-landing-mobile.png", fullPage: true });
    await page.goto("/login");
    await page.screenshot({ path: "test-results/audit-login-mobile.png", fullPage: true });
    await page.goto("/signup");
    await page.screenshot({ path: "test-results/audit-signup-mobile.png", fullPage: true });
  });
});
