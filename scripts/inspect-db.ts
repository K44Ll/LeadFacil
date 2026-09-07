import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
async function main() {
  const { prisma } = await import("../lib/prisma");
  try {
    const url = new URL(process.env.DIRECT_URL!);
    console.log({ host: url.hostname, user: url.username });
    const rows = await prisma.$queryRaw<
      { schema: string; name: string }[]
    >`select schemaname as schema, tablename as name from pg_tables where schemaname in ('public','auth') order by schemaname,tablename`;
    console.log(rows);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(() => {
  console.error("Não foi possível inspecionar o banco. Credenciais omitidas.");
  process.exitCode = 1;
});
