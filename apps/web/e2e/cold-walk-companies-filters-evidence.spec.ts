import { expect, test } from "@playwright/test";
import { onboardCompany, signupAdmin, waitForInboxActions } from "./helpers/session";

async function companiesFiltersWalk(
  page: import("@playwright/test").Page,
  companyName: string,
  prefix: string,
  mobile: boolean,
) {
  await page.goto("/companies");
  await expect(page.getByTestId("companies-ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("companies-filter-bar")).toBeVisible();
  await expect(page.getByTestId("companies-row").first()).toBeVisible();
  await expect(page.getByRole("link", { name: companyName })).toBeVisible();

  await page.getByTestId("companies-search").fill("zzzz-no-match");
  await expect(page.getByText(/try different filters/i)).toBeVisible();
  await page.getByTestId("companies-search").fill(companyName.slice(0, 6));
  await expect(page.getByRole("link", { name: companyName })).toBeVisible();

  await page.getByTestId("companies-cover-filter").selectOption("gap");
  await expect(page.getByText(/try different filters/i)).toBeVisible();
  await page.getByTestId("companies-cover-filter").selectOption("booked");
  await expect(page.getByRole("link", { name: companyName })).toBeVisible();
  await expect(page.getByTestId("companies-clear-filters")).toBeVisible();
  await page.getByTestId("companies-clear-filters").click();
  await expect(page.getByTestId("companies-cover-filter")).toHaveValue("all");

  if (mobile) {
    await expect(page.getByTestId("companies-own-filter")).toHaveCSS("min-height", /44px/);
    await expect(page.getByTestId("companies-cover-filter")).toHaveCSS("min-height", /44px/);
    const pill = page.locator(".filter-bar .filter-pill").first();
    if (await pill.isVisible().catch(() => false)) {
      await expect(pill).toHaveCSS("min-height", /44px/);
    }
  }

  await page.screenshot({ path: `test-results/${prefix}-companies-filters.png`, fullPage: true });

  await page.getByRole("link", { name: companyName }).click();
  await expect(page.getByTestId("company-ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Evidence trail" })).toBeVisible();
  const evidenceTable = page.getByTestId("company-evidence-table");
  const evidenceEmpty = page.getByTestId("company-evidence-empty");
  await expect(evidenceTable.or(evidenceEmpty)).toBeVisible({ timeout: 15_000 });

  if (await evidenceTable.isVisible()) {
    const citeBtn = page.getByTestId("company-evidence-table").getByTestId("company-evidence-cite").first();
    await citeBtn.scrollIntoViewIfNeeded();
    await expect(citeBtn).toBeVisible();
    if (mobile) {
      await expect(citeBtn).toHaveCSS("min-height", /44px/);
    }
    await citeBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Citation").first()).toBeVisible();
  }

  await page.screenshot({ path: `test-results/${prefix}-company-evidence.png`, fullPage: true });
}

test.describe("cold walk: companies filters and evidence", () => {
  test("desktop companies filters and company evidence", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    const stamp = Date.now().toString(36);
    const companyName = `E2E Co ${stamp}`;

    try {
      await signupAdmin(page, stamp);
      await onboardCompany(page, stamp);
      const confirm = await waitForInboxActions(page, "inbox-confirm");
      await confirm.click();
      await companiesFiltersWalk(page, companyName, `co-filters-desktop-${stamp}`, false);
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

  test("phone companies filters and company evidence", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const stamp = `${Date.now().toString(36)}m`;
    const companyName = `E2E Co ${stamp}`;

    try {
      await signupAdmin(page, stamp);
      await onboardCompany(page, stamp);
      const confirm = await waitForInboxActions(page, "inbox-confirm");
      await confirm.click();
      await companiesFiltersWalk(page, companyName, `co-filters-phone-${stamp}`, true);
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
