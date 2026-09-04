import { Queue, Worker } from "bullmq";
import { loadEnv } from "@venture-os/config";
import { runFlagJob, runParseJob } from "@venture-os/db";

const env = loadEnv();
const connection = () => {
  const u = new URL(env.REDIS_URL);
  return { host: u.hostname, port: Number(u.port || 6379), password: u.password || undefined };
};

function log(msg: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: "info", msg, ...extra }));
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
      log("report_job", { jobId: job.id, ...job.data });
      return { ok: true };
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

  for (const w of [hello, parse, flags, report, nav]) {
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

  log("worker_listen", { queues: ["hello", "parse", "flags", "report", "nav"] });
}

start();
