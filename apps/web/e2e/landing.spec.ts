import { expect, test } from "@playwright/test";

test.describe("@smoke marketing landing", () => {
  test("anonymous / paints the V3 landing without waiting on /api/me", async ({ page }) => {
    let meCalls = 0;
    page.on("request", (req) => {
      if (req.url().includes("/api/me") && req.method() === "GET") meCalls += 1;
    });

    await page.goto("/");
    await expect(page.getByTestId("marketing-landing")).toBeVisible();
    await expect(page.getByRole("heading", { name: /truth you can cite/i })).toBeVisible();
    await expect(page.getByText("Opening the book")).toHaveCount(0);
    await expect(page.getByTestId("landing-get-started")).toHaveAttribute("href", "/signup");
    await expect(page.getByTestId("landing-log-in")).toHaveAttribute("href", "/login");
    await expect(page.getByRole("banner").getByRole("link", { name: /get started/i })).toHaveAttribute(
      "href",
      "/signup",
    );
    await expect(page.getByRole("heading", { name: /cite everything/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /dash, not zero/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /human confirms/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /precision architecture/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /ask\. refuse/i })).toHaveCount(0);
    await expect(page.getByText(/\$250M|Acme Corp/i)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Platform" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Pricing" })).toHaveCount(0);
    await expect(page.getByText("142")).toHaveCount(0);
    await expect(page.getByText(/sequoia|a16z|index ventures/i)).toHaveCount(0);
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Methodology" })).toHaveAttribute(
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

  test("security page is honest and does not invent certifications", async ({ page }) => {
    await page.goto("/security");
    await expect(page.getByRole("heading", { name: /methodology, not a badge wall/i })).toBeVisible();
    await expect(page.getByText(/we do not claim soc 2/i)).toBeVisible();
  });
});
