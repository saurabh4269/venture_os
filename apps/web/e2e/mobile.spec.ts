import { expect, test } from "@playwright/test";

test.describe("@smoke mobile chrome", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("marketing landing stacks and opens Menu", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("marketing-landing")).toBeVisible();
    await expect(page.getByRole("heading", { name: /the book for the investment team/i })).toBeVisible();
    await expect(page.getByTestId("landing-get-started")).toBeVisible();

    const started = await page.getByTestId("landing-get-started").boundingBox();
    const login = await page.getByTestId("landing-log-in").boundingBox();
    expect(started && login).toBeTruthy();
    expect(login!.y).toBeGreaterThan(started!.y + started!.height - 2);

    await expect(page.getByTestId("mkt-notes")).toBeVisible();

    await page.getByRole("button", { name: "Menu" }).click();
    const menu = page.getByRole("navigation", { name: "Marketing menu" });
    await expect(menu.getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Get started" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Platform" })).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("auth card fits a phone viewport", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in to your book/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back to venture os/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();
    await expect(page.getByPlaceholder("you@firm.com")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
