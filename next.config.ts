import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  outputFileTracingIncludes: {
    "/*": ["./prisma/supabase-ca.crt"],
  },
};

export default nextConfig;
