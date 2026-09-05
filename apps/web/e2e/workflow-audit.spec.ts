import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { waitForInboxActions } from "./helpers/session";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const DEFENSIVE = [
  /we don'?t/i,
  /we never/i,
  /will not/i,
  /nothing auto/i,
  /not fake/i,
  /cite or refuse/i,
  /illustrative nav/i,
  /do not treat/i,
  /does not invent/i,
  /not connected/i,
  /not configured/i,
  /cannot write/i,
  /refuses when/i,
  /badge wall/i,
];

async function scanPage(page: import("@playwright/test").Page, label: string) {
  const body = await page.locator("body").innerText();
  const hits: string[] = [];
  for (const re of DEFENSIVE) {
    if (re.test(body)) hits.push(re.source);
  }
  return { label, hits, body };
}

test.describe("workflow audit", () => {
  test("all major paths desktop + mobile", async ({ page, browser }) => {
    test.setTimeout(600_000);
    const stamp = Date.now().toString(36);
    const email = `wf-${stamp}@example.test`;
    const password = "password12345";
    const org = `WF ${stamp}`;
    const fixture = resolve(process.cwd(), "../../fixtures/FIXTURE_ONLY-sample-mis.csv");
    const issues: { label: string; hits: string[] }[] = [];

    // WF1: landing → signup → command
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const path of ["/", "/login", "/signup", "/blog", "/security"]) {
      await page.goto(path);
      issues.push(await scanPage(page, `public ${path}`));
      await page.screenshot({ path: `test-results/wf-public-${path.replace(/\//g, "_") || "home"}.png`, fullPage: true });
    }

    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("WF User");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill(password);
    await page.getByTestId("signup-confirm").fill(password);
    await page.getByTestId("signup-org").fill(org);
    await page.getByTestId("signup-submit").click();
    await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 30_000 });
    issues.push(await scanPage(page, "command after signup"));
    await page.screenshot({ path: "test-results/wf-command.png", fullPage: true });

    const appPaths = [
      "/inbox",
      "/flags",
      "/companies",
      "/ask",
      "/nav",
      "/compare",
      "/reports",
      "/vault",
      "/settings",
      "/settings/connectors",
    ];
    for (const path of appPaths) {
      await page.goto(path);
      await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
      const testId = path.includes("connectors") ? "connector-cards" : path.slice(1).replace("/", "-") + "-ready";
      const ready = page.getByTestId(testId);
      if (await ready.count()) {
        await expect(ready.first()).toBeVisible({ timeout: 15_000 });
      }
      issues.push(await scanPage(page, path));
      await page.screenshot({ path: `test-results/wf-${path.replace(/\//g, "_")}.png`, fullPage: true });
    }

    // WF2: add company → upload → inbox → command
    await page.goto("/companies/new");
    await page.getByTestId("company-name").fill(`WF Co ${stamp}`);
    await page.getByTestId("create-company").click();
    await expect(page.getByTestId("mis-file")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("mis-file").setInputFiles(fixture);
    await page.getByTestId("mis-upload").click();
    await expect(page.getByTestId("extract-status")).toBeVisible({ timeout: 90_000 });
    issues.push(await scanPage(page, "companies/new after upload"));
    const confirm = await waitForInboxActions(page, "inbox-confirm");
    await confirm.click();
    await page.goto("/command");
    await expect(page.getByRole("link", { name: `WF Co ${stamp}` }).first()).toBeVisible({ timeout: 30_000 });
    issues.push(await scanPage(page, "command after confirm"));

    // Company detail
    await page.goto("/companies");
    await page.getByRole("link", { name: `WF Co ${stamp}` }).first().click();
    await expect(page.getByTestId("shell-ready")).toBeVisible();
    issues.push(await scanPage(page, "company detail"));
    await page.screenshot({ path: "test-results/wf-company-detail.png", fullPage: true });

    // Mobile walks
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mpage = await mobile.newPage();
    await mpage.goto(`${BASE}/login`);
    await mpage.getByTestId("login-email").fill(email);
    await mpage.getByTestId("login-password").fill(password);
    await mpage.getByTestId("login-submit").click();
    await expect(mpage.getByTestId("shell-ready")).toBeVisible({ timeout: 90_000 });

    const mobilePaths = [
      "/command",
      "/inbox",
      "/flags",
      "/companies",
      "/ask",
      "/nav",
      "/compare",
      "/reports",
      "/vault",
      "/settings",
      "/settings/connectors",
    ];
    for (const path of mobilePaths) {
      await mpage.goto(`${BASE}${path}`);
      await expect(mpage.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
      const testId = path.includes("connectors") ? "connector-cards" : path.slice(1).replace("/", "-") + "-ready";
      const ready = mpage.getByTestId(testId);
      if (await ready.count()) {
        await expect(ready.first()).toBeVisible({ timeout: 15_000 });
      }
      await mpage.getByTestId("mobile-nav-open").click();
      await expect(mpage.getByTestId("mobile-nav")).toBeVisible();
      await mpage.keyboard.press("Escape");
      issues.push(await scanPage(mpage, `mobile ${path}`));
      await mpage.screenshot({ path: `test-results/wf-mobile-${path.replace(/\//g, "_")}.png`, fullPage: true });
    }

    await mobile.close();

    const bad = issues.filter((i) => i.hits.length > 0);
    if (bad.length) {
      console.log("COPY ISSUES:", JSON.stringify(bad, null, 2));
    }
    expect(bad, `defensive copy found: ${JSON.stringify(bad)}`).toHaveLength(0);
  });
});
