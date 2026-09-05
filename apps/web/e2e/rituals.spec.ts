import { expect, test } from "@playwright/test";
import { onboardCompany, signupAdmin, waitForInboxActions } from "./helpers/session";

test.describe("@smoke rituals", () => {
  test("inbox reject, Flags, NAV lock control, Ask refuse", async ({ page }) => {
    const { stamp } = await signupAdmin(page);
    await onboardCompany(page, stamp);

    const reject = await waitForInboxActions(page, "inbox-reject");
    await reject.click();
    await page.getByTestId("inbox-tab-rejected").click();
    await expect(page.getByTestId("inbox-ready")).toHaveAttribute("data-inbox-status", "rejected", { timeout: 15_000 });
    await expect(page.getByTestId("inbox-row").first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/flags");
    await expect(page.getByTestId("flags-ready")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Flags" })).toBeVisible();

    await page.goto("/nav");
    await expect(page.getByTestId("nav-ready")).toBeVisible();
    await expect(page.getByTestId("nav-lock")).toBeVisible();

    await page.goto("/ask");
    await expect(page.getByTestId("ask-ready")).toBeVisible();
    await page.getByTestId("ask-question").fill("What was confirmed cash of 888 crore in FY 2099?");
    await page.getByTestId("ask-submit").click();
    await expect(page.getByTestId("ask-refused")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("ask-refused")).toContainText(/will not guess/i);

    await page.goto("/reports");
    await expect(page.getByTestId("reports-ready")).toBeVisible();
  });
});
