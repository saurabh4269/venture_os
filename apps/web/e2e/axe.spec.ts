import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signupAdmin } from "./helpers/session";

const enabled = process.env.PLAYWRIGHT_AXE === "1";

test.describe("@axe optional", () => {
  test.skip(!enabled, "Set PLAYWRIGHT_AXE=1 to run axe (CI optional).");

  test("login and command have no critical violations", async ({ page }) => {
    await page.goto("/login");
    const login = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    const loginCritical = login.violations.filter((v) => v.impact === "critical");
    expect(loginCritical, JSON.stringify(loginCritical, null, 2)).toEqual([]);

    await signupAdmin(page);
    await expect(page.getByTestId("command-ready")).toBeVisible();
    const command = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    const commandCritical = command.violations.filter((v) => v.impact === "critical");
    expect(commandCritical, JSON.stringify(commandCritical, null, 2)).toEqual([]);
  });
});
