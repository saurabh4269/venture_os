import { expect, test } from "@playwright/test";
import { signupAdmin } from "./helpers/session";

async function settingsInviteWalk(page: import("@playwright/test").Page, prefix: string, mobile: boolean) {
  await page.goto("/settings");
  await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("settings-ready")).toBeVisible();
  await expect(page.locator(".settings-subnav")).toBeVisible();
  await expect(page.locator(".settings-subnav a.on")).toHaveText("Firm");

  if (mobile) {
    await page.locator("#people").scrollIntoViewIfNeeded();
  }
  await page.screenshot({ path: `test-results/${prefix}-settings-people.png`, fullPage: false });

  await page.locator("#invite").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("invite-email")).toBeVisible();
  await expect(page.locator("#invite-role")).toBeVisible();
  await page.getByTestId("invite-email").fill(`analyst-${prefix}@example.test`);
  await page.getByTestId("invite-submit").click();
  await expect(page.getByText(/invite created/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("invite-copy-link")).toBeVisible();
  await page.getByTestId("invite-copy-link").click();
  await expect(page.getByTestId("invite-copy-link")).toHaveText("Copied");
  await expect(page.locator(".settings-pending-table tbody tr").first()).toContainText(`analyst-${prefix}@example.test`);
  await page.screenshot({ path: `test-results/${prefix}-settings-invite.png`, fullPage: true });

  await page.getByTestId("settings-connectors-cta").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("settings-connectors-cta")).toBeVisible();
  await page.screenshot({ path: `test-results/${prefix}-settings-connectors-summary.png`, fullPage: false });
}

async function connectorsWalk(page: import("@playwright/test").Page, prefix: string, mobile: boolean) {
  await page.getByRole("link", { name: "Connectors", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/connectors/);
  await expect(page.getByTestId("connectors-ready")).toBeVisible();
  await expect(page.locator(".settings-subnav a.on")).toHaveText("Connectors");
  await expect(page.getByTestId("connector-cards")).toBeVisible();
  await expect(page.getByTestId("connector-card-onedrive")).toBeVisible();
  await expect(page.getByTestId("connector-card-affinity")).toBeVisible();
  await expect(page.getByTestId("connector-card-granola")).toBeVisible();
  await page.screenshot({ path: `test-results/${prefix}-connectors-top.png`, fullPage: false });

  for (const kind of ["onedrive", "affinity", "granola"] as const) {
    const card = page.getByTestId(`connector-card-${kind}`);
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByTestId(`connector-test-${kind}`)).toBeVisible();
    await expect(card.getByTestId(`connector-connect-${kind}`)).toBeVisible();
    if (mobile) {
      const box = await card.getByTestId(`connector-test-${kind}`).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
    }
    await page.screenshot({ path: `test-results/${prefix}-connectors-${kind}.png`, fullPage: false });
  }

  await page.screenshot({ path: `test-results/${prefix}-connectors-full.png`, fullPage: true });
}

test.describe("cold walk: settings invite and connectors", () => {
  test("desktop settings people invite and connectors", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    const stamp = Date.now().toString(36);
    try {
      await signupAdmin(page, stamp);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
    const prefix = `settings-desktop-${stamp}`;
    await settingsInviteWalk(page, prefix, false);
    await connectorsWalk(page, prefix, false);
  });

  test("mobile settings people invite and connectors", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const stamp = `${Date.now().toString(36)}m`;
    try {
      await signupAdmin(page, stamp);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
    const prefix = `settings-mobile-${stamp}`;
    await settingsInviteWalk(page, prefix, true);
    await connectorsWalk(page, prefix, true);
  });
});
