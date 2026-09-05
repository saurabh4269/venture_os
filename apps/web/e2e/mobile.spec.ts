import { expect, test } from "@playwright/test";

test.describe("@smoke mobile chrome", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("marketing landing stacks and opens Menu", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("marketing-landing")).toBeVisible();
    await expect(page.getByRole("heading", { name: /the book for the investment team/i })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Get started" })).toBeVisible();

    const started = await page.getByTestId("landing-get-started").boundingBox();
    const login = await page.getByTestId("landing-log-in").boundingBox();
    expect(started && login).toBeTruthy();
    expect(login!.y).toBeGreaterThan(started!.y + started!.height - 2);
    expect(started!.width).toBeGreaterThan(300);

    const stages = page.getByTestId("mkt-pipeline").locator("li");
    const first = await stages.nth(0).boundingBox();
    const last = await stages.nth(4).boundingBox();
    expect(first && last).toBeTruthy();
    expect(last!.y).toBeGreaterThan(first!.y + first!.height - 2);

    await expect(page.getByTestId("mkt-final-panel")).toBeVisible();
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("navigation", { name: "Marketing menu" }).getByRole("link", { name: "Product" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("auth card fits a phone viewport", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Venture OS" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
