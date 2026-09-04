import { loadEnv } from "@venture-os/config";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema.js";

const env = loadEnv();

export type Database = PostgresJsDatabase<typeof schema>;

let _sql: ReturnType<typeof postgres> | null = null;
let _db: Database | null = null;

export function getSql(url = env.DATABASE_URL) {
  if (!_sql) {
    if (!url) throw new Error("DATABASE_URL is required");
    _sql = postgres(url, { max: 10 });
  }
  return _sql;
}

export function getDb(): Database {
  if (!_db) _db = drizzle(getSql(), { schema });
  return _db;
}

export async function closeDb() {
  if (_sql) await _sql.end();
  _sql = null;
  _db = null;
}

/**
 * Run work as an org. Sets `app.current_org_id` locally so RLS applies.
 * Always also pass orgId in queries (defense in depth).
 */
export async function withOrg<T>(orgId: string, fn: (tx: Database) => Promise<T>): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
    return fn(tx as unknown as Database);
  });
}

/** Bypass RLS for migrations / Better Auth admin paths. Uses a fresh connection without FORCE... 
 * Superuser still sees rows unless FORCE; we FORCE, so this sets a session bypass via role is not available.
 * For seed/migrate we execute as table owner before FORCE is applied, or set org id.
 */
export async function withOrgRaw<T>(orgId: string, fn: (db: Database) => Promise<T>): Promise<T> {
  const client = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });
  try {
    await db.execute(sql`select set_config('app.current_org_id', ${orgId}, false)`);
    return await fn(db);
  } finally {
    await client.end();
  }
}
