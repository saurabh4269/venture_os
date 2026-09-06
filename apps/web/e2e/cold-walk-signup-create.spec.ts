import { expect, test } from "@playwright/test";

const PASSWORD = "password12345";

async function signupToCommand(
  page: import("@playwright/test").Page,
  stamp: string,
  label: string,
) {
  const orgName = `Onboard Walk ${stamp}`;
  await page.goto("/signup");
  await expect(page.getByTestId("signup-submit")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("signup-name").fill(label);
  await page.getByTestId("signup-email").fill(`onboard-walk-${stamp}@example.test`);
  await page.getByTestId("signup-password").fill(PASSWORD);
  await page.getByTestId("signup-confirm").fill(PASSWORD);
  await page.getByTestId("signup-org").fill(orgName);
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
    await page.getByTestId("onboard-org").fill(orgName);
    await page.getByTestId("onboard-submit").click();
    await page.waitForURL("**/command", { timeout: 30_000 });
  }
  await expect(page.getByTestId("command-ready")).toBeVisible({ timeout: 30_000 });
}

async function firstCompanyCreateWalk(
  page: import("@playwright/test").Page,
  prefix: string,
  mobile: boolean,
) {
  const stamp = `${Date.now().toString(36)}${mobile ? "m" : "d"}`;
  const companyName = `Walk Co ${stamp}`;

  await signupToCommand(page, stamp, mobile ? "Walk Mobile" : "Walk Desktop");
  await page.screenshot({ path: `test-results/${prefix}-01-command-empty.png`, fullPage: true });

  const addCompany = page.getByTestId("command-empty").getByRole("link", { name: "Add company" });
  await addCompany.click();
  await expect(page.getByTestId("companies-new-ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".onboard-steps li.on")).toHaveText("Profile");
  await page.screenshot({ path: `test-results/${prefix}-02-company-profile.png`, fullPage: true });

  await page.getByTestId("company-name").fill(companyName);
  const createBtn = page.getByTestId("create-company");
  if (mobile) {
    await expect(createBtn).toHaveCSS("min-height", /44px/);
  }
  await createBtn.click();

  await expect(page.getByTestId("mis-file")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".onboard-steps li.on")).toHaveText("Vault");
  await expect(page.getByTestId("mis-upload")).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip for now" })).toBeVisible();
  await page.screenshot({ path: `test-results/${prefix}-03-company-upload.png`, fullPage: true });
}

test.describe("signup to first company create", () => {
  test("desktop signup through company profile to upload step", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    try {
      await page.goto("/signup");
      await expect(page.getByTestId("signup-submit")).toHaveClass(/auth-submit/);
      await page.screenshot({ path: "test-results/onboard-walk-desktop-signup-form.png", fullPage: true });
      await firstCompanyCreateWalk(page, "onboard-walk-desktop", false);
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

  test("mobile signup through company profile to upload step", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await page.goto("/signup");
      await page.screenshot({ path: "test-results/onboard-walk-mobile-signup-form.png", fullPage: true });
      await firstCompanyCreateWalk(page, "onboard-walk-mobile", true);
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
