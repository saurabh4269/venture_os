import { expect, test } from "@playwright/test";

test.describe("@smoke marketing landing", () => {
  test("anonymous / paints the book homepage without waiting on /api/me", async ({ page }) => {
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
    await expect(page.getByRole("banner").getByRole("link", { name: "Get started" })).toHaveAttribute(
      "href",
      "/signup",
    );
    await expect(page.getByRole("heading", { name: /the morning ritual, on one book/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /source to analysis/i })).toBeVisible();
    await expect(page.getByText("Source", { exact: true })).toBeVisible();
    await expect(page.getByText("Analysis", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /three steps to a live row/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /built with design partner v3 ventures/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /no public price list/i })).toBeVisible();
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Methodology" })).toHaveAttribute(
      "href",
      "/#trust",
    );
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Terms" })).toHaveCount(0);
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Privacy" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /request access/i })).toHaveCount(0);
    expect(meCalls).toBe(0);

    await page.getByTestId("landing-get-started").click();
    await expect(page.getByTestId("signup-submit")).toBeVisible();
  });

  test("security page is honest and does not invent certifications", async ({ page }) => {
    await page.goto("/security");
    await expect(page.getByRole("heading", { name: /methodology, not a badge wall/i })).toBeVisible();
    await expect(page.getByText(/we do not claim soc 2/i)).toBeVisible();
  });
});
