import * as envPackage from "@next/env";
import { readFileSync } from "node:fs";
import * as pgPackage from "pg";
const nextEnv = envPackage.default ?? envPackage;
const pg = pgPackage.default ?? pgPackage;
nextEnv.loadEnvConfig(process.cwd());
export function createDatabaseClient() {
  const connection = new URL(
    process.env.DIRECT_URL || process.env.DATABASE_URL,
  );
  for (const key of ["sslmode", "sslcert", "sslrootcert", "sslkey"])
    connection.searchParams.delete(key);
  return new pg.Client({
    connectionString: connection.toString(),
    connectionTimeoutMillis: 10000,
    ssl: {
      ca: readFileSync("prisma/supabase-ca.crt", "utf8"),
      rejectUnauthorized: true,
    },
  });
}
