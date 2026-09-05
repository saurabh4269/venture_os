import { expect, test } from "@playwright/test";
import { signupAdmin } from "./helpers/session";

const RAIL_PAGES = [
  { label: "Command", href: "/command", ready: "command-ready" },
  { label: "Inbox", href: "/inbox", ready: "inbox-ready" },
  { label: "Flags", href: "/flags", ready: "flags-ready" },
  { label: "Companies", href: "/companies", ready: "companies-ready" },
  { label: "Ask", href: "/ask", ready: "ask-ready" },
  { label: "NAV", href: "/nav", ready: "nav-ready" },
  { label: "Compare", href: "/compare", ready: "compare-ready" },
  { label: "Reports", href: "/reports", ready: "reports-ready" },
  { label: "Settings", href: "/settings", ready: "settings-ready" },
] as const;

async function assertExpandedRail(page: import("@playwright/test").Page, active: string) {
  await expect(page.locator(".app.app-rail-expanded")).toBeVisible();
  await expect(page.locator("aside.rail.rail-expanded")).toBeVisible();
  await expect(page.locator("aside.rail")).toHaveCSS("width", /23\dpx/);
  await expect(page.locator(".rail-expanded .rail-item.active .rail-label")).toHaveText(active);

  const metrics = await page.evaluate(() => {
    const labels = [...document.querySelectorAll(".rail-expanded .rail-label")].map((el) => ({
      text: el.textContent?.trim(),
      width: el.getBoundingClientRect().width,
    }));
    const app = document.querySelector(".app");
    return {
      labels,
      appGrid: app ? getComputedStyle(app).gridTemplateColumns : "",
    };
  });
  expect(metrics.appGrid).toMatch(/23\dpx/);
  for (const name of ["Inbox", "Flags", "Companies", "Ask", "NAV", "Compare", "Reports", "Settings"]) {
    const hit = metrics.labels.find((l) => l.text === name);
    expect(hit, `missing rail label ${name}`).toBeTruthy();
    expect(hit!.width).toBeGreaterThan(24);
  }
}

async function walkExpandedRail(page: import("@playwright/test").Page, prefix: string) {
  await page.goto("/command");
  await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("aside.rail")).not.toHaveClass(/rail-expanded/);
  await page.screenshot({ path: `test-results/${prefix}-rail-collapsed.png`, fullPage: false });

  await page.locator(".rail-toggle").click();
  await assertExpandedRail(page, "Command");
  await page.screenshot({ path: `test-results/${prefix}-rail-expanded-command.png`, fullPage: false });

  for (const stop of RAIL_PAGES) {
    const link = page.locator(`aside.rail a.rail-item[href="${stop.href}"]`);
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await page.waitForURL(`**${stop.href}`, { timeout: 20_000 });
    await expect(page.getByTestId(stop.ready)).toBeVisible({ timeout: 30_000 });
    await assertExpandedRail(page, stop.label);
    await page.screenshot({
      path: `test-results/${prefix}-rail-${stop.label.toLowerCase()}.png`,
      fullPage: false,
    });
  }

  await page.locator("aside.rail").getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByTestId("settings-ready")).toBeVisible();
  await page.goto("/settings/connectors");
  await expect(page.getByTestId("connectors-ready")).toBeVisible({ timeout: 30_000 });
  await assertExpandedRail(page, "Settings");
  await page.screenshot({ path: `test-results/${prefix}-rail-connectors.png`, fullPage: false });

  await page.locator(".rail-toggle").click();
  await expect(page.locator(".app.app-rail-expanded")).toHaveCount(0);
  await expect(page.locator("aside.rail")).toHaveCSS("width", /5\dpx/);
  await page.screenshot({ path: `test-results/${prefix}-rail-collapsed-again.png`, fullPage: false });
}

test.describe("expanded desktop rail walk", () => {
  test("rail labels and grid stay synced across ritual pages", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    const stamp = Date.now().toString(36);
    try {
      await signupAdmin(page, stamp);
      await walkExpandedRail(page, `rail-walk-${stamp}`);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
  });
});
