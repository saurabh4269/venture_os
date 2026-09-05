import { expect, test } from "@playwright/test";

async function assertMarketingChrome(page: import("@playwright/test").Page) {
  await expect(page.getByRole("banner").getByRole("link", { name: "Venture OS" })).toBeVisible();
  await expect(page.getByTestId("landing-header-login")).toHaveAttribute("href", "/login");
  await expect(page.getByTestId("landing-header-get-started")).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "How we work" })).toHaveAttribute(
    "href",
    "/security",
  );
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Notes" })).toHaveAttribute("href", "/blog");
}

async function blogWalk(page: import("@playwright/test").Page, prefix: string) {
  await page.goto("/blog");
  await expect(page.getByTestId("blog-ready")).toBeVisible();
  await expect(page.getByRole("heading", { name: /build notes/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /you confirm/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /blanks stay blank/i })).toBeVisible();
  await assertMarketingChrome(page);
  await page.screenshot({ path: `test-results/${prefix}-blog-top.png`, fullPage: false });
  await page.screenshot({ path: `test-results/${prefix}-blog-full.png`, fullPage: true });
}

async function securityWalk(page: import("@playwright/test").Page, prefix: string) {
  await page.goto("/security");
  await expect(page.getByTestId("security-ready")).toBeVisible();
  await expect(page.getByRole("heading", { name: /how we work/i })).toBeVisible();
  await expect(page.getByText(/sources attached/i).first()).toBeVisible();
  await assertMarketingChrome(page);
  await page.screenshot({ path: `test-results/${prefix}-security-top.png`, fullPage: false });

  await page.goto("/security#methodology");
  await expect(page.locator("#methodology")).toBeVisible();
  await expect(page.getByRole("heading", { name: /^standards$/i })).toBeVisible();
  await expect(page.getByText(/propose, then confirm/i)).toBeVisible();
  await page.screenshot({ path: `test-results/${prefix}-security-methodology.png`, fullPage: true });
}

async function landingFooterWalk(page: import("@playwright/test").Page, prefix: string) {
  await page.goto("/");
  await expect(page.getByTestId("marketing-landing")).toBeVisible();
  await page.getByRole("contentinfo").getByRole("link", { name: "Notes" }).click();
  await expect(page).toHaveURL(/\/blog/);
  await expect(page.getByTestId("blog-ready")).toBeVisible();
  await page.getByRole("contentinfo").getByRole("link", { name: "How we work" }).click();
  await expect(page).toHaveURL(/\/security/);
  await expect(page.getByTestId("security-ready")).toBeVisible();
  await page.screenshot({ path: `test-results/${prefix}-landing-footer-links.png`, fullPage: false });
}

test.describe("cold walk: blog and security marketing pages", () => {
  test("desktop blog, security, and footer chrome", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    const prefix = `mkt-legal-desktop-${Date.now().toString(36)}`;
    await blogWalk(page, prefix);
    await securityWalk(page, prefix);
    await landingFooterWalk(page, prefix);
    await expect(page.getByRole("navigation", { name: "Marketing" }).getByRole("link", { name: "Notes" })).toHaveAttribute(
      "href",
      "/blog",
    );
  });

  test("mobile blog, security, menu, and footer chrome", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const prefix = `mkt-legal-mobile-${Date.now().toString(36)}`;
    await blogWalk(page, prefix);
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("link", { name: "How we work" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Notes" })).toBeVisible();
    const menuLogin = page.getByRole("navigation", { name: "Marketing menu" }).getByRole("link", { name: "Log in" });
    await expect(menuLogin).toBeVisible();
    const box = await menuLogin.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
    await page.screenshot({ path: `test-results/${prefix}-blog-menu.png`, fullPage: false });
    await page.keyboard.press("Escape");

    await securityWalk(page, prefix);
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("navigation", { name: "Marketing menu" }).getByRole("link", { name: "Notes" }).click();
    await expect(page).toHaveURL(/\/blog/);
    await expect(page.getByTestId("blog-ready")).toBeVisible();
    await landingFooterWalk(page, prefix);
  });
});
