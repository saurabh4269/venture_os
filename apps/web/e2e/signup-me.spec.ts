import { expect, test } from "@playwright/test";

/**
 * Live blocker: after signup 200, GET /api/me was 200 but the browser
 * JSON.parse threw Unterminated string (body ended mid-key).
 * Assert the BFF body is complete JSON immediately after sign-up.
 */
test.describe("@smoke signup then /api/me", () => {
  test("signup then GET /api/me parses (no Unterminated string)", async ({ page }) => {
    const stamp = Date.now().toString(36);
    const email = `e2e-me-${stamp}@example.test`;
    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("E2E Me");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm").fill("password123");
    await page.getByTestId("signup-org").fill(`E2E ${stamp}`);

    const pageMeTexts: string[] = [];
    page.on("response", (r) => {
      if (!r.url().includes("/api/me") || r.request().method() !== "GET") return;
      void r.text().then((t) => pageMeTexts.push(t));
    });

    const signupWait = page.waitForResponse(
      (r) => r.url().includes("/api/auth/sign-up/email") && r.request().method() === "POST",
    );
    await page.getByTestId("signup-submit").click();
    const signup = await signupWait;
    const signupText = await signup.text();
    const signupDiag = `signup status=${signup.status()} bytes=${signupText.length} head=${signupText.slice(0, 80)} tail=${signupText.slice(-80)}`;
    expect(signup.ok(), signupDiag).toBeTruthy();
    expect(() => JSON.parse(signupText), signupDiag).not.toThrow();

    const me = await page.context().request.get("/api/me");
    const hdrs = me.headers();
    const text = await me.text();
    const diag = `status=${me.status()} content-type=${hdrs["content-type"] ?? ""} content-length=${hdrs["content-length"] ?? "(none)"} content-encoding=${hdrs["content-encoding"] ?? "(none)"} bytes=${text.length} body=${text}`;
    expect(hdrs["content-type"] ?? "", diag).toMatch(/json/i);
    expect(text, diag).not.toMatch(/,"org"$/);
    let parsed: { user?: { email?: string } | null; orgId?: string | null; needsOrg?: boolean };
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch (err) {
      throw new Error(`${err instanceof Error ? err.message : err} — ${diag}`);
    }
    expect(parsed.user?.email?.toLowerCase(), diag).toBe(email);

    for (const body of pageMeTexts) {
      expect(() => JSON.parse(body), body.slice(0, 80)).not.toThrow();
    }

    await expect(page.getByTestId("shell-ready").or(page.getByRole("alert"))).toBeVisible({
      timeout: 30_000,
    });
  });
});
