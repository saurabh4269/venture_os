import { expect, test } from "@playwright/test";
import { onboardCompany, signupAdmin, waitForInboxActions } from "./helpers/session";

async function inboxCommandLookWalk(
  page: import("@playwright/test").Page,
  companyName: string,
  prefix: string,
  mobile: boolean,
) {
  await page.goto("/command");
  await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 30_000 });
  const needsLook = page.getByTestId("command-needs-look");
  await expect(needsLook).toBeVisible();
  await expect(page.getByTestId("command-look-item").first()).toBeVisible({ timeout: 30_000 });
  await expect(needsLook.getByRole("link", { name: companyName })).toBeVisible();
  await expect(page.locator(".command-kpis .kpi").filter({ hasText: "Needs look" }).locator(".v")).not.toHaveText("—");
  const openInbox = page.getByTestId("command-open-inbox");
  await expect(openInbox).toBeVisible();
  if (mobile) {
    const openMinH = await openInbox.evaluate((el) => parseFloat(getComputedStyle(el).minHeight));
    expect(openMinH).toBeGreaterThanOrEqual(44);
    await expect(needsLook.getByRole("link", { name: companyName })).toHaveCSS("min-height", /44px/);
  }
  await page.screenshot({ path: `test-results/${prefix}-command-needs-look.png`, fullPage: true });

  if (mobile) {
    await page.getByTestId("mobile-nav-open").click();
    await page.getByTestId("mobile-nav-inbox").click();
  } else {
    await page.goto("/inbox");
  }
  await expect(page.getByTestId("inbox-ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("inbox-row").first()).toBeVisible({ timeout: 60_000 });

  const citeBtn = mobile
    ? page.locator(".inbox-cite-mobile").getByTestId("inbox-cite").first()
    : page.locator(".triage-row .hide-sm").getByTestId("inbox-cite").first();
  await citeBtn.scrollIntoViewIfNeeded();
  await expect(citeBtn).toBeVisible();
  if (mobile) {
    await expect(citeBtn).toHaveCSS("min-height", /44px/);
  }
  await citeBtn.click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Citation").first()).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.screenshot({ path: `test-results/${prefix}-inbox-cite.png`, fullPage: true });

  const confirm = await waitForInboxActions(page, "inbox-confirm");
  const pendingBefore = await page.getByTestId("inbox-ready").getAttribute("data-inbox-count");
  await confirm.click();
  await expect
    .poll(async () => page.getByTestId("inbox-ready").getAttribute("data-inbox-count"))
    .not.toBe(pendingBefore);

  if (mobile) {
    await page.getByTestId("mobile-nav-open").click();
    await page.getByTestId("mobile-nav-command").click();
  } else {
    await page.goto("/command");
  }
  await expect(page.getByTestId("command-ready")).toBeVisible();
  await expect(page.locator(".command-kpis .kpi").filter({ hasText: "Companies" }).locator(".v")).toHaveText("1");
  await page.screenshot({ path: `test-results/${prefix}-command-booked.png`, fullPage: true });
}

test.describe("cold walk: inbox cite chips and command needs a look", () => {
  test("desktop inbox cite and command needs a look with data", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    const stamp = Date.now().toString(36);
    const companyName = `E2E Co ${stamp}`;

    try {
      await signupAdmin(page, stamp);
      await onboardCompany(page, stamp);
      await inboxCommandLookWalk(page, companyName, `inbox-look-desktop-${stamp}`, false);
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

  test("phone inbox cite and command needs a look with data", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const stamp = `${Date.now().toString(36)}m`;
    const companyName = `E2E Co ${stamp}`;

    try {
      await signupAdmin(page, stamp);
      await onboardCompany(page, stamp);
      await inboxCommandLookWalk(page, companyName, `inbox-look-phone-${stamp}`, true);
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
