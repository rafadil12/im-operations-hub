import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/daily-operation/management",
        destination: "/daily-operation/activities",
        permanent: true,
      },
      {
        source: "/daily-operation/analysis",
        destination: "/daily-operation/insights",
        permanent: true,
      },
      {
        source: "/daily-operation/master",
        destination: "/daily-operation/configuration/users",
        permanent: true,
      },
      {
        source: "/daily-operation/master/:path*",
        destination: "/daily-operation/configuration/:path*",
        permanent: true,
      },
      {
        source: "/training/activities",
        destination: "/training/session",
        permanent: true,
      },
      {
        source: "/report/management",
        destination: "/report/summary",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
