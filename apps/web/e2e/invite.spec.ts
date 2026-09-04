import { expect, test } from "@playwright/test";
import { createInvite, publicInvite, signup } from "./helpers/invite";

test.describe("@smoke invite", () => {
  test("public GET masks email; matching user can accept from a fresh context", async ({
    page,
    browser,
  }) => {
    const stamp = Date.now().toString(36);
    const adminEmail = `e2e-admin-${stamp}@example.test`;
    const inviteEmail = `e2e-analyst-${stamp}@example.test`;
    await signup(page, {
      name: "E2E Admin",
      email: adminEmail,
      password: "password123",
      org: `Invite ${stamp}`,
    });
    await expect(page.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });

    const created = await createInvite(page.request, inviteEmail, "analyst");
    const pub = await publicInvite(page.request, created.id);
    expect(pub.invitation.email).toBeUndefined();
    expect(pub.invitation.emailMasked).toMatch(/\*\*\*/);
    expect(pub.invitation.canAccept).toBeFalsy();

    const ctx = await browser.newContext();
    const guest = await ctx.newPage();
    await guest.goto(`/signup?invite=${created.id}`);
    await expect(guest.getByTestId("signup-email")).toHaveValue("");
    await guest.getByTestId("signup-name").fill("E2E Analyst");
    await guest.getByTestId("signup-email").fill(inviteEmail);
    await guest.getByTestId("signup-password").fill("password123");
    await guest.getByTestId("signup-confirm").fill("password123");
    await guest.getByTestId("signup-submit").click();
    await expect(guest.getByRole("heading", { name: "Join an organisation" })).toBeVisible({
      timeout: 15_000,
    });
    await guest.getByRole("button", { name: "Accept invite" }).click();
    await expect(guest.getByTestId("shell-ready")).toBeVisible({ timeout: 30_000 });
    await ctx.close();
  });
});
