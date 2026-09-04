import { expect, test } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const stamp = Date.now().toString(36);
const email = `e2e-${stamp}@example.test`;
const password = "password123";
const org = `E2E ${stamp}`;
const fixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/FIXTURE_ONLY-sample-mis.csv");

test.describe("@smoke happy path", () => {
  test("signup → company → upload → confirm → Command; open redirect stays on-site", async ({
    page,
  }) => {
    const started = Date.now();
    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("E2E Partner");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill(password);
    await page.getByTestId("signup-confirm").fill(password);
    await page.getByTestId("signup-org").fill(org);
    await page.getByTestId("signup-submit").click();
    await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("command-ready")).toBeVisible();
    console.log(`time_to_command_ms=${Date.now() - started}`);

    await page.goto("/companies/new");
    await expect(page.getByTestId("shell-ready")).toBeVisible();
    await page.getByTestId("company-name").fill(`E2E Co ${stamp}`);
    await page.getByTestId("create-company").click();
    await expect(page.getByTestId("mis-file")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("mis-file").setInputFiles(fixture);
    await page.getByTestId("mis-upload").click();
    await expect(page.getByText(/Extract/)).toBeVisible({ timeout: 20_000 });
    await page.goto("/inbox");
    await expect(page.getByTestId("shell-ready")).toBeVisible();
    const confirm = page.getByTestId("inbox-confirm").first();
    await expect(confirm).toBeVisible({ timeout: 30_000 });
    await confirm.click();
    console.log(`time_to_inbox_confirm_ms=${Date.now() - started}`);

    await page.goto("/command");
    await expect(page.getByTestId("shell-ready")).toBeVisible();
    await expect(page.getByTestId("command-ready")).toBeVisible();
    await expect(page.getByText(`E2E Co ${stamp}`)).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByTestId("login-submit")).toBeVisible({ timeout: 15_000 });

    await page.goto("/login?next=//evil.example/phish");
    await page.getByTestId("login-email").fill(email);
    await page.getByTestId("login-password").fill(password);
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/command/);
    expect(page.url()).not.toContain("evil.example");
  });
});
