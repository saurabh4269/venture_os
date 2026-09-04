import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "@venture-os/config";
import postgres from "postgres";

loadEnv();

const here = dirname(fileURLToPath(import.meta.url));

async function main() {
  const env = loadEnv();
  const url = process.env.MIGRATE_DATABASE_URL || env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const sql = postgres(url, { max: 1 });
  await sql`create table if not exists _migrations (id text primary key, applied_at timestamptz not null default now())`;
  const dir = join(here, "..", "drizzle");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const applied = await sql`select id from _migrations where id = ${file}`;
    if (applied.length) continue;
    const body = readFileSync(join(dir, file), "utf8");
    await sql.unsafe(body);
    await sql`insert into _migrations (id) values (${file})`;
    console.log(`applied ${file}`);
  }
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
