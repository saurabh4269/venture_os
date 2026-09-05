import { expect, test } from "@playwright/test";
import { signupAdmin } from "./helpers/session";

test.describe("@smoke connectors settings", () => {
  test("three cards; invalid key shows error without a live vendor call", async ({ page }) => {
    await signupAdmin(page);
    await page.goto("/settings/connectors");
    await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("connector-cards")).toBeVisible();
    await expect(page.getByTestId("connector-card-onedrive")).toBeVisible();
    await expect(page.getByTestId("connector-card-affinity")).toBeVisible();
    await expect(page.getByTestId("connector-card-granola")).toBeVisible();

    await page.getByTestId("affinity-api-key").fill("short");
    await page.getByTestId("connector-card-affinity").getByRole("button", { name: "Save" }).click();
    await expect(page.getByTestId("connector-form-error-affinity")).toBeVisible();
    await expect(page.getByTestId("connector-form-error-affinity")).toContainText(/invalid_affinity/i);
    await expect(page.getByTestId("connector-status-affinity")).toContainText(/not connected|configured|error/i);
  });
});
