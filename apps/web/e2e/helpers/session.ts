import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInvite } from "./invite";

const password = "password123";

export async function signupAdmin(
  page: Page,
  stamp = Date.now().toString(36),
  opts?: { name?: string; org?: string; emailPrefix?: string },
) {
  const email = `${opts?.emailPrefix ?? "e2e-admin"}-${stamp}@example.test`;
  const org = opts?.org ?? `E2E ${stamp}`;
  const name = opts?.name ?? "E2E Admin";
  await page.goto("/signup");
  await expect(page.getByTestId("signup-name")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("signup-name").fill(name);
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill(password);
  await page.getByTestId("signup-confirm").fill(password);
  await page.getByTestId("signup-org").fill(org);
  await page.getByTestId("signup-submit").click();
  const rateLimited = page.getByRole("alert", { name: /too many (requests|sign-in attempts)/i });
  if (await rateLimited.isVisible({ timeout: 5000 }).catch(() => false)) {
    throw new Error("signup_rate_limited");
  }
  const landed = await Promise.race([
    page.waitForURL("**/command", { timeout: 90_000 }).then(() => "command" as const),
    page.waitForURL("**/onboard", { timeout: 90_000 }).then(() => "onboard" as const),
  ]).catch(() => "stuck" as const);
  if (landed === "stuck") {
    if (await rateLimited.isVisible().catch(() => false)) throw new Error("signup_rate_limited");
    throw new Error("signup_did_not_finish");
  }
  if (landed === "onboard") {
    await expect(page.getByTestId("onboard-ready")).toBeVisible();
    await page.getByTestId("onboard-org").fill(org);
    await page.getByTestId("onboard-submit").click();
    await page.waitForURL("**/command", { timeout: 30_000 });
  }
  await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 30_000 });
  return { email, password, org, stamp };
}

export async function onboardCompany(page: Page, stamp: string) {
  const fixture = resolve(process.cwd(), "../../fixtures/FIXTURE_ONLY-sample-mis.csv");
  await page.goto("/companies/new");
  await expect(page.getByTestId("shell-ready")).toBeVisible();
  await page.getByTestId("company-name").fill(`E2E Co ${stamp}`);
  await page.getByTestId("create-company").click();
  await expect(page.getByTestId("mis-file")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("mis-file").setInputFiles(fixture);
  await page.getByTestId("mis-upload").click();
  await expect(page.getByTestId("extract-status")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("extract-status")).toContainText(/done/i, { timeout: 60_000 });
}

/** Inbox list is fetched after extract; poll/reload until confirm or reject is in the DOM. */
export async function waitForInboxActions(page: Page, action: "inbox-confirm" | "inbox-reject" = "inbox-confirm") {
  await page.goto("/inbox");
  await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("inbox-ready")).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(
      async () => {
        if (await page.getByTestId(action).first().isVisible().catch(() => false)) return true;
        await page.reload();
        await expect(page.getByTestId("inbox-ready")).toBeVisible({ timeout: 20_000 });
        return page.getByTestId(action).first().isVisible().catch(() => false);
      },
      { timeout: 60_000, intervals: [1_000, 2_000, 2_000, 3_000] },
    )
    .toBeTruthy();
  return page.getByTestId(action).first();
}

export async function createViewerStorageState(page: Page, browser: Browser, stamp: string) {
  const viewerEmail = `e2e-viewer-${stamp}@example.test`;
  const created = await createInvite(page.request, viewerEmail, "viewer");
  const ctx = await browser.newContext();
  const guest = await ctx.newPage();
  await guest.goto(`/signup?invite=${created.id}`);
  await guest.getByTestId("signup-name").fill("E2E Viewer");
  await guest.getByTestId("signup-email").fill(viewerEmail);
  await guest.getByTestId("signup-password").fill(password);
  await guest.getByTestId("signup-confirm").fill(password);
  await guest.getByTestId("signup-submit").click();
  await expect(guest.getByRole("heading", { name: "Join an organisation" })).toBeVisible({
    timeout: 15_000,
  });
  await guest.getByRole("button", { name: "Accept invite" }).click();
  await expect(guest.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
  const dir = resolve(process.cwd(), "e2e/.auth");
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `viewer-${stamp}.json`);
  await ctx.storageState({ path });
  await ctx.close();
  return { viewerEmail, storageState: path };
}

export async function openViewer(browser: Browser, storageState: string): Promise<BrowserContext> {
  return browser.newContext({ storageState });
}
