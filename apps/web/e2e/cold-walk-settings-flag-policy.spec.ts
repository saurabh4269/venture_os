import { expect, test } from "@playwright/test";
import { signupAdmin } from "./helpers/session";

async function flagPolicyWalk(page: import("@playwright/test").Page, prefix: string, mobile: boolean) {
  await page.goto("/settings#flag-policy");
  await expect(page.getByTestId("settings-ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("flag-policy-table")).toBeVisible();
  await expect(page.getByTestId("flag-policy-row-mis_late")).toBeVisible();

  const misInput = page.getByTestId("flag-policy-threshold-mis_late");
  await misInput.scrollIntoViewIfNeeded();
  const current = Number(await misInput.inputValue());
  const next = current === 45 ? 46 : 45;
  await misInput.fill(String(next));

  if (mobile) {
    await expect(misInput).toHaveCSS("min-height", /44px/);
    await expect(page.getByTestId("save-flag-policy")).toHaveCSS("min-height", /44px/);
  }

  await page.screenshot({ path: `test-results/${prefix}-flag-policy-before.png`, fullPage: false });
  await page.getByTestId("save-flag-policy").click();
  await expect(page.getByTestId("flag-policy-msg")).toContainText(/saved/i, { timeout: 15_000 });
  await expect(page.getByTestId("flag-policy-audit")).toBeVisible();
  const auditRow = page.getByTestId("flag-policy-audit-row").first();
  await expect(auditRow).toBeVisible();
  await expect(auditRow).toContainText(/MIS late/i);
  await expect(auditRow.locator(".flag-policy-audit-list")).toBeVisible();
  await expect(auditRow.locator(".flag-policy-audit-list")).not.toContainText("{");
  await page.screenshot({ path: `test-results/${prefix}-flag-policy-audit.png`, fullPage: true });
}

test.describe("cold walk: settings flag policy and audit", () => {
  test("desktop settings flag policy table and audit log", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    const stamp = Date.now().toString(36);
    try {
      await signupAdmin(page, stamp);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      if (e instanceof Error && e.message.includes("signup_did_not_finish")) {
        test.skip(true, "Signup did not reach Command");
      }
      throw e;
    }
    await flagPolicyWalk(page, `settings-policy-desktop-${stamp}`, false);
  });

  test("phone settings flag policy table and audit log", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const stamp = `${Date.now().toString(36)}m`;
    try {
      await signupAdmin(page, stamp);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      if (e instanceof Error && e.message.includes("signup_did_not_finish")) {
        test.skip(true, "Signup did not reach Command");
      }
      throw e;
    }
    await flagPolicyWalk(page, `settings-policy-mobile-${stamp}`, true);
  });
});
