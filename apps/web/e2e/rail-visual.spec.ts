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

  const addCompany = page.locator(".topbar-actions a");
  await expect(addCompany).toHaveText("Add company");
  await expect(addCompany).toHaveClass(/btn/);
  const color = await addCompany.evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, bg: s.backgroundColor };
  });
  expect(color.color).toMatch(/250|251|252|255/);
  await page.screenshot({ path: "test-results/rail-collapsed.png" });

  await page.locator(".rail-toggle").click();
  await expect(page.locator(".rail-expanded")).toBeVisible();
  const layout = await page.locator(".rail-expanded .rail-item.active").evaluate((item) => {
    const label = item.querySelector(".rail-label");
    const icon = item.querySelector("svg");
    if (!label || !icon) return { sameRow: false, width: item.getBoundingClientRect().width };
    const lt = label.getBoundingClientRect().top;
    const it = icon.getBoundingClientRect().top;
    return { sameRow: Math.abs(lt - it) < 8, width: item.getBoundingClientRect().width };
  });
  expect(layout.sameRow).toBe(true);
  expect(layout.width).toBeGreaterThan(100);
  await page.screenshot({ path: "test-results/rail-expanded.png" });
});
