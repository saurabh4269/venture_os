import { expect, test } from "@playwright/test";
import { signupAdmin } from "./helpers/session";

const MOBILE_TRIO = [
  { label: "Command", href: "/command", ready: "command-ready", title: "Command" },
  { label: "Inbox", href: "/inbox", ready: "inbox-ready", title: "Inbox" },
  { label: "Companies", href: "/companies", ready: "companies-ready", title: "Companies" },
] as const;

async function openMobileNav(page: import("@playwright/test").Page) {
  await page.getByTestId("mobile-nav-open").click();
  await expect(page.getByTestId("mobile-nav")).toBeVisible();
}

async function assertMobileNavHitTargets(page: import("@playwright/test").Page) {
  const links = page.getByTestId("mobile-nav").locator("a.mobile-nav-link, button.mobile-nav-link");
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const box = await links.nth(i).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
  }
}

async function mobileNavTo(page: import("@playwright/test").Page, label: string) {
  await openMobileNav(page);
  await page.getByTestId(`mobile-nav-${label.toLowerCase()}`).click();
  await expect(page.getByTestId("mobile-nav")).toBeHidden();
}

async function walkMobileNavTrio(page: import("@playwright/test").Page, prefix: string) {
  await page.goto("/command");
  await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("aside.rail")).toBeHidden();
  await expect(page.getByTestId("command-ready")).toBeVisible();
  await expect(page.getByTestId("topbar-mobile-title")).toHaveText("Command");
  await page.screenshot({ path: `test-results/${prefix}-command.png`, fullPage: true });

  for (const stop of MOBILE_TRIO) {
    if (stop.href !== "/command") {
      await mobileNavTo(page, stop.label);
    }
    await expect(page).toHaveURL(new RegExp(`${stop.href.replace("/", "\\/")}$`));
    await expect(page.getByTestId(stop.ready)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("topbar-mobile-title")).toHaveText(stop.title);

    await openMobileNav(page);
    await expect(page.getByTestId(`mobile-nav-${stop.label.toLowerCase()}`)).toHaveClass(/active/);
    await assertMobileNavHitTargets(page);
    await page.screenshot({
      path: `test-results/${prefix}-menu-${stop.label.toLowerCase()}.png`,
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("mobile-nav")).toBeHidden();
    await page.screenshot({ path: `test-results/${prefix}-${stop.label.toLowerCase()}.png`, fullPage: true });
  }

  await openMobileNav(page);
  await page.getByTestId("mobile-nav-flags").click();
  await expect(page).toHaveURL(/\/flags/);
  await expect(page.getByTestId("topbar-mobile-title")).toHaveText("Flags");
  await page.screenshot({ path: `test-results/${prefix}-flags-via-menu.png`, fullPage: false });

  await mobileNavTo(page, "Command");
  await expect(page.getByTestId("command-ready")).toBeVisible();
  await expect(page.getByTestId("command-empty")).toBeVisible();
}

test.describe("mobile hamburger nav walk", () => {
  test("phone Command → Inbox → Companies via hamburger", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const stamp = `${Date.now().toString(36)}m`;
    try {
      await signupAdmin(page, stamp);
      await walkMobileNavTrio(page, `mobile-nav-${stamp}`);
    } catch (e) {
      if (e instanceof Error && e.message.includes("signup_rate_limited")) {
        test.skip(true, "Preview signup rate limited");
      }
      throw e;
    }
  });
});
