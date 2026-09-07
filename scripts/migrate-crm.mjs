import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createDatabaseClient } from "./db-client.mjs";
const client = createDatabaseClient();
try {
  await client.connect();
  await client.query("begin");
  await client.query("create schema if not exists supabase_migrations");
  await client.query(
    "create table if not exists supabase_migrations.schema_migrations(version text primary key, statements text[], name text)",
  );
  const files = (await readdir("supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const version = file.split("_")[0];
    const { rows } = await client.query(
      "select version from supabase_migrations.schema_migrations where version=$1",
      [version],
    );
    if (rows.length) {
      console.log(`Migration ${version} já aplicada.`);
      continue;
    }
    const sql = await readFile(path.join("supabase/migrations", file), "utf8");
    await client.query(sql);
    await client.query(
      "insert into supabase_migrations.schema_migrations(version,statements,name) values($1,$2,$3)",
      [version, [sql], file.slice(version.length + 1, -4)],
    );
    console.log(`Migration ${version} aplicada.`);
  }
  await client.query("commit");
  const { rows } = await client.query(
    "select tablename,rowsecurity from pg_tables where schemaname='public' order by tablename",
  );
  console.table(rows);
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error("Migration não aplicada. Transação revertida.", {
    code: error.code,
    message: error.message?.replace(
      /postgres(?:ql)?:\/\/[^\s]+/g,
      "[URL omitida]",
    ),
  });
  process.exitCode = 1;
} finally {
  await client.end();
}
