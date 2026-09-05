import { Queue, Worker } from "bullmq";
import { loadEnv } from "@venture-os/config";
import { redactSecretsForLog } from "@venture-os/core";
import { listConnectedOrgs, runConnectorHealth, runConnectorSync, runFlagJob, runParseJob, runReportJob } from "@venture-os/db";

const env = loadEnv();
const connection = () => {
  const u = new URL(env.REDIS_URL);
  return { host: u.hostname, port: Number(u.port || 6379), password: u.password || undefined };
};

function log(msg: string, extra: Record<string, unknown> = {}) {
  const safe = redactSecretsForLog(extra) as Record<string, unknown>;
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: "info", msg, ...safe }));
}

async function start() {
  try {
    const helloQ = new Queue("hello", { connection: connection() });
    await helloQ.add("hello", { ping: true });
    await helloQ.close();
  } catch (err) {
    log("worker_redis_unavailable", { err: String(err) });
    setTimeout(start, 5000);
    return;
  }

  const hello = new Worker(
    "hello",
    async (job) => {
      log("hello_job", { jobId: job.id, data: job.data });
      return { ok: true, at: new Date().toISOString() };
    },
    { connection: connection() },
  );

  const parse = new Worker(
    "parse",
    async (job) => {
      log("parse_start", { jobId: job.id, ...job.data });
      const r = await runParseJob(job.data.orgId, job.data.documentId);
      log("parse_done", { jobId: job.id, ...r });
      return r;
    },
    { connection: connection() },
  );

  const flags = new Worker(
    "flags",
    async (job) => {
      log("flags_start", { jobId: job.id, ...job.data });
      const r = await runFlagJob(job.data.orgId, job.data.companyId);
      log("flags_done", { jobId: job.id, ...r });
      return r;
    },
    { connection: connection() },
  );

  const report = new Worker(
    "report",
    async (job) => {
      log("report_start", { jobId: job.id, ...job.data });
      const r = await runReportJob(job.data.orgId, job.data.reportId);
      log("report_done", { jobId: job.id, ...r });
      return r;
    },
    { connection: connection() },
  );

  const nav = new Worker(
    "nav",
    async (job) => {
      log("nav_job", { jobId: job.id, ...job.data });
      return { ok: true };
    },
    { connection: connection() },
  );

  const connectorSync = new Worker(
    "connector.sync",
    async (job) => {
      log("connector_sync_start", { jobId: job.id, ...job.data });
      const r = await runConnectorSync(job.data.orgId, job.data.kind, {
        companyId: job.data.companyId,
        actorUserId: job.data.actorUserId,
      });
      log("connector_sync_done", { jobId: job.id, ...r });
      return r;
    },
    { connection: connection() },
  );

  const connectorHealth = new Worker(
    "connector.health",
    async (job) => {
      log("connector_health_start", { jobId: job.id, ...job.data });
      const r = await runConnectorHealth(job.data.orgId, job.data.kind);
      log("connector_health_done", { jobId: job.id, ...r });
      return r;
    },
    { connection: connection() },
  );

  const connectorSchedule = new Worker(
    "connector.schedule",
    async (job) => {
      const connected = await listConnectedOrgs();
      if (!connected.length) {
        log("connector_schedule_noop", { jobId: job.id, reason: "no_connected_connectors" });
        return { ok: true, noop: true, connected: 0 };
      }
      const syncQ = new Queue("connector.sync", { connection: connection() });
      for (const row of connected) {
        await syncQ.add("sync", { orgId: row.orgId, kind: row.kind });
      }
      await syncQ.close();
      log("connector_schedule_enqueued", { jobId: job.id, n: connected.length });
      return { ok: true, connected: connected.length };
    },
    { connection: connection() },
  );

  try {
    const sched = new Queue("connector.schedule", { connection: connection() });
    await sched.add("tick", { poll: true }, { repeat: { every: 15 * 60 * 1000 }, jobId: "connector-poll" });
    await sched.close();
  } catch (err) {
    log("connector_schedule_repeat_failed", { err: String(err) });
  }

  for (const w of [hello, parse, flags, report, nav, connectorSync, connectorHealth, connectorSchedule]) {
    w.on("failed", (job, err) => {
      console.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "error",
          msg: "job_failed",
          queue: w.name,
          jobId: job?.id,
          err: err.message,
        }),
      );
    });
  }

  log("worker_listen", {
    queues: ["hello", "parse", "flags", "report", "nav", "connector.sync", "connector.health", "connector.schedule"],
  });
}

start();
