import { expect, test } from "@playwright/test";
import { signupAdmin } from "./helpers/session";

const RAIL_NAV = [
  { label: "Command", href: "/command", ready: "command-ready" },
  { label: "Inbox", href: "/inbox", ready: "inbox-ready" },
  { label: "Flags", href: "/flags", ready: "flags-ready" },
  { label: "Companies", href: "/companies", ready: "companies-ready" },
  { label: "Ask", href: "/ask", ready: "ask-ready" },
  { label: "NAV", href: "/nav", ready: "nav-ready" },
  { label: "Compare", href: "/compare", ready: "compare-ready" },
  { label: "Reports", href: "/reports", ready: "reports-ready" },
  { label: "Vault", href: "/vault", ready: "vault-ready" },
  { label: "Settings", href: "/settings", ready: "settings-ready" },
] as const;

const RAIL_LABELS = [
  "Command",
  "Inbox",
  "Flags",
  "Companies",
  "Ask",
  "NAV",
  "Compare",
  "Reports",
  "Vault",
  "Settings",
] as const;

async function assertRailHitTargets(page: import("@playwright/test").Page) {
  const hits = await page.evaluate(() => {
    const links = [...document.querySelectorAll("aside.rail a.rail-item[href]")] as HTMLAnchorElement[];
    const nav = document.querySelector(".rail .nav");
    const navR = nav?.getBoundingClientRect();
    const spacer = document.querySelector(".rail-spacer");
    const spacerVisible = spacer && getComputedStyle(spacer).display !== "none";
    return links.map((a) => {
      const href = a.getAttribute("href") ?? "";
      const r = a.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const el = document.elementFromPoint(x, y);
      const onLink = Boolean(el && (el === a || a.contains(el)));
      const inNav =
        !navR || href === "/settings"
          ? true
          : r.top >= navR.top - 1 && r.bottom <= navR.bottom + 1;
      return {
        href,
        onLink,
        inNav,
        spacerVisible,
        hit: el ? `${el.tagName}.${(el.className || "").toString().slice(0, 40)}` : "none",
      };
    });
  });

  expect(hits.some((h) => h.spacerVisible), "rail-spacer should be hidden when expanded").toBe(false);

  for (const hit of hits) {
    expect(hit.onLink, `${hit.href} hit target blocked (${hit.hit})`).toBe(true);
    if (hit.href !== "/settings") {
      expect(hit.inNav, `${hit.href} should sit inside the scrollable nav column`).toBe(true);
    }
  }
}

async function assertExpandedRail(page: import("@playwright/test").Page, active: string) {
  await expect(page.locator(".app.app-rail-expanded")).toBeVisible();
  await expect(page.locator("aside.rail.rail-expanded")).toBeVisible();
  await expect(page.locator("aside.rail")).toHaveCSS("width", /23\dpx/);
  await expect(page.locator(".rail-expanded .rail-item.active .rail-label")).toHaveText(active);

  await assertRailHitTargets(page);

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
  for (const name of RAIL_LABELS) {
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

  for (const stop of RAIL_NAV) {
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

  // Settings sub-route keeps Settings active in the rail
  await page.goto("/settings/connectors");
  await expect(page.getByTestId("connectors-ready")).toBeVisible({ timeout: 30_000 });
  await assertExpandedRail(page, "Settings");
  await page.screenshot({ path: `test-results/${prefix}-rail-connectors.png`, fullPage: false });

  // Awkward pages: empty vault + company create form (topbar CTA)
  await page.locator('aside.rail a.rail-item[href="/vault"]').click();
  await expect(page.getByTestId("vault-ready")).toBeVisible();
  const vaultAdd = page.locator(".vault-empty-actions").getByRole("link", { name: "Add company" });
  await expect(vaultAdd).toBeVisible();
  await page.screenshot({ path: `test-results/${prefix}-vault-empty.png`, fullPage: true });

  await vaultAdd.click();
  await expect(page.getByTestId("company-name")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `test-results/${prefix}-company-new.png`, fullPage: true });

  await page.locator(".rail-toggle").click();
  await expect(page.locator(".app.app-rail-expanded")).toHaveCount(0);
  await expect(page.locator("aside.rail")).toHaveCSS("width", /5\dpx/);
  await page.screenshot({ path: `test-results/${prefix}-rail-collapsed-again.png`, fullPage: false });
}

test.describe("expanded desktop rail walk", () => {
  test("rail hit targets and labels stay synced across every nav item", async ({ page }) => {
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
      if (e instanceof Error && e.message.includes("signup_did_not_finish")) {
        test.skip(true, "Signup did not reach Command");
      }
      throw e;
    }
  });
});
