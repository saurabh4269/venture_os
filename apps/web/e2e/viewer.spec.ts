import { expect, test } from "@playwright/test";
import { createViewerStorageState, openViewer, signupAdmin } from "./helpers/session";

test.describe("@smoke viewer storageState", () => {
  test("viewer cannot submit the company onboard form", async ({ page, browser }) => {
    const { stamp } = await signupAdmin(page);
    const { storageState } = await createViewerStorageState(page, browser, stamp);
    const ctx = await openViewer(browser, storageState);
    const viewer = await ctx.newPage();
    await viewer.goto("/companies/new");
    await expect(viewer.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
    await expect(viewer.getByTestId("viewer-read-only")).toBeVisible();
    await expect(viewer.getByTestId("create-company")).toHaveCount(0);
    await viewer.goto("/nav");
    await expect(viewer.getByTestId("nav-ready")).toBeVisible();
    await expect(viewer.getByTestId("nav-lock")).toHaveCount(0);
    await ctx.close();
  });
});
