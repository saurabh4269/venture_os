# Pass 36 — Redis-backed auth rate-limit + session notes

**Date:** 2026-09-05  
**Surface:** signup / sign-in / invite accept+reject limiter; session TTL copy  
**Evidence:** Pass 30/32 residual; NEXT.md item 7; queue-2 security #6.

## Issues

### 1. P0 — Limiter was per-process memory

**Wrong:** Two Fly machines = two counters. Credential stuffing split across instances.

**Should:** Redis sliding window (ZSET + Lua) keyed `rl:auth:{ip}` / `rl:invite:{ip}`. Same 20 / 15 min.

**Fix:** `rate-limit.ts` `allowRequestShared`.

### 2. P0 — Redis down would 500 the auth path if we fail-closed blindly

**Wrong:** A Redis blip must not take signup with it on a design-partner LAN.

**Should:** Timeout ~800ms, then fall back to the in-memory window. Document fail-open-to-memory.

### 3. P1 — Health already pinged Redis; limiter opened a second client each request

**Wrong:** Easy to leak sockets.

**Should:** Lazy singleton with `enableOfflineQueue: false`.

### 4. P1 — Unit tests only covered the stub

**Wrong:** A broken Lua script would ship.

**Should:** Keep memory tests. Add Redis tests that skip if `REDIS_URL` cannot PING (CI has Redis).

### 5. P1 — Session lifetime was code-only

**Wrong:** Partners could not see 7-day absolute / 24h `updateAge`.

**Should:** Settings “Session” note. DECISION D8. Login lede: sessions last 7 days; no SSO.

### 6. P1 — Invite accept/reject still used the memory stub

**Wrong:** Same IP flood on accept would bypass on a second machine.

**Should:** Same Redis key family `invite:{ip}`.

### 7. P1 — 429 body stayed a raw code

**Wrong:** UI already maps `rate_limited` via `friendlyAuthError`. Keep that.

### 8. P2 — No per-account (email) bucket

**Wrong:** Distributed IP only. Email stuffing from many IPs still works.

**Should:** Residual. IP is the design-partner bar. Do not log raw emails in the limiter key in production.

### 9. P2 — Logout still does not rotate other sessions

**Wrong:** Pass 32 residual (member DELETE / idle viewer).

**Should:** Documented. No SSO. Absolute 7d + daily refresh.

### 10. P2 — `__Host-` cookie prefix still unset

**Wrong:** Would break Better Auth names.

**Should:** Residual.

### 11. P2 — Captcha / Turnstile still absent

**Wrong:** Rate-limit is the control.

### 12. P2 — Org-create cap is not the rate-limit

**Wrong:** Cap (5) is a different gate. Do not conflate.

### 13. P2 — Tests used `password123`

**Wrong:** Allowed (min 8). Production does not add a breached-password API.

### 14. P3 — Idle timeout for viewers

**Wrong:** Same 7d as partners.

**Should:** Residual.

### 15. P3 — Redis AUTH username URLs

**Wrong:** `ioredis` parses `REDIS_URL`. Upstash works.

### 16. P1 — Middleware stayed sync `allowRequest`

**Wrong:** Would ignore Redis.

**Should:** `await allowRequestShared`.

## Residual

- SSO, session revoke-on-remove, per-email bucket, captcha.
