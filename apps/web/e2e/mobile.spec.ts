import { expect, test } from "@playwright/test";

test.describe("@smoke mobile chrome", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("marketing landing stacks and opens Menu", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("marketing-landing")).toBeVisible();
    await expect(page.getByRole("heading", { name: /the book for the investment team/i })).toBeVisible();
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
