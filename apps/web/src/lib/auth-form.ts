import { normalizeEmail, passwordLengthError } from "@venture-os/config";
import { apiUrl } from "./api";
import type { Me } from "./auth-client";

export { normalizeEmail, passwordLengthError };

export type AuthFormFields = {
  email: string;
  password: string;
  name: string;
  confirm: string;
  org: string;
};

/** DOM values win over React state so password-manager autofill survives hydration. */
export function readAuthForm(form: Pick<HTMLFormElement, "elements"> | FormData): AuthFormFields {
  const fd = form instanceof FormData ? form : new FormData(form as HTMLFormElement);
  return {
    email: normalizeEmail(String(fd.get("email") ?? "")),
    password: String(fd.get("password") ?? ""),
    name: String(fd.get("name") ?? "").trim(),
    confirm: String(fd.get("confirm") ?? ""),
    org: String(fd.get("organization") ?? ""),
  };
}

export type AuthEmailResult = { ok: true } | { ok: false; message: string };

export async function postAuthEmail(
  path: "/api/auth/sign-in/email" | "/api/auth/sign-up/email",
  body: { email: string; password: string; name?: string },
): Promise<AuthEmailResult> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: { error?: string; message?: string; status?: string } | null = null;
  try {
    data = (await res.json()) as { error?: string; message?: string; status?: string };
  } catch {
    /* ignore */
  }
  const message = data?.message ?? data?.error ?? data?.status ?? res.statusText ?? "Request failed";
  if (!res.ok) return { ok: false, message };
  if (data?.error || data?.status === "INVALID_EMAIL_OR_PASSWORD") {
    return { ok: false, message };
  }
  return { ok: true };
}

export type AfterAuth =
  | { ok: true; to: string }
  | { ok: false; message: string };

/**
 * A 200 from sign-in/sign-up is not enough: /api/me must see the session cookie.
 * Never treat a missing user as "needs onboard" — that bounces back to /login.
 */
export function destinationAfterAuth(me: Me, nextPath: string): AfterAuth {
  if (!me.user) {
    return {
      ok: false,
      message: "Signed in but the session was not kept. Try again on this same site.",
    };
  }
  if (me.needsOrg || !me.orgId) return { ok: true, to: "/onboard" };
  return { ok: true, to: nextPath };
}
