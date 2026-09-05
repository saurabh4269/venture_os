import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { signupAdmin, waitForInboxActions } from "./helpers/session";

const PATHS = [
  { path: "/flags", ready: "flags-ready" },
  { path: "/ask", ready: "ask-ready" },
  { path: "/compare", ready: "compare-ready" },
  { path: "/reports", ready: "reports-ready" },
  { path: "/nav", ready: "nav-ready" },
  { path: "/vault", ready: "vault-ready" },
  { path: "/settings", ready: "settings-ready" },
  { path: "/settings/connectors", ready: "connector-cards" },
];

const AUTH = resolve(process.cwd(), "e2e/.auth/polish-walk.json");

test.describe.configure({ mode: "serial" });

test.describe("workflow polish", () => {
  let stamp = "";

  test.beforeAll(async ({ browser }) => {
    mkdirSync(dirname(AUTH), { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const creds = await signupAdmin(page);
    stamp = creds.stamp;
    await ctx.storageState({ path: AUTH });
    await ctx.close();
  });

  test.use({ storageState: AUTH });

  test("desktop paths load with shell and ready markers", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1280, height: 800 });

    for (const { path, ready } of PATHS) {
      await page.goto(path);
      await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId(ready).first()).toBeVisible({ timeout: 15_000 });
      if (!path.startsWith("/companies/new")) {
        await expect(page.locator(".topbar-actions a.topbar-add-btn")).toBeVisible();
      }
      await page.screenshot({ path: `test-results/polish-desktop-${path.replace(/\//g, "_")}.png`, fullPage: true });
    }

    const fixture = resolve(process.cwd(), "../../fixtures/FIXTURE_ONLY-sample-mis.csv");
    await page.goto("/companies/new");
    await page.getByTestId("company-name").fill(`Polish Co ${stamp}`);
    await page.getByTestId("create-company").click();
    await expect(page.getByTestId("mis-file")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("mis-file").setInputFiles(fixture);
    await page.getByTestId("mis-upload").click();
    await expect(page.getByTestId("extract-status")).toBeVisible({ timeout: 90_000 });
    const confirm = await waitForInboxActions(page, "inbox-confirm");
    await confirm.click();
    await page.goto("/companies");
    await page.getByRole("link", { name: `Polish Co ${stamp}` }).first().click();
    await expect(page.getByTestId("shell-ready")).toBeVisible();
    await page.screenshot({ path: "test-results/polish-company-detail.png", fullPage: true });
  });

  test("mobile paths and vault empty CTA", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/command");
    await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("aside.rail")).toBeHidden();

    for (const path of ["/flags", "/ask", "/compare", "/reports", "/nav", "/vault", "/settings", "/settings/connectors"]) {
      await page.goto(path);
      await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
      await page.getByTestId("mobile-nav-open").click();
      await expect(page.getByTestId("mobile-nav")).toBeVisible();
      await page.keyboard.press("Escape");
      await page.screenshot({ path: `test-results/polish-mobile-${path.replace(/\//g, "_")}.png`, fullPage: true });
    }

    await page.goto("/vault");
    await expect(page.locator(".empty").getByRole("link", { name: "Add company" })).toBeVisible();
  });
});
