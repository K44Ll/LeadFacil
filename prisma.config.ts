import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // A CLI usa o pooler de sessão (5432), inclusive para migrations.
    // process.env permite gerar o client sem credenciais durante o build.
    url: process.env.DIRECT_URL,
  },
});
