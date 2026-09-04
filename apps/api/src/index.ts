import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadEnv } from "@venture-os/config";
import { auth } from "./auth.js";
import { HttpError, sessionMiddleware } from "./context.js";
import { log } from "./log.js";
import { routes } from "./routes.js";

const env = loadEnv();
const app = new Hono();

app.use(
  "*",
  cors({
    origin: [env.WEB_URL, "http://localhost:3000"],
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.use("*", sessionMiddleware);
app.route("/", routes);

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status as never);
  log("error", "unhandled", { err: err.message, stack: err.stack });
  return c.json({ error: "internal_error" }, 500);
});

const port = env.API_PORT;
serve({ fetch: app.fetch, port }, () => {
  log("info", "api_listen", { port });
});

export default app;
