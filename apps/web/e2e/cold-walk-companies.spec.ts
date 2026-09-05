import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

const FIXTURE = resolve(process.cwd(), "../../fixtures/FIXTURE_ONLY-sample-mis.csv");
const PASSWORD = "password12345";

async function signupFresh(page: import("@playwright/test").Page, stamp: string, label: string) {
  await page.goto("/signup");
  await page.getByTestId("signup-name").fill(label);
  await page.getByTestId("signup-email").fill(`co-walk-${stamp}@example.test`);
  await page.getByTestId("signup-password").fill(PASSWORD);
  await page.getByTestId("signup-confirm").fill(PASSWORD);
  await page.getByTestId("signup-org").fill(`Co Walk ${stamp}`);
  await page.getByTestId("signup-submit").click();
  const rateLimited = page.getByRole("alert", { name: /too many requests/i });
  if (await rateLimited.isVisible({ timeout: 5000 }).catch(() => false)) {
    throw new Error("signup_rate_limited");
  }
  await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 90_000 });
}

async function createCompany(page: import("@playwright/test").Page, name: string) {
  await page.goto("/companies/new");
  await expect(page.getByTestId("company-name")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("company-name").fill(name);
  await page.getByTestId("create-company").click();
  await expect(page.getByTestId("mis-file")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("mis-file").setInputFiles(FIXTURE);
  await page.getByTestId("mis-upload").click();
  await expect(page.getByTestId("extract-status")).toBeVisible({ timeout: 90_000 });
}

async function verifyRailExpand(page: import("@playwright/test").Page, prefix: string) {
  await page.goto("/command");
  await expect(page.getByTestId("command-ready")).toBeVisible();
  await expect(page.locator("aside.rail")).not.toHaveClass(/rail-expanded/);
  await expect(page.locator(".app")).not.toHaveClass(/app-rail-expanded/);
  await page.screenshot({ path: `test-results/${prefix}-rail-collapsed.png`, fullPage: false });

  await page.locator(".rail-toggle").click();
  await expect(page.locator(".app.app-rail-expanded")).toBeVisible();
  await expect(page.locator("aside.rail.rail-expanded")).toBeVisible();
  await expect(page.locator("aside.rail")).toHaveCSS("width", /23\dpx/);

  const expanded = await page.evaluate(() => {
    const rail = document.querySelector("aside.rail");
    const app = document.querySelector(".app");
    const labels = [...document.querySelectorAll(".rail-expanded .rail-label")].map((el) => ({
      text: el.textContent?.trim(),
      width: el.getBoundingClientRect().width,
    }));
    const active = document.querySelector(".rail-expanded .rail-item.active .rail-label");
    return {
      railWidth: rail?.getBoundingClientRect().width ?? 0,
      appGrid: app ? getComputedStyle(app).gridTemplateColumns : "",
      labels,
      activeLabel: active?.textContent?.trim(),
      activeLabelWidth: active?.getBoundingClientRect().width ?? 0,
    };
  });
  expect(expanded.railWidth).toBeGreaterThan(180);
  expect(expanded.appGrid).toMatch(/23\dpx/);
  expect(expanded.activeLabel).toBe("Command");
  expect(expanded.activeLabelWidth).toBeGreaterThan(40);
  for (const label of ["Inbox", "Flags", "Companies", "Ask", "Settings"]) {
    const hit = expanded.labels.find((l) => l.text === label);
    expect(hit, `missing rail label ${label}`).toBeTruthy();
    expect(hit!.width).toBeGreaterThan(24);
  }
  await page.screenshot({ path: `test-results/${prefix}-rail-expanded.png`, fullPage: false });

  await page.locator("aside.rail").getByRole("link", { name: "Companies", exact: true }).click();
  await expect(page.getByTestId("companies-ready")).toBeVisible();
  await expect(page.locator(".rail-expanded .rail-item.active .rail-label")).toHaveText("Companies");
  await expect(page.locator("aside.rail")).toHaveCSS("width", /23\dpx/);
  await page.screenshot({ path: `test-results/${prefix}-rail-stays-expanded.png`, fullPage: false });

  await page.locator(".rail-toggle").click();
  await expect(page.locator(".app.app-rail-expanded")).toHaveCount(0);
  await expect(page.locator("aside.rail.rail-expanded")).toHaveCount(0);
  await expect(page.locator("aside.rail")).toHaveCSS("width", /5\dpx/);

  await page.reload();
  await expect(page.getByTestId("companies-ready")).toBeVisible();
  await expect(page.locator(".app.app-rail-expanded")).toHaveCount(0);
  await page.locator(".rail-toggle").click();
  await expect(page.locator(".app.app-rail-expanded")).toBeVisible();
  await expect(page.locator("aside.rail")).toHaveCSS("width", /23\dpx/);
  await page.screenshot({ path: `test-results/${prefix}-rail-collapsed-again.png`, fullPage: false });
}

async function companiesUploadWalk(
  page: import("@playwright/test").Page,
  prefix: string,
  companyName: string,
  expandRail: boolean,
) {
  if (expandRail) {
    if (!(await page.locator(".app.app-rail-expanded").isVisible())) {
      await page.locator(".rail-toggle").click();
    }
    await expect(page.locator(".app.app-rail-expanded")).toBeVisible();
    await page.locator("aside.rail").getByRole("link", { name: "Companies", exact: true }).click();
  } else {
    await page.getByTestId("mobile-nav-open").click();
    await page.getByTestId("mobile-nav").getByRole("link", { name: "Companies", exact: true }).click();
  }

  await expect(page.getByTestId("companies-ready")).toBeVisible();
  await expect(page.getByRole("link", { name: companyName })).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `test-results/${prefix}-companies-list.png`, fullPage: true });

  await page.getByRole("link", { name: companyName }).click();
  await expect(page).toHaveURL(/\/companies\//);
  await expect(page.getByTestId("shell-ready")).toBeVisible();
  await page.screenshot({ path: `test-results/${prefix}-company-detail.png`, fullPage: true });

  const upload = page.locator(".company-upload-form");
  await expect(upload).toBeVisible();
  await upload.locator('input[type="file"]').setInputFiles(FIXTURE);
  await upload.getByTestId("company-upload-submit").click();
  await expect(upload.getByText(/queued|duplicate|inbox/i)).toBeVisible({ timeout: 90_000 });
  await page.screenshot({ path: `test-results/${prefix}-company-upload.png`, fullPage: true });
}

test.describe("rail expand and companies upload walk", () => {
  test("desktop rail expand and companies upload", async ({ page }) => {
    test.setTimeout(300_000);
    const stamp = Date.now().toString(36);
    const companyName = `Rail Co ${stamp}`;
    await page.setViewportSize({ width: 1280, height: 800 });

    try {
      await signupFresh(page, stamp, "Rail Desktop");
      await createCompany(page, companyName);
      await verifyRailExpand(page, "co-walk-desktop");
      await companiesUploadWalk(page, "co-walk-desktop", companyName, true);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
  });

  test("mobile companies upload walk", async ({ page }) => {
    test.setTimeout(300_000);
    const stamp = `${Date.now().toString(36)}m`;
    const companyName = `Mobile Co ${stamp}`;
    await page.setViewportSize({ width: 390, height: 844 });

    try {
      await signupFresh(page, stamp, "Co Mobile");
      await createCompany(page, companyName);
      await expect(page.locator("aside.rail")).toBeHidden();
      await companiesUploadWalk(page, "co-walk-mobile", companyName, false);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
  });
});
