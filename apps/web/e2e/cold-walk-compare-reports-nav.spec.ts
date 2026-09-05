import { test, expect } from "@playwright/test";
import { signupAdmin, onboardCompany, waitForInboxActions } from "./helpers/session";

/**
 * Compare → Reports → NAV with confirmed book data (desktop + phone).
 */
test.describe("cold walk: compare, reports, nav with data", () => {
  test("desktop and phone ritual pages with real metrics", async ({ page }) => {
    test.setTimeout(300_000);
    const stamp = Date.now().toString(36);
    const companyName = `E2E Co ${stamp}`;

    try {
      await signupAdmin(page, stamp);
      await onboardCompany(page, stamp);
      const confirm = await waitForInboxActions(page, "inbox-confirm");
      await confirm.click();
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }

    // Compare — desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/compare");
    await expect(page.getByRole("heading", { name: "Compare" })).toBeVisible();
    await expect(page.getByTestId("compare-ready")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("compare-inr-cr").first()).toBeVisible();
    await expect(page.getByText(companyName).first()).toBeVisible();
    await page.screenshot({
      path: "test-results/cold-walk-compare-desktop.png",
      fullPage: true,
    });

    // Reports — desktop: draft one-pager
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await page.getByTestId("reports-company").selectOption({ label: companyName });
    await page.getByTestId("reports-draft-one-pager").click();
    await expect(page.getByRole("cell", { name: /one-pager/i }).first()).toBeVisible({ timeout: 20_000 });
    await page.screenshot({
      path: "test-results/cold-walk-reports-desktop.png",
      fullPage: true,
    });

    // NAV — desktop
    await page.goto("/nav");
    await expect(page.getByRole("heading", { name: "NAV" })).toBeVisible();
    await expect(page.getByTestId("nav-ready")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("nav-kpis")).toBeVisible();
    await page.screenshot({
      path: "test-results/cold-walk-nav-desktop.png",
      fullPage: true,
    });

    // Phone — Compare
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/compare");
    await expect(page.getByTestId("compare-ready")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("compare-inr-cr").first()).toBeVisible();
    await page.screenshot({
      path: "test-results/cold-walk-compare-phone.png",
      fullPage: true,
    });

    // Phone — Reports
    await page.goto("/reports");
    await expect(page.getByTestId("reports-ready")).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: "test-results/cold-walk-reports-phone.png",
      fullPage: true,
    });

    // Phone — NAV
    await page.goto("/nav");
    await expect(page.getByTestId("nav-ready")).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: "test-results/cold-walk-nav-phone.png",
      fullPage: true,
    });
  });
});
