import { expect, test } from "@playwright/test";

test("rail collapsed/expanded and topbar CTA", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now().toString(36);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/signup");
  await page.getByTestId("signup-name").fill("Rail Visual");
  await page.getByTestId("signup-email").fill(`rail-visual-${stamp}@example.test`);
  await page.getByTestId("signup-password").fill("password12345");
  await page.getByTestId("signup-confirm").fill("password12345");
  await page.getByTestId("signup-org").fill(`Rail Visual ${stamp}`);
  await page.getByTestId("signup-submit").click();
  await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 90_000 });

  const addCompany = page.locator(".topbar-actions a.topbar-add-btn");
  await expect(addCompany).toBeVisible();
  await expect(addCompany).toHaveAttribute("aria-label", "Add company");
  await expect(addCompany).toHaveCSS("background-color", /9,\s*9,\s*11|rgb\(9,\s*9,\s*11\)/);
  await page.screenshot({ path: "test-results/rail-collapsed.png" });

  await page.locator(".rail-toggle").click();
  await expect(page.locator(".app.app-rail-expanded")).toBeVisible();
  await expect(page.locator("aside.rail")).toHaveCSS("width", /23\dpx/);
  const layout = await page.locator("aside.rail.rail-expanded .rail-item.active").evaluate((item) => {
    const rail = item.closest(".rail");
    const app = rail?.closest(".app");
    const label = item.querySelector(".rail-label");
    const icon = item.querySelector("svg");
    const r = item.getBoundingClientRect();
    return {
      sameRow:
        label && icon ? Math.abs(label.getBoundingClientRect().top - icon.getBoundingClientRect().top) < 8 : false,
      width: r.width,
      railWidth: rail?.getBoundingClientRect().width ?? 0,
      appClasses: app?.className ?? "",
      railClasses: rail?.className ?? "",
    };
  });
  expect(layout.appClasses).toContain("app-rail-expanded");
  expect(layout.railWidth).toBeGreaterThan(180);
  expect(layout.sameRow).toBe(true);
  expect(layout.width).toBeGreaterThan(100);
  await page.screenshot({ path: "test-results/rail-expanded.png" });
});
