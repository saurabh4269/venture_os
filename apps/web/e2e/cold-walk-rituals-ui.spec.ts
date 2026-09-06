import { expect, test } from "@playwright/test";
import { onboardCompany, signupAdmin, waitForInboxActions } from "./helpers/session";

async function ritualWalk(
  page: import("@playwright/test").Page,
  prefix: string,
  mobile: boolean,
) {
  await page.goto("/flags");
  await expect(page.getByTestId("flags-ready")).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Recompute" }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Recompute" }).click();
    await page.waitForTimeout(1500);
  }
  const row = page.getByTestId("flags-row").first();
  if (await row.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await row.click();
    await expect(page.getByTestId("flags-detail")).toBeVisible();
    await expect(page.locator(".flag-detail-title")).not.toBeEmpty();
  }
  await page.screenshot({ path: `test-results/${prefix}-flags.png`, fullPage: true });

  await page.goto("/ask");
  await expect(page.getByTestId("ask-ready")).toBeVisible();
  await page.getByTestId("ask-question").fill("What was confirmed cash?");
  await page.getByTestId("ask-submit").click();
  await expect(
    page.getByTestId("ask-answer").or(page.getByTestId("ask-refused")),
  ).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `test-results/${prefix}-ask.png`, fullPage: true });

  await page.goto("/settings");
  await expect(page.getByTestId("settings-ready")).toBeVisible();
  if (mobile) {
    await page.locator("#invite").scrollIntoViewIfNeeded();
  }
  await page.getByTestId("invite-email").fill(`analyst-${prefix}@example.test`);
  await page.getByTestId("invite-submit").click();
  await expect(page.getByText(/invite created/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("invite-copy-link")).toBeVisible();
  await page.getByTestId("invite-copy-link").click();
  await expect(page.getByTestId("invite-copy-link")).toHaveText("Copied");
  await page.screenshot({ path: `test-results/${prefix}-settings-invite.png`, fullPage: true });
}

test.describe("flags ask settings walk", () => {
  test("desktop flags with items, ask, settings invite", async ({ page }) => {
    test.setTimeout(300_000);
    const stamp = Date.now().toString(36);
    await page.setViewportSize({ width: 1280, height: 800 });
    try {
      await signupAdmin(page, stamp);
      await onboardCompany(page, stamp);
      const confirm = await waitForInboxActions(page, "inbox-confirm");
      await confirm.click();
      await ritualWalk(page, `ritual-desktop-${stamp}`, false);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
  });

  test("mobile flags with items, ask, settings invite", async ({ page }) => {
    test.setTimeout(300_000);
    const stamp = `${Date.now().toString(36)}m`;
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await signupAdmin(page, stamp);
      await onboardCompany(page, stamp);
      const confirm = await waitForInboxActions(page, "inbox-confirm");
      await confirm.click();
      await ritualWalk(page, `ritual-mobile-${stamp}`, true);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
  });
});
