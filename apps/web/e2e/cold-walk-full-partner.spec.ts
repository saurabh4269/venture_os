import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { waitForInboxActions } from "./helpers/session";

const FIXTURE = resolve(process.cwd(), "../../fixtures/FIXTURE_ONLY-sample-mis.csv");
const PASSWORD = "password12345";

async function navViaShell(
  page: import("@playwright/test").Page,
  label: string,
  href: string,
  desktop: boolean,
) {
  if (desktop) {
    await page.locator("aside.rail").getByRole("link", { name: label, exact: true }).click();
    return;
  }
  await page.getByTestId("mobile-nav-open").click();
  const link = page.getByTestId("mobile-nav").getByRole("link", { name: label, exact: true });
  await expect(link).toBeVisible();
  await Promise.all([page.waitForURL(`**${href}`), link.click()]);
}

async function fullPartnerWalk(
  page: import("@playwright/test").Page,
  prefix: string,
  desktop: boolean,
) {
  const stamp = `${Date.now().toString(36)}${desktop ? "d" : "m"}`;
  const companyName = `Partner Co ${stamp}`;
  const partnerName = desktop ? "Partner Desktop" : "Partner Mobile";

  // Landing
  await page.goto("/");
  await expect(page.getByTestId("marketing-landing")).toBeVisible();
  await page.screenshot({ path: `test-results/${prefix}-01-landing.png`, fullPage: true });

  // Signup
  await page.getByTestId("landing-get-started").click();
  await expect(page.getByTestId("signup-submit")).toBeVisible();
  await page.getByTestId("signup-name").fill(partnerName);
  await page.getByTestId("signup-email").fill(`partner-full-${stamp}@example.test`);
  await page.getByTestId("signup-password").fill(PASSWORD);
  await page.getByTestId("signup-confirm").fill(PASSWORD);
  await page.getByTestId("signup-org").fill(`Partner Org ${stamp}`);
  await page.getByTestId("signup-submit").click();

  const rateLimited = page.getByRole("alert", { name: /too many requests/i });
  if (await rateLimited.isVisible({ timeout: 5000 }).catch(() => false)) {
    throw new Error("signup_rate_limited");
  }

  // Command
  await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 90_000 });
  await page.screenshot({ path: `test-results/${prefix}-02-command.png`, fullPage: true });

  // Nav → Companies
  if (desktop) {
    await page.locator(".rail-toggle").click();
    await expect(page.locator(".app.app-rail-expanded")).toBeVisible();
    await expect(page.locator("aside.rail")).toHaveCSS("width", /23\dpx/);
    await expect(page.locator(".rail-expanded .rail-item.active .rail-label")).toHaveText("Command");
    await page.screenshot({ path: `test-results/${prefix}-03-rail-expanded.png`, fullPage: false });
  } else {
    await expect(page.locator("aside.rail")).toBeHidden();
    await page.getByTestId("mobile-nav-open").click();
    await expect(page.getByTestId("mobile-nav")).toBeVisible();
    await page.screenshot({ path: `test-results/${prefix}-03-mobile-nav.png`, fullPage: false });
    await page.keyboard.press("Escape");
  }
  await navViaShell(page, "Companies", "/companies", desktop);

  // Companies → create + upload
  await expect(page.getByTestId("companies-ready")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: "Add company" }).first().click();
  await expect(page.getByTestId("company-name")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("company-name").fill(companyName);
  await page.getByTestId("create-company").click();
  await expect(page.getByTestId("mis-file")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("mis-file").setInputFiles(FIXTURE);
  await page.screenshot({ path: `test-results/${prefix}-04-upload-form.png`, fullPage: true });
  await page.getByTestId("mis-upload").click();
  await expect(page.getByTestId("extract-status")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId("extract-status")).toContainText(/done/i, { timeout: 90_000 });
  await page.screenshot({ path: `test-results/${prefix}-05-upload-done.png`, fullPage: true });

  // Inbox → confirm
  await navViaShell(page, "Inbox", "/inbox", desktop);
  const confirm = await waitForInboxActions(page, "inbox-confirm");
  await page.screenshot({ path: `test-results/${prefix}-06-inbox-pending.png`, fullPage: true });
  await confirm.click();
  await expect(page.getByText(/confirmed|posted to the book/i).first()).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: `test-results/${prefix}-07-inbox-confirmed.png`, fullPage: true });

  // Flags
  await navViaShell(page, "Flags", "/flags", desktop);
  await expect(page.getByTestId("flags-ready")).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Recompute" }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Recompute" }).click();
    await page.waitForTimeout(1500);
  }
  const flagRow = page.getByTestId("flags-row").first();
  if (await flagRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await flagRow.click();
    await expect(page.getByTestId("flags-detail")).toBeVisible();
  }
  await page.screenshot({ path: `test-results/${prefix}-08-flags.png`, fullPage: true });

  // Ask
  await navViaShell(page, "Ask", "/ask", desktop);
  await expect(page.getByTestId("ask-ready")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("ask-question").fill("What was confirmed cash?");
  await page.getByTestId("ask-submit").click();
  await expect(page.getByTestId("ask-answer").or(page.getByTestId("ask-refused"))).toBeVisible({
    timeout: 30_000,
  });
  await page.screenshot({ path: `test-results/${prefix}-09-ask.png`, fullPage: true });
}

test.describe("full partner cold walk", () => {
  test("desktop landing through ask with expanded rail", async ({ page }) => {
    test.setTimeout(360_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    try {
      await fullPartnerWalk(page, "full-partner-desktop", true);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
  });

  test("mobile landing through ask", async ({ page }) => {
    test.setTimeout(360_000);
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await fullPartnerWalk(page, "full-partner-mobile", false);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
  });
});
