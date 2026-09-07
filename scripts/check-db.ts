import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

async function main() {
  const { prisma } = await import("../lib/prisma");

  try {
    const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;

    if (result[0]?.ok !== 1) {
      throw new Error("Resposta inesperada do banco.");
    }

    console.log("Conexão com o PostgreSQL via Prisma confirmada.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const code =
    error && typeof error === "object" && "code" in error
      ? ` Código: ${String(error.code)}.`
      : "";

  let detail = error instanceof Error ? error.message : "Erro desconhecido.";

  for (const connectionString of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
    if (!connectionString) continue;

    detail = detail.replaceAll(connectionString, "[URL omitida]");

    try {
      const password = new URL(connectionString).password;

      for (const secret of [password, decodeURIComponent(password)]) {
        if (secret) detail = detail.replaceAll(secret, "[senha omitida]");
      }
    } catch {
      // Uma URL inválida também é omitida acima.
    }
  }

  detail = detail.replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/g, "[URL omitida]");

  console.error(
    `Falha na conexão via Prisma.${code} Verifique DATABASE_URL, a senha e o acesso ao pooler.`,
  );
  console.error(detail);
  process.exitCode = 1;
});
