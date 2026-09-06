import { expect, test } from "@playwright/test";
import { onboardCompany, signupAdmin, waitForInboxActions } from "./helpers/session";

async function flagsDetailWalk(page: import("@playwright/test").Page, prefix: string, mobile: boolean) {
  await page.goto("/flags");
  await expect(page.getByTestId("flags-ready")).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Recompute" }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Recompute" }).click();
    await page.waitForTimeout(1500);
  }
  const row = page.getByTestId("flags-row").first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.click();
  await expect(page.getByTestId("flags-detail")).toBeVisible();
  await expect(page.locator(".flag-detail-title")).not.toBeEmpty();
  await expect(page.locator(".lane-obj")).toBeVisible();
  await expect(page.locator(".lane-sub")).toBeVisible();
  if (mobile) {
    await page.locator(".flag-detail").scrollIntoViewIfNeeded();
    const snooze = page.getByRole("button", { name: "Snooze 14d" });
    if (await snooze.isVisible().catch(() => false)) {
      await expect(snooze).toHaveCSS("min-height", /44px/);
    }
  }
  await page.screenshot({ path: `test-results/${prefix}-flags-detail.png`, fullPage: true });
}

async function askCardWalk(page: import("@playwright/test").Page, prefix: string, mobile: boolean) {
  await page.goto("/ask");
  await expect(page.getByTestId("ask-ready")).toBeVisible();
  await page.getByTestId("ask-question").fill("What was confirmed cash?");
  await page.getByTestId("ask-submit").click();
  const answer = page.getByTestId("ask-answer-card");
  const refused = page.getByTestId("ask-refused");
  await expect(answer.or(refused)).toBeVisible({ timeout: 30_000 });
  if (await refused.isVisible()) {
    await expect(refused).toHaveClass(/ask-answer--refused/);
  } else {
    await expect(answer).toBeVisible();
    await expect(answer.locator(".ask-answer-section")).toHaveText("Provenance");
  }
  if (mobile) {
    const card = (await refused.isVisible()) ? refused : answer;
    const box = await card.boundingBox();
    const viewport = page.viewportSize();
    expect(box && viewport).toBeTruthy();
    expect(box!.width).toBeGreaterThan(viewport!.width * 0.85);
    await expect(page.locator(".ask-bar .btn")).toHaveCSS("min-height", /44px/);
  }
  await page.screenshot({ path: `test-results/${prefix}-ask-card.png`, fullPage: true });
}

async function ritualCardsWalk(page: import("@playwright/test").Page, prefix: string, mobile: boolean) {
  await flagsDetailWalk(page, prefix, mobile);
  await askCardWalk(page, prefix, mobile);
}

test.describe("flags detail and ask answer cards", () => {
  test("desktop flags detail and ask answer card", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    const stamp = Date.now().toString(36);
    try {
      await signupAdmin(page, stamp);
      await onboardCompany(page, stamp);
      const confirm = await waitForInboxActions(page, "inbox-confirm");
      await confirm.click();
      await ritualCardsWalk(page, `flags-ask-desktop-${stamp}`, false);
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

  test("mobile flags detail and ask answer card", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const stamp = `${Date.now().toString(36)}m`;
    try {
      await signupAdmin(page, stamp);
      await onboardCompany(page, stamp);
      const confirm = await waitForInboxActions(page, "inbox-confirm");
      await confirm.click();
      await ritualCardsWalk(page, `flags-ask-mobile-${stamp}`, true);
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
