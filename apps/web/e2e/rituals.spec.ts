import { expect, test } from "@playwright/test";
import { onboardCompany, signupAdmin } from "./helpers/session";

test.describe("@smoke rituals", () => {
  test("inbox reject, Flags, NAV lock control, Ask refuse", async ({ page }) => {
    const { stamp } = await signupAdmin(page);
    await onboardCompany(page, stamp);

    await page.goto("/inbox");
    await expect(page.getByTestId("shell-ready")).toBeVisible();
    const reject = page.getByTestId("inbox-reject").first();
    await expect(reject).toBeVisible({ timeout: 30_000 });
    await reject.click();
    await page.getByTestId("inbox-tab-rejected").click();
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/flags");
    await expect(page.getByTestId("flags-ready")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Flags" })).toBeVisible();

    await page.goto("/nav");
    await expect(page.getByTestId("nav-ready")).toBeVisible();
    await expect(page.getByTestId("nav-lock")).toBeVisible();

    await page.goto("/ask");
    await expect(page.getByTestId("ask-ready")).toBeVisible();
    await page.getByTestId("ask-question").fill("Does xyzzy-plugh-atlas-prime appear in the book?");
    await page.getByTestId("ask-submit").click();
    await expect(page.getByTestId("ask-refused")).toBeVisible({ timeout: 20_000 });

    await page.goto("/reports");
    await expect(page.getByTestId("reports-ready")).toBeVisible();
  });
});
