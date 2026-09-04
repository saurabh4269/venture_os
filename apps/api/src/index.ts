import { serve } from "@hono/node-server";
import { loadEnv } from "@venture-os/config";
import { createApp } from "./app.js";
import { log } from "./log.js";

const env = loadEnv();
const app = createApp();
const port = env.API_PORT;
serve({ fetch: app.fetch, port }, () => {
  log("info", "api_listen", { port });
});

export default app;
