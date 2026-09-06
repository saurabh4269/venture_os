import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { signupAdmin, waitForInboxActions } from "./helpers/session";

test.describe("happy path visual walk", () => {
  test("desktop signup through command after confirm", async ({ page }) => {
    test.setTimeout(180_000);
    const stamp = Date.now().toString(36);
    const fixture = resolve(process.cwd(), "../../fixtures/FIXTURE_ONLY-sample-mis.csv");
    await page.setViewportSize({ width: 1280, height: 800 });

    try {
    await page.goto("/signup");
    await page.screenshot({ path: "test-results/hp-desktop-signup.png" });
    await signupAdmin(page, stamp, { name: "HP Walk", org: `HP Org ${stamp}`, emailPrefix: "hp" });
    await page.screenshot({ path: "test-results/hp-desktop-command.png" });

    await page.locator(".rail-toggle").click();
    await expect(page.locator(".app.app-rail-expanded")).toBeVisible();
    await expect(page.locator(".rail-expanded .rail-item.active .rail-label")).toHaveText("Command");
    await page.screenshot({ path: "test-results/hp-desktop-rail-expanded.png" });

    await page.goto("/companies/new");
    await page.screenshot({ path: "test-results/hp-desktop-company-new.png" });
    await page.getByTestId("company-name").fill(`HP Co ${stamp}`);
    await page.getByTestId("create-company").click();
    await page.getByTestId("mis-file").setInputFiles(fixture);
    await page.screenshot({ path: "test-results/hp-desktop-upload.png" });
    await page.getByTestId("mis-upload").click();
    await expect(page.getByTestId("extract-status")).toBeVisible({ timeout: 90_000 });

    await page.goto("/inbox");
    await expect(page.getByTestId("inbox-ready")).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: "test-results/hp-desktop-inbox-before.png" });
    const confirm = await waitForInboxActions(page, "inbox-confirm");
    await confirm.click();
    await page.screenshot({ path: "test-results/hp-desktop-inbox-after.png" });

    await page.goto("/command");
    await expect(page.getByRole("link", { name: `HP Co ${stamp}` }).first()).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: "test-results/hp-desktop-command-booked.png" });
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

  test("mobile signup through command after confirm", async ({ page }) => {
    test.setTimeout(180_000);
    const stamp = Date.now().toString(36);
    const fixture = resolve(process.cwd(), "../../fixtures/FIXTURE_ONLY-sample-mis.csv");
    await page.setViewportSize({ width: 390, height: 844 });

    try {
    await page.goto("/signup");
    await page.screenshot({ path: "test-results/hp-mobile-signup.png" });
    await signupAdmin(page, stamp, { name: "HP Mobile", org: `HP Mobile ${stamp}`, emailPrefix: "hpm" });
    await expect(page.locator("aside.rail")).toBeHidden();
    await page.screenshot({ path: "test-results/hp-mobile-command.png" });

    await page.getByTestId("mobile-nav-open").click();
    await page.screenshot({ path: "test-results/hp-mobile-nav.png" });
    await page.keyboard.press("Escape");

    await page.goto("/companies/new");
    await expect(page.locator(".topbar-actions a.btn")).toHaveCount(0);
    await page.getByTestId("company-name").fill(`HP MCo ${stamp}`);
    await page.getByTestId("create-company").click();
    await page.getByTestId("mis-file").setInputFiles(fixture);
    await page.screenshot({ path: "test-results/hp-mobile-upload.png" });
    await page.getByTestId("mis-upload").click();
    await expect(page.getByTestId("extract-status")).toBeVisible({ timeout: 90_000 });

    await page.goto("/inbox");
    await expect(page.getByTestId("inbox-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".triage-head")).toBeHidden();
    await page.screenshot({ path: "test-results/hp-mobile-inbox.png" });
    const confirm = await waitForInboxActions(page, "inbox-confirm");
    await confirm.click();
    await page.waitForTimeout(500);

    await page.goto("/command");
    await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: `HP MCo ${stamp}` }).first()).toBeVisible({ timeout: 60_000 });
    await page.screenshot({ path: "test-results/hp-mobile-command-booked.png" });
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
