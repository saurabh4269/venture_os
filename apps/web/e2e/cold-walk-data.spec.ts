import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const AUTH = resolve(process.cwd(), "e2e/.auth/polish-walk.json");

test.describe("cold walk with data", () => {
  test.use({ storageState: existsSync(AUTH) ? AUTH : undefined });

  test("nav vault company detail screenshots", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/command");
    await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 30_000 });

    for (const [name, vp] of [
      ["desktop", { width: 1280, height: 800 }],
      ["mobile", { width: 390, height: 844 }],
    ] as const) {
      await page.setViewportSize(vp);
      for (const path of ["/nav", "/vault"]) {
        await page.goto(path);
        await expect(page.getByTestId("shell-ready")).toBeVisible();
        await page.screenshot({ path: `test-results/cold-${name}-${path.slice(1)}.png`, fullPage: true });
      }
      await page.goto("/companies");
      const link = page.getByRole("link", { name: /Polish Co|E2E Co|HP Co/ }).first();
      await expect(link).toBeVisible({ timeout: 15_000 });
      await link.click();
      await expect(page).toHaveURL(/\/companies\//);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `test-results/cold-${name}-company-detail.png`, fullPage: true });
    }
  });
});
