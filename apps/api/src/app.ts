import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadEnv } from "@venture-os/config";
import { auth } from "./auth.js";
import { HttpError, sessionMiddleware } from "./context.js";
import { log } from "./log.js";
import { AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS, allowRequest } from "./rate-limit.js";
import { routes } from "./routes.js";

const TRUSTED = new Set(["http://localhost:3000", "http://localhost:4000"]);

export function createApp() {
  const env = loadEnv();
  const app = new Hono();
  TRUSTED.add(env.WEB_URL.replace(/\/$/, ""));
  TRUSTED.add(env.API_URL.replace(/\/$/, ""));

  app.use(
    "*",
    cors({
      origin: [env.WEB_URL, "http://localhost:3000"],
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.use("*", async (c, next) => {
    const method = c.req.method;
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
    const origin = c.req.header("origin") ?? "";
    if (origin && !TRUSTED.has(origin.replace(/\/$/, ""))) {
      return c.json({ error: "untrusted_origin" }, 403);
    }
    return next();
  });

  app.use("/api/auth/*", async (c, next) => {
    const path = new URL(c.req.url).pathname;
    if (c.req.method === "POST" && (path.endsWith("/sign-in/email") || path.endsWith("/sign-up/email"))) {
      const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";
      if (!allowRequest(`auth:${ip}`, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS)) {
        return c.json({ error: "rate_limited" }, 429);
      }
    }
    return next();
  });

  app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
  app.use("*", sessionMiddleware);
  app.route("/", routes);

  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json({ error: err.message }, err.status as never);
    log("error", "unhandled", { err: err.message, stack: err.stack });
    return c.json({ error: "internal_error" }, 500);
  });

  return app;
}
