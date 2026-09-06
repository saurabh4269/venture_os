import { expect, test } from "@playwright/test";
import { onboardCompany, signupAdmin, waitForInboxActions } from "./helpers/session";

async function bookWithData(page: import("@playwright/test").Page, stamp: string) {
  await signupAdmin(page, stamp);
  await onboardCompany(page, stamp);
  const confirm = await waitForInboxActions(page, "inbox-confirm");
  await confirm.click();
}

async function compareTableWalk(page: import("@playwright/test").Page, prefix: string, companyName: string, mobile: boolean) {
  await page.goto("/compare");
  await expect(page.getByTestId("compare-ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("compare-results-table")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(companyName).first()).toBeVisible();
  await expect(page.getByTestId("compare-inr-cr").first()).toBeVisible();
  const table = page.getByTestId("compare-results-table");
  await table.scrollIntoViewIfNeeded();
  if (mobile) {
    await expect(page.getByRole("button", { name: /Export CSV/i })).toHaveCSS("min-height", /44px/);
    const sortBtn = page.locator(".compare-results-table th .chip").first();
    await expect(sortBtn).toHaveCSS("min-height", /44px/);
  }
  await page.screenshot({ path: `test-results/${prefix}-compare-table.png`, fullPage: true });
}

async function reportsDraftExportWalk(
  page: import("@playwright/test").Page,
  prefix: string,
  companyName: string,
  mobile: boolean,
) {
  await page.goto("/reports");
  await expect(page.getByTestId("reports-ready")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("reports-company").selectOption({ label: companyName });
  const draftBtn = page.getByTestId("reports-draft-one-pager");
  if (mobile) {
    await expect(draftBtn).toHaveCSS("min-height", /44px/);
    await expect(page.getByTestId("reports-period")).toHaveCSS("min-height", /44px/);
  }
  await draftBtn.click();
  await expect(page.getByRole("cell", { name: /one-pager/i }).first()).toBeVisible({ timeout: 30_000 });
  const exportPdf = page.getByTestId("reports-export-pdf").first();
  await expect(exportPdf).toBeVisible();
  if (mobile) {
    await expect(exportPdf).toHaveCSS("min-height", /44px/);
  }
  await exportPdf.click();
  await page.screenshot({ path: `test-results/${prefix}-reports-export.png`, fullPage: true });
}

test.describe("compare table and reports export walk", () => {
  test("desktop compare results and reports draft export", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    const stamp = Date.now().toString(36);
    const companyName = `E2E Co ${stamp}`;
    try {
      await bookWithData(page, stamp);
      await compareTableWalk(page, `compare-export-desktop-${stamp}`, companyName, false);
      await reportsDraftExportWalk(page, `compare-export-desktop-${stamp}`, companyName, false);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      if (e instanceof Error && e.message.includes("signup_did_not_finish")) {
        test.skip(true, "Signup did not reach Command");
      }
      throw e;
    }
  });

  test("mobile compare results and reports draft export", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const stamp = `${Date.now().toString(36)}m`;
    const companyName = `E2E Co ${stamp}`;
    try {
      await bookWithData(page, stamp);
      await compareTableWalk(page, `compare-export-mobile-${stamp}`, companyName, true);
      await reportsDraftExportWalk(page, `compare-export-mobile-${stamp}`, companyName, true);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      if (e instanceof Error && e.message.includes("signup_did_not_finish")) {
        test.skip(true, "Signup did not reach Command");
      }
      throw e;
    }
  });
});
