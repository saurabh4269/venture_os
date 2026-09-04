import type { APIRequestContext, Page } from "@playwright/test";

export async function createInvite(
  request: APIRequestContext,
  email: string,
  role = "analyst",
): Promise<{ id: string; acceptUrl: string }> {
  const res = await request.post("/api/invitations", { data: { email, role } });
  if (!res.ok()) {
    throw new Error(`createInvite failed ${res.status()}: ${await res.text()}`);
  }
  const body = (await res.json()) as { invitation: { id: string }; acceptUrl: string };
  return { id: body.invitation.id, acceptUrl: body.acceptUrl };
}

export async function publicInvite(request: APIRequestContext, id: string) {
  const res = await request.get(`/api/invitations/${id}`);
  return (await res.json()) as {
    invitation: {
      id: string;
      email?: string;
      emailMasked?: string;
      canAccept?: boolean;
      status: string;
    };
  };
}

export async function signup(page: Page, opts: { name: string; email: string; password: string; org?: string }) {
  await page.goto(opts.org ? "/signup" : `/signup`);
  await page.getByTestId("signup-name").fill(opts.name);
  await page.getByTestId("signup-email").fill(opts.email);
  await page.getByTestId("signup-password").fill(opts.password);
  await page.getByTestId("signup-confirm").fill(opts.password);
  if (opts.org) {
    await page.getByTestId("signup-org").fill(opts.org);
  }
  await page.getByTestId("signup-submit").click();
}
