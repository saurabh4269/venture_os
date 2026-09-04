import { Queue } from "bullmq";
import { loadEnv } from "@venture-os/config";
import { log } from "./log.js";

const env = loadEnv();

function connection() {
  const u = new URL(env.REDIS_URL);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    password: u.password || undefined,
  };
}

let parseQueue: Queue | null = null;
let flagsQueue: Queue | null = null;
let reportQueue: Queue | null = null;

export function getParseQueue() {
  if (!parseQueue) parseQueue = new Queue("parse", { connection: connection() });
  return parseQueue;
}
export function getFlagsQueue() {
  if (!flagsQueue) flagsQueue = new Queue("flags", { connection: connection() });
  return flagsQueue;
}
export function getReportQueue() {
  if (!reportQueue) reportQueue = new Queue("report", { connection: connection() });
  return reportQueue;
}

async function withRedisTimeout<T>(work: Promise<T>, ms = 1500): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("redis_timeout")), ms);
    }),
  ]);
}

export async function enqueueParse(orgId: string, documentId: string) {
  try {
    await withRedisTimeout(getParseQueue().add("parse-document", { orgId, documentId }));
    return "queued";
  } catch (err) {
    log("warn", "redis_unavailable_inline_parse", { err: String(err) });
    const { runParseJob } = await import("@venture-os/db");
    await runParseJob(orgId, documentId);
    return "inline";
  }
}

export async function enqueueFlags(orgId: string, companyId?: string) {
  try {
    await withRedisTimeout(getFlagsQueue().add("detect-flags", { orgId, companyId }));
  } catch {
    const { runFlagJob } = await import("@venture-os/db");
    await runFlagJob(orgId, companyId);
  }
}

export async function enqueueReport(orgId: string, reportId: string) {
  try {
    await Promise.race([
      getReportQueue().add("render-report", { orgId, reportId }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("redis_timeout")), 1500);
      }),
    ]);
    return "queued";
  } catch (err) {
    log("warn", "redis_unavailable_inline_report", { err: String(err) });
    const { runReportJob } = await import("@venture-os/db");
    await runReportJob(orgId, reportId);
    return "inline";
  }
}
