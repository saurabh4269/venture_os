import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { waitForInboxActions } from "./helpers/session";

const CORE_PATHS = [
  { path: "/command", ready: "command-ready" },
  { path: "/inbox", ready: "inbox-ready" },
  { path: "/flags", ready: "flags-ready" },
  { path: "/ask", ready: "ask-ready" },
  { path: "/settings", ready: "settings-ready" },
] as const;

async function signupFresh(
  page: import("@playwright/test").Page,
  stamp: string,
  label: string,
  shotPrefix: string,
) {
  await page.goto("/signup");
  await expect(page.getByTestId("signup-name")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `test-results/${shotPrefix}-signup-form.png`, fullPage: true });
  await page.getByTestId("signup-name").fill(label);
  await page.getByTestId("signup-email").fill(`cold-${stamp}@example.test`);
  await page.getByTestId("signup-password").fill("password12345");
  await page.getByTestId("signup-confirm").fill("password12345");
  await page.getByTestId("signup-org").fill(`Cold Org ${stamp}`);
  await page.getByTestId("signup-submit").click();
  const rateLimited = page.getByRole("alert", { name: /too many requests/i });
  if (await rateLimited.isVisible({ timeout: 5000 }).catch(() => false)) {
    throw new Error("signup_rate_limited");
  }
  await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 90_000 });
}

async function bookCompany(page: import("@playwright/test").Page, stamp: string) {
  const fixture = resolve(process.cwd(), "../../fixtures/FIXTURE_ONLY-sample-mis.csv");
  await page.goto("/companies/new");
  await expect(page.getByTestId("shell-ready")).toBeVisible();
  await page.getByTestId("company-name").fill(`Cold Co ${stamp}`);
  await page.getByTestId("create-company").click();
  await expect(page.getByTestId("mis-file")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("mis-file").setInputFiles(fixture);
  await page.getByTestId("mis-upload").click();
  await expect(page.getByTestId("extract-status")).toBeVisible({ timeout: 90_000 });
  await page.goto("/inbox");
  const confirm = await waitForInboxActions(page, "inbox-confirm");
  await confirm.click();
}

test.describe.configure({ mode: "serial" });

test.describe("core cold walk", () => {
  test("desktop signup through settings", async ({ page }) => {
    test.setTimeout(300_000);
    const stamp = Date.now().toString(36);
    await page.setViewportSize({ width: 1280, height: 800 });

    try {
      await signupFresh(page, stamp, "Cold Desktop", "cold-core-desktop");
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }

    await bookCompany(page, stamp);

    for (const { path, ready } of CORE_PATHS) {
      await page.goto(path);
      await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId(ready).first()).toBeVisible({ timeout: 15_000 });
      await page.screenshot({
        path: `test-results/cold-core-desktop-${path.replace(/\//g, "_")}.png`,
        fullPage: true,
      });
    }

    await page.goto("/flags");
    const row = page.getByTestId("flags-row").first();
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await expect(page.getByTestId("flags-detail")).toBeVisible();
      await page.screenshot({ path: "test-results/cold-core-desktop-flags-detail.png", fullPage: true });
    }
  });

  test("mobile signup through settings", async ({ page }) => {
    test.setTimeout(300_000);
    const stamp = `${Date.now().toString(36)}m`;
    await page.setViewportSize({ width: 390, height: 844 });

    try {
      await signupFresh(page, stamp, "Cold Mobile", "cold-core-mobile");
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
    await expect(page.locator("aside.rail")).toBeHidden();
    await page.screenshot({ path: "test-results/cold-core-mobile-command.png", fullPage: true });

    await bookCompany(page, stamp);

    for (const { path, ready } of CORE_PATHS) {
      await page.goto(path);
      await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId(ready).first()).toBeVisible({ timeout: 15_000 });
      await page.screenshot({
        path: `test-results/cold-core-mobile-${path.replace(/\//g, "_")}.png`,
        fullPage: true,
      });
    }

    await page.goto("/flags");
    const row = page.getByTestId("flags-row").first();
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await page.screenshot({ path: "test-results/cold-core-mobile-flags-detail.png", fullPage: true });
    }
  });
});
