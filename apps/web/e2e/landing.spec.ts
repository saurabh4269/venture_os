import { expect, test } from "@playwright/test";

test.describe("@smoke marketing landing", () => {
  test("anonymous / paints the V3 landing without waiting on /api/me", async ({ page }) => {
    let meCalls = 0;
    page.on("request", (req) => {
      if (req.url().includes("/api/me") && req.method() === "GET") meCalls += 1;
    });

    await page.goto("/");
    await expect(page.getByTestId("marketing-landing")).toBeVisible();
    await expect(page.getByRole("heading", { name: /the book for the investment team/i })).toBeVisible();
    await expect(page.getByText("Opening the book")).toHaveCount(0);
    await expect(page.getByTestId("landing-get-started")).toHaveAttribute("href", "/signup");
    await expect(page.getByTestId("landing-log-in")).toHaveAttribute("href", "/login");
    await expect(page.getByTestId("landing-header-login")).toHaveAttribute("href", "/login");
    await expect(page.getByRole("banner").getByRole("link", { name: /get started/i })).toHaveAttribute(
      "href",
      "/signup",
    );
    await expect(page.getByTestId("mkt-notes")).toBeVisible();
    await expect(page.getByRole("heading", { name: /sources attached/i })).toBeVisible();
    await expect(page.getByText(/blanks stay blank/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /three steps/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /uncompromising clarity/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /precision architecture/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /ask\. refuse/i })).toHaveCount(0);
    await expect(page.getByText(/V3 Ventures/i)).toHaveCount(0);
    await expect(page.getByText(/\$250M|Acme Corp/i)).toHaveCount(0);
    await expect(page.getByText("42")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Platform" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Pricing" })).toHaveCount(0);
    await expect(page.getByText(/sequoia|a16z|index ventures/i)).toHaveCount(0);
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "How we work" })).toHaveAttribute(
      "href",
      "/security",
    );
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Terms" })).toHaveCount(0);
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Privacy" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /request access/i })).toHaveCount(0);
    expect(meCalls).toBe(0);

    await page.getByTestId("landing-get-started").click();
    await expect(page.getByTestId("signup-submit")).toBeVisible();
  });

  test("security page describes standards positively", async ({ page }) => {
    await page.goto("/security");
    await expect(page.getByRole("heading", { name: /how we work/i })).toBeVisible();
    await expect(page.getByText(/sources attached/i).first()).toBeVisible();
  });

  test("mobile landing and auth layout", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("marketing-landing")).toBeVisible();
    await expect(page.getByRole("heading", { name: /the book for the investment team/i })).toBeVisible();
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.screenshot({ path: "test-results/landing-mobile.png", fullPage: true });

    await page.goto("/login");
    await expect(page.getByTestId("login-submit")).toBeVisible();
    await page.screenshot({ path: "test-results/auth-login-mobile.png", fullPage: true });

    await page.goto("/signup");
    await expect(page.getByTestId("signup-submit")).toBeVisible();
    await page.screenshot({ path: "test-results/auth-signup-mobile.png", fullPage: true });
  });
});
