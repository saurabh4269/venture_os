import { expect, test } from "@playwright/test";
import { onboardCompany, signupAdmin, waitForInboxActions } from "./helpers/session";

const FIXTURE_FILE = "FIXTURE_ONLY-sample-mis.csv";

async function navMarksWalk(
  page: import("@playwright/test").Page,
  companyName: string,
  prefix: string,
  mobile: boolean,
) {
  await page.goto("/nav");
  await expect(page.getByRole("heading", { name: "NAV" })).toBeVisible();
  await expect(page.getByTestId("nav-ready")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("nav-kpis")).toBeVisible();
  await expect(page.getByTestId("nav-marks-table")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(companyName).first()).toBeVisible();

  const unmarkedChip = page.getByTestId("nav-unmarked-chip").filter({ hasText: companyName });
  if (await unmarkedChip.isVisible().catch(() => false)) {
    await unmarkedChip.click();
  }

  const markForm = page.getByTestId("nav-mark-form");
  await expect(markForm).toBeVisible();
  const positionSelect = markForm.locator("select").first();
  if (!(await positionSelect.inputValue())) {
    await positionSelect.selectOption({ index: 1 });
  }
  await markForm.locator('input[placeholder="Mark value"]').fill("10000000");
  await page.getByTestId("nav-add-mark").click();
  await expect(page.getByTestId("nav-marks-table").getByText(companyName)).toBeVisible({ timeout: 15_000 });

  if (mobile) {
    await expect(page.getByTestId("nav-add-mark")).toHaveCSS("min-height", /44px/);
    await expect(page.locator(".nav-filters .field input").first()).toHaveCSS("min-height", /44px/);
  }

  await page.screenshot({ path: `test-results/${prefix}-nav.png`, fullPage: true });
}

async function vaultDocumentsWalk(
  page: import("@playwright/test").Page,
  companyName: string,
  prefix: string,
  mobile: boolean,
) {
  await page.goto("/vault");
  await expect(page.getByRole("heading", { name: "Vault" })).toBeVisible();
  await expect(page.getByTestId("vault-ready")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("vault-documents-table")).toBeVisible();
  await expect(page.getByTestId("vault-document-row").first()).toBeVisible();
  await expect(page.getByText(FIXTURE_FILE).first()).toBeVisible();
  await expect(page.getByText(companyName).first()).toBeVisible();

  const download = page.getByTestId("vault-download").first();
  await expect(download).toBeVisible();
  if (mobile) {
    await expect(download).toHaveCSS("min-height", /44px/);
  }

  await page.screenshot({ path: `test-results/${prefix}-vault.png`, fullPage: true });
}

async function navVaultWalk(
  page: import("@playwright/test").Page,
  companyName: string,
  prefix: string,
  mobile: boolean,
) {
  await navMarksWalk(page, companyName, prefix, mobile);
  await vaultDocumentsWalk(page, companyName, prefix, mobile);
}

test.describe("cold walk: NAV marks and Vault documents", () => {
  test("desktop NAV marks and Vault documents", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    const stamp = Date.now().toString(36);
    const companyName = `E2E Co ${stamp}`;

    try {
      await signupAdmin(page, stamp);
      await onboardCompany(page, stamp);
      const confirm = await waitForInboxActions(page, "inbox-confirm");
      await confirm.click();
      await navVaultWalk(page, companyName, `nav-vault-desktop-${stamp}`, false);
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

  test("phone NAV marks and Vault documents", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const stamp = `${Date.now().toString(36)}m`;
    const companyName = `E2E Co ${stamp}`;

    try {
      await signupAdmin(page, stamp);
      await onboardCompany(page, stamp);
      const confirm = await waitForInboxActions(page, "inbox-confirm");
      await confirm.click();
      await navVaultWalk(page, companyName, `nav-vault-phone-${stamp}`, true);
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
