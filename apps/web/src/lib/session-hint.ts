/** Better Auth session cookie names we may see on the web host. */
export const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
  "__Host-better-auth.session_token",
] as const;

/** True when a request carries a session cookie. Does not validate the session. */
export function hasSessionCookie(names: readonly string[]): boolean {
  return names.some((n) => n === "better-auth.session_token" || n.endsWith("better-auth.session_token"));
}
