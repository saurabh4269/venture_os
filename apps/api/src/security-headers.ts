export function securityHeaders(secure: boolean): Record<string, string> {
  const h: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "frame-ancestors 'none'",
  };
  if (secure) {
    h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }
  return h;
}
