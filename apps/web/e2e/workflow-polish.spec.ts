import { expect, test, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
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

const AUTH_DIR = resolve(process.cwd(), "e2e/.auth");
const AUTH = resolve(AUTH_DIR, "polish-walk.json");
const STAMP_FILE = resolve(AUTH_DIR, "polish-walk-stamp.txt");
const CREDS_FILE = resolve(AUTH_DIR, "polish-walk-creds.json");

type PolishCreds = { stamp: string; email: string; password: string };

function readCreds(): PolishCreds | null {
  if (!existsSync(CREDS_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CREDS_FILE, "utf8")) as PolishCreds;
  } catch {
    return null;
  }
}

function writeCreds(creds: PolishCreds) {
  writeFileSync(CREDS_FILE, JSON.stringify(creds), "utf8");
  writeFileSync(STAMP_FILE, creds.stamp, "utf8");
}

async function loginExisting(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 90_000 });
}

test.describe.configure({ mode: "serial" });

test.describe("workflow polish", () => {
  async function ensureAuth(browser: Browser): Promise<string> {
    mkdirSync(AUTH_DIR, { recursive: true });

    async function createFresh(): Promise<string> {
      if (existsSync(AUTH)) unlinkSync(AUTH);
      if (existsSync(STAMP_FILE)) unlinkSync(STAMP_FILE);
      if (existsSync(CREDS_FILE)) unlinkSync(CREDS_FILE);
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      const creds = await signupAdmin(page);
      const saved: PolishCreds = { stamp: creds.stamp, email: creds.email, password: creds.password };
      writeCreds(saved);
      await ctx.storageState({ path: AUTH });
      await ctx.close();
      return creds.stamp;
    }

    async function sessionOk(): Promise<boolean> {
      if (!existsSync(AUTH)) return false;
      const ctx = await browser.newContext({ storageState: AUTH, viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      await page.goto("/command");
      const ok = await page.getByTestId("command-ready").isVisible({ timeout: 20_000 }).catch(() => false);
      await ctx.close();
      return ok;
    }

    if (await sessionOk()) {
      const stamp = readFileSync(STAMP_FILE, "utf8").trim();
      if (stamp) return stamp;
    }

    const saved = readCreds();
    if (saved) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      try {
        await loginExisting(page, saved.email, saved.password);
        await ctx.storageState({ path: AUTH });
        await ctx.close();
        return saved.stamp;
      } catch {
        await ctx.close();
      }
    }

    return createFresh();
  }

  async function authedPage(browser: Browser, viewport: { width: number; height: number }): Promise<Page> {
    const ctx = await browser.newContext({ storageState: AUTH, viewport });
    return ctx.newPage();
  }

  test("desktop paths load with shell and ready markers", async ({ browser }) => {
    test.setTimeout(300_000);
    let stamp = "";
    try {
      stamp = await ensureAuth(browser);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
    const page = await authedPage(browser, { width: 1280, height: 800 });
    await page.goto("/command");
    await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 30_000 });

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

  test("mobile paths and vault empty CTA", async ({ browser }) => {
    test.setTimeout(180_000);
    await ensureAuth(browser);
    const page = await authedPage(browser, { width: 390, height: 844 });
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
    await expect(page.getByTestId("vault-ready")).toBeVisible();
  });
});
